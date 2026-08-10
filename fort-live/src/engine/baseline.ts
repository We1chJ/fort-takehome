import type { MuscleSlug } from '../data/bodyPolygons';
import { PRIOR_SESSIONS } from '../session/history';
import { accumulate } from './recruitment';
import { computeSets, type SetMetrics } from './setMetrics';

/**
 * The lifter's own past, reduced to the few distributions the panel compares
 * against. Nothing here refers to anyone else.
 */
export interface Baseline {
  /** Per exercise: how hard this lifter's sets of it usually go. */
  velocityLossByExercise: Record<string, Distribution>;
  /** Per exercise: the ROM they usually hold. */
  romByExercise: Record<string, Distribution>;
  /** Per region: seconds under tension in a typical session that trains it. */
  typicalSessionTensionS: Partial<Record<MuscleSlug, number>>;
  /**
   * One shared scale for the body figure, in seconds: what this lifter's
   * hardest-worked region receives in a typical session.
   *
   * The figure deliberately does NOT normalise each region against its own
   * history. Doing so lit every trained region almost equally — a push day
   * showed rear delts at 69% next to chest at 81%, when the rear delts had
   * taken a tenth of the tension. Per-region normalisation divides the
   * magnitude out, and magnitude is the one thing the picture is for.
   *
   * A single scale keeps the image honest while staying self-relative: the
   * reference is still drawn from this lifter's own sessions and nobody else's.
   * The per-region comparison still exists — it lives in the fact ledger, in
   * words, which is where a comparison belongs.
   */
  referenceTensionS: number;
  /** Sessions ago each exercise last appeared. Absent = not in the window. */
  sessionsSinceExercise: Record<string, number>;
}

export interface Distribution {
  mean: number;
  sd: number;
  n: number;
}

function distribution(values: number[]): Distribution {
  const n = values.length;
  if (n === 0) return { mean: 0, sd: 0, n: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1);
  return { mean, sd: Math.sqrt(variance), n };
}

export function buildBaseline(priorSessions = PRIOR_SESSIONS): Baseline {
  const vlByExercise: Record<string, number[]> = {};
  const romByExercise: Record<string, number[]> = {};
  const tensionSamples: Partial<Record<MuscleSlug, number[]>> = {};
  const sessionPeaks: number[] = [];
  const sessionsSinceExercise: Record<string, number> = {};

  priorSessions.forEach((events, sessionsAgo) => {
    const sets = computeSets(events);

    for (const set of sets) {
      if (set.reps.length < 2) continue;
      (vlByExercise[set.exerciseId] ??= []).push(set.velocityLoss);
      (romByExercise[set.exerciseId] ??= []).push(set.meanRomFrac);
      if (!(set.exerciseId in sessionsSinceExercise)) {
        sessionsSinceExercise[set.exerciseId] = sessionsAgo;
      }
    }

    // Only sessions that actually trained a region contribute to its typical
    // figure. Averaging in the zeroes would make every leg day look enormous.
    const { byMuscle } = accumulate(sets);
    const tensions = Object.values(byMuscle).filter((w): w is number => (w ?? 0) > 0);
    for (const [slug, s] of Object.entries(byMuscle) as Array<[MuscleSlug, number]>) {
      if (s > 0) (tensionSamples[slug] ??= []).push(s);
    }
    if (tensions.length) sessionPeaks.push(Math.max(...tensions));
  });

  const typicalSessionTensionS: Partial<Record<MuscleSlug, number>> = {};
  for (const [slug, samples] of Object.entries(tensionSamples) as Array<
    [MuscleSlug, number[]]
  >) {
    typicalSessionTensionS[slug] = distribution(samples).mean;
  }

  return {
    velocityLossByExercise: mapValues(vlByExercise, distribution),
    romByExercise: mapValues(romByExercise, distribution),
    typicalSessionTensionS,
    referenceTensionS: sessionPeaks.length ? distribution(sessionPeaks).mean : 0,
    sessionsSinceExercise,
  };
}

function mapValues<T, U>(o: Record<string, T>, f: (v: T) => U): Record<string, U> {
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v)]));
}

/**
 * How unusual a value is against the lifter's own distribution, in standard
 * deviations. Returns 0 when there is too little history to say — which is the
 * honest answer, and is what keeps the panel quiet on a cold start.
 *
 * `minSd` guards against a degenerate denominator. Range of motion is the case
 * that forced it: a lifter who always completes full reps has a ROM history
 * with almost no spread, so a perfectly ordinary 6% shortfall came out as
 * 15.5 standard deviations. That number is arithmetically correct and
 * completely meaningless. Callers pass the smallest difference actually worth
 * calling unusual, and the result is clamped so no single fact can dominate
 * the ranking on the strength of a tiny denominator.
 */
export const MAX_ABS_Z = 6;

export function zScore(
  value: number,
  d: Distribution | undefined,
  minSd = 0,
): number {
  if (!d || d.n < 3) return 0;
  const sd = Math.max(d.sd, minSd);
  if (sd <= 1e-6) return 0;
  const z = (value - d.mean) / sd;
  return Math.max(-MAX_ABS_Z, Math.min(MAX_ABS_Z, z));
}

/** Smallest ROM difference worth treating as a departure: two percentage points. */
export const ROM_MIN_SD = 0.02;

/**
 * Same guard for velocity loss: five percentage points. Below that the two sets
 * were, for practical purposes, taken equally close to failure — whatever the
 * arithmetic says about a lifter whose history happens to be very consistent.
 */
export const VELOCITY_LOSS_MIN_SD = 0.05;

/**
 * How far from the lifter's own baseline something has to be before the panel
 * will call it a departure at all.
 *
 * Defined here, and used by both surfaces, because they must not disagree. The
 * strip saying "harder than your usual" while the sheet reports nothing unusual
 * is the system contradicting itself in the space of one screen.
 */
export const DEPARTURE_THRESHOLD = 0.9;
const STRONG_DEPARTURE = 1.8;

/** Wording for how this set compares to the lifter's own. Never a number. */
export function relativePhrase(z: number): string {
  if (z >= STRONG_DEPARTURE) return 'much harder than your usual';
  if (z >= DEPARTURE_THRESHOLD) return 'harder than your usual';
  if (z <= -STRONG_DEPARTURE) return 'much easier than your usual';
  if (z <= -DEPARTURE_THRESHOLD) return 'easier than your usual';
  return 'about your usual';
}

/**
 * Fill level 0..1 for a region, on the shared scale described on
 * `Baseline.referenceTensionS`.
 *
 * Saturating rather than linear: past a hard session's worth of tension on one
 * region, the difference between "a lot" and "a lot more" is not worth
 * rendering, and a linear scale would leave every accessory movement invisible.
 */
export function fillFor(tensionS: number, baseline: Baseline): number {
  if (tensionS <= 0) return 0;
  if (baseline.referenceTensionS <= 0) return 0.35;
  return 1 - Math.exp(-1.35 * (tensionS / baseline.referenceTensionS));
}

export function summariseSet(set: SetMetrics, baseline: Baseline) {
  const z = zScore(set.velocityLoss, baseline.velocityLossByExercise[set.exerciseId]);
  return { z, phrase: relativePhrase(z) };
}
