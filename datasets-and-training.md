# Datasets & Training — matching Fort's sensor suite

Research · 2026-08-09 · companion to `fort-research.md`

**Fort's actual sensors:** 6-axis IMU (3-axis accel + 3-axis gyro) + PPG + temperature + magnetometer, wrist-worn, on-device ML, ~100–200 Hz plausible.

---

## 1. ⚠️ Read this first — your idea has been published

**"Rep Smarter, Not Harder: AI Hypertrophy Coaching with Wearable Sensors and Edge Neural Networks"** (arXiv 2512.11854) is, in substance, the prototype we've been designing. Wrist IMU → rep segmentation → proximity-to-failure classification → **haptic feedback on the watch.**

This is a **gift, not a blocker** — but you must know it exists, cite it, and differentiate. A candidate who finds the prior art and extends it reads far better than one who reinvents it badly and claims novelty.

### What they did

| | |
|---|---|
| Data | 13 participants (9M/4F, 18–25), **preacher curls only**, to momentary failure |
| Volume | **631 reps across 68 sets, ~40 minutes total** |
| Sensor | Adafruit **MPU-6050**, 6-axis, ~100 Hz, wrist |
| Labels | Manual end-of-rep annotations **with RiR ground truth** |
| Task | Two-stage: 1D conv ResNet segments reps → LSTM classifies "near-failure" (**RiR ≤ 2**) |
| Models | Segmentation 2.97 M params; classifier 5.29 M params (2.32 M trainable) |
| Results | Segmentation F1 **0.83** / 92.7% acc · Classification F1 **0.82** / **86.6%** acc |
| Preproc | Interpolate to exactly 100 Hz, 150 ms moving average, 256-sample (2.56 s) windows |
| Augmentation | Random time-stretch 1–1.5×, amplitude scale 0.6–1.4× |
| Split | 80/20 **at set level** (53 train / 15 val) |
| Edge | Pi 5: 20 MB model, 112 ms latency · iPhone 16: 23.5 ms · Watch collects → phone infers → watch buzzes |

Dataset availability is **not stated as public** — treat it as unavailable.

### The three numbers that should change your plan

**① 631 reps / 68 sets / ~40 minutes was enough for F1 0.82.** That is a *tiny* dataset. You can collect comparable volume yourself in two or three gym sessions. The bar for self-collection is far lower than it looks.

**② Their model is 20 MB and runs on a Pi or a phone — not on a wristband.** Fort's device is a sub-30 g band with a ~100 mAh battery and an MCU with on the order of 1 MB of flash. **This model physically cannot run on Fort's hardware.** Their pipeline is watch → phone → watch, which is precisely the round-trip Nover says they're engineering to avoid: *"we need to store and process data on the device to avoid sending too much over to the phone."*

**③ Their own limitations section is your project list:**
- *"Data collection focused solely on preacher curls"* — a single-joint isolation movement. Compound lifts unvalidated.
- Only 13 participants.
- **Binary classification only — no RiR regression.**
- *"Model size and LSTM computational cost suggest quantization opportunities."*
- Data collected via Pi, not the target watch — axis-orientation mismatch.

### Where that leaves you

The differentiated contribution is **not** "build a near-failure detector." It's:

> **Can near-failure detection fit on the wearable itself?**

Target ~100 KB and an MCU-class budget instead of 20 MB on a phone. That means a small temporal CNN or a GRU with quantization, not a 4-layer 256-hidden LSTM. If you get even *degraded* accuracy inside a real embedded budget, and you report the accuracy-vs-size curve honestly, that is a genuine result against a published baseline — and it lands exactly on Fort's stated constraint. Their paper hands you the baseline to beat and the metric to beat it on.

Secondary angles, in rough order of value: **compound movements** (their explicit gap), **RiR regression** instead of binary, and **cross-exercise generalization**.

---

## 2. The datasets, ranked by fit to Fort

| Dataset | IMU | PPG | Wrist | Exercise labels | Reps | Verdict |
|---|---|---|---|---|---|---|
| **[OpenWatch](https://arxiv.org/pdf/2605.04791)** | 6-axis @100 Hz | **✅** | ✅ | gestures, not exercises | ✗ | **Closest sensor match to Fort.** 50 participants, 78 sessions, Huawei Watch GT4. Wrong task, right modalities — use it to learn IMU+PPG fusion. |
| **[MM-Fit](https://dl.acm.org/doi/10.1145/3432701)** | smartwatch + phone + earbud | ✗ | ✅ | ✅ 10 exercises | **✅** | **Best exercise dataset.** Also ships RGB-D video with 2D/3D pose — free ground truth for ROM. Baselines: 96% multimodal, **94% smartwatch-only**. |
| **[MyoGym](https://dl.acm.org/doi/10.1145/3123024.3124400)** | 6-axis | ✗ (**8-ch EMG**) | forearm | ✅ **30 exercises** | 10 each | **The strategic one — see §3.** 10 subjects, Myo armband. |
| **[Kaggle Gym Workout IMU](https://www.kaggle.com/datasets/shakthisairam123/gym-workout-imu-dataset)** | Apple Watch @100 Hz | ✗ | ✅ | ✅ + **weight used** | ✅ | 164 sets. Labels include exercise, set, reps, **and load** — load matters for velocity work. |
| **[IEEE DataPort Gym Gesture](https://ieee-dataport.org/documents/gym-gesture-classification-using-imu-sensor-dataset)** | 6-axis @100 Hz | ✗ | ✅ | ✅ 5 exercises | 3×10 | Collected on an **Arduino Nano 33 BLE** — if that's your board, this is a drop-in reference. 750 movements. |
| **[PPG-DaLiA](https://archive.ics.uci.edu/dataset/495/ppg+dalia)** | 3-axis accel @32 Hz | **✅ @64 Hz** | ✅ | daily activities | ✗ | 15 subjects, ~36 h, **chest ECG as HR ground truth**. The canonical set for *HR estimation under motion artifact* — that's the PPG problem Fort actually has. |
| **[RecoFit](https://github.com/microsoft/Exercise-Recognition-from-Wearable-Sensors)** | accel+gyro @~50 Hz | ✗ | arm | ✅ | ✅ | 200+ participants, the classic. **MATLAB `.mat`**, and 50 Hz is marginal for velocity. |
| **[StrengthSense](https://arxiv.org/pdf/2511.02027)** | 10 body IMUs | ✗ | body | 11 strength-demanding ADLs | ✗ | Useful only for sensor-placement questions. |

**Also worth a look:** [Detection of Sets and Repetitions in Strength Exercises Using IMU-Based Wristband Wearables](https://link.springer.com/chapter/10.1007/978-3-031-48306-6_7) (Springer) and [LiftRight](https://www.sciencedirect.com/science/article/abs/pii/S235264832030009X) — both directly on-task.

### The gap, stated plainly

**No public dataset has wrist IMU + PPG + strength exercises + RiR labels together.** That combination is exactly Fort's sensor suite and exactly Fort's hardest metric. It doesn't exist publicly — which is precisely why Fort is hiring a Clinical Operations Lead to manufacture it in a lab.

---

## 3. MyoGym is strategically the most interesting

MyoGym pairs a **6-axis IMU with 8-channel EMG** across 30 gym exercises. Recall Fort's publicly stated open question (`fort-research.md` §7.7 ⑧): they are *"investigating whether motion tracking alone suffices, rather than requiring local muscle sensors."*

**MyoGym lets you run that experiment.** Train on IMU-only vs. IMU+EMG on the same subjects and movements, and quantify what EMG actually buys you. If motion alone gets close, that's evidence for Fort's central bet. If it doesn't, you've characterized the gap they'd need to close.

Either result is publishable-quality reasoning about **the company's own open research question, using public data, in a weekend.** I haven't seen a stronger candidate-differentiator in this entire research effort.

*(Caveat: MyoGym details — 10 subjects, 30 exercises, 10 reps each, magnetometer excluded — come from secondary sources. Verify against the paper and confirm the download works before committing.)*

---

## 4. Collect your own — and now you know the bar

**Yes, you should.** The Rep Smarter numbers prove ~40 minutes of well-labeled data is enough to train something that works.

**Protocol** (adapted from theirs, plus what `fort-research.md` §7.5 already recommended):

1. **4–6 movements**, not one. Their explicit gap is that they only did preacher curls. Cover compound + isolation, free weight + machine, upper + lower.
2. **Take sets genuinely to failure.** RiR labels are only anchored if the endpoint is real. This is the whole reason your data beats public data.
3. **Log per set:** exercise, load, reps completed, RiR at termination. Per rep if you can.
4. **Video with a visible clock** for annotation alignment — cheaper and more reliable than manual end-of-rep marking.
5. **Vary deliberately:** fresh vs. fatigued, fast vs. grinding tempo, both arms, deliberately sloppy reps.
6. **Second sensor on the bar** if you have two units — that gets you the wrist-vs-bar validation (§7.11) *and* velocity ground truth in the same sessions.
7. **Split at the set level, never the window level.** Rep Smarter did 80/20 by set. Window-level splits leak adjacent samples across the split and will give you a beautiful, meaningless score.

**Publish it.** A small, honestly-labeled, RiR-annotated wrist dataset covering multiple movements would be a *better public artifact than any dataset listed in §2*, because nothing there has RiR labels across exercises. That's a real contribution, not a portfolio exercise.

---

## 5. Suggested training plan

**Phase 0 — reproduce.** Rep segmentation on MM-Fit or the Kaggle set. Gets the pipeline working against a known baseline before anything novel.

**Phase 1 — collect.** Your own sets, per §4. Two or three sessions.

**Phase 2 — the contribution.** Near-failure detection **inside an embedded budget**. Report the accuracy-vs-model-size curve against Rep Smarter's 20 MB / F1 0.82 baseline. State flash, RAM, and latency at each point.

**Phase 3 — if time permits.** The MyoGym IMU-vs-EMG experiment (§3), or PPG under motion using PPG-DaLiA — the latter matters because Fort's recovery metrics all depend on HR that survives a moving wrist.

**Traps to avoid**
- **Window-level train/test splits.** Split by set, or by subject if you can.
- **Reporting accuracy on a balanced set** when near-failure reps are a small minority. Report precision/recall/F1.
- **Claiming technique assessment.** You can see ROM, tempo, and velocity. You cannot see knee valgus (`fort-research.md`, and §"what velocity loss measures").
- **Ignoring axis orientation.** Rep Smarter flagged this as a real problem — a wrist rotates, and your training and deployment frames must match.

---

### Changelog

- **Pass 1 (2026-08-09):** Created. Found and analyzed "Rep Smarter, Not Harder" as direct prior art with a published baseline (F1 0.82, 20 MB, phone-side inference) and identified the differentiated angle: **fit it on the wearable**. Ranked eight datasets by fit to Fort's IMU+PPG suite. Flagged MyoGym as the way to test Fort's own open IMU-vs-EMG question. Self-collection protocol updated with the set-level-split warning and the finding that ~40 min of labeled data suffices.
