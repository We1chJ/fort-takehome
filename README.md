# Fort take-home — working notes

Research, prototype and model work for the Fort submission.

| File | What it is |
|---|---|
| `fort-research.md` | Company dossier — product, founders, public quotes, prototype options, ranked |
| `datasets-and-training.md` | Public dataset survey against Fort's sensor suite, plus prior art |
| `narrative-layer.md` | Design + architecture for the interpretation layer |
| `q1-data-project.md`, `q3-motivation.md` | Application answers |
| `idea.md` | Loose notes |
| `fort-live/` | **Between Sets** — the prototype panel (Vite + React + TS) |
| `scripts/mmfit_classify.py` | Exercise classifier + rep detector trained on MM-Fit |
| `mm-fit/` | The unzipped MM-Fit dataset (1.6 GB, not committed) |

---

## Exercise classification from wrist IMU

`scripts/mmfit_classify.py`. Trained and validated in one session against
[MM-Fit](https://mmfit.github.io/).

```bash
python3 scripts/mmfit_classify.py             # train + full report
# hold one workout out, label it, and write the result as a SessionEvent stream
# that fort-live plays exactly like an authored scenario:
python3 scripts/mmfit_classify.py --emit w14 --out fort-live/src/data/mmfit-session.json
```

The `--emit` path is what connects the two halves of this repo. It fits the model on the
other twenty workouts, predicts this one, detects its reps, derives per-rep kinematics,
attaches the real heart-rate trace, and writes the whole thing in `fort-live`'s
`SessionEvent` schema. The panel then has no idea it is not synthetic — which was the
point of writing that schema down first. Pick it in the prototype as **MM-Fit w14 (real)**.

### Approach

**No pretrained model, no neural network.** Feature engineering plus an ensemble of
randomized decision trees. The whole thing fits in ~2 seconds on a laptop CPU.

**Input.** Left-wrist accelerometer + gyroscope only (~103 Hz), sliced to each labelled
set. Set boundaries are treated as given — that is `fort-live`'s stated contract, since
Fort segments sets on-device. Right wrist, earbud, phone and pose streams are unused.

**Features — 127 per set.** Eight channels (accel xyz, gyro xyz, accel magnitude, gyro
magnitude), each reduced to 15 features:

- *time domain* — mean, std, min, max, median, IQR, RMS, skew, kurtosis
- *dynamics* — mean absolute jerk, jerk std, zero-crossing rate
- *spectral* — dominant frequency in the 0.15–3.5 Hz rep band, that peak's share of total
  power, spectral centroid

Plus inter-axis correlations for the accel and gyro triads (6) and set duration (1).
Magnitudes are used so wrist orientation doesn't dominate.

**Model.** `ExtraTreesClassifier`, 400 trees, scikit-learn. No gradient descent, no epochs,
no GPU.

**Rep count is never a feature** — it is a prediction target for the rep detector.

### Validation

Two splits, both stricter than a random split.

**Leave-one-workout-out**, 21 folds — no set from a held-out workout appears in training:

```
mean fold acc 0.980   std 0.048   min 0.833   max 1.000
pooled        0.980   (559 predictions)
```

**MM-Fit's own published split** (train on 10 workouts / 271 sets only):

| Split | Workouts | Sets | Accuracy |
|---|---|---|---|
| val | 14, 15, 19 | 80 | 0.975 |
| test | 09, 10, 11 | 81 | **1.000** |
| unseen test | 00, 05, 12, 13, 20 | 127 | 0.976 |
| test + unseen | — | 208 | **0.986** |

Nine classes (jumping jacks excluded — no row in the app's exercise ontology and no
matching movement pattern), 559 sets, classes balanced at 56–65 sets each.

### Results

| Exercise | Recall |
|---|---|
| squats | **0.875** |
| lunges | 0.984 |
| dumbbell rows | 0.984 |
| sit-ups | 0.985 |
| push-ups, lateral raises, shoulder press, bicep curls, tricep extensions | 1.000 |

Eleven errors in 559. Eight are the same confusion.

---

## The two findings that matter more than the accuracy

### ① The wrist blind spot, reproduced

**Eight of eleven errors are squats predicted as sitting lateral raises.** MM-Fit's own
exercise descriptions explain it:

> **Squats** — *"The body is lowered at the hips from a standing position... **Hands are
> pushed in front for balancing.**"*
>
> **Sitting dumbbell lateral raises** — *"Slowly lifting the weights out to the side until
> the arms are parallel with the floor."*

At the wrist these are close to the same movement: a slow, symmetric arm elevation to
roughly horizontal at similar cadence. The legs do the squat, and the legs are invisible.

This is the blind spot named in `fort-research.md` §7.7 ⑩, arrived at from measurement
rather than quotation — and in a sharper form than the usual leg-press example: the squat,
the most fundamental lower-body pattern, is misread as a shoulder isolation 12.5% of the
time. The eight sets are enumerated in the script's output.

The lunge ↔ dumbbell-row pair (one error each way) has the same root — MM-Fit lunges are
bodyweight with a bent-forward torso, and standing rows are *"slightly bent knees, hips
pushed back"*. Similar torso pitch, similar arm swing.

### ② MM-Fit cannot validate rep counting

**91.9% of its 616 sets contain exactly ten reps.** The protocol was 3 sets × 10 reps.

```
 10 reps : 566 sets (91.9%)     9 reps : 12    12 reps : 5
 11 reps :  25 sets ( 4.1%)     other  :  8
```

So the trivial baseline — ignore the sensor, always answer "10" — scores **91.9% exact,
97.9% within ±1, MAE 0.14 reps**. The DSP detector below scores 48.8% / 73.2% / 1.88.

**A constant beats the detector by an order of magnitude.** There is no rep-count variance
to predict, so any rep-counting claim from this dataset is unfalsifiable, and training a
learned rep counter here would only teach it to output 10. This was found by checking the
label distribution before trusting the error metric.

It is also the strongest available argument for self-collection: sets taken genuinely to
failure produce 12, then 9, then 7. That variance is exactly what MM-Fit lacks.

---

## Rep detection — deterministic, and unvalidated

No machine learning. Pure signal processing, in `detect_reps()`:

1. Vector magnitude of gyro and accel, so orientation doesn't matter.
2. 3rd-order Butterworth bandpass, 0.2–2.0 Hz — the plausible rep cadence band.
3. **Autocorrelation** to find the dominant repetition period; the channel with the
   stronger self-similarity at its own period wins.
4. Peak-find with that period enforced as minimum spacing; reconcile against
   `duration / period`.

Counting peaks directly first gave **MAE 6.26 reps, bias +4.9** — it fired on
sub-movements within each rep (descent, pause, lockout). Autocorrelation finds the
repeating structure rather than individual bumps and dropped this to **MAE 1.88, bias
+0.12** — which, per finding ② above, is still far worse than a constant.

MM-Fit ships **no per-rep timestamps at all**, so rep *timing* — the field `fort-live`'s
`RepEvent.t` actually needs — has no ground truth here under any method. Video annotation
or self-capture is the only way to check it.

A defence of the DSP choice for Fort specifically: a bandpass plus an autocorrelation is a
few hundred bytes of code running in microseconds on an MCU, against a model needing flash
and inference time. For a device with a ~1 MB budget that is a reasonable engineering
answer — provided it is labelled untested, which on this dataset it is.

---

## MM-Fit's own baseline, for comparison

**Their approach** — a three-stage multimodal deep model:

1. A separate autoencoder per device and modality, learning modality-specific
   representations.
2. Those representations flattened and concatenated into a fully-connected multimodal
   autoencoder, learning a shared cross-modal representation.
3. A fully-connected classifier attached to that shared representation.

**Their reported accuracy on unseen subjects:** 94% smartwatch-only, 85% smartphone-only,
82% earbud. *(A ~96% multimodal figure appears in my earlier research pass but was not
re-verified this session — treat it as unconfirmed.)*

**These numbers are not directly comparable to the 98% above, and the difference favours
them.** They perform continuous activity segmentation *and* recognition over an unbroken
stream and evaluate on unseen subjects. This work is handed set boundaries and classifies
a pre-segmented window, split by workout rather than by subject. **Set segmentation — the
harder half — is assumed, not solved.**

### The subject-leakage caveat

MM-Fit's 21 workouts come from 10 subjects, and the files carry no subject ID. In most
folds the same person appears in train and test, so the model may be partly recognizing an
individual's movement signature. The honest claim is **98% within-cohort, per-subject
generalization unmeasured** — not "98% accuracy" flat. All eleven errors fall in w16, w17,
w19 and w20, a clustering consistent with one subject whose form or watch orientation
differs.

---

## Datasets surveyed

Full ranking and rationale in [`datasets-and-training.md`](./datasets-and-training.md).
The gap that matters: **no public dataset pairs wrist IMU + PPG with strength training and
honest reps-in-reserve labels.**

### Used here

| Dataset | Sensors | Why |
|---|---|---|
| [MM-Fit](https://mmfit.github.io/) · [code](https://github.com/KDMStromback/mm-fit) · [paper](https://dl.acm.org/doi/10.1145/3432701) | wrist accel+gyro+mag ~103 Hz (both wrists), HR ~1 Hz, earbud, phone, RGB-D, 2D/3D pose | The only public set with strength exercises, 6-axis wrist IMU, a cardiac channel and set boundaries in one continuous recording. MIT. |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | — | 873 exercises with primary/secondary muscles, force, mechanic. Public domain. Powers the app's muscle map. |

**MM-Fit inventory, verified locally:** wrist accel + gyro 21/21 workouts · left-wrist HR
**18/21** (missing w05, w10, w18) · both wrists 14/21 · 3D pose 21/21 · 616 labelled sets ·
10 exercises · time base is `[frame_idx@30Hz, unix_ms, …]` with labels as
`start,end,reps,exercise`.

### Both IMU (accel + gyro) *and* PPG — the rare combination

Most wearable-physiology datasets use the Empatica E4, which **has no gyroscope**. That one
hardware fact eliminates most apparent matches.

| Dataset | IMU | Cardiac | Subjects | Task |
|---|---|---|---|---|
| [OpenWatch](https://arxiv.org/abs/2605.04791) | 6-axis @100 Hz | raw PPG | 50 | hand gestures |
| [Wrist PPG During Exercise](https://physionet.org/content/wrist/1.0.0/) | accel + gyro @256 Hz | PPG + chest ECG | 8 | walk / run / bike |
| [Pulse Transit Time PPG](https://physionet.org/content/pulse-transit-time-ppg/1.1.0/) | accel + gyro @500 Hz | 6× PPG @1 kHz + ECG | 22 | sit / walk / run |
| [Shoulder fatigue](https://pmc.ncbi.nlm.nih.gov/articles/PMC11055894/) · [data](https://zenodo.org/record/8415066) | 6× Xsens @100 Hz | PPG @200 Hz (finger) + EMG | 34 | **sets to failure, Borg every 10 s** |
| [PPG-Sport](https://github.com/LaserHu/PPG-Sport) | IMU @64 Hz *(composition unverified)* | PPG + ECG | 30, both wrists | 6 sports |

Accel-only, therefore excluded: [PPG-DaLiA](https://archive.ics.uci.edu/dataset/495/ppg+dalia),
[WildPPG](https://arxiv.org/pdf/2412.17540), [HEART-Watch](https://arxiv.org/pdf/2512.03988),
IEEE SPC 2015, and all other E4-based sets.

Gyro but no cardiac channel: [Kaggle Gym Workout IMU](https://www.kaggle.com/datasets/shakthisairam123/gym-workout-imu-dataset)
— Apple Watch SE, left wrist, 100 Hz, 164 sets, with `weight`/`set`/`reps` labels. One file
per set, cropped, so rest periods are absent.

### Recovery physiology

[Wearable Device Dataset from Induced Stress and Structured Exercise](https://physionet.org/content/wearable-device-dataset/1.0.1/)
— 31 subjects, Empatica E4 (BVP 64 Hz, accel 32 Hz), Wingate protocol: 3-min baseline →
30-s maximal sprint → 4-min recovery, ×3, button-marked. Wrong movement, right structure:
maximal effort, fixed rest, repeated. The best available reference for what an inter-set
recovery curve should look like.

### Prior art

**["Rep Smarter, Not Harder"](https://arxiv.org/abs/2512.11854)** — wrist IMU → rep
segmentation → proximity-to-failure. 13 participants, preacher curls only, 631 reps.
Segmentation F1 0.83, classification F1 0.82. **20 MB model, inference on a phone, not the
band.** The differentiated angle is fitting this inside an MCU budget; see
`datasets-and-training.md` §1.

---

## Reproducing

```bash
# dataset (1.6 GB)
curl -O https://s3.eu-west-2.amazonaws.com/vradu.uk/mm-fit.zip && unzip mm-fit.zip

python3 -m pip install scikit-learn scipy numpy
python3 scripts/mmfit_classify.py
```

Runs in about 20 seconds, including all 21 validation folds.

## What is not claimed

- **Set segmentation** — assumed given, not solved. The harder half of the problem.
- **Rep counting** — implemented, unvalidatable on this dataset.
- **Rep timing** — no ground truth exists in MM-Fit.
- **Velocity, ROM, reps-in-reserve** — not derived; MM-Fit ships none of them, and
  `fort-live` suppresses these channels rather than displaying invented values.
- **Per-subject generalization** — unmeasured, no subject IDs available.
