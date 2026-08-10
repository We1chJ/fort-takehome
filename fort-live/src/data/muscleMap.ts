import type { MuscleSlug } from './bodyPolygons';

/**
 * free-exercise-db labels its muscles with 17 strings. The vendored body figure
 * has 22 drawable regions. This is the join between them.
 *
 * Verified against dist/exercises.json (873 exercises): the complete set of
 * values appearing in `primaryMuscles` / `secondaryMuscles` is exactly these 17.
 */
export type FdbMuscle =
  | 'abdominals'
  | 'abductors'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'forearms'
  | 'glutes'
  | 'hamstrings'
  | 'lats'
  | 'lower back'
  | 'middle back'
  | 'neck'
  | 'quadriceps'
  | 'shoulders'
  | 'traps'
  | 'triceps';

/**
 * Where each free-exercise-db label lands on the figure, and with what share.
 *
 * Two labels split across more than one region because the figure is more
 * granular than the database:
 *   - `shoulders` has no anterior/posterior distinction in free-exercise-db.
 *     The split here is the neutral fallback; `SHOULDER_SPLIT_BY_FORCE` below
 *     overrides it, because the `force` field tells us which head is doing the
 *     work far better than a fixed ratio does.
 *   - `abdominals` carries a little into the obliques for the same reason.
 *
 * `lats` and `middle back` both resolve to `upper-back` because the figure has
 * no separate lat region. Information is lost there; nothing can be done about
 * it without redrawing the body.
 */
export const FDB_TO_REGIONS: Record<FdbMuscle, Array<[MuscleSlug, number]>> = {
  abdominals: [
    ['abs', 0.8],
    ['obliques', 0.2],
  ],
  abductors: [['abductors', 1]],
  adductors: [['adductor', 1]],
  biceps: [['biceps', 1]],
  calves: [
    ['calves', 0.7],
    ['left-soleus', 0.15],
    ['right-soleus', 0.15],
  ],
  chest: [['chest', 1]],
  forearms: [['forearm', 1]],
  glutes: [['gluteal', 1]],
  hamstrings: [['hamstring', 1]],
  lats: [['upper-back', 1]],
  'lower back': [['lower-back', 1]],
  'middle back': [['upper-back', 1]],
  neck: [['neck', 1]],
  quadriceps: [['quadriceps', 1]],
  shoulders: [
    ['front-deltoids', 0.6],
    ['back-deltoids', 0.4],
  ],
  traps: [['trapezius', 1]],
  triceps: [['triceps', 1]],
};

/**
 * Which deltoid head a movement actually loads, keyed on free-exercise-db's
 * `force` field.
 *
 * Without this, every press lights the rear delts as brightly as the front —
 * a pure push day rendered a lifter's rear delts at 84% fill, which anyone who
 * trains would immediately read as wrong. Pressing is anterior-dominant;
 * rowing and pulling is posterior-dominant. The `force` field already encodes
 * that distinction, so no new data is needed to fix it.
 *
 * Still a convention rather than a measurement — but a much better one.
 */
export const SHOULDER_SPLIT_BY_FORCE: Record<string, Array<[MuscleSlug, number]>> = {
  push: [
    ['front-deltoids', 0.85],
    ['back-deltoids', 0.15],
  ],
  pull: [
    ['back-deltoids', 0.7],
    ['front-deltoids', 0.3],
  ],
};

/**
 * Recruitment weights.
 *
 * IMPORTANT, and stated plainly in the write-up: this is a lookup table, not a
 * measurement. free-exercise-db tells us *which* muscles a movement involves,
 * never *how much*. 1.0 / 0.4 is a convention, chosen so a compound lift reads
 * as clearly dominated by its prime mover without the assistors vanishing.
 *
 * fort-research.md §7.7 ⑧ records that Fort has publicly said it does not yet
 * know whether motion tracking alone can substitute for local EMG in estimating
 * recruitment. This constant is precisely where a real estimate would land.
 */
export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.4;

/** Regions that exist on the figure but are never a training target. */
export const NON_MUSCLE_REGIONS: MuscleSlug[] = ['head', 'knees'];

/** Human-readable names for the figure's regions. */
export const REGION_NAMES: Record<MuscleSlug, string> = {
  abductors: 'abductors',
  abs: 'abs',
  adductor: 'adductors',
  'back-deltoids': 'rear delts',
  biceps: 'biceps',
  calves: 'calves',
  chest: 'chest',
  forearm: 'forearms',
  'front-deltoids': 'front delts',
  gluteal: 'glutes',
  hamstring: 'hamstrings',
  head: 'head',
  knees: 'knees',
  'left-soleus': 'soleus',
  'lower-back': 'lower back',
  neck: 'neck',
  obliques: 'obliques',
  quadriceps: 'quads',
  'right-soleus': 'soleus',
  trapezius: 'traps',
  triceps: 'triceps',
  'upper-back': 'upper back',
};

/** Which side of the figure a region is drawn on. Drives the auto-flip. */
export const REGION_VIEW: Record<MuscleSlug, 'anterior' | 'posterior'> = {
  abductors: 'anterior',
  abs: 'anterior',
  biceps: 'anterior',
  chest: 'anterior',
  'front-deltoids': 'anterior',
  obliques: 'anterior',
  quadriceps: 'anterior',
  neck: 'anterior',
  calves: 'anterior',
  head: 'anterior',
  knees: 'anterior',
  adductor: 'posterior',
  'back-deltoids': 'posterior',
  forearm: 'posterior',
  gluteal: 'posterior',
  hamstring: 'posterior',
  'left-soleus': 'posterior',
  'lower-back': 'posterior',
  'right-soleus': 'posterior',
  trapezius: 'posterior',
  triceps: 'posterior',
  'upper-back': 'posterior',
};
