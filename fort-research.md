# Fort — Research Dossier & Prototype Options

Research passes 1–7 · 2026-08-09 · sources listed at bottom

---

## ⚡ Start here — the decision summary

Seven passes revised the prototype ranking in four different places (§6, §7.6, §7.7, §7.11). This is where it landed. Everything below is the working record; **this block is the conclusion.**

> **See also `narrative-layer.md`** — the interpretation-layer direction developed in full, after you flagged it as the part of Fort's mission you care about. It's the strongest alternative to the validation build below, needs no hardware, and has its own documented competitor failure case (Strava) to design against.

### Build this

**A wrist-vs-bar velocity validation, with the blind-spot feature falling out of it.**

An independent reviewer has publicly noted that Fort "has published no accuracy data and has not shown how its speed estimates compare against a barbell-mounted reference device" (§7.11). That is a named credibility gap at a company whose CEO says *"accuracy… is more important than something aesthetically pleasing."* You can close it this week with two cheap sensors and your own labeled sets (§7.5) — and Fort can't easily publish it themselves pre-launch.

Report agreement per rep, and where it breaks: heavy vs. light, fast vs. grinding, machine vs. free weight, fresh vs. fatigued. **A negative result is still a contribution.** State what would falsify it.

Then let the product feature emerge from the measurement: where wrist and bar disagree most is the **blind spot** (§7.7), and a system that detects "you're doing loaded work I can't see" — instead of silently logging nothing — is the unclaimed product problem.

### Four constraints that should visibly shape it

1. **Calm, not graded.** *"Clear, calm, useful… not clinical, crowded, or gamified in a cheap way"* (§7.10). **⚠️ Corrected pass 9:** earlier drafts of this line said "no scores" — that was my inference and it's **wrong**. Fort's FAQ lists **"session scores"** and **"recovery scoring"** among its own metrics. The real constraint is the *reference frame*: compare the user to their own history, not to a target or population norm. *"Strongest set of your last five"* is fine; *"62% of goal"* is what feels graded.
2. **Pick a cadence and defend it.** They call Fort *"part new ritual."* Post-set / post-session / morning / weekly are four different products on the same model (§7.10 ⑬). Naming your choice shows more judgment than model tuning.
3. **State a compute and bandwidth budget.** The CEO: *"we need to store and process data on the device to avoid sending too much over to the phone"* (§7.7 ⑫).
4. **Say what you deleted.** The take-home's "first-principles" phrasing points at a method whose whole point is deleting before optimizing (§7.9). An explicit *deleted scope* section speaks their language.

### Three things to say in the write-up

- **"Novel sensing is not the path forward"** is the CEO's own framing — the moat is interpretation, not hardware (§7.6). Build accordingly.
- **Their ontology is movement patterns, not muscles** — squat/hinge/lunge/push/pull/carry/core (§7.7 ⑪). *"You haven't hinged in three weeks"* beats *"rear delts under MEV."*
- **The market reads them as a serious-lifter product; the founder says "active, but not obsessive"** (§7.11 ⑯). Serving the non-obsessive user is on-message with her, against the press narrative — and almost nobody will notice the gap.

### Two things NOT to do

- **Don't cite the StartupHub.ai "teardown."** It's AI speculation — invented part numbers, invented architecture (§7.8). Citing it means telling three ex-Tesla engineers what's inside their own device, wrongly.
- **Don't cite a ship date.** Sources conflict badly; the site now says Q2 2027, slipped from 2026.

### Known-good facts to rely on

Screenless, sub-30 g aluminum, IMU + PPG + temp + magnetometer, 7-day battery, BLE, iOS + Android, $309–349 + $80/yr, magnet-mounts to bars/dumbbells/cable handles, 50+ exercises, on-device ML, three ex-Tesla founders, YC W26, team of 3–4, ships Q2 2027. "Form" is operationalized as **range of motion + velocity loss** — not pose estimation (§7.7 ⑨).

---

## 1. What Fort is

**One-liner (their words, from YC):** "A wearable that tracks strength training for people who care about longevity."

**Homepage positioning:** "The Strength Wearable." "Fitness is more than steps and sleep scores." "Fort is made for the work most wearables miss."

Fort is a screenless, wrist-worn IMU + PPG sensor puck that automatically detects strength training — exercises, reps, sets, rest — with no manual logging, and places that strength load in the context of sleep, cardio, stress, and recovery.

| | |
|---|---|
| Founded | 2025, San Francisco |
| YC batch | Winter 2026 |
| Team size | 4 |
| Price | $289 pre-order / $309–$349 retail, includes 1 year of premium software |
| Ship date | Stated as June 2026 in the YC launch; site FAQ now says Signature Edition ships **Q2 2027** — treat the hardware as *not yet in customers' hands* |
| Investors | Afore Capital, Carnegie Mellon, Weekend Fund, Theory Forge, Banana Capital, + angels from OpenAI and Tesla |
| Contact | founders@fort.cx |

### Founders — all ex-Tesla hardware

- **Miranda Nover** — Founder & CEO. Product Design Engineer at Tesla; 4680 battery cells for Cybertruck, prototype → launch. MechE, Carnegie Mellon.
- **Paul Schneider** — Co-founder & CTO. mmWave radar and electrical fire detection at Tesla; systems design and autonomy architecture for Semi and Robotaxi.
- **Zac Valles** — Founder & CPO. Senior Engineer at Tesla, body + powertrain subsystems for Cybercab and Cybertruck. Previously propulsion and Starlink at SpaceX.

> "Built by a team of Tesla engineers who love strength training."

**This matters for the take-home.** This is a hardware-systems team. Their instincts are sensors, signal chains, power budgets, and manufacturing tolerance — not web dashboards. Public job listings are Founding Designer, Growth Marketing Lead, Social Content, and a SWE intern. **There is no publicly advertised ML/signal-processing or data role.** The gap between "IMU voltage" and "a sentence that changes what you do today" is the least-staffed part of the company.

---

## 2. Mission

Fort has no formal mission statement on the site. It's implied consistently across surfaces, and it's narrower than "fitness tracking":

> **Make strength a first-class, automatically-measured health metric — the way steps and sleep already are — because muscle mass and strength are longevity predictors.**

The YC copy is explicit about the longevity framing: the screenless device "targets the longevity community, aligning with research linking muscle mass and strength to reduced all-cause mortality."

The "why now" is a real market observation, not a vibe: per their launch post, Whoop reported **strength workouts up 122% YoY (2024→2025)**, and strength training is the **third most popular activity among female Oura users** — while both devices remain functionally blind to it. Strength is the fastest-growing activity on platforms that can't measure it.

---

## 3. Product

### Hardware
- Screenless motion + heart-rate module. **IMU (accelerometer + gyroscope) + PPG**, plus **temperature**.
- Magnetically detaches from the wristband and re-attaches to **weights or body straps** — so the sensor can move to where the movement actually is.
- **7-day battery**, Bluetooth LE, interchangeable bands, iOS + Android app.
- "Screen-free by design, with no notifications, no distractions." "Like jewelry, not performance gear."

### Metrics they claim
**Strength:** session scores, **per-muscle volume breakdowns**, **proximity to failure**, **time under tension**, **rep velocity**, rest times, rep cadence. Auto-detection of **50+ exercises**. Feedback on power, form, and muscle recruitment.

**Everything else:** heart rate zones, VO2 max, sleep stages, recovery scoring, HRV, activity, stress. Cycle tracking "coming soon." Bloodwork/biomarker integration is on the roadmap per Fitt Insider.

### Software
- **Fort Foundations** — "Expert-led training system for getting stronger without overcomplicating your routine," built around "core movement patterns your body needs."
- Class-aware insight (strength classes, Pilates, sculpt).
- Explicit pitch: "quantifies programming effectiveness while preventing overtraining, linking muscular load to recovery."

---

## 4. Values (inferred from the artifacts, since they aren't listed)

1. **Automatic over manual.** Logging is the enemy. Every competitor's strength feature is a form; Fort's whole reason to exist is deleting it.
2. **Restraint as a feature.** No screen, no notifications, no distractions. They're selling *less* interface, deliberately.
3. **Design/jewelry-first.** "Like jewelry, not performance gear." Wearability all day is a hard product constraint, not a nice-to-have. Hiring a Founding Designer at $150–260K supports this.
4. **Context over isolated numbers.** Strength only means something next to sleep, stress, and cardio. The interconnection *is* the pitch.
5. **Longevity, not aesthetics.** Positioned toward healthspan, not gym-bro PRs. This changes who the user is and what a "good week" means.
6. **Hardware rigor.** Tesla/SpaceX pedigree is used as a trust signal — they expect things to actually work, and they'll be able to tell if your model is hand-waved.

---

## 5. Unique insights from the research

These are the non-obvious things I'd put in the write-up.

**① The prompt's wording is the brief.** "Build a **relationship** with the data" — not *insights*, not *dashboard*, not *analytics*. Combine that with a device that has **no screen and no notifications**, and the design constraint becomes clear: **Fort's product philosophy is anti-dashboard.** A beautiful chart-heavy web app is the single most predictable submission and it quietly contradicts their values. The strongest prototype *reduces* the number of times a user looks at their phone while still increasing what they know.

**② Their hardest claim is "proximity to failure," and it's the one with real scientific footing.** Estimating **reps-in-reserve (RIR)** from within-set **concentric velocity decay** is a well-established idea in velocity-based training — velocity-loss thresholds are used as autoregulation cutoffs in the strength literature. A wrist IMU can estimate concentric velocity per rep. This is the metric that separates Fort from a step counter, it is genuinely hard, and it is demonstrable on open data. *(Flagging uncertainty: I'm confident velocity-loss-based autoregulation is well studied; I have not verified the specific accuracy achievable from a wrist-worn — as opposed to bar-mounted — sensor. That gap is itself an interesting thing to characterize in a prototype.)*

**③ "Per-muscle volume breakdown" is secretly a knowledge-graph problem, and it's fully solvable with open data.** Detected exercise → muscle recruitment vector → weekly volume per muscle group. Open exercise databases (free-exercise-db, wger) already ship primary/secondary muscle mappings for hundreds of movements. Layer hypertrophy volume landmarks (MEV/MAV/MRV) on top and you get findings no other wearable can produce: *"your rear delts have been under minimum effective volume for five weeks."* Fort promises this metric; nothing public shows they've built the mapping layer.

**④ The real moat is a two-channel load model, and nobody has built it.** Whoop and Oura model **one** fatigue channel — cardiovascular strain — and decay it globally. Muscular fatigue is *local* (your legs can be wrecked while your press is fresh) and decays on a different, slower timescale. Fort is the first device positioned to measure the muscular channel directly. A **per-muscle-group fitness–fatigue model** (impulse–response, Banister-style, one instance per muscle group, fed by detected volume/load and modulated by HRV and sleep) is the thing their pitch implies but their marketing hasn't yet described. **That's the system I'd want to own.**

**⑤ They have a cold-start problem and no user data yet.** Hardware isn't in hands. Every insight feature has to be credible on a user's *first week*, and every model has to be developed and evaluated before real longitudinal data exists. Anything that makes model development possible pre-hardware — public-dataset benchmarks, a synthetic-history simulator — is immediately, unglamorously useful to them.

**⑥ Their sensor can move — and that's an unexploited product primitive.** The module magnetically detaches to weights or straps. That means the *same device* sees a movement from the wrist, from the barbell, or from the ankle. Nothing in their marketing uses this. A "clip it to the bar for one set to calibrate your wrist model" flow is a hardware-native idea a software-only competitor structurally cannot copy.

**⑦ Power budget is part of the design, not an afterthought.** 7-day battery + BLE + continuous IMU means inference is either a tiny on-device model or a batched phone-side pass. To a team that shipped 4680 cells and vehicle subsystems, a candidate who states a **compute and energy budget** for their model will read very differently from one who doesn't. Cheap to include; disproportionately credible.

---

## 6. Prototype options

Ranked by how much I'd want to own them and how well they demo. All are buildable from public data.

### A. **Velocity-Based Autoregulation — "the last good rep"** ⭐ strongest single feature
Estimate per-rep concentric velocity from wrist IMU, detect velocity decay across a set, infer RIR, and call set termination.
- **Demo:** scrub a recorded set; velocity-per-rep curve draws live; predicted RIR annotates each rep; a marker fires at the velocity-loss threshold.
- **Data:** RecoFit (Microsoft, 200+ participants, accel+gyro, gym exercises), Kaggle Gym Workout IMU (Apple Watch, 100 Hz, 164 sets).
- **Why it wins:** it's Fort's hardest promised metric, it's scientifically grounded, and it's the one thing a phone app cannot fake.
- **Risk:** wrist-mounted velocity is noisier than bar-mounted. Characterize the error honestly — that *is* the contribution.

### B. **The Muscle Ledger — per-muscle weekly volume vs. landmarks**
Exercise recognition → muscle recruitment vector → rolling weekly set counts per muscle vs. MEV/MAV/MRV, surfacing chronic under- and over-training.
- **Data:** free-exercise-db / wger (open exercise DBs with primary/secondary muscle mappings) + any of the IMU datasets for the recognition front-end.
- **Why:** delivers a promised Fort metric end-to-end, and produces insights that are legitimately impossible on Whoop/Oura.
- **Risk:** lowest technical risk of the set; also the least novel-looking.

### C. **Two-Channel Readiness — per-muscle-group fitness–fatigue model** ⭐ the system I'd most want to own
Run an impulse–response fitness–fatigue model **per muscle group**, fed by detected volume/load, modulated by HRV/sleep/stress. Output is not a dashboard: it's one sentence a day. *"Legs 61%, push 94%, pull 88% — today is an upper day."*
- **Data:** synthetic training histories + open IMU sets for the load front-end; public HRV/sleep datasets for the recovery channel.
- **Why:** it's the literal thesis of the company ("linking muscular load to recovery"), it's the part of the stack that doesn't exist yet, and its output form matches their screen-free values.
- **Risk:** unvalidatable without real longitudinal data. Frame it as a model + simulator, not a truth claim.

### D. **The Screen-Free Interaction Language** — highest-variance, most differentiated
The device has no screen. So design and prototype the **haptic/ambient vocabulary**: a specific buzz pattern at the velocity-loss threshold meaning *"that was your last good rep."* Another for rest-period end, tuned to the set you just did rather than a fixed timer.
- **Demo:** browser + phone, Web Vibration/audio, driven by replayed IMU data.
- **Why:** every other candidate will build a screen for a screenless product. This one takes their constraint seriously and is memorable on a portfolio.
- **Risk:** harder to make legible in a static write-up; needs video.

### E. **Cold-Start Simulator** — least sexy, most obviously useful to them
Generate months of plausible, individually-varied training histories (plateaus, deloads, missed weeks, illness) to exercise insight engines before hardware ships.
- **Why:** directly attacks insight ⑤. Reads as "I understand what a pre-launch hardware company actually needs."
- **Risk:** it's infrastructure. Won't wow on a portfolio alone.

### My recommendation

**A → C → D as one coherent demo.** A is the input signal, C is the model, D is the output surface. Together they read as *"here is Fort's software spine, end to end"* rather than a feature. If scope has to shrink, **A alone** is the highest ratio of impressiveness to effort; **B alone** is the safest.

---

## 7. Open datasets & repos identified

| Resource | What it gives you |
|---|---|
| [RecoFit — microsoft/Exercise-Recognition-from-Wearable-Sensors](https://github.com/microsoft/Exercise-Recognition-from-Wearable-Sensors) | Accel + gyro from 200+ participants doing gym exercises. The canonical rep-counting/recognition dataset. **Verified pass 8: ships as two MATLAB `.mat` files** (`exercise_data.50.0000_multionly.mat`, `..._singleonly.mat`) plus a `load_exercise_data.m` walkthrough — **not CSV**. Load via `scipy.io.loadmat`, or `h5py` if they're MATLAB v7.3. The `50.0000` in the filename **suggests 50 Hz** *(inferred from the filename, not confirmed in the README)*. If so, that's marginal for concentric-velocity work — you integrate acceleration over a ~1 s rep, and 50 Hz gives you ~50 samples with drift. **Use RecoFit for exercise recognition and rep segmentation; use your own higher-rate capture for the velocity validation.** Paper: Morris et al., CHI 2014. |
| [Gym Workout IMU Dataset (Kaggle)](https://www.kaggle.com/datasets/shakthisairam123/gym-workout-imu-dataset) | Apple Watch SE, 100 Hz, 164 real sets — wrist-worn, matching Fort's form factor. |
| [Gym Gesture Classification IMU Dataset (IEEE DataPort)](https://ieee-dataport.org/documents/gym-gesture-classification-using-imu-sensor-dataset) | Arduino Nano 33 BLE, wrist, 100 Hz, 5 exercises × 3 sets × 10 reps, 750 movements. |
| [StrengthSense](https://arxiv.org/pdf/2511.02027) | 11 strength-demanding activities, 29 subjects, 10 body-worn IMUs. Useful for sensor-placement questions (insight ⑥). |
| [Awesome-IMU-Sensing](https://github.com/rh20624/Awesome-IMU-Sensing) | Index of further HAR datasets, papers, and baselines. |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | **Verified pass 3: Unlicense (public domain), 800+ exercises.** Each record has `primaryMuscles`, `secondaryMuscles`, `force` (push/pull), `mechanic` (isolation/compound), `equipment`, `level`, `instructions`, and images. JSON, individual files + combined `dist/exercises.json`. This fully unblocks option B — no license risk, and `force`/`mechanic` map cleanly onto Fort's own movement-pattern taxonomy. |

---

## 7.5 Hardware path — collect your own wrist data

**This is the single biggest upgrade available to this submission.** Fort's founders are hardware engineers. A candidate who strapped a real IMU to their own wrist, collected their own sets, and showed a model working on that data is operating in their native language. Public datasets show you can use `pandas`; your own strapped-on sensor shows you can close a sensing loop — which is literally what Fort does.

It also unlocks something no public dataset gives you: **ground truth you actually control.** You know the exact weight, the exact RIR, whether you failed. That's what makes insight ② (proximity to failure) demonstrable instead of hand-waved — public datasets don't label RIR.

### Options, cheapest effort first

| Path | What you need | Fidelity vs. Fort | Effort |
|---|---|---|---|
| **Phone in a wristband/armband** | Just your phone + Sensor Logger (iOS/Android), 100 Hz accel+gyro, CSV export | Wrong mass and mounting, right signal class. Fine for rep detection, marginal for velocity | ~0 |
| **Apple Watch / Wear OS** | Watch + Sensor Logger; this is exactly how the Kaggle gym IMU dataset was made | Closest consumer analog to Fort's form factor | Low |
| **M5StickC Plus2** | ~$25, ESP32 + 6-axis IMU + battery + case, wrist-strappable out of the box | Real embedded target; you own the sample rate and the power story | Low–medium |
| **Arduino Nano 33 BLE Sense** | ~$45, 9-axis IMU, BLE, runs TensorFlow Lite Micro | The IEEE DataPort gym dataset used exactly this on the wrist. Best match to Fort's actual stack | Medium |
| **ESP32 + MPU6050/ICM-42688** | ~$15 in parts, needs wiring and a strap | Most control, most yak-shaving | Medium–high |
| **Second sensor on the bar** | Any two of the above | Unlocks insight ⑥ — bar-mounted ground truth to calibrate the wrist model | Medium |

### Recommendation

**Start with the phone or watch today, in parallel with ordering a Nano 33 BLE Sense or M5StickC.** Don't block on shipping. Collect a real session tonight; you'll learn more about the actual problem in one hour of your own data than in a day of reading dataset READMEs — sensor drift, where reps blur together, how different a machine press looks from a free-weight press.

### The protocol that makes the data worth having

Public datasets are unlabeled for the thing Fort cares about. Yours doesn't have to be.

1. Pick 4–6 movements across patterns (press, pull, hinge, squat, carry).
2. For each set, log: **exercise, load, reps completed, and your honest RIR at termination.** Take at least a few sets genuinely **to failure** — that's the anchor the whole RIR model calibrates against.
3. Record voice or video timestamps to align labels with the IMU stream.
4. Vary deliberately: fresh vs. fatigued, fast vs. controlled tempo, both arms, sloppy reps on purpose. Clean data teaches a model nothing about real gyms.
5. Publish the dataset alongside the demo. **A small, well-labeled, RIR-annotated wrist IMU dataset is itself a contribution** — arguably a better portfolio artifact than the model trained on it, and it's exactly the asset a pre-launch hardware company (insight ⑤) has none of.

### Which prototype this makes newly viable

- **A (velocity/RIR)** goes from "plausible on public data" to **demonstrated on labeled ground truth**. This is the pairing I'd pick.
- **D (haptics)** becomes a genuinely closed loop: your sensor detects the velocity-loss threshold and buzzes *the device on your wrist*, live, mid-set. That's a 15-second video that sells itself.
- **C (readiness model)** still needs longitudinal data you won't have in a week — keep it as a modeled system, not a validated one.

---

## 7.6 Pass-2 findings — founder quotes that change the calculus

New sources: founder interviews (The Split, Glossy), the SWE intern listing, and a **Clinical Operations Lead, Health & Performance Data** job posting.

### The three quotes that matter most

> **"I am very contrarian in that I don't think novel sensing and novel sensor technology… is the path forward."** — Miranda Nover

This is the most useful sentence I found. The CEO is saying **the moat is the interpretation layer, not the sensor.** Commodity IMU + PPG, extraordinary inference. That is a direct invitation: the valuable work is turning ordinary, messy signals into a trustworthy claim about a body. It confirms insight ④ and it means a prototype demonstrating *modeling* judgment outranks one demonstrating exotic hardware.

> **"We're excited about AI providing narrative-driven summaries that tell a digestible story without making you feel graded."** — Nover

Independent confirmation of insight ①. "Without making you feel graded" is a design constraint with teeth — it rules out scores, rings, streaks, and red/green status. Their user "lives **active, but not obsessive**, lives." A prototype that assigns you a number out of 100 is off-brand for this company in a way that is not obvious from the outside.

> **"Accuracy and having differentiated metrics that actually work reliably is more important than having something that's really aesthetically pleasing."** — Nover

Rigor is explicitly ranked above polish. **Error bars are not a caveat here — they're the deliverable.** Reporting honest accuracy on your prototype will read as taste, not weakness.

### Two facts that reshape §6

**1. They already do bar velocity and proximity to failure, with on-device ML.** Coverage confirms Fort "auto-detects 50+ exercises, counts reps, measures bar velocity, and estimates proximity to failure" using **on-device machine learning**. This cuts both ways for prototype option A: it is maximally on-thesis, but you'd be rebuilding their headline feature, and they'll evaluate it against an internal version they've spent a year on. **If you build A, the differentiator has to be the honesty of the evaluation, not the existence of the model** — the error characterization, the failure cases, the wrist-vs-bar gap. That's still a strong submission; it's just a different one than "look, I did it too."

**2. They're hiring a Clinical Operations Lead to run human-subject studies.** Responsibilities include owning "study planning, participant operations, and day-to-day lab execution," ensuring "data from studies are high-quality and reliable," and coordinating "with engineering and machine learning teams on study design and data requirements." They are standing up a **ground-truth apparatus**. This strongly validates §7.5: the labeled-data-collection protocol isn't a side quest, it's the function they're actively building an org around. A candidate who self-collects labeled RIR data is doing, at small scale, the exact thing they're paying $72–125K to solve.

### Revised recommendation

The gap has moved. Options that are now *more* attractive because Fort has publicly said less about them:

- **C (two-channel per-muscle readiness model)** — still the least-described part of their pitch. Now the top pick.
- **The narrative layer** — a new option: given a week of training + recovery data, generate the *one paragraph* a user reads, engineered explicitly to inform without grading. Nover named this as something they're excited about and it is unbuilt as far as anything public shows. Low technical risk, high taste-signal, directly quoting their own design constraint back at them as an implementation.
- **§7.5 self-collected labeled dataset** — upgraded from "nice differentiator" to "mirrors a role they're actively hiring for."

Option A remains excellent **if framed as an evaluation, not a reimplementation.**

### Two customer archetypes (useful for framing any demo)

Nover describes two distinct users:
1. **Optimizers** — "want to build muscle… get stronger… in the most efficient way possible."
2. **Minimum-effective-dose** — "want to do as little strength training as possible to still be considered healthy."

Most fitness software serves only #1. Building for #2 — or better, a demo that visibly serves *both* from the same model — is a differentiated framing that shows you read past the homepage.

---

## 7.7 Pass-3 findings — the wrist blind spot, and an open question they've admitted to

New sources mined: the Split podcast writeup (second pass, different questions), New Atlas technical coverage, and the Fort Foundations page.

### New hard facts

- **Subscription is $80/year**, retail $319, first year included with pre-order. So the software is a real, separately-priced product — insight features aren't garnish, they're the recurring revenue.
- **"Form" is operationalized as range of motion + velocity loss.** Not pose estimation, not computer vision. See insight ⑨.
- **Fort Foundations runs on seven movement patterns**: squat, hinge, lunge, push, pull, carry, core. Three tiers (1/2/3 days per week). Philosophy: *"Doing enough of the right work, repeated consistently, beats doing the most."*
- Launch timing is genuinely inconsistent across sources (June 2026 / Q3 2026 / Q2 2027 for Signature Edition). **Don't cite a ship date in your submission.**
- Miranda "handles software and product development **using AI coding tools**." The take-home's "use of AI tools is expected" is not a test you can fail by using them — it's how the CEO works.

### ⑧ They have publicly admitted an open research question — and it's a great prototype hook

> Fort is "investigating whether **motion tracking alone suffices**, rather than requiring local muscle sensors." (paraphrase from the Split interview)

That is the company saying out loud: *we don't yet know if an IMU can substitute for EMG in estimating muscle recruitment.* It is the central scientific bet of the product and it is **unresolved**. A prototype that takes a real position on it — even a negative result, honestly characterized — engages with the actual frontier of their work rather than reproducing a shipped feature. Combined with the "accuracy over aesthetics" quote, a rigorous negative result may be a *stronger* submission than a polished positive one.

### ⑨ "Form" reduced to ROM + velocity loss is a first-principles tell

Every competitor in this space reaches for cameras and pose estimation. Fort reduced "form" to the two things a wrist IMU can *actually observe reliably*: how far the limb travelled, and how much it slowed down. That's a deliberate scoping decision — refusing to promise a metric the sensor can't support. Given the take-home explicitly asks about "first-principles" thinking, **naming this reduction in your write-up shows you can read an engineering decision off a product spec.**

### ⑩ The wrist blind spot is the category's structural flaw — and Fort's fix creates a product tension

> "My wrist doesn't move when I'm doing leg press." — Nover

This is why wrist wearables fail at strength, stated as plainly as possible. Fort's answer: the **magnetic charging base attaches to gym equipment** (leg press, cable stacks) to sense the machine's motion instead.

But look at the tension that creates. Fort's entire pitch is *automatic, no logging, no manual input* — and the lower-body solution requires the user to **physically move a puck onto a machine.** That's a manual step in an automatic product. Nobody has resolved this publicly.

**This is the most interesting unclaimed product problem I've found.** A system that:
1. detects from wrist signal alone that the current movement is **in the blind spot** (high HR, low wrist motion, rhythmic cadence → "you're doing something loaded that I can't see"),
2. estimates what it can from HR and cadence rather than silently logging nothing, and
3. surfaces the mount prompt *only when it would actually pay off* —

…turns the manual step from a chore into an earned, occasional request. It respects "automatic," it respects "no notifications," and it addresses the failure mode that kills trust fastest: **silently recording nothing while the user works hard.**

### ⑪ Their ontology is movement patterns, not muscles — this refines option B

Foundations organizes around **seven patterns**, not muscle groups. Bodybuilding software thinks in muscles; Fort thinks in patterns, because patterns are what a *longevity* user needs balanced (can you still get off the floor, carry groceries, climb stairs).

So the §6B "Muscle Ledger" should probably become a **Pattern Ledger**: weekly coverage across squat/hinge/lunge/push/pull/carry/core, surfacing *"you haven't hinged in three weeks"* rather than *"your rear delts are under MEV."* Same machinery — free-exercise-db's `force` and `mechanic` fields plus muscle mappings roll up to patterns cleanly — but it speaks their language and serves their stated "active, not obsessive" user. **This is a cheap change that makes the demo look like it was built by someone who understands the company rather than someone who understands lifting.**

### ⑫ The bandwidth constraint, in the CEO's own words

> "We need to store and process data on the device to avoid sending too much over to the phone."

Insight ⑦ upgraded from inference to direct quote. On-device processing isn't an optimization at Fort, it's forced by the BLE/battery envelope. Any prototype that states its compute and bandwidth budget — *"this model is N KB and runs in M ms per rep window; raw IMU at 100 Hz is X KB/s, this ships Y KB/s"* — is speaking directly to a constraint the CEO has publicly named.

### Revised ranking after pass 3

1. **The Blind Spot Detector (⑩)** — new entry, straight to the top. Unclaimed, product-shaped, plays to their stated tension, and demoable with self-collected data (do a leg press with the sensor on your wrist — the null signal *is* the dataset).
2. **C — two-channel per-muscle/pattern readiness model.** Unchanged; still the deepest system.
3. **Pattern Ledger (⑪, was B).** Now cheap and license-clean thanks to free-exercise-db being public domain.
4. **A — velocity/RIR, framed as an honest evaluation.** Strong, but you're grading against their shipped feature.
5. **D — haptics.** Still the best video.

The combination I'd now pitch: **⑩ as the feature, ⑫ as the engineering rigor, and the narrative layer (§7.6) as the output surface.**

---

## 8. Take-home checklist

- [ ] Pick a prototype direction (see §6 recommendation)
- [ ] Build it
- [ ] State the **compute/power budget** for any on-device inference — insight ⑦
- [ ] Write up **unique insights** — §5 is the raw material; ①, ④, and ⑥ are the ones they likely haven't heard from other candidates
- [ ] Export a copy of the AI prompts/sessions used (this file's session included) — explicitly requested
- [ ] Be honest about what's modeled vs. validated. This team can smell a hand-waved number.

---

## 7.11 Pass-7 — the credibility gap, named publicly

### New hard facts

- **Ship date has slipped to Q2 2027**, from the 2026 window cited at launch. Publicly noted as a step back. **The device is not in anyone's hands**, so no independent review data exists.
- **Sub-30 g, aluminum body.** Sensor list now includes a **magnetometer** alongside IMU, PPG, and temperature.
- Magnetic attachment works to **barbells, dumbbells, cable handles, or body straps** — broader than the "charging base on a machine" framing from pass 3.
- Straps: silicone, sport weave, leather. Subscription confirmed at **$80/yr after year one**.
- Third-party coverage independently reads Fort as betting on **"proprietary software rather than novel sensors"** — outside confirmation of the §7.6 thesis.

### ⑮ An outside reviewer has named the exact evidence Fort hasn't published

> Fort "has published no accuracy data and has not shown how its speed estimates compare against a **barbell-mounted reference device**."

This is the most actionable finding in the whole dossier. An independent technical reviewer has identified precisely the validation gap — and it is **exactly the experiment §7.5 already proposed you run.**

That changes what option §6A *is*. Pass 2 downgraded it because "you'd be rebuilding their headline feature against a year of internal work." That reasoning no longer holds:

- You would not be reimplementing their feature. You'd be **producing the evidence they have been publicly called out for not having.**
- Fort cannot easily publish this pre-launch; you can, this week, with two cheap sensors.
- It lands directly on their stated value — *"accuracy… is more important than something aesthetically pleasing"* — and on the Clinical Ops role they're hiring for.
- **A negative or messy result is still a win.** "Wrist-derived mean concentric velocity tracks a bar-mounted reference with r = X and breaks down under conditions Y and Z" is a real contribution regardless of which way X lands.

**The experiment**, achievable with what §7.5 already recommends:
1. Two sensors, or one sensor moved between matched sets — **wrist** vs. **bar/dumbbell-mounted** (their own magnet mount makes this the *device's own* use case, not a hack).
2. Matched sets across a few movements, taken to or near failure, with RIR logged honestly.
3. Report agreement per rep, and — more interestingly — **where it fails**: heavy vs. light, fast vs. grinding reps, machine vs. free weight, fatigued vs. fresh.
4. State what would falsify your conclusion.

This is now the **top recommendation**, displacing §7.7's Blind Spot Detector — though the two compose: the blind-spot problem *is* the wrist-vs-bar disagreement, viewed from the product side rather than the measurement side. Build the measurement, and the feature falls out of it.

### ⑯ A positioning tension worth noticing

Press coverage reads Fort as **"targeting serious lifters specifically… unsuitable for casual gym-goers."** But the CEO says the goal is people who live *"active, but not obsessive, lives,"* and describes a second customer who wants *"to do as little strength training as possible to still be considered healthy."*

**The market is currently reading them as a serious-lifter product, and that is not what the founder says she's building.** Either the messaging isn't landing or the product is drifting toward the louder audience.

That's a real, observable gap between intent and reception — and it's a legitimate, non-sycophantic observation to raise in a submission. It also gives your Q2 a defensible angle: **a prototype that visibly serves the non-obsessive user is on-message with the founder, against the current press narrative.** Very few candidates will notice there's a difference.

### Honest caveat on the critical coverage

The reviewers also flag first-generation-hardware execution risk and a 2027 timeline requiring patience. That's fair commentary, not a reason to hedge in your submission — but it's worth knowing the skeptical read exists. **Don't repeat it back to them.** Use it only as context for why *evidence* (⑮) is the most valuable thing an outsider can hand them right now.

---

## 7.10 Pass-6 — the design spec, stated four times, and a retraction

### Retraction

Pass 5's "correction" about a Founding ML Engineer role is **withdrawn** — see the marked block in §7.9. Fort's YC page lists five roles; none is ML. **Pass 1 was right the first time.**

Worth naming the failure mode, because it's the same one as §7.8: a *summary* of search results asserted something the *primary source* doesn't support, and I propagated it. Between that and the AI-written "teardown," this research has now been wrong twice in the same direction — **plausible synthesis outrunning primary evidence.** For your submission the operational rule is: if a fact would change what you build or claim, open the primary page. Fort's own site and their own YC listings are primary; everything else is commentary.

### The design spec, now stated four independent times

Pulling the Founding Designer and Growth Marketing listings gave the clearest statement yet of what Fort wants its data to *feel* like. Combined with the CEO quote from §7.6, the same constraint now appears in four independent places:

1. *"narrative-driven summaries that tell a digestible story **without making you feel graded**"* — Nover, interview
2. *"making training data feel **clear, calm, useful, and emotionally resonant**"* — Founding Designer listing
3. *"interfaces that feel **premium and intelligent, not clinical, crowded, or gamified in a cheap way**"* — Founding Designer listing
4. *"The design bar should feel like **premium apparel, boutique wellness, and modern health brands, rather than traditional fitness tech**"* — Founding Designer listing

**Treat this as a written spec for your Q2 prototype, because it effectively is one.** It rules *in*: prose, restraint, whitespace, one thing at a time, and a visual reference class closer to Aesop or Oura's early work than to Strava or MyFitnessPal.

> **⚠️ Corrected pass 9.** This paragraph originally continued: *"It rules out: scores out of 100, rings to close, streaks, badges, leaderboards, red/amber/green status."* **That was my inference, not Fort's words, and the "no scores" part is contradicted by Fort's own product** — their FAQ lists **"session scores"** and **"recovery scoring"** as metrics they ship, and New Atlas leads with "Session scores."
>
> What Fort actually said is narrower: *"gamified **in a cheap way**"* (note the qualifier) and *"without making you feel **graded**."* Those constrain **tone and reference frame**, not the existence of a number. A score computed against the user's own history reads as description; the same score against a target or population norm reads as a grade. Design for the former. Rings/streaks/badges remain a reasonable inference about their taste — but label them as inference, not quotation.

Notably, **"calm"** and **"not gamified"** are hard to satisfy at the same time as "motivating" — which their intern listing also asks for (*"clear, useful, and motivating"*). Resolving that tension in a demo is a genuine design contribution, not a styling exercise.

### ⑬ "A new ritual" is a product-design instruction, not marketing copy

Both listings describe Fort as *"part health companion, part beautiful consumer object, **part new ritual** for strength and longevity."*

That word is doing real work. A **feature** is something you use when you need it; a **ritual** is something that happens at a fixed time, in a fixed form, whether or not you sought it out. Rituals are why Oura's morning readiness score and Spotify Wrapped work — the *cadence and constancy* carry as much weight as the content.

**This sharpens every prototype option in §6.** The question to ask of your demo isn't "what does this tell the user?" but **"when does this happen, how often, and what does it replace?"** A readiness model (§6C) delivered as a dashboard you visit is a feature. The same model delivered as one sentence at a fixed moment each morning is a ritual — and matches "screen-free, no notifications, no distractions" far better.

Concretely: pick a cadence and defend it. Post-set, post-session, morning, or weekly are four very different products built on the same model. **Say which one you chose and why.** That single decision demonstrates more product judgment than any amount of model tuning, and almost no candidate will make it explicitly.

### ⑭ The rigor/speed tension, restated in their own words

The Growth listing asks for *"comfort with imperfect data while maintaining analytical rigor."*

That's the §4.5 tension in `q3-motivation.md`, written by Fort rather than inferred by me — and it's a strikingly precise phrase. It's not "be rigorous" and not "move fast"; it's **act on data you know is incomplete, without lying to yourself about it.** For a pre-launch company with no user data, that's the daily condition.

For Q2 this is permission: **your prototype does not need to be validated to be credible.** It needs honest error bars and a clear statement of what would falsify it. For Q1, a story where you made a defensible call on insufficient data — and said so at the time — hits this exactly.

### Aesthetic reference class (for whatever you build)

If your demo has a UI, the stated target is **premium apparel / boutique wellness / modern health**, explicitly *not* traditional fitness tech. Practically: restrained type, generous spacing, few colors, no gradients-as-excitement, no progress rings, no confetti. Closer to a well-set page of text than to a cockpit.

---

## 7.9 Pass-5 — a correction, and the lens I should have used from the start

### ⚠️ RETRACTED IN PASS 6 — read §7.10 first

> **This correction was itself wrong.** A direct fetch of Fort's YC company page in pass 6 returns **five** listings — Social Content Intern, Social Media Content Producer, Growth Marketing Lead, Founding Designer, SWE Intern — and **no ML role.** The claim below came from a search-engine summary that appears to have conflated Fort with other companies in the same result set (Weave, Novaflow, Bindwell, and The Forecasting Company all had "Founding Machine Learning Engineer" listings on that page of results). **Pass 1's original statement stands: there is no publicly advertised ML role at Fort.** The paragraph below is kept only so the error is traceable — do not use it.

~~Pass 1 stated: *"There is no publicly advertised ML/signal-processing or data role."* **That was wrong.** Fort is hiring a **Founding Machine Learning Engineer, Health Algorithms**. YC now lists 5 open roles across engineering, marketing, and design.~~

This changes the read in a useful way. The ML layer isn't thinly staffed by oversight — **they've identified it as the critical hire and are recruiting for it at founding level, with founding-level equity.** So:

- The "interpretation layer is the moat" thesis (§7.6) is now confirmed by where they're spending equity, not just by a quote.
- Your Q2 prototype sits adjacent to the most important open role in the company. That raises the ceiling on how much it can matter — and the bar for rigor.
- Don't write as though you've spotted a gap they've missed. They've priced it. Write as someone who'd want to work *with* that hire.

### The Tesla design algorithm — the lens the take-home is written in

The take-home says: *"we want to understand how you think about problem solving and **first-principles**."* Three ex-Tesla founders using that phrase is not generic startup vocabulary. Tesla/SpaceX engineering has an explicitly articulated method — Musk's five-step algorithm, stated publicly in the 2021 Everyday Astronaut Starbase interview:

1. **Make the requirements less dumb.** Question every requirement, no matter who it came from — "it's particularly dangerous when they come from an intelligent person."
2. **Delete the part or process.** "If you do not end up adding back at least 10%, you didn't delete enough."
3. **Simplify and optimize** — *only after* 1 and 2. "A common mistake is to simplify and optimize a part or process that should not exist."
4. **Accelerate cycle time.**
5. **Automate.** Last.

**The ordering is the whole point**, and the named failure mode is *the characteristic error of a smart engineer*: optimizing something that should have been deleted.

### Fort's product decisions read as this algorithm applied to a wearable

This is the connection worth making in your write-up — it's specific, checkable, and shows you understand *how they think*, not just what they've built:

| Fort decision | Algorithm step |
|---|---|
| **"Novel sensing isn't the path forward"** — commodity IMU + PPG | **1.** The requirement "we need a new sensor" was the dumb requirement. Questioned it. |
| **Screenless, no notifications** | **2.** Deleted the screen — the part every competitor assumes. |
| **"Form" reduced to ROM + velocity loss**, not pose estimation | **1 + 2.** Deleted the promise the sensor can't keep, rather than bolting on a camera to support it. |
| **Magnetic mount for leg press** instead of more wrist sensors | **2 → 3.** Moved the sensor to the signal rather than optimizing a sensor that can't see. |
| **Hiring a human Clinical Ops Lead** to hand-run studies before scaling data collection | **5.** Automate *last*. They're deliberately doing ground truth manually first. |

That last row is the one most people would get backwards, and it's strong evidence the ordering is deliberate rather than coincidental.

### How to use this without being sycophantic

Do **not** write "I love Elon's algorithm." Use it structurally:

- In **Q1**, present your tradeoffs in that order — what requirement did you question, what did you delete, and *then* what did you optimize. If you optimized something you should have deleted, saying so is a strong answer.
- In **Q2**, state what you deliberately **did not build** and why. A prototype with an explicit "deleted scope" section is speaking their language.
- Anywhere: **"I questioned the requirement"** is a more Fort-shaped sentence than "I met the requirement."

*(Attribution: the five-step algorithm is Musk's, publicly stated; the mapping onto Fort's decisions in the table above is my inference, not anything Fort has claimed. Label it that way if you use it.)*

### Minor new facts (second Launch YC post)

- **Zac met Miranda at a gym**, and later introduced her to Paul. Paul joined after the first launch — the founding team assembled in stages.
- Pre-orders **capped at 1,000 units**. Three finishes: Gold, Black, Silver.
- Site headline framing: *"This Wearable Actually Tracks Strength."*

---

## 7.8 ⚠️ Source-reliability warning (pass 4)

There is an article — **StartupHub.ai, "Claude's Corner: Fort, The Wearable That Finally Takes Strength Training Seriously"** — that reads like an authoritative technical teardown. It names a specific MCU (nRF52840), specific IMU/PPG part numbers, a "quantized CNN/LSTM" with a ~500 KB memory budget, a TimescaleDB backend, and a "6.5/10 build difficulty" score.

**Treat essentially all of it as AI-generated speculation, not fact.** It's a column where a model reasons about a startup from public information. Fort has not published a bill of materials, a model architecture, or a backend stack. The part numbers are plausible *guesses* at what a company like this would pick — not disclosures.

**Do not cite any of it in your submission.** You would be telling three ex-Tesla engineers what's inside their own device, incorrectly, with confidence. That is the single worst failure mode available in this take-home, and it's an easy one to walk into because the piece is well-written and shows up high in search.

What *is* legitimately useful from it, reframed as your own hypotheses rather than facts:

- **The training-data flywheel.** Every user session is a labeled IMU sequence, so the dataset compounds and competitors can't buy it. This is a real strategic observation and it's consistent with them hiring a Clinical Ops Lead — bootstrap ground truth first, then let users compound it.
- **The wrist-vs-clip accuracy argument.** A rigid, equipment-mounted sensor sees a more predictable trajectory than a wrist, which is why velocity estimates from a clip should beat wrist estimates. Directly relevant to insight ⑩ and to how you'd frame §6A.
- **The competitive clock.** Apple or Garmin could plausibly ship a similar feature set if they prioritized it, which makes data accumulation and speed existential. Useful context for *why* they'd value an intern who ships.

General rule for this submission: **separate what Fort has said from what you inferred, and label which is which.** Given they explicitly asked you to annotate anything not authored by you, showing that discipline about *sources* is itself a signal.

---

## Sources

- [fort.cx](https://fort.cx/) · [/how-it-works](https://fort.cx/how-it-works) · [/about](https://fort.cx/about) · [/faq](https://fort.cx/faq)
- [Fort on Y Combinator](https://www.ycombinator.com/companies/fort)
- [Launch YC: Fort — Automatic Strength Tracking for People Who Care About Longevity](https://www.ycombinator.com/launches/PKj-fort-automatic-strength-tracking-for-people-who-care-about-longevity)
- [Fitt Insider — Fort Launches Strength-Tracking Wearable](https://insider.fitt.co/fort-launches-strength-tracking-wearable/)
- [New Atlas — New fitness tracker for muscle building from ex-Tesla engineers](https://newatlas.com/wearables/fort-strength-training-fitness-tracker/)
- [Men's Fitness — Fort Wants to Reinvent Fitness Wearables](https://www.mensfitness.com/gear/fort-wants-to-reinvent-fitness-wearables-by-tracking-what-actually-builds-strength)
- [Wearable Technologies — Fort Fitness Tracker](https://wearable-technologies.com/news/fort-fitness-tracker-built-especially-for-workouts)

---

### Changelog

- **Pass 9 (2026-08-09):** **Corrected an invented constraint.** Passes 6–7 asserted Fort's design spec "rules out scores, rings, streaks, badges, leaderboards, red/amber/green." Only the *tone* part is theirs — *"gamified in a cheap way"* and *"without making you feel graded."* **"No scores" was my inference and is contradicted by Fort's own FAQ**, which lists "session scores" and "recovery scoring" as shipped metrics. Reframed the constraint as being about **reference frame** (own history vs. external target), not the existence of a number. Fixed in the ⚡ Start here block, §7.10, and `narrative-layer.md` §4.
- **Pass 8 (2026-08-09):** No new company research (terminal, per pass 7 — both loops now no-op). One correction to §7's dataset table: **RecoFit ships as MATLAB `.mat` files, not CSV**, and appears to be **50 Hz**, which is marginal for concentric-velocity estimation. Split its role accordingly — RecoFit for recognition and rep segmentation, self-captured data at a higher rate for the velocity validation.
- **Pass 7 (2026-08-09):** Added §7.11 and the **⚡ Start here** decision summary at the top (the ranking had been revised in four separate places across seven passes and was no longer actionable). New facts: ship date slipped to **Q2 2027**, sub-30 g aluminum, magnetometer in the sensor stack, magnet-mounts to bars/dumbbells/cable handles, $80/yr confirmed. New insight ⑮ — an independent reviewer has publicly named Fort's missing evidence (**no accuracy data, no wrist-vs-barbell-reference comparison**), which **reinstates the velocity validation as the top prototype**: not reimplementing their feature, but producing evidence they've been called out for lacking, with a negative result still counting. New insight ⑯ — press reads Fort as a serious-lifter product while the founder says "active, but not obsessive"; that gap is a legitimate observation and a defensible angle for Q2. **This is the terminal research pass.**
- **Pass 6 (2026-08-09):** Added §7.10. **Retracted pass 5's ML-role "correction"** — Fort's YC page lists five roles and none is ML; pass 1 was right. Pulled the Founding Designer and Growth Marketing listings, which yield the clearest values language yet: the *"clear, calm, useful… not clinical, crowded, or gamified"* design spec, now corroborated four independent times and usable as a literal brief for Q2. New insight ⑬ — **"a new ritual" is a design instruction**: pick and defend a cadence (post-set / post-session / morning / weekly) rather than building a dashboard. New insight ⑭ — *"comfort with imperfect data while maintaining analytical rigor"* is Fort's own phrasing of the rigor/speed tension, and it licenses an honest, unvalidated prototype. Added the aesthetic reference class (premium apparel / boutique wellness, explicitly not fitness tech).
- **Pass 5 (2026-08-09):** Added §7.9. **Corrected pass 1's claim that Fort has no public ML role** — they're hiring a Founding ML Engineer, Health Algorithms (5 roles open total), which confirms the interpretation-layer thesis via equity rather than quotes. Added the **Tesla five-step design algorithm** as the lens the take-home's "first-principles" phrasing points at, with a table mapping five observed Fort decisions onto its steps (including "automate last" → the manual Clinical Ops hire). Minor facts from the second Launch YC post: Zac met Miranda at a gym, Paul joined later, pre-orders capped at 1,000.
- **Pass 4 (2026-08-09):** Added §7.8 — **source-reliability warning**. The StartupHub.ai "Claude's Corner" piece reads as a technical teardown but is AI speculation; its MCU/sensor part numbers, model architecture, and backend stack are guesses, not Fort disclosures. Do not cite. Salvaged three legitimate framings from it as *hypotheses* (training-data flywheel, wrist-vs-clip accuracy, competitive clock). Companion updates: `q1-data-project.md` §6.5, `q3-motivation.md` §4.5.
- **Pass 3 (2026-08-09):** Added §7.7. New facts: $80/yr subscription, "form" = ROM + velocity loss, Foundations' seven movement patterns, inconsistent ship dates. New insights ⑧–⑫: Fort has an **open research question** on whether motion alone substitutes for EMG; the wrist blind spot ("my wrist doesn't move when I'm doing leg press") and the automatic-vs-manual tension its magnet-mount fix creates; their ontology is patterns not muscles (refines B → **Pattern Ledger**); on-device processing confirmed as a bandwidth constraint in the CEO's own words. **New top-ranked prototype: the Blind Spot Detector.** Closed the license open thread — free-exercise-db is Unlicense/public domain with full muscle mappings.
- **Pass 2 (2026-08-09):** Added §7.6 — founder interview quotes (The Split, Glossy), SWE intern + Clinical Ops Lead listings. Confirmed on-device ML and that bar velocity / proximity-to-failure already ship, which **revises the §6 ranking**: option C and a new "narrative layer" option move up; option A should be framed as an evaluation rather than a reimplementation. Added the two customer archetypes. Companion files created: `q1-data-project.md`, `q3-motivation.md`.
- **Pass 1b (2026-08-09):** Added §7.5 hardware path — self-collected wrist IMU options, labeling protocol, and how own-data changes the prototype ranking (A and D become substantially stronger).
- **Pass 1 (2026-08-09):** Initial dossier. Company facts, founders, mission, product, inferred values, 7 insights, 5 ranked prototype options, dataset inventory. Open threads: verify free-exercise-db/wger licenses and muscle-mapping coverage; find any founder interviews or podcast appearances for direct mission quotes; check whether Fort has published anything on detection accuracy.
