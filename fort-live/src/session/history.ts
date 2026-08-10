import { generateSession, type PlannedSet } from './generator';
import type { SessionEvent } from './types';

/**
 * One lifter's last thirty days: eighteen sessions on a four-day rotation.
 *
 * Two things read from this file and they want different slices of it.
 *
 *  - The live panel wants only a *baseline* — how hard this lifter's sets of a
 *    given lift usually go, so every comparison it makes is to their own past
 *    and nothing else. That is Fort's "without making you feel graded"
 *    constraint reduced to an implementation detail: if the only reference
 *    point in the system is the user's own history, there is no external scale
 *    left to be graded on.
 *  - The monthly report wants the whole span, with dates, so it can aggregate.
 *
 * Sessions are generated rather than hand-written so the history obeys the same
 * velocity model as the live session. A real deployment reads this off device.
 */

export interface HistoricSession {
  /** Days before today. 0 would be today; the newest here is yesterday. */
  daysAgo: number;
  label: string;
  events: SessionEvent[];
}

const push: PlannedSet[] = [
  { exerciseId: 'bench-press', reps: 8, rirAtEnd: 6, restS: 140 },
  { exerciseId: 'bench-press', reps: 8, rirAtEnd: 4, restS: 190 },
  { exerciseId: 'bench-press', reps: 7, rirAtEnd: 3, restS: 220 },
  { exerciseId: 'db-shoulder-press', reps: 10, rirAtEnd: 3, restS: 160 },
  { exerciseId: 'db-shoulder-press', reps: 10, rirAtEnd: 2, restS: 160 },
  { exerciseId: 'cable-fly', reps: 12, rirAtEnd: 3, restS: 115 },
  { exerciseId: 'triceps-pushdown', reps: 12, rirAtEnd: 3, restS: 110 },
  { exerciseId: 'lateral-raise', reps: 15, rirAtEnd: 2, restS: 85 },
];

const pull: PlannedSet[] = [
  { exerciseId: 'pull-ups', reps: 8, rirAtEnd: 3, restS: 190 },
  { exerciseId: 'pull-ups', reps: 7, rirAtEnd: 2, restS: 190 },
  { exerciseId: 'barbell-row', reps: 10, rirAtEnd: 3, restS: 175 },
  { exerciseId: 'barbell-row', reps: 10, rirAtEnd: 2, restS: 175 },
  { exerciseId: 'cable-row', reps: 12, rirAtEnd: 3, restS: 145 },
  { exerciseId: 'barbell-curl', reps: 10, rirAtEnd: 2, restS: 115 },
  { exerciseId: 'db-curl', reps: 12, rirAtEnd: 2, restS: 100 },
];

const legs: PlannedSet[] = [
  { exerciseId: 'back-squat', reps: 8, rirAtEnd: 3, restS: 220 },
  { exerciseId: 'back-squat', reps: 8, rirAtEnd: 3, restS: 220 },
  { exerciseId: 'back-squat', reps: 6, rirAtEnd: 2, restS: 230 },
  { exerciseId: 'romanian-deadlift', reps: 10, rirAtEnd: 3, restS: 175 },
  { exerciseId: 'romanian-deadlift', reps: 10, rirAtEnd: 3, restS: 175 },
  { exerciseId: 'walking-lunge', reps: 12, rirAtEnd: 3, restS: 160 },
  { exerciseId: 'hanging-leg-raise', reps: 12, rirAtEnd: 2, restS: 130 },
];

const heavy: PlannedSet[] = [
  { exerciseId: 'deadlift', reps: 5, rirAtEnd: 2, restS: 290 },
  { exerciseId: 'deadlift', reps: 5, rirAtEnd: 1, restS: 290 },
  { exerciseId: 'leg-press', reps: 12, rirAtEnd: 3, restS: 205 },
  { exerciseId: 'romanian-deadlift', reps: 10, rirAtEnd: 4, restS: 175 },
  { exerciseId: 'sit-up', reps: 20, rirAtEnd: 3, restS: 115 },
];

/** A short session — the kind that happens on a bad week. */
const short: PlannedSet[] = [
  { exerciseId: 'push-ups', reps: 18, rirAtEnd: 3, restS: 130 },
  { exerciseId: 'push-ups', reps: 15, rirAtEnd: 2, restS: 130 },
  { exerciseId: 'sit-up', reps: 20, rirAtEnd: 3, restS: 100 },
];

/**
 * Four-day rotation with a deliberately thin patch around three weeks ago —
 * two sessions in eight days, then back to normal. A month of identical weeks
 * would make the report's trend lines meaningless and would not resemble how
 * anybody actually trains.
 */
const PLAN: Array<{ daysAgo: number; label: string; sets: PlannedSet[] }> = [
  { daysAgo: 1, label: 'push', sets: push },
  { daysAgo: 3, label: 'legs', sets: legs },
  { daysAgo: 4, label: 'pull', sets: pull },
  { daysAgo: 6, label: 'heavy', sets: heavy },
  { daysAgo: 8, label: 'push', sets: push },
  { daysAgo: 10, label: 'pull', sets: pull },
  { daysAgo: 11, label: 'legs', sets: legs },
  { daysAgo: 13, label: 'push', sets: push },
  { daysAgo: 15, label: 'heavy', sets: heavy },
  { daysAgo: 17, label: 'pull', sets: pull },
  { daysAgo: 18, label: 'short', sets: short },
  { daysAgo: 22, label: 'short', sets: short },
  { daysAgo: 24, label: 'push', sets: push },
  { daysAgo: 25, label: 'legs', sets: legs },
  { daysAgo: 27, label: 'pull', sets: pull },
  { daysAgo: 28, label: 'push', sets: push },
  { daysAgo: 29, label: 'heavy', sets: heavy },
  { daysAgo: 30, label: 'legs', sets: legs },
];

/**
 * Nobody terminates a set at exactly the same proximity to failure week after
 * week. Repeating the templates verbatim produced baselines with almost no
 * spread — velocity loss for one lift had sd = 0.009 — and against a
 * denominator that small, a completely ordinary set scored 3.6 standard
 * deviations from normal and the panel announced it. Realistic variance in the
 * history is not decoration; it is what makes "unusual" mean anything.
 *
 * The cycle is indexed by how many times a session type has already occurred,
 * not by position in the calendar. Cycling on the global index left each
 * individual exercise seeing a lopsided slice of the pattern — hanging leg
 * raises drew offsets of 0, -1, 0, -1, so their historical mean sat half a rep
 * deeper than the template and an on-template set read as unusually easy. Per
 * session type, the offsets average out and the mean lands where intended.
 */
const RIR_OFFSETS = [0, -1, 1, 0];

function vary(sets: PlannedSet[], occurrence: number): PlannedSet[] {
  const offset = RIR_OFFSETS[occurrence % RIR_OFFSETS.length];
  return sets.map((s) => ({ ...s, rirAtEnd: Math.max(0, s.rirAtEnd + offset) }));
}

const seen: Record<string, number> = {};

export const HISTORY: HistoricSession[] = PLAN.map((p, i) => {
  const occurrence = (seen[p.label] = (seen[p.label] ?? -1) + 1);
  return {
    daysAgo: p.daysAgo,
    label: p.label,
    // Seed varies per entry so two 'push' days are not byte-identical.
    events: generateSession(vary(p.sets, occurrence), { seed: 101 + i * 7 }),
  };
});

/** Newest first — the order `buildBaseline` treats as "sessions ago". */
export const PRIOR_SESSIONS: SessionEvent[][] = HISTORY.map((h) => h.events);

export const HISTORY_WINDOW_DAYS = 30;
