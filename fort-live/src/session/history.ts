import { MMFIT_HISTORY, type HistoricSession } from './mmfit';
import type { SessionEvent } from './types';

/**
 * One lifter's last thirty days: fifteen real sessions.
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
 * This used to be eighteen generated sessions. They are now fifteen MM-Fit
 * workouts, held out of the model that labelled them and run through the same
 * emitter as the playable ones — see `mmfit.ts` for what is measured and what
 * is not. The one thing still assigned rather than observed is the calendar:
 * MM-Fit's timestamps are recording dates, not a training log.
 *
 * Two consequences of real data worth expecting rather than debugging:
 *
 *  - **Only five of Fort's seven patterns appear.** MM-Fit's protocol has no
 *    hinge and no carry, so the report shows both untouched and the assistant
 *    says so when asked what is being neglected. That is a true statement about
 *    this data, and a more interesting demo than a tidy seven.
 *  - **Every set is ten reps.** The protocol was 3x10, so rep-count spread is
 *    near zero and the baselines lean on velocity and ROM instead. A history of
 *    sets genuinely taken to failure would carry more signal; MM-Fit does not
 *    contain one.
 */

export type { HistoricSession };

export const HISTORY: HistoricSession[] = MMFIT_HISTORY;

/** Newest first — the order `buildBaseline` treats as "sessions ago". */
export const PRIOR_SESSIONS: SessionEvent[][] = HISTORY.map((h) => h.events);

export const HISTORY_WINDOW_DAYS = 30;
