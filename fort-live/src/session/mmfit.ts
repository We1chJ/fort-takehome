import bundle from '../data/mmfit.json';
import type { Session, SessionEvent } from './types';

/**
 * Every session in this app, from a real wrist.
 *
 * There is no generator behind any of it any more. The events came off a
 * left-wrist smartwatch in the MM-Fit dataset, went through the Q1 classifier,
 * and land here in exactly the schema `types.ts` declares. That schema was
 * written first, as a bet that a real device could satisfy it; this file is the
 * bet being settled rather than argued.
 *
 * Every workout was HELD OUT of the model that labelled it. The predictions
 * come from the leave-one-workout-out pass, so there is no path by which a
 * workout was labelled by a model that had seen it.
 *
 * Three workouts are playable and fifteen more are the history. The history is
 * the part that is easy to overlook and hard to do without: "harder than your
 * usual" needs a usual, and while it was generated, the live session was real
 * and the yardstick it was measured against was imaginary. Both ends are
 * measured now.
 *
 * What is measured, detected, derived and invented — the same four-column
 * honesty the rest of the app keeps, because a real source makes overclaiming
 * easier, not harder:
 *
 *   measured   set boundaries, set timing, heart rate
 *   detected   exercise identity (98.0% leave-one-workout-out over 559 sets)
 *              rep count and timing (MAE 1.88; octave errors on some sets,
 *              left visible rather than hand-corrected)
 *   derived    romFrac    — wrist angular path per rep, normalised against that
 *                           session's best rep of the same movement
 *              velocity   — wrist speed from integrated acceleration, zeroed at
 *                           each rep's turnaround. The WRIST, not the bar.
 *   invented   bodyMassKg — MM-Fit does not publish subject mass and Keytel
 *                           needs one
 *              the calendar — MM-Fit's timestamps are recording dates, not a
 *                           training log, so the thirty-day spread is assigned
 *
 * Three workouts (w05, w10, w18) have no wrist heart-rate stream and are left
 * out entirely rather than back-filled, since energy is derived from HR and a
 * session with a blank where the one number goes is worse than one fewer
 * session.
 */

interface Provenance {
  dataset: string;
  workout: string;
  heldOut: boolean;
  setsEmitted: number;
  exercises: string[];
  /** Fraction of sets in THIS workout the held-out model labelled correctly. */
  exerciseAccuracy: number;
  repMAE: number;
  repOctaveErrors: number;
  hrEvents: number;
  measured: string[];
  detected: string[];
  derived: string[];
  invented: string[];
}

const TYPES = new Set(['set_start', 'rep', 'set_end', 'hr']);

/**
 * The cast from JSON is real work, not laundering. `resolveJsonModule` widens
 * every `type` field to `string`, so the literal union is asserted once, here,
 * at the boundary — and then actually checked, because an assertion that is
 * never tested is just a comment with syntax.
 */
function assertSchema(events: SessionEvent[], where: string): SessionEvent[] {
  let last = -Infinity;
  for (const e of events) {
    if (!TYPES.has(e.type)) throw new Error(`mmfit ${where}: unknown event type ${e.type}`);
    if (!Number.isFinite(e.t)) throw new Error(`mmfit ${where}: non-finite timestamp`);
    if (e.t < last) throw new Error(`mmfit ${where}: events out of time order`);
    last = e.t;
  }
  return events;
}

export const MMFIT_BUNDLE = {
  dataset: bundle.dataset,
  sensor: bundle.sensor,
  playable: bundle.workoutsPlayable,
  history: bundle.workoutsHistory,
  excluded: bundle.workoutsExcluded as Record<string, string>,
  totalSets: bundle.totalSets,
};

export const MMFIT_SESSIONS: Session[] = bundle.playable.map((s) => ({
  id: s.id,
  label: s.label,
  note: s.note,
  bodyMassKg: s.bodyMassKg,
  events: assertSchema(s.events as SessionEvent[], s.id),
}));

export const MMFIT_PROVENANCE: Record<string, Provenance> = Object.fromEntries(
  bundle.playable.map((s) => [s.id, s.source as Provenance]),
);

export interface HistoricSession {
  /** Days before today. The newest here is yesterday. */
  daysAgo: number;
  label: string;
  events: SessionEvent[];
}

export const MMFIT_HISTORY: HistoricSession[] = bundle.history.map((h) => ({
  daysAgo: h.daysAgo,
  label: h.label,
  events: assertSchema(h.events as SessionEvent[], h.label),
}));
