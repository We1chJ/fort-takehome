/**
 * The people who have chosen to share something with you.
 *
 * Two design commitments are encoded in this file's shape rather than left to
 * the UI, because they are the difference between care and surveillance:
 *
 *  1. `sharing` is per-person and they own it. There is no level that exposes
 *     raw data — the most anyone shares is trends against their own baseline.
 *     A `paused` member still appears, so pausing is a visible, unremarkable
 *     act rather than a disappearance someone has to explain.
 *
 *  2. Every signal here is something a wrist device genuinely observes, and
 *     every one is compared only to that person's own history. There is no
 *     population norm anywhere in this file. An 82-year-old is not measured
 *     against other 82-year-olds; she is measured against herself last month.
 *
 * The signal that matters most for an older relative is the one Fort's whole
 * thesis is built on. Muscle strength and the ability to rise from a chair are
 * among the better-established predictors of independence in later life, and
 * they decline slowly enough that nobody notices from a weekly phone call.
 * A wearable that already counts reps can count sit-to-stands.
 */

export type SharingLevel = 'trends' | 'activity' | 'paused';

/** Short enough to sit on one line beside the sync time. */
export const SHARING_LABEL: Record<SharingLevel, string> = {
  trends: 'trends only',
  activity: 'trends + activity',
  paused: 'paused',
};

export interface CareSignal {
  key: string;
  label: string;
  unit: string;
  /** Most recent 7-day mean. */
  current: number;
  /** Their own mean over the prior 30 days. */
  baseline: number;
  /** Their own spread over that window. */
  sd: number;
  /** Which way is the direction of concern, for wording only — never colour. */
  concernWhen: 'falls' | 'rises';
  /** Thirty daily values, oldest first. */
  series: number[];
  /** One line on what the device actually measures to produce this. */
  provenance: string;
}

export interface CareMember {
  id: string;
  name: string;
  relation: string;
  ageYears: number;
  sharing: SharingLevel;
  lastSyncHoursAgo: number;
  signals: CareSignal[];
}

/** Deterministic series generator — same PRNG approach as the session data. */
function series(
  base: number,
  noise: number,
  seed: number,
  drift = 0,
  driftFrom = 30,
): number[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: 30 }, (_, i) => {
    const past = i >= driftFrom ? (i - driftFrom) / (30 - driftFrom) : 0;
    return base + drift * past + (rand() - 0.5) * 2 * noise;
  });
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

function signal(
  key: string,
  label: string,
  unit: string,
  provenance: string,
  concernWhen: 'falls' | 'rises',
  values: number[],
): CareSignal {
  const recent = values.slice(-7);
  const prior = values.slice(0, -7);
  return {
    key,
    label,
    unit,
    provenance,
    concernWhen,
    current: mean(recent),
    baseline: mean(prior),
    sd: sd(prior),
    series: values,
  };
}

/**
 * Margaret is the case this page exists for. Her sit-to-stand pace has been
 * slowing for about ten days and her daily movement has come down with it —
 * each change small enough to miss on a phone call, and both pointing the same
 * way. Nothing here says why, because nothing here can know why.
 */
const margaret: CareMember = {
  id: 'margaret',
  name: 'Margaret',
  relation: 'mother',
  ageYears: 74,
  sharing: 'activity',
  lastSyncHoursAgo: 3,
  signals: [
    signal(
      'sit-to-stand',
      'sit-to-stand pace',
      'reps/min',
      'Counted the same way the app counts reps — chair rises detected from wrist motion.',
      'falls',
      series(21, 1.1, 3001, -4.4, 19),
    ),
    signal(
      'active-minutes',
      'daily movement',
      'min',
      'Minutes of sustained walking or activity, from the accelerometer.',
      'falls',
      series(146, 14, 3002, -38, 19),
    ),
    signal(
      'resting-hr',
      'resting heart rate',
      'bpm',
      'Overnight low from the optical heart-rate sensor.',
      'rises',
      series(63, 2.4, 3003),
    ),
    signal(
      'sleep',
      'time asleep',
      'h',
      'Estimated from movement and heart rate overnight.',
      'falls',
      series(6.9, 0.5, 3004),
    ),
  ],
};

const arthur: CareMember = {
  id: 'arthur',
  name: 'Arthur',
  relation: 'father',
  ageYears: 78,
  sharing: 'trends',
  lastSyncHoursAgo: 11,
  signals: [
    signal(
      'sit-to-stand',
      'sit-to-stand pace',
      'reps/min',
      'Counted the same way the app counts reps — chair rises detected from wrist motion.',
      'falls',
      series(17, 1.0, 4001),
    ),
    signal(
      'active-minutes',
      'daily movement',
      'min',
      'Minutes of sustained walking or activity, from the accelerometer.',
      'falls',
      series(98, 16, 4002),
    ),
    signal(
      'resting-hr',
      'resting heart rate',
      'bpm',
      'Overnight low from the optical heart-rate sensor.',
      'rises',
      series(67, 2.2, 4003),
    ),
  ],
};

const priya: CareMember = {
  id: 'priya',
  name: 'Priya',
  relation: 'sister',
  ageYears: 34,
  sharing: 'paused',
  lastSyncHoursAgo: 96,
  signals: [],
};

export const CARE_CIRCLE: CareMember[] = [margaret, arthur, priya];
