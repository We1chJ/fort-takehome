import raw from '../data/mmfit-session.json';
import type { Session, SessionEvent } from './types';

/**
 * A real workout, played through the same pipe as the fake ones.
 *
 * Everything else in this folder is a generator. This file is not: the events
 * came off a smartwatch on someone's left wrist in the MM-Fit dataset, went
 * through the Q1 classifier, and land here in exactly the schema `types.ts`
 * declares. That is the point of the exercise — the contract was written as a
 * bet that a real device could satisfy it, and this is the bet being settled
 * rather than argued.
 *
 * The workout was HELD OUT of training. The model that labelled these sets was
 * fitted on the other twenty workouts and had never seen this one, which is the
 * only version of this demo that means anything.
 *
 * What is measured and what is not — the same table the README keeps, because
 * a real data source makes it easier, not harder, to overclaim:
 *
 *   measured   set boundaries, set timing, heart rate
 *   detected   rep count and timing — 2.56 reps mean error on this workout,
 *                             and three exercises land an OCTAVE out: the
 *                             detector locks onto a harmonic of the cadence, so
 *                             triceps pushdown reads 19 where the truth is 10
 *                             and db-curl reads 5. Left visible rather than
 *                             hand-corrected; a demo that quietly patches its
 *                             own model's mistakes is not a demo of the model.
 *   derived    romFrac      — wrist angular path per rep, normalised against
 *                             this session's best rep of the same movement
 *              velocity     — wrist speed from integrated acceleration, zeroed
 *                             at each rep's turnaround. The WRIST, not the bar.
 *   invented   bodyMassKg   — MM-Fit does not publish subject mass, and Keytel
 *                             needs one. 78 kg, same as the authored sessions.
 *
 * The cast is real work, not laundering. `resolveJsonModule` widens every
 * `type` field to `string`, so the literal union is asserted here, once, at the
 * boundary — and `assertSchema` below actually checks it at load rather than
 * trusting the assertion.
 */

interface Provenance {
  dataset: string;
  workout: string;
  heldOut: boolean;
  setsEmitted: number;
  /** Fraction of sets in THIS workout the held-out model labelled correctly. */
  exerciseAccuracy: number;
  /** Mean absolute error in reps per set, on this workout. */
  repMAE: number;
  /** Sets where the detector landed on a harmonic — roughly double or half. */
  repOctaveErrors: number;
  hrEvents: number;
  measured: string[];
  detected: string[];
  derived: string[];
  invented: string[];
}

const TYPES = new Set(['set_start', 'rep', 'set_end', 'hr']);

function assertSchema(events: SessionEvent[]): SessionEvent[] {
  let last = -Infinity;
  for (const e of events) {
    if (!TYPES.has(e.type)) throw new Error(`mmfit: unknown event type ${e.type}`);
    if (!Number.isFinite(e.t)) throw new Error('mmfit: non-finite timestamp');
    if (e.t < last) throw new Error('mmfit: events are not in time order');
    last = e.t;
  }
  return events;
}

export const MMFIT_PROVENANCE = raw.source as Provenance;

export const MMFIT_SESSION: Session = {
  id: raw.id,
  label: raw.label,
  note: raw.note,
  bodyMassKg: raw.bodyMassKg,
  events: assertSchema(raw.events as SessionEvent[]),
};
