# Between Sets

A passive in-workout display for a screenless strength wearable.

It assumes the hard part is already solved on the device — exercises classified, sets
segmented, reps counted — and asks the question downstream of that: **given a correctly
classified stream, what should a person see in the ninety seconds between sets?**

Three views and an assistant. **now** is the live panel. **month** is four one-screen
report views you go to afterwards, on purpose. **care** is the people who have chosen to
share something with you. The circle in the corner answers questions about your own data
— and refuses the ones it should.

---

## Run it

```bash
npm install
npm run dev -- --host      # prints a LAN URL as well as localhost
npm test                   # 73 engine tests
npm run build
```

**On a phone:** open the printed Network URL in Safari, then Share → *Add to Home Screen*.
It launches fullscreen with no browser chrome. On a desktop the same URL renders inside a
phone bezel; the bezel disappears below 620px or in standalone mode.

The playback controls in the bottom-left are not part of the product — a real panel has no
timeline. They exist so the demo can be driven, and they show the raw `SessionEvent` stream
scrolling past as the clock advances. Three real MM-Fit workouts are selectable, chosen
because they differ: w14 is 27 sets in 25 minutes at 27/27 classification, w09 is the same
work at half the pace, and w20 is 83% accurate with no shoulder press at all.

---

## The cadence is the rest period

Post-set, post-session, morning and weekly are four different products built on the same
model. This one picks the rest period, and the choice drives everything else.

It is the one moment a lifter is already holding their phone and already in a
results-focused frame of mind. The screen time is spent regardless; the only question is
what occupies it. So the panel is **pull-only**: no notifications, no haptics, no badges,
nothing that initiates contact. It is inert until looked at.

## Not a scoreboard

The product spec this is written against says *clear, calm, useful — not clinical, crowded,
or gamified*, and *without making you feel graded*. A live per-muscle display sits close to
that line, so the resolution is a hard rule rather than a disclaimer:

- Intensity is **drawn, not scored** — fill on a body figure, no number on it anywhere.
- Every comparison is to **this lifter's own recent sessions**. There is no population norm,
  no target, no ideal, and therefore no scale left to be graded on.
- No rings, streaks, badges, percentages-of-goal, or red/amber/green. The one dial in the
  app is on the care tab, where it is doing a different job for a different reader — see
  that section.
- Insight must be **dragged into view**. Silence is the resting state.
- The one number on the main screen is energy, and the ledger shows how it was built.

The **silent case** is a first-class behaviour, not a gap. There used to be an authored
session guaranteed to produce it; with only real data left, the claim is made against
measurement instead — across the three sessions the sheet has nothing to say at **22% of
sampled moments**, and on w09 at 28%. Scrub anywhere in that space and the system correctly
reports that nothing departed from how this lifter's sessions usually go. There is a test
asserting that fraction stays high, which is the thing actually worth guarding: a filter
that became chatty would collapse it.

---

## Architecture

The engine is a **pure reducer over the event prefix**: `deriveState(session, now)` returns
everything the UI draws, given the events at or before `now`. No clock read, no mutation, no
memoisation. Seeking backwards is the same operation as playing forwards, and the whole
engine is testable without a DOM.

```
session source            MM-Fit, through the Q1 classifier (scripts/mmfit_classify.py)
      │                   held-out predictions -> SessionEvent[]; nothing is generated
      ▼
SessionEvent[]            src/session/types.ts — THE CONTRACT with the on-device classifier
      ▼
deriveState(events, now)  PURE
      ├ setMetrics        per set: tension-seconds, per-rep velocity, velocity loss, ROM
      ├ recruitment       tension-seconds x muscle shares → per-region accumulation
      ├ energy            session kcal from HR, attributed by share of time under tension
      ├ baseline          this set vs THIS lifter's own prior sets
      ├ facts             claims, each carrying its evidence and provenance
      └ newsworthiness    statistical filter — most sets produce nothing
      ▼
UI (now)                  body · last-set strip · energy · ribbon · [drag] sheet + ledger

buildMonthlyReport()      the same computeSets/accumulate/computeEnergy over 30 days
      ▼
UI (month)                stat tiles · daily kcal + 7-day mean · weekly minutes · ranked bars
```

The report is not a second pipeline. It runs the same `computeSets` → `accumulate` →
`computeEnergy` chain over the same `SessionEvent` streams, so it cannot drift from what
the live panel says — there is a test that asserts exactly that.

**No language model anywhere in the data path.** Numbers are computed, never generated.
Claims are written next to the arithmetic that justifies them, a threshold decides which are
worth saying, and the ledger makes the chain inspectable. An LLM renderer would slot in at
exactly one place — receiving the surviving `Fact` objects and no raw data — which is the
constraint that would make it safe. It is not needed to make the point.

---

## No kilograms anywhere

A wrist sensor sees motion. It cannot know there are 87.5 kg on the bar, and the only
way that number reaches the app is the user typing it — which is exactly the manual
logging the product exists to delete. So the schema has no load field, and everything
that depended on one is gone: no volume load, no tonnage, no mechanical work in joules.

An earlier version had all of them, built on a `typicalLoadKg` and a `romMetres` I had
invented per exercise. Neither exists in any public exercise database and neither is
observable from the wrist. Removing them left the catalogue **100% sourced** — every
field in `exercises.json` now traces to a free-exercise-db record.

What replaced it is **tension-seconds**: `Σ over reps of durationS × romFrac`. Time and
range are precisely what the device does observe. A half rep earns half the credit; a
grinding set earns more than a fast one of the same rep count, because its reps take
longer. Both fall out of the definition rather than being bolted on.

What it deliberately does not capture is intensity — forty seconds under something light
and forty under something heavy score the same. That information is genuinely absent
from the sensor, so it stays out of the body map entirely and effort lives where it can
actually be measured: the velocity trace on the last-set strip.

## What is measured, what is modelled, what is invented

Being explicit about this is the point of the fact ledger, and it belongs in the README too.

| Quantity | Standing |
|---|---|
| Reps, sets, exercise identity, per-rep velocity, ROM | **Assumed given.** The contract in `session/types.ts` is where this prototype starts. |
| Tension-seconds (duration × range) | **Computed.** Arithmetic on the above, no physiology added, no load required. |
| Velocity loss | **Computed.** Measured from the fastest rep in the set, not the first. |
| Reps in reserve | **Modelled.** Velocity-loss autoregulation is well established; the specific loss→RIR mapping is movement- and athlete-specific. No open dataset pairs wrist-derived per-rep velocity with honest RIR labels to fit it against — I looked. Replacing `estimateRir` with a fitted function is the first thing real data would buy. |
| Which muscles a lift uses | **Data.** free-exercise-db primary/secondary lists. |
| Health notes (prior strain, impingement) | **Self-reported.** Never inferred from sensor data, and never used to make a clinical judgement — only to decide which numbers are worth surfacing. |
| How much each muscle contributes | **A convention.** Primary 1.0, secondary 0.4. This is a lookup table, not a measurement, and it is where a real recruitment estimate would go. |
| Session kcal | **Estimated.** Keytel et al. (2005) from HR, mass, age, sex — roughly ±20% individually, and worse for resistance training than steady-state cardio. Needs body mass, which is a profile field, not a per-set reading. |
| Per-muscle kcal | **Attributed, not measured.** No wearable can observe where in the body a calorie was spent. The session estimate is divided by each region's share of time under tension. The division rule is stated so it can be argued with. |

Two modelling decisions worth naming because both started out wrong:

- **The deltoid split.** `shoulders` has no front/back distinction in free-exercise-db, so an
  even split lit rear delts at 84% on a pure push day — obviously wrong to anyone who trains.
  The `force` field (push/pull) already encodes the distinction, so no new data was needed.
- **The fill scale.** Normalising each region against its own history divided out the
  magnitude and made a region with a tenth of the work render nearly as bright. The figure
  now uses one shared scale, still derived only from this lifter's sessions. Per-region
  comparison still exists — in the ledger, in words, which is where a comparison belongs.

---

## The month tab

Fifteen real MM-Fit workouts over thirty days. Time is kept as "days ago" rather than
calendar dates — it sidesteps timezones and keeps the aggregation pure, which is what makes
it testable. The spacing across the month is the one assigned quantity: MM-Fit's timestamps
are recording dates, not a training log.

Two consequences of real data worth expecting rather than debugging. **Only five of the
seven patterns appear** — MM-Fit's protocol contains no hinge and no carry, so the report
shows both untouched and the assistant says so when asked what is being neglected. And
**every set is ten reps**, because the protocol was 3×10, so rep-count spread is near zero
and the baselines lean on velocity and ROM instead. A history of sets genuinely taken to
failure would carry more signal; MM-Fit does not contain one.

**Four views, not one scrolling column.** A month of training is four separate questions —
how much, how hard, where, and what kind — and stacking them vertically meant scrolling
past three answers to reach the one you wanted. One question per screen, nothing below
the fold, and the caption on each is a single line or absent.

| View | Question | Form |
|---|---|---|
| summary | how much? | four stat tiles + minutes per week |
| energy | how much did it cost? | daily kcal columns + 7-day mean |
| body | where did it go? | ranked bars, nine regions |
| patterns | what kind of work? | ranked bars, all seven patterns |

**There are no pie charts, and that is a considered choice.** Two reasons:

1. Comparing lengths is easier than comparing angles — the standard argument.
2. The deciding one: **a pie can only draw what exists.** A month with no carries has no
   carry slice, so the single most useful thing a monthly view can tell you silently
   disappears. The ranked bar draws that row at zero, labelled *not trained*, and it is
   the first thing your eye lands on.

Every bar is the same accent colour. Muscle groups and movement patterns are nominal
categories with no natural order, so shading each bar darker-where-bigger would
double-encode length as hue and spend the only free channel on information the bar
already carries. The one non-accent mark is the seven-day average line, which is a
different *kind of thing* rather than a different category, and is drawn neutral.

Daily energy is columns, not a line, because most days are rest days — a line drawn
through the zeros would imply a continuous burn down and back up that never happened.
Both marks on that chart are kcal on one axis; there is no second scale anywhere.

---

## The assistant

A circle in the corner, available from every view. It is the only persistent control on the
live panel and it earns that by being completely inert: no dot, no unread count, no
"I noticed something" nudge.

**There is no language model behind it, and that is the architecture rather than a
shortcut.** Every reply is assembled from numbers the engine already computed and shows its
working, the same as the fact ledger. A model would slot in at exactly one point —
receiving an `Answer`'s claim and evidence rows and nothing else, purely to phrase it.
Never the raw data, never arithmetic, never choosing a fact. That is the direct fix for how
Strava's AI invented elevation that was not in the data.

The clinical boundary is deliberately the one thing that would *not* move behind that seam.
`classify()` runs first, in plain code. A prompt asking a model to decline medical questions
is a request that usually works; a branch that never reaches the model is a guarantee. Same rule as everything else — the user opens it, it never
opens itself. A badge would turn the whole design inside out.

**It knows your health history, and that is exactly why it refuses.** `data/profile.ts`
holds what the person has told the app — a resolved lower-back strain, an intermittent
shoulder impingement — and each note names the patterns it makes worth watching. So the
assistant will volunteer *"your hinge volume this month is 5m 36s, 12% of your total"*
when asked what it knows about you. What it will not do is tell you whether your back can
take it:

> I can only speak to what your sessions measured. Anything about pain, injury or a
> diagnosis needs a clinician who can actually examine you — I would be guessing, and
> guessing confidently is the worst thing I could do here.

That question has a correct answer, and it depends on an examination this app has not
performed. Refusals render differently from answers — quieter, ruled down the left —
because a refusal that looks like an answer is its own kind of lie.

---

## The care tab

The people who look after each other, and the little they have chosen to share. The
distinction is care versus surveillance, and it is four concrete decisions rather than a
matter of tone:

- **They control it, and you can see that they do.** Each card states the sharing level in
  the person's own terms. A member who paused still has a card, so pausing is ordinary
  rather than a disappearance they have to explain.
- **Trends, never raw data.** The most anyone shares is how their own numbers moved against
  their own last month. No live feed, no location, no way to look at a moment.
- **Change, never cause.** The engine can conclude that something *moved*. It can never
  conclude what the change *means*, and it says so out loud rather than leaving the gap for
  a worried reader to fill. There are tests asserting no causal language reaches the screen.
- **The recommended action is a phone call.** Not an alert, not an appointment — the
  smallest step that is definitely appropriate. It appears as three words, `worth a call`.
  The lowest ring step is clay, and nothing on the page turns alarm red.

The signal that matters most for an older relative is the one this whole product is built
on. Sit-to-stand pace is a strength measurement, strength predicts independence in later
life, and it declines slowly enough that nobody notices from a weekly phone call. A device
that already counts reps can count chair rises. Margaret's card is the case the page exists
for: two signals moved together over about ten days, each small enough to miss alone.

**The page carries almost no prose.** Closed, a row is a name and one number. Open, it is
that person's numbers and a three-word prompt. Two things paid for that: the sentences
describing how each measurement is derived moved to the labels' `title`, and the sentences
narrating what moved were cut outright — a delta of −19% next to a falling sparkline
already says "daily movement down 19%", and saying it twice is how a care page starts
sounding like a ward round. The one sentence that stays is the disclaimer at the foot,
because the fewer words surround a number, the more authority the number borrows.

The engine still generates that narration — `summary()` and `nextStep()` in `engine/care.ts`,
with the tests that assert no causal language and no guessed pronouns ever reach a screen.
They are unrendered rather than deleted: the constraint they encode is the interesting part
of the page, and it is the thing an LLM renderer would have to be held to.

**The number is not a health score, and it is never called one.** Nothing on a wrist can
score a person's health, and a figure that claimed to would be exactly the failure this
whole app is built against. What it can honestly say is how far someone is sitting from
their own usual range: 100 means everything they share is where it normally is, one
standard deviation of adverse movement costs about eight points, and the curve saturates so
no combination of trends can drive it near zero — a set of trends is never evidence that
someone is at nought out of a hundred, so the number must not be able to say it. Movement
in the *good* direction earns nothing back; walking more than usual does not offset chair
rises getting slower. All four properties have tests.

**The ring is the only red/amber/green in the app**, and it is there to fix an ambiguity
rather than to raise an alarm. A row reading `Margaret  mother · 74      67` is two bare
numbers and the second one looks like a second age; a dial gives the score a shape nothing
else on the row has. The hue is doubly encoded — the arc sweeps to the score as well — so a
colourblind reader loses nothing, and the three steps clear ΔE 8.7 under deutan/protan/
tritan simulation and 18.8 at normal vision against the card surface, checked with a
validator rather than by eye. The low step is clay, not alarm red: a 12%-slower chair rise
has not earned a siren.

The top step is defined by the flag, not by the number, and that is the one non-obvious
line in `scoreBand()`. Cutting the score at fixed thresholds looks equivalent and is not —
a member can trip the 1.5σ flag on a single signal and still score 89, which would paint a
green ring on a card that says `worth a call`. Green now means nothing crossed the line;
the other two steps split by magnitude at 75. There is a test that constructs exactly that
89-with-a-flag case.

---

## Data sources

| Source | Licence | Used for |
|---|---|---|
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense (public domain) | 873 exercises with primary/secondary muscles, `force`, `mechanic`. A curated 23-exercise subset is vendored in `src/data/exercises.json`. |
| [react-body-highlighter](https://github.com/giavinh79/react-body-highlighter) | MIT | SVG body geometry, vendored as raw polygon data in `src/data/bodyPolygons.ts`. Vendored rather than consumed as a component because its API only colours muscles from a discrete palette keyed by exercise frequency, and this needs continuous animated fill. Licence retained alongside. |
| [MM-Fit](https://mmfit.github.io/) | MIT | **Every session in the app.** Left-wrist smartwatch accel/gyro at ~100 Hz plus HR at 1 Hz. Run through `scripts/mmfit_classify.py --emit-all` into `src/data/mmfit.json`: three workouts playable, fifteen as the baseline history, three excluded for having no heart-rate stream. It slotted in behind `SessionEvent` with no engine changes, which was the claim the schema was written to test. |

**Nothing in the app is generated.** `src/session/generator.ts` survives only as a test
fixture — the engine tests need controlled inputs (a set taken to exact failure, a set with
a known ROM cut) that no real workout happens to contain. It feeds no screen.

---

## Deleted scope

- **Exercise classification.** Assumed solved on-device; the event schema is the stated boundary.
- **Notifications, haptics, rest timers.** Anything that initiates contact breaks the thesis.
- **Long-term views *inside the session*.** Trends live on the `month` tab, which you
  navigate to deliberately. Nothing historical appears on the live panel mid-set.
- **A real language model in the assistant.** The seam is specified and the surrounding
  discipline is built; a prototype does not need the dependency, the key handling, or the
  latency to make the point.
- **Any write path on the care tab.** You can see what people share; you cannot change it
  from here. Sharing is changed by the person sharing, on their own device.
- **Form correction and pose estimation.** "Form" here is ROM and velocity loss — the two
  things a wrist IMU can actually observe. Promising more than the sensor supports is the
  failure mode to avoid.
- **Static and carry modelling.** A special currency for planks and carries was built and
  removed; it needed a coefficient with nothing behind it. The `carry` pattern reads as
  untouched on the report, which is honest and turns out to be the most useful row on it.
- **Load, and everything derived from it.** See above.
- **Accounts, backend, persistence, an animation library.**

## Not verified

- **On-device.** I could not test on a real iPhone. Standalone launch, safe-area insets, and
  the `<620px` bare layout need a check on the actual phone via the LAN URL.
- **Motion timing.** The browser window used for verification was backgrounded, where Chrome
  throttles animation, so transition timings were checked by forcing end states rather than
  by watching them. Layout, data and interaction logic were verified directly.
