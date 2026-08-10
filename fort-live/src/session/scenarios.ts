import { generateSession, type PlannedSet } from './generator';
import { MMFIT_SESSION } from './mmfit';
import type { Session } from './types';

const BODY_MASS_KG = 78;

/**
 * Three authored sessions. Each exists to make one behaviour visible; a
 * prototype that only demos its happy path has not been tested, it has been
 * rehearsed.
 */

const pushDay: PlannedSet[] = [
  { exerciseId: 'bench-press', reps: 8, rirAtEnd: 6, restS: 95 },
  { exerciseId: 'bench-press', reps: 8, rirAtEnd: 3, restS: 130 },
  { exerciseId: 'bench-press', reps: 7, rirAtEnd: 1, restS: 165 },
  { exerciseId: 'bench-press', reps: 6, rirAtEnd: 0, restS: 180, shortRomFromRep: 4 },
  { exerciseId: 'db-shoulder-press', reps: 10, rirAtEnd: 2, restS: 110 },
  { exerciseId: 'db-shoulder-press', reps: 8, rirAtEnd: 1, restS: 110 },
  { exerciseId: 'cable-fly', reps: 12, rirAtEnd: 3, restS: 80 },
  { exerciseId: 'triceps-pushdown', reps: 12, rirAtEnd: 2, restS: 75 },
  { exerciseId: 'lateral-raise', reps: 14, rirAtEnd: 1, restS: 60 },
];

/**
 * Everything here is push. The point is what the panel does NOT say: no alarm,
 * no nudge, no "you should train legs." It shows an unlit lower body and the
 * pattern strip does the rest. Absence rendered as absence.
 */
const lopsided: PlannedSet[] = [
  { exerciseId: 'bench-press', reps: 8, rirAtEnd: 3, restS: 120 },
  { exerciseId: 'bench-press', reps: 6, rirAtEnd: 1, restS: 140 },
  { exerciseId: 'overhead-press', reps: 7, rirAtEnd: 2, restS: 120 },
  { exerciseId: 'overhead-press', reps: 6, rirAtEnd: 1, restS: 120 },
  { exerciseId: 'push-ups', reps: 18, rirAtEnd: 2, restS: 90 },
  { exerciseId: 'triceps-pushdown', reps: 12, rirAtEnd: 3, restS: 70 },
  { exerciseId: 'lateral-raise', reps: 15, rirAtEnd: 2, restS: 60 },
];

/**
 * A completely unremarkable session — every set lands where this lifter's sets
 * normally land. The newsworthiness filter should find nothing and the sheet
 * should say so. Restraint is the feature; this is the scenario that proves it.
 */
const ordinary: PlannedSet[] = [
  { exerciseId: 'back-squat', reps: 8, rirAtEnd: 3, restS: 150 },
  { exerciseId: 'back-squat', reps: 8, rirAtEnd: 3, restS: 150 },
  { exerciseId: 'back-squat', reps: 8, rirAtEnd: 3, restS: 150 },
  { exerciseId: 'romanian-deadlift', reps: 10, rirAtEnd: 3, restS: 120 },
  { exerciseId: 'romanian-deadlift', reps: 10, rirAtEnd: 3, restS: 120 },
  { exerciseId: 'walking-lunge', reps: 12, rirAtEnd: 3, restS: 110 },
  // RIR must match the history's leg-day entry, or this set reads as unusually
  // easy and the "silent session" scenario stops being silent.
  { exerciseId: 'hanging-leg-raise', reps: 12, rirAtEnd: 2, restS: 70 },
];

export const SESSIONS: Session[] = [
  {
    id: 'push-day',
    label: 'push day',
    note: 'A set taken to failure with the last two reps cut short. The panel should register both.',
    bodyMassKg: BODY_MASS_KG,
    events: generateSession(pushDay, { seed: 11 }),
  },
  {
    id: 'lopsided',
    label: 'all push, no pull',
    note: 'A whole session on one pattern. Shown as an unlit body, not as a warning.',
    bodyMassKg: BODY_MASS_KG,
    events: generateSession(lopsided, { seed: 23 }),
  },
  {
    id: 'ordinary',
    label: 'an ordinary leg day',
    note: 'Sets that land where this lifter’s sets normally land. One hinge set reads a little harder than usual around 10:00; by the end nothing clears the bar and the sheet says so.',
    bodyMassKg: BODY_MASS_KG,
    events: generateSession(ordinary, { seed: 41 }),
  },
  // Not generated. A real wrist, a real session, through the real classifier —
  // and through the identical interface, which is the only reason it can sit in
  // this list at all.
  MMFIT_SESSION,
];

export const DEFAULT_SESSION_ID = 'push-day';

export function getSession(id: string): Session {
  return SESSIONS.find((s) => s.id === id) ?? SESSIONS[0];
}

export function sessionDuration(s: Session): number {
  return s.events.length ? s.events[s.events.length - 1].t : 0;
}
