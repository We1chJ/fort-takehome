import { MMFIT_SESSIONS } from './mmfit';
import type { Session } from './types';

/**
 * The three sessions you can play. All real, all MM-Fit, all held out of the
 * model that labelled them.
 *
 * They were chosen because they differ in ways one workout could not show:
 *
 *  - **w14** — 27 sets in 25 minutes, all nine movements. A brisk, complete
 *    session, and the one where the classifier goes 27 for 27.
 *  - **w09** — the same 27 sets in 56 minutes. Identical work, half the pace,
 *    which is the case the panel is built for: the cadence is the rest period,
 *    and here there is twice as much of it.
 *  - **w20** — 24 sets in 46 minutes with no shoulder press at all, and the
 *    one where the model is visibly wrong: 83% on this workout, against 98%
 *    overall. Kept deliberately. A demo where the model is never wrong is not a
 *    demo of the model.
 *
 * There used to be three authored scenarios here — a set taken to failure, an
 * all-push day, and a deliberately unremarkable one — each written to make a
 * particular behaviour visible. They are gone. What they bought was control:
 * the silent case could be guaranteed, and failure could be staged. What they
 * cost was the only question that actually matters, which is whether any of
 * this survives contact with a real sensor.
 */
export const SESSIONS: Session[] = MMFIT_SESSIONS;

export const DEFAULT_SESSION_ID = SESSIONS[0].id;

export function getSession(id: string): Session {
  return SESSIONS.find((s) => s.id === id) ?? SESSIONS[0];
}

export function sessionDuration(s: Session): number {
  return s.events.length ? s.events[s.events.length - 1].t : 0;
}
