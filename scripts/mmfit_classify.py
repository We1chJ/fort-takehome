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

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--emit", metavar="WORKOUT", help="dump predictions for one workout")
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
    if args.emit:
        clf.fit(X[groups != args.emit], y[groups != args.emit])
        out = []
        for i, m in enumerate(meta):
            if m["w"] != args.emit:
                continue
            p = clf.predict(X[i:i + 1])[0]
            n, times = detect_reps(m["acc"], m["gyr"], m["dur"])
            out.append({
                "startS": round(m["f0"] / FPS, 2),
                "endS": round(m["f1"] / FPS, 2),
                "predictedExercise": p,
                "trueExercise": y[i],
                "detectedReps": n,
                "trueReps": m["reps"],
                "repTimesS": [round(m["f0"] / FPS + t, 2) for t in times],
            })
        path = f"/tmp/{args.emit}_predictions.json"
        with open(path, "w") as f:
            json.dump(out, f, indent=2)
        print(f"\nwrote {len(out)} sets -> {path}")


if __name__ == "__main__":
    main()
