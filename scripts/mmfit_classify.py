#!/usr/bin/env python3
"""
Exercise classification + rep detection from MM-Fit left-wrist IMU.

Assumes set boundaries are given (that is fort-live's stated contract: the
on-device classifier segments sets; this asks what can be read off the
segment). Trains on per-set features from accel + gyro only.

Validation is leave-one-workout-out, so no set from a test workout ever
appears in training. Rep counts are NEVER used as a feature -- they are a
prediction target for the rep detector.

    python3 scripts/mmfit_classify.py            # train + report
    python3 scripts/mmfit_classify.py --emit w00 # dump SessionEvent JSON
"""
import argparse
import csv
import json
import os
import sys

import numpy as np
from scipy import signal, stats
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import LeaveOneGroupOut

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mm-fit")
FPS = 30.0          # label frames
WORKOUTS = [f"w{i:02d}" for i in range(21)]


# ---------------------------------------------------------------- loading

def load_workout(w):
    """Return (labels, acc, gyr). Arrays are [frame, unix_ms, x, y, z]."""
    d = os.path.join(ROOT, w)
    labels = []
    with open(os.path.join(d, f"{w}_labels.csv")) as f:
        for row in csv.reader(f):
            if row:
                labels.append((int(row[0]), int(row[1]), int(row[2]), row[3]))
    acc = np.load(os.path.join(d, f"{w}_sw_l_acc.npy"))
    gyr = np.load(os.path.join(d, f"{w}_sw_l_gyr.npy"))
    return labels, acc, gyr


def slice_frames(arr, f0, f1):
    """Rows of arr whose frame index falls in [f0, f1]."""
    m = (arr[:, 0] >= f0) & (arr[:, 0] <= f1)
    return arr[m, 2:5]


# ---------------------------------------------------------------- features

def channel_features(x, fs):
    """15 features for one 1-D signal."""
    if len(x) < 8:
        return [0.0] * 15
    d = np.diff(x)
    centred = x - x.mean()
    zc = np.sum(np.diff(np.signbit(centred)) != 0) / len(x)

    # spectrum
    n = len(x)
    freqs = np.fft.rfftfreq(n, 1.0 / fs)
    p = np.abs(np.fft.rfft(centred)) ** 2
    tot = p.sum() + 1e-12
    band = (freqs > 0.15) & (freqs < 3.5)          # plausible rep cadence
    dom = freqs[band][np.argmax(p[band])] if band.any() and p[band].size else 0.0
    dom_frac = p[band].max() / tot if band.any() and p[band].size else 0.0
    centroid = float((freqs * p).sum() / tot)
    pn = p / tot
    entropy = float(-(pn * np.log(pn + 1e-12)).sum())

    return [
        float(x.mean()), float(x.std()), float(x.min()), float(x.max()),
        float(np.median(x)), float(np.percentile(x, 75) - np.percentile(x, 25)),
        float(np.sqrt((x ** 2).mean())), float(stats.skew(x)), float(stats.kurtosis(x)),
        float(np.abs(d).mean()), float(d.std()), float(zc),
        float(dom), float(dom_frac), float(centroid + entropy * 0),
    ]


def set_features(acc, gyr, dur_s):
    """Feature vector for one set. acc/gyr are (n,3)."""
    fs_a = len(acc) / dur_s if dur_s > 0 else 100.0
    fs_g = len(gyr) / dur_s if dur_s > 0 else 100.0

    chans = []
    for i in range(3):
        chans.append((acc[:, i], fs_a))
        chans.append((gyr[:, i], fs_g))
    chans.append((np.linalg.norm(acc, axis=1), fs_a))
    chans.append((np.linalg.norm(gyr, axis=1), fs_g))

    feats = []
    for x, fs in chans:
        feats.extend(channel_features(x, fs))

    # inter-axis correlation, orientation proxy
    for arr in (acc, gyr):
        if len(arr) > 8:
            c = np.corrcoef(arr.T)
            feats.extend([float(c[0, 1]), float(c[0, 2]), float(c[1, 2])])
        else:
            feats.extend([0.0, 0.0, 0.0])

    feats.append(float(dur_s))
    return np.nan_to_num(np.array(feats, dtype=np.float64), posinf=0.0, neginf=0.0)


# ---------------------------------------------------------------- rep detection

def _period_by_autocorr(y, fs, f_lo=0.2, f_hi=2.0):
    """Dominant repetition period in seconds, via autocorrelation."""
    y = y - y.mean()
    n = len(y)
    ac = np.correlate(y, y, mode="full")[n - 1:]
    if ac[0] <= 0:
        return None
    ac = ac / ac[0]
    lag_min = int(fs / f_hi)
    lag_max = min(int(fs / f_lo), n - 1)
    if lag_max <= lag_min + 2:
        return None
    seg = ac[lag_min:lag_max]
    peaks, _ = signal.find_peaks(seg)
    if len(peaks) == 0:
        return None
    best = peaks[np.argmax(seg[peaks])] + lag_min
    return best / fs


def detect_reps(acc, gyr, dur_s, fs=100.0):
    """
    Reps from the dominant cadence. Autocorrelation fixes the period, then
    peaks are counted with that period enforced as the minimum spacing --
    raw peak counting alone fires on sub-movements and over-counts badly.
    Returns (count, times_s).
    """
    if len(acc) < 32 or dur_s <= 0:
        return 0, []
    fs = len(acc) / dur_s

    nyq = fs / 2.0
    lo, hi = 0.2 / nyq, min(2.0 / nyq, 0.99)
    if not (0 < lo < hi < 1):
        return 0, []
    b, a = signal.butter(3, [lo, hi], btype="band")

    # pick whichever channel carries the cleaner periodicity
    best = None
    for raw in (np.linalg.norm(gyr, axis=1), np.linalg.norm(acc, axis=1)):
        y = signal.filtfilt(b, a, raw - raw.mean())
        per = _period_by_autocorr(y, fs)
        if per is None:
            continue
        lag = int(per * fs)
        ac = np.correlate(y - y.mean(), y - y.mean(), mode="full")[len(y) - 1:]
        strength = ac[lag] / ac[0] if ac[0] > 0 and lag < len(ac) else 0.0
        if best is None or strength > best[0]:
            best = (strength, y, per)

    if best is None:
        return 0, []
    _, y, period = best

    peaks, _ = signal.find_peaks(
        y, distance=max(int(0.85 * period * fs), 5), prominence=y.std() * 0.4
    )
    # the period is the more reliable estimate; peaks only align the timing
    by_period = int(round(dur_s / period))
    count = by_period if abs(by_period - len(peaks)) > 2 else len(peaks)
    return count, (peaks / fs).tolist()


# ---------------------------------------------------------------- dataset

def build_dataset(drop_cardio=True):
    X, y, groups, meta = [], [], [], []
    for w in WORKOUTS:
        labels, acc, gyr = load_workout(w)
        for (f0, f1, reps, name) in labels:
            if drop_cardio and name == "jumping_jacks":
                continue
            a = slice_frames(acc, f0, f1)
            g = slice_frames(gyr, f0, f1)
            dur = (f1 - f0) / FPS
            if len(a) < 32 or len(g) < 32:
                continue
            X.append(set_features(a, g, dur))
            y.append(name)
            groups.append(w)
            meta.append({"w": w, "f0": f0, "f1": f1, "reps": reps,
                         "dur": dur, "acc": a, "gyr": g})
    return np.vstack(X), np.array(y), np.array(groups), meta


# ---------------------------------------------------------------- main

# ---------------------------------------------------------------- emit

# MM-Fit's ten classes onto fort-live's exercise ids. Nine map; the tenth is
# cardio and the model never sees it.
#
# `dumbbell_rows -> barbell-row` is the one substitution rather than a match:
# fort-live's curated free-exercise-db subset has no dumbbell row, and both
# movements are a horizontal pull with `middle back` as the primary. It changes
# nothing downstream — recruitment keys off the exercise record, not the name —
# but it is a substitution and not a translation, so it is written down.
MMFIT_TO_APP = {
    "squats": "back-squat",
    "pushups": "push-ups",
    "situps": "sit-up",
    "dumbbell_shoulder_press": "db-shoulder-press",
    "lateral_shoulder_raises": "lateral-raise",
    "bicep_curls": "db-curl",
    "tricep_extensions": "triceps-pushdown",
    "dumbbell_rows": "barbell-row",
    "lunges": "walking-lunge",
    "jumping_jacks": None,
}

PRE_ROLL_S = 25.0      # quiet lead-in before the first set, so the panel opens empty
HR_EVERY_S = 5.0
ROM_FLOOR = 0.15       # a detected rep always moved something

# The three workouts the prototype lets you play, chosen because they differ in
# ways a single workout could not show:
#   w14  27 sets in 25 min, all nine movements  — a brisk complete session
#   w09  27 sets in 56 min, all nine            — the same work at half the pace
#   w20  24 sets in 46 min, no shoulder press   — a session with a gap in it
PLAYABLE = ["w14", "w09", "w20"]

# No heart-rate stream on the wrist for these three. Energy comes from HR, so
# including them would mean a session with a blank where the one number on the
# main screen goes. Left out, and said so, rather than back-filled.
NO_HR = ["w05", "w10", "w18"]


def _rep_windows(times, dur_s, count):
    """
    Rep boundaries from detected peak times.

    A peak marks the middle of a rep, not its edge, so the boundaries are the
    midpoints between consecutive peaks. When the period-based count disagrees
    with the number of peaks, the count is the more reliable figure (see
    detect_reps) and the reps get spaced evenly instead.
    """
    if count <= 0:
        return []
    if len(times) != count:
        step = dur_s / count
        times = [(i + 0.5) * step for i in range(count)]
    times = sorted(times)
    edges = [0.0]
    for a, b in zip(times, times[1:]):
        edges.append((a + b) / 2.0)
    edges.append(dur_s)
    return [(edges[i], edges[i + 1], times[i]) for i in range(count)]


def _wrist_speed(a_win, fs):
    """
    Mean wrist speed over a rep, m/s.

    Integrating accelerometer data is normally a drift disaster. It is tolerable
    here for one reason: the window is a single rep, roughly a second, and a rep
    starts and ends at a turnaround where true velocity is ~0. Subtracting the
    window mean kills any residual DC, and forcing the integral's endpoints to
    zero removes the linear drift term. What survives is the shape of the rep.

    This is the WRIST, not the bar. On a squat the wrist rides the bar and they
    are nearly the same; on a curl they are not. The engine downstream only ever
    compares a rep to other reps of the same movement, which is what makes the
    quantity usable despite that.
    """
    if len(a_win) < 4:
        return 0.0
    dt = 1.0 / fs
    a = a_win - a_win.mean(axis=0)                 # drop gravity / DC
    v = np.cumsum(a, axis=0) * dt
    n = len(v)
    ramp = np.linspace(0.0, 1.0, n)[:, None]
    v = v - ramp * v[-1]                           # endpoints back to zero
    return float(np.linalg.norm(v, axis=1).mean())


def build_session(w, pred_all, y, meta, hr_every_s=HR_EVERY_S):
    """
    One workout as a fort-live Session dict.

    `pred_all` is the leave-one-workout-out prediction vector from main(): every
    entry was produced by a model fitted without the workout it labels. Reusing
    it here rather than refitting per workout is not just cheaper, it is the
    same guarantee applied uniformly — there is no path through this function
    that can accidentally label a workout with a model that saw it.
    """
    idx = [i for i, m in enumerate(meta) if m["w"] == w]
    if not idx:
        return None

    # --- per-set inference
    sets = []
    for i in idx:
        m = meta[i]
        pred = pred_all[i]
        app_id = MMFIT_TO_APP.get(pred)
        if app_id is None:
            continue
        n, times = detect_reps(m["acc"], m["gyr"], m["dur"])
        if n <= 0:
            continue
        sets.append({
            "i": i, "m": m, "pred": pred, "true": y[i],
            "appId": app_id, "reps": n, "times": times,
        })
    sets.sort(key=lambda s: s["m"]["f0"])

    t0 = sets[0]["m"]["f0"] / FPS - PRE_ROLL_S

    # --- per-rep kinematics
    raw = []                                        # (setpos, repidx, rom_rad, vel, dur)
    for sp, s in enumerate(sets):
        m = s["m"]
        a, g = m["acc"], m["gyr"]
        dur = m["dur"]
        fs = len(a) / dur
        for r, (w0, w1, _peak) in enumerate(_rep_windows(s["times"], dur, s["reps"])):
            i0, i1 = int(w0 * fs), max(int(w1 * fs), int(w0 * fs) + 4)
            g_win, a_win = g[i0:i1], a[i0:i1]
            if len(g_win) < 4:
                continue
            # total angular path of the wrist over the rep, radians
            rom_rad = float(np.trapezoid(np.linalg.norm(g_win, axis=1), dx=1.0 / fs))
            raw.append({
                "setpos": sp, "repIdx": r,
                "rom_rad": rom_rad,
                "vel": _wrist_speed(a_win, fs),
                "durationS": w1 - w0,
                "t": m["f0"] / FPS + w1 - t0,
            })

    # ROM is normalised per exercise, against this session's own best rep of
    # that movement. The schema asks for "a fraction of this lifter's full ROM"
    # and one session is the largest window available here, so that is the
    # window used. It is stated rather than smuggled.
    by_ex = {}
    for r in raw:
        by_ex.setdefault(sets[r["setpos"]]["appId"], []).append(r["rom_rad"])
    ref = {k: float(np.percentile(v, 95)) or 1.0 for k, v in by_ex.items()}

    events = []
    for sp, s in enumerate(sets):
        m = s["m"]
        start = m["f0"] / FPS - t0
        end = m["f1"] / FPS - t0
        events.append({"type": "set_start", "t": round(start, 2),
                       "exerciseId": s["appId"], "setIdx": sp})
        for r in [x for x in raw if x["setpos"] == sp]:
            denom = ref.get(s["appId"], 1.0) or 1.0
            events.append({
                "type": "rep", "t": round(r["t"], 2),
                "exerciseId": s["appId"], "setIdx": sp, "repIdx": r["repIdx"],
                "concentricVelocity": round(r["vel"], 3),
                "romFrac": round(min(1.0, max(ROM_FLOOR, r["rom_rad"] / denom)), 3),
                "durationS": round(r["durationS"], 2),
            })
        events.append({"type": "set_end", "t": round(end, 2),
                       "exerciseId": s["appId"], "setIdx": sp})

    # --- real heart rate, subsampled to keep the stream event-sparse
    hr_path = os.path.join(ROOT, w, f"{w}_sw_l_hr.npy")
    hr_n = 0
    if os.path.exists(hr_path):
        hr = np.load(hr_path)
        last = -1e9
        end_t = max(e["t"] for e in events)
        for frame, _ms, bpm in hr:
            t = frame / FPS - t0
            if t < 0 or t > end_t + 10:
                continue
            if t - last < hr_every_s:
                continue
            last = t
            events.append({"type": "hr", "t": round(t, 2), "bpm": round(float(bpm), 1)})
            hr_n += 1

    events.sort(key=lambda e: e["t"])

    correct = sum(1 for s in sets if s["pred"] == s["true"])
    rep_err = np.array([s["reps"] - s["m"]["reps"] for s in sets])
    # Sets where the detector locked onto a harmonic of the true cadence and
    # came out roughly double or roughly half. Worth naming separately: it is a
    # different failure from being a rep or two off, and it is the one you can
    # see on the screen.
    octaves = int(np.sum((rep_err >= 4) | (rep_err <= -4)))
    mae = float(np.abs(rep_err).mean())
    exercises = sorted({s["appId"] for s in sets})
    return {
        "id": f"mmfit-{w}",
        "label": f"{w} · {len(sets)} sets · {max(e['t'] for e in events) / 60:.0f} min",
        "note": (
            f"MM-Fit workout {w}. Exercise labels are predictions from a model that "
            f"never saw this workout — {correct}/{len(sets)} correct. Reps are detected, "
            f"not counted: {mae:.1f} mean error, {octaves} of {len(sets)} sets an octave "
            f"out (every true set here is 10 reps). Set timing and heart rate are measured."
        ),
        "bodyMassKg": 78,
        "source": {
            "dataset": "MM-Fit (MIT), left-wrist smartwatch IMU @ ~100 Hz + HR @ 1 Hz",
            "workout": w,
            "heldOut": True,
            "setsEmitted": len(sets),
            "exercises": exercises,
            "exerciseAccuracy": round(correct / len(sets), 3),
            "repMAE": round(mae, 2),
            "repOctaveErrors": octaves,
            "hrEvents": hr_n,
            "measured": ["set boundaries", "set timing", "heart rate"],
            "detected": [f"rep count and rep timing (MAE {mae:.2f}, {octaves} octave errors)"],
            "derived": ["romFrac (wrist angular path, per-exercise normalised)",
                        "concentricVelocity (wrist speed, integrated accel)"],
            "invented": ["bodyMassKg", "calendar placement of history sessions"],
        },
        "events": events,
    }


def emit_bundle(pred_all, y, groups, meta, out_path):
    """
    Every usable workout, in one file: three to play and the rest as history.

    The history is what makes the panel's comparisons mean anything — "harder
    than your usual" needs a usual. It used to be generated, which made the live
    session real and the yardstick imaginary. Both ends are measured now.
    """
    usable = [w for w in WORKOUTS if w not in NO_HR]
    hist_ws = [w for w in usable if w not in PLAYABLE]

    playable, history, skipped = [], [], []
    for w in PLAYABLE:
        s = build_session(w, pred_all, y, meta)
        if s:
            playable.append(s)

    # Spread across the trailing month. MM-Fit's timestamps are the dates the
    # dataset was recorded, not a training log, so the calendar here is assigned
    # rather than measured — the one invented field in the whole file.
    # History heart rate is subsampled four times harder than the playable
    # sessions'. Nothing reads it per-beat — it only ever integrates to a
    # session kcal total, and a 20-second step changes that by well under the
    # +/-20% the Keytel estimate already carries. The playable sessions keep the
    # 5-second cadence because the panel shows a live bpm.
    n = len(hist_ws)
    for i, w in enumerate(hist_ws):
        s = build_session(w, pred_all, y, meta, hr_every_s=20.0)
        if not s:
            skipped.append(w)
            continue
        history.append({
            "daysAgo": 1 + round(i * 29 / max(1, n - 1)),
            "label": w,
            "workout": w,
            "events": s["events"],
        })

    total_sets = sum(s["source"]["setsEmitted"] for s in playable) + \
        sum(len({e["setIdx"] for e in h["events"] if e["type"] == "set_start"}) for h in history)
    bundle = {
        "dataset": "MM-Fit (MIT) — mmfit.github.io",
        "sensor": "left-wrist smartwatch, accel + gyro ~100 Hz, HR 1 Hz",
        "heldOut": True,
        "workoutsPlayable": PLAYABLE,
        "workoutsHistory": [h["workout"] for h in history],
        "workoutsExcluded": {w: "no wrist heart-rate stream" for w in NO_HR},
        "totalSets": total_sets,
        "playable": playable,
        "history": history,
    }
    with open(out_path, "w") as f:
        json.dump(bundle, f, separators=(",", ":"))

    ev = sum(len(s["events"]) for s in playable) + sum(len(h["events"]) for h in history)
    size = os.path.getsize(out_path) / 1024
    print(f"\nwrote {ev} events -> {out_path}  ({size:.0f} KB)")
    print(f"  playable: {', '.join(PLAYABLE)}")
    print(f"  history : {len(history)} workouts over 30 days")
    print(f"  excluded: {', '.join(NO_HR)} (no HR)")
    for s in playable:
        src = s["source"]
        print(f"    {src['workout']}: {src['setsEmitted']} sets · "
              f"acc {src['exerciseAccuracy']:.3f} · repMAE {src['repMAE']:.2f} · "
              f"{len(src['exercises'])} exercises")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emit", metavar="WORKOUT", help="dump a SessionEvent stream for one workout")
    ap.add_argument("--emit-all", action="store_true",
                    help="dump every usable workout: three playable, the rest as history")
    ap.add_argument("--out", default="/tmp/mmfit_session.json")
    ap.add_argument("--keep-cardio", action="store_true")
    args = ap.parse_args()

    print("loading + featurising ...", file=sys.stderr)
    X, y, groups, meta = build_dataset(drop_cardio=not args.keep_cardio)
    print(f"  {X.shape[0]} sets, {X.shape[1]} features, "
          f"{len(set(y))} classes, {len(set(groups))} workouts\n")

    clf = ExtraTreesClassifier(n_estimators=400, random_state=0, n_jobs=-1)

    # ---- leave-one-workout-out classification
    logo = LeaveOneGroupOut()
    pred = np.empty_like(y)
    for tr, te in logo.split(X, y, groups):
        clf.fit(X[tr], y[tr])
        pred[te] = clf.predict(X[te])

    acc_all = float((pred == y).mean())
    print("=" * 62)
    print(f"EXERCISE CLASSIFICATION  (leave-one-workout-out)")
    print("=" * 62)
    print(f"overall accuracy: {acc_all:.3f}\n")
    print(classification_report(y, pred, digits=3, zero_division=0))

    names = sorted(set(y))
    cm = confusion_matrix(y, pred, labels=names)
    print("confusion (rows = true):")
    w = max(len(n) for n in names)
    print(" " * (w + 2) + " ".join(f"{n[:6]:>6}" for n in names))
    for i, n in enumerate(names):
        print(f"{n:>{w}}  " + " ".join(f"{v:6d}" for v in cm[i]))

    # per-workout spread
    per_w = [(g, float((pred[groups == g] == y[groups == g]).mean()))
             for g in sorted(set(groups))]
    lo = min(per_w, key=lambda t: t[1])
    hi = max(per_w, key=lambda t: t[1])
    print(f"\nper-workout accuracy: worst {lo[0]} {lo[1]:.3f} · best {hi[0]} {hi[1]:.3f}")

    # ---- rep detection
    print("\n" + "=" * 62)
    print("REP DETECTION  (peak counting, no training)")
    print("=" * 62)
    errs, true_c, det_c = [], [], []
    for m in meta:
        n, _ = detect_reps(m["acc"], m["gyr"], m["dur"])
        errs.append(n - m["reps"])
        true_c.append(m["reps"])
        det_c.append(n)
    errs = np.array(errs)
    print(f"sets            : {len(errs)}")
    print(f"exact match     : {float((errs == 0).mean()):.3f}")
    print(f"within +/-1 rep : {float((np.abs(errs) <= 1).mean()):.3f}")
    print(f"within +/-2 reps: {float((np.abs(errs) <= 2).mean()):.3f}")
    print(f"MAE             : {float(np.abs(errs).mean()):.2f} reps")
    print(f"bias            : {float(errs.mean()):+.2f} reps (positive = over-count)")

    # ---- optional emit
    # `pred` above is already leave-one-workout-out: every label was produced by
    # a model fitted without the workout it labels. The emitters reuse it rather
    # than refitting, so there is no code path that can leak a workout into the
    # model that labels it.
    if args.emit_all:
        emit_bundle(pred, y, groups, meta, args.out)
    elif args.emit:
        s = build_session(args.emit, pred, y, meta)
        if s is None:
            print(f"no sets for {args.emit}", file=sys.stderr)
        else:
            with open(args.out, "w") as f:
                json.dump(s, f, indent=1)
            print(f"\nwrote {len(s['events'])} events -> {args.out}")


if __name__ == "__main__":
    main()
