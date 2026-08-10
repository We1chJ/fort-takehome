import exercisesJson from './exercises.json';
import type { FdbMuscle } from './muscleMap';

/**
 * Fort Foundations is organised around seven movement patterns, not muscle
 * groups (fort-research.md §7.7 ⑪). Bodybuilding software thinks in muscles
 * because muscles are what you grow; a longevity product thinks in patterns
 * because patterns are what you lose.
 *
 * So the panel splits the two: the body figure is the *picture*, patterns are
 * the *vocabulary*. "you haven't hinged in three weeks" is the sentence Fort
 * would write; "rear delts under MEV" is the one they wouldn't.
 */
export const PATTERNS = [
  'squat',
  'hinge',
  'lunge',
  'push',
  'pull',
  'carry',
  'core',
] as const;

export type Pattern = (typeof PATTERNS)[number];

export interface Exercise {
  id: string;
  name: string;
  /** Original free-exercise-db `name`, kept so every row is traceable to source. */
  sourceName: string;
  pattern: Pattern;
  force: 'push' | 'pull' | 'static' | null;
  mechanic: 'compound' | 'isolation' | null;
  equipment: string | null;
  primaryMuscles: FdbMuscle[];
  secondaryMuscles: FdbMuscle[];
}

/**
 * Every field above except `id`, `name` and `pattern` comes straight from
 * free-exercise-db. An earlier version carried a `typicalLoadKg` and a
 * `romMetres` per exercise so mechanical work could be computed in joules —
 * both were invented, neither exists in any public exercise database, and a
 * wrist sensor cannot observe either. They are gone. `sourceName` keeps every
 * row traceable back to the record it came from.
 */

export const EXERCISES = exercisesJson as Exercise[];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);

export function getExercise(id: string): Exercise {
  const e = EXERCISE_BY_ID[id];
  if (!e) throw new Error(`unknown exercise id: ${id}`);
  return e;
}
