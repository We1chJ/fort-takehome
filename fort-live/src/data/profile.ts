/**
 * What the assistant knows about the person, beyond their training data.
 *
 * A coach who does not know you had a back problem is worse than no coach, so
 * this exists. But it draws a hard line down the middle: the profile lets the
 * assistant know *which numbers to bring up*, and never turns it into something
 * that gives clinical advice.
 *
 * Concretely, a logged lower-back issue means hinge volume is worth mentioning
 * unprompted. It does not mean the app tells anyone whether their back can take
 * it. That question has a right answer and this system does not have it — see
 * `CLINICAL_BOUNDARY` in engine/assistant.ts.
 *
 * The failure being designed against is documented: Strava's AI congratulated a
 * user on a "consistent, well-rounded" week in a note where they had said they
 * were on the way to hospital after being hit by a car (narrative-layer.md §1 ①).
 * A system with one register, applied regardless of context, will eventually say
 * something like that.
 */

export interface HealthNote {
  id: string;
  /** Short label, shown to the user so they can see what the assistant knows. */
  label: string;
  /** Which movement patterns or regions this makes worth watching. */
  watch: string[];
  /** How long ago it was recorded, in days. */
  loggedDaysAgo: number;
}

export interface HealthProfile {
  ageYears: number;
  sex: 'male' | 'female';
  bodyMassKg: number;
  /** What the person has told the app. Never inferred from sensor data. */
  notes: HealthNote[];
}

export const PROFILE: HealthProfile = {
  ageYears: 29,
  sex: 'male',
  bodyMassKg: 78,
  notes: [
    {
      id: 'lower-back',
      label: 'lower-back strain, resolved',
      watch: ['hinge', 'lower back'],
      loggedDaysAgo: 240,
    },
    {
      id: 'left-shoulder',
      label: 'left shoulder impingement, intermittent',
      watch: ['push', 'front delts'],
      loggedDaysAgo: 95,
    },
  ],
};
