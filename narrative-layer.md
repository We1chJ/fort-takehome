# The Narrative Layer — turning Fort's data into something a person reads

Research + prototype spec · 2026-08-09 · companion to `fort-research.md`

> **Why this direction.** Fort's CEO: *"I am very contrarian in that I don't think novel sensing… is the path forward."* The moat is interpretation. The narrative layer is the interpretation layer's user-facing surface — the last mile between a validated number and a person changing what they do. Nover named it directly as something they're excited about: *"AI providing narrative-driven summaries that tell a digestible story **without making you feel graded**."*
>
> **Naming note:** this was never "option B." §6B in `fort-research.md` is the Pattern Ledger; B in the A/B/C build plan was validation + blind-spot. This is the unlettered idea from §7.6, now developed.

---

## 1. Someone already shipped this, and it went badly in public

**Strava launched "Athlete Intelligence" in October 2024** — generative summaries of each activity, written in the voice of a coach. It is the closest existing analogue to what Fort has described, and the reception was bad enough to become a news story. Forbes: *"Strava Upsets Fans With New AI Feature That Promises Insights But Provides Bland Pep Talks."*

The documented failures sort into four distinct modes, and **each one maps onto a specific engineering decision:**

### ① Tone failure — no model of context or stakes
A user logged an activity noting they'd been **hit by a car and were en route to the hospital**. The AI replied: *"Ouch, hope you're okay after that car accident!"* — then continued: *"Despite the setback, your activity data shows you're a consistent, well-rounded athlete—keep up the great work!"*

The system had no concept that some situations are not occasions for encouragement. It applied its one register regardless of context.

### ② Numerical hallucination — the LLM didn't read the numbers
On a four-mile run with **72 feet of total elevation gain**, the summary claimed *"elevation changes throughout the splits suggest a challenging route."* The user described the route as "pancake flat." The model produced a plausible-sounding claim that the underlying data directly contradicts.

### ③ Spurious inference from unreliable fields
An Iowa runner was congratulated on crushing *"the Great Wall Ultra"* — in China. The model had parsed his free-text activity title, which mentioned a **local Chinese restaurant** in Davenport, as if it were ground truth about the event.

### ④ The quiet failure — saying obvious things confidently
The most common complaint wasn't the viral howlers, it was banality. A Reddit user: the tool *"doesn't add value and probably costs them a ton of money."* Restating the stats the user just looked at, in prose, is worse than silence — it costs tokens, screen space, and trust.

**This is the single most useful artifact for your submission.** It's a real, documented, public failure of the exact feature, from a company with vastly more data than Fort. Designing explicitly against it is concrete, verifiable engineering judgment — not speculation.

---

## 2. What the research says

### The reflection→action gap is the actual problem (Li, Dey & Forlizzi, CHI 2010)

The canonical model of personal informatics has **five stages: preparation → collection → integration → reflection → action.** Its central claim is that **barriers cascade** — a failure at any stage poisons everything downstream. Extended by Epstein et al.'s *Lived Informatics Model*, which adds "deciding to track" and treats tracking as cyclical rather than linear.

**Why this matters for Fort, and it's a sharp framing for the write-up:**

Fort's entire product thesis is **collapsing the collection barrier** — no logging, automatic detection. That's real and valuable. But the model's whole point is that *removing one barrier doesn't move you downstream.* Perfect collection with no reflection support produces a user with immaculate data and no idea what to do. That is precisely how most wearables die: the data is fine, the drawer is where the device ends up.

So: **Fort's automatic tracking earns the right to attempt reflection and action. The narrative layer is where that attempt actually happens.** Framing your prototype as "attacking the stage everyone else abandons" is a much stronger pitch than "I built a summary generator."

### Standard LLMs cannot be trusted with the arithmetic (PHIA, Google)

**PHIA** (Personal Health Insights Agent) — an agent that uses **multi-step reasoning with code generation and information retrieval** rather than asking a model to reason over numbers directly. Reported: **~84% accuracy on objective numerical questions** and **~83% favorable ratings on open-ended ones**, from a ~650-hour expert evaluation. *(Figures from the paper's abstract/summary; the full text was gated for me — verify before quoting.)*

The headline finding is the one that matters here: **deriving insight from wearable data requires numerical reasoning that defeats standard LLMs, so you offload it to code.** That is the direct technical answer to Strava's failure ②. The model should never be the thing doing the math.

Related work in the same direction: **PH-LLM** (Nature Medicine) — a fine-tuned personal-health model for sleep and fitness coaching; **MotionTeller** — pairs a pretrained actigraphy encoder with a decoder-only LLM to describe minute-level movement data in natural language.

### The survey view: what's hard

A 2024 survey of LLMs for wearable sensing names the recurring obstacles: raw sensor data is *"noisy, incomplete, and inconsistent"*; LLMs are *"black-box"* in a domain where explanation matters; compute demands make **real-time inference on edge devices impractical**; and models trained on non-diverse data carry demographic bias.

That last-but-one point is a clean architectural constraint for Fort: **the LLM cannot run on a 100 mAh wristband.** Metrics on-device, narration on phone or cloud. That split isn't a compromise — it's the correct boundary, and it matches Nover's own *"we need to store and process data on the device to avoid sending too much over to the phone."*

---

## 3. The architecture this all points to

Strava's failures and PHIA's finding converge on the same design. **Do not let the language model analyze anything. Let it choose and phrase.**

```
   IMU / PPG / temp
        │
   [ deterministic metrics engine ]     ← plain code. on-device where possible.
        │                                  velocity loss, ROM, TUT, rest, per-pattern
        │                                  volume, readiness. every number computed,
        │                                  never generated.
        ▼
   [ candidate fact set ]               ← structured claims, each with provenance:
        │                                  {claim, value, baseline, delta,
        │                                   confidence, source_window}
        ▼
   [ newsworthiness filter ]            ← statistics, not an LLM. does this depart
        │                                  from THIS user's own baseline enough
        │                                  to be worth saying?
        ▼
   [ LLM as renderer ]                  ← receives ONLY surviving facts. selects 1–2.
        │                                  phrases them. cannot introduce a number
        │                                  it wasn't given. cannot see raw data.
        ▼
   one short paragraph, at a chosen cadence
```

**Each layer kills a specific Strava failure:**

| Failure | Killed by |
|---|---|
| ② hallucinated elevation | LLM never receives raw series and never computes — it can only restate verified facts |
| ③ Great Wall Ultra | Free-text and unreliable fields never enter the fact set |
| ④ bland pep talks | Newsworthiness filter — if nothing departs from baseline, **say nothing** |
| ① tone-deafness | Register rules + a hard "when in doubt, describe, don't encourage" default |

**The traceability is the demo.** For every sentence the model emits, you can show the exact computed fact it came from. A UI with the paragraph on the left and its fact-ledger on the right — every claim clickable back to a number and a window — is genuinely compelling, easy to grasp in five seconds, and *impossible to fake*. It's also the most direct possible answer to *"accuracy… is more important than something aesthetically pleasing."*

---

## 4. Design rules from Fort's own words

**"Without making you feel graded."** Describe, don't evaluate. Compare the user **to their own history**, never to a population norm, a target, or an ideal. *"Your hinge volume is the lowest it's been in five weeks"* is descriptive. *"You're at 62% of your weekly goal"* is a grade.

> **⚠️ Corrected.** This section originally said "no scores." **Fort ships scores** — their FAQ lists *"session scores"* and *"recovery scoring."* The constraint they actually stated is *"gamified **in a cheap way**"* and *"without making you feel **graded**"* — about tone and reference frame, not about whether a number exists. A score is fine. A score benchmarked against an external target is what stings. Rings/streaks/badges are my inference about their taste, not their words.

**"Clear, calm, useful."** Calm implies **the right to stay silent.** Most days, nothing has meaningfully changed. A system that speaks anyway is Strava's failure ④. Silence should be the default output, and that's a defensible, demonstrable design position.

**"Part new ritual."** Pick a cadence and defend it — post-set, post-session, morning, or weekly are four different products. Weekly is the most interesting choice for Fort's stated user: strength adaptation happens on a weekly-to-monthly timescale, and a weekly cadence *cannot* become a compulsive check-in, which suits "active, but not obsessive."

**Two archetypes, one engine.** Optimizers want the mechanism (*velocity loss hit 22% on set 4 — that's your marker*). Minimum-effective-dose users want the verdict (*you did enough this week; you haven't hinged since the 14th*). Same fact set, different selection and register. Demonstrating **one engine serving both** is a strong differentiator — most fitness software only serves the optimizer.

**Patterns, not muscles.** Their ontology is squat/hinge/lunge/push/pull/carry/core (§7.7 ⑪). Narrate in those terms.

---

## 5. The prototype

**"One paragraph a week, and the receipts."**

**Input.** A week of training + recovery data. Real if you have it (your own capture — see `fort-research.md` §7.5); otherwise simulated histories with deliberate structure: a missed week, a deload, a plateau, a chronically neglected pattern, a bad-sleep stretch.

**Build.**
1. Deterministic metrics engine — per-pattern volume, velocity loss trends, rest, ROM, a simple readiness channel. Pure code, fully tested.
2. Fact extraction with provenance and confidence on every claim.
3. Newsworthiness filter against the user's own rolling baseline. Tunable threshold — **show the silent case**.
4. LLM renderer, constrained to the surviving fact set. Two registers (optimizer / minimum-dose).
5. Side-by-side UI: paragraph + fact ledger, each sentence traceable to its number.

**What to show in the write-up.**
- The **silent week** — a week where the system correctly says nothing. Nobody else will demo restraint.
- An **adversarial test**: feed contradictory or missing data and show the system degrading to silence or hedged description rather than inventing. Explicitly reproduce Strava's elevation-hallucination setup and show your architecture cannot produce it.
- The **same week rendered for both archetypes.**
- **Deleted scope** — what you deliberately didn't build (§7.9).
- **Cadence justification** — why weekly.

**Effort:** meaningfully less than the velocity validation, since it doesn't need hardware or ground truth. **Risk:** it's a *design and architecture* contribution rather than a measurement one — so its credibility rests entirely on the traceability demo and the adversarial tests. Ship those or it reads as a wrapper around an API.

### How this composes with the velocity work

They're complementary, not competing. The validation (`fort-research.md` §7.11) produces **trustworthy numbers**; the narrative layer decides **which of them to say and how**. If you build both, the pitch is one clean sentence: *measure honestly, then say only what the measurement supports.* If you build one, this one is faster and needs no hardware — the velocity work is more defensible but needs your board and a labeled dataset.

---

## Sources

- [Forbes — Strava Upsets Fans With New AI Feature That Promises Insights But Provides Bland Pep Talks](https://www.forbes.com/sites/cyrusfarivar/2024/10/12/strava-upsets-fans-with-new-ai-feature-that-promises-insights-but-provides-bland-pep-talks/)
- [Fortune — Strava's AI coach and the viral memes](https://fortune.com/2024/10/11/strava-app-artificial-intelligence-fitness-athletic-memes)
- [Strava Help Center — Athlete Intelligence](https://support.strava.com/hc/en-us/articles/26786795557005-Athlete-Intelligence-on-Strava)
- [Li, Dey & Forlizzi — A Stage-Based Model of Personal Informatics Systems (CHI 2010)](https://www.ianli.com/publications/2010-ianli-chi-stage-based-model.pdf)
- [Transforming wearable data into personal health insights using LLM agents (PHIA) — Nature Communications](https://www.nature.com/articles/s41467-025-67922-y)
- [A personal health large language model for sleep and fitness coaching (PH-LLM) — Nature Medicine](https://www.nature.com/articles/s41591-025-03888-0) *(gated; not read)*
- [MotionTeller — wearable time-series + LLMs](https://arxiv.org/pdf/2512.21506) *(not read; arxiv blocked this session)*
- [LLMs for Wearable Sensor-Based HAR, Health Monitoring, and Behavioral Modeling: A Survey (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11314694/)
- [Give and Take: Perceptions of a Conversational Coach Agent in Fitness Trackers (ACM)](https://dl.acm.org/doi/10.1145/3743718) *(403; not read — likely relevant, worth retrying)*

**Reading caveat:** the Strava failures and the Li/Dey/Forlizzi model are well-sourced. The PHIA figures come from abstract-level summaries — verify before quoting. PH-LLM, MotionTeller, and the ACM coach-agent paper were inaccessible this session and are listed as leads, not evidence.

---

### Changelog

- **Pass 1 (2026-08-09):** Created. Strava Athlete Intelligence as the documented failure case (four failure modes); personal-informatics reflection→action gap as the academic framing; PHIA's code-generation finding as the technical answer to numerical hallucination; the deterministic-metrics → fact-set → newsworthiness-filter → LLM-renderer architecture; design rules from Fort's own language; prototype spec with adversarial tests and the silent-week demo.
