import type { MuscleSlug } from '../data/bodyPolygons';
import {
  FDB_TO_REGIONS,
  PRIMARY_WEIGHT,
  SECONDARY_WEIGHT,
  SHOULDER_SPLIT_BY_FORCE,
  type FdbMuscle,
} from '../data/muscleMap';
import { getExercise, type Pattern } from '../data/patterns';
import type { SetMetrics } from './setMetrics';

/** Seconds under tension attributed to each drawable region. */
export type MuscleTension = Partial<Record<MuscleSlug, number>>;

/**
 * How one exercise's time under tension divides across the figure's regions.
 *
 * The division is a lookup, not a measurement: free-exercise-db says which
 * muscles a movement involves, never how much. Primary 1.0 / secondary 0.4 is
 * a stated convention. Shares are normalised so a set's attributed tension
 * always sums back to the seconds actually measured — the split can be wrong,
 * but it can never invent or lose time.
 */
export function recruitmentShares(exerciseId: string): MuscleTension {
  const ex = getExercise(exerciseId);
  const raw: MuscleTension = {};

  const add = (muscle: FdbMuscle, weight: number) => {
    const regions =
      muscle === 'shoulders' && ex.force
        ? (SHOULDER_SPLIT_BY_FORCE[ex.force] ?? FDB_TO_REGIONS.shoulders)
        : FDB_TO_REGIONS[muscle];
    for (const [slug, portion] of regions ?? []) {
      raw[slug] = (raw[slug] ?? 0) + weight * portion;
    }
  };

  ex.primaryMuscles.forEach((m) => add(m, PRIMARY_WEIGHT));
  ex.secondaryMuscles.forEach((m) => add(m, SECONDARY_WEIGHT));

  const total = Object.values(raw).reduce((a, b) => a + (b ?? 0), 0);
  if (total === 0) return {};

  const shares: MuscleTension = {};
  for (const [slug, v] of Object.entries(raw) as Array<[MuscleSlug, number]>) {
    shares[slug] = v / total;
  }
  return shares;
}

export interface RecruitmentTotals {
  /** Attributed seconds under tension per region. */
  byMuscle: MuscleTension;
  /** Seconds under tension per movement pattern. */
  byPattern: Partial<Record<Pattern, number>>;
  totalTensionS: number;
  /** Patterns touched at all this session. */
  patternsTouched: Pattern[];
}

export function accumulate(sets: SetMetrics[]): RecruitmentTotals {
  const byMuscle: MuscleTension = {};
  const byPattern: Partial<Record<Pattern, number>> = {};
  let totalTensionS = 0;

  for (const set of sets) {
    const shares = recruitmentShares(set.exerciseId);
    const pattern = getExercise(set.exerciseId).pattern;
    const tension = set.tensionSeconds;

    for (const [slug, share] of Object.entries(shares) as Array<[MuscleSlug, number]>) {
      byMuscle[slug] = (byMuscle[slug] ?? 0) + tension * share;
    }
    byPattern[pattern] = (byPattern[pattern] ?? 0) + tension;
    totalTensionS += tension;
  }

  return {
    byMuscle,
    byPattern,
    totalTensionS,
    patternsTouched: (Object.keys(byPattern) as Pattern[]).filter(
      (p) => (byPattern[p] ?? 0) > 0,
    ),
  };
}
