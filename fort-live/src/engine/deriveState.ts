import type { BodyView, MuscleSlug } from '../data/bodyPolygons';
import { NON_MUSCLE_REGIONS, REGION_VIEW } from '../data/muscleMap';
import { getExercise, type Pattern } from '../data/patterns';
import type { Session, SessionEvent } from '../session/types';
import {
  buildBaseline,
  fillFor,
  relativePhrase,
  VELOCITY_LOSS_MIN_SD,
  zScore,
  type Baseline,
} from './baseline';
import { computeEnergy, DEFAULT_SUBJECT, type EnergyProfile } from './energy';
import { buildFacts, type Fact } from './facts';
import { selectNewsworthy } from './newsworthiness';
import { accumulate, recruitmentShares, type RecruitmentTotals } from './recruitment';
import { computeSets, type SetMetrics } from './setMetrics';

/**
 * The entire engine, as one pure function of (session, time).
 *
 * Given the events at or before `now`, this returns everything the UI draws.
 * No clock is read here, nothing is memoised across calls, nothing mutates.
 * Two consequences, both of which the prototype leans on:
 *
 *  - Scrubbing the timeline is free. Seeking backwards is the same operation
 *    as playing forwards.
 *  - The whole thing is testable without a DOM, which is where the confidence
 *    in the numbers comes from.
 */

export type Phase = 'idle' | 'working' | 'resting';

export interface DerivedState {
  now: number;
  phase: Phase;
  /** The set in progress, if any. */
  activeSet: SetMetrics | null;
  /** The most recently completed set — what the panel is actually about. */
  lastCompletedSet: SetMetrics | null;
  lastSetPhrase: string;
  lastSetZ: number;
  /** Seconds since the last set ended. */
  restElapsedS: number;

  sets: SetMetrics[];
  totals: RecruitmentTotals;
  energy: EnergyProfile;
  baseline: Baseline;

  /** 0..1 fill per drawable region, relative to this lifter's usual session. */
  fill: Partial<Record<MuscleSlug, number>>;
  /** Regions worked by the last completed set — these get the pulse. */
  activeRegions: MuscleSlug[];
  /** Which way the figure should face, given what was just trained. */
  suggestedView: BodyView;

  patternsTouched: Pattern[];
  facts: Fact[];
  surfaced: Fact[];
  currentHr: number;
}

/** Rebuilt once per session rather than per frame — it depends only on history. */
const sharedBaseline = buildBaseline();

export function deriveState(
  session: Session,
  now: number,
  baseline: Baseline = sharedBaseline,
): DerivedState {
  const events = session.events.filter((e) => e.t <= now);
  const sets = computeSets(events);

  const activeSet = sets.find((s) => !s.complete) ?? null;
  const completed = sets.filter((s) => s.complete);
  const lastCompletedSet = completed[completed.length - 1] ?? null;

  const totals = accumulate(sets);
  const energy = computeEnergy(events, totals.byMuscle, {
    ...DEFAULT_SUBJECT,
    bodyMassKg: session.bodyMassKg,
  });

  const fill: Partial<Record<MuscleSlug, number>> = {};
  for (const [slug, work] of Object.entries(totals.byMuscle) as Array<[MuscleSlug, number]>) {
    if (NON_MUSCLE_REGIONS.includes(slug)) continue;
    fill[slug] = fillFor(work, baseline);
  }

  const activeRegions = lastCompletedSet
    ? (Object.keys(recruitmentShares(lastCompletedSet.exerciseId)) as MuscleSlug[])
    : [];

  const z = lastCompletedSet
    ? zScore(
        lastCompletedSet.velocityLoss,
        baseline.velocityLossByExercise[lastCompletedSet.exerciseId],
        VELOCITY_LOSS_MIN_SD,
      )
    : 0;

  const facts = buildFacts(sets, totals, baseline);

  return {
    now,
    phase: activeSet ? 'working' : lastCompletedSet ? 'resting' : 'idle',
    activeSet,
    lastCompletedSet,
    lastSetPhrase: lastCompletedSet ? relativePhrase(z) : '',
    lastSetZ: z,
    restElapsedS: lastCompletedSet && !activeSet ? Math.max(0, now - lastCompletedSet.endT) : 0,
    sets,
    totals,
    energy,
    baseline,
    fill,
    activeRegions,
    suggestedView: viewFor(activeRegions, lastCompletedSet?.exerciseId),
    patternsTouched: totals.patternsTouched,
    facts,
    surfaced: selectNewsworthy(facts),
    currentHr: latestHr(events),
  };
}

/**
 * Face the figure toward whichever side carries most of the last set's work,
 * weighting by the recruitment shares rather than by region count so a single
 * prime mover outvotes three small assistors.
 */
function viewFor(regions: MuscleSlug[], exerciseId?: string): BodyView {
  if (!exerciseId || regions.length === 0) return 'anterior';
  const shares = recruitmentShares(exerciseId);
  let anterior = 0;
  let posterior = 0;
  for (const [slug, share] of Object.entries(shares) as Array<[MuscleSlug, number]>) {
    if (REGION_VIEW[slug] === 'anterior') anterior += share;
    else posterior += share;
  }
  return posterior > anterior ? 'posterior' : 'anterior';
}

function latestHr(events: SessionEvent[]): number {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'hr') return e.bpm;
  }
  return 0;
}

/** Display name for whatever the panel is currently about. */
export function currentExerciseName(s: DerivedState): string {
  const id = s.activeSet?.exerciseId ?? s.lastCompletedSet?.exerciseId;
  return id ? getExercise(id).name : 'warming up';
}
