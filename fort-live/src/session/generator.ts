import type { HrEvent, SessionEvent } from './types';

/**
 * Turns an authored set list into a SessionEvent stream.
 *
 * The velocity model is the only part of this file with any physiology in it,
 * and it is a model, not a measurement. Two published relationships shape it:
 *
 *  1. Load–velocity. Mean concentric velocity falls roughly linearly as load
 *     rises toward 1RM, ending at a movement-specific minimum velocity
 *     threshold (~0.15–0.3 m/s). Well established in the VBT literature.
 *  2. Within-set velocity loss. Velocity decays across a set as fatigue
 *     accumulates, and the size of that decay tracks proximity to failure.
 *
 * What is NOT established is the exact mapping from either to reps-in-reserve
 * on a *wrist-worn* sensor. No open dataset pairs per-rep velocity with honest
 * RIR labels — I looked. So this generator produces plausible data with the
 * right shape, and `engine/setMetrics.ts` reads it back with a stated,
 * falsifiable RIR model. Neither claims to be validated.
 */

export interface PlannedSet {
  exerciseId: string;
  reps: number;
  /**
   * How close to failure this set was taken, as reps left in the tank at
   * termination. 0 = went to failure. Drives how far velocity decays.
   */
  rirAtEnd: number;
  /** Rest after this set, seconds. */
  restS: number;
  /** Optional: reps performed with a shortened range of motion. */
  shortRomFromRep?: number;
}

/** Deterministic PRNG so scenarios replay identically and tests are stable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Opening concentric velocity for a set.
 *
 * With no load in the schema there is no %1RM to read a load–velocity curve
 * against, so this infers it from the only intensity signal an author gives:
 * how many reps the set had left in it. A set with few total reps to failure
 * was heavy and therefore slow; a long set was light and fast.
 *
 * This is an authoring convenience for generating plausible demo data, not
 * physiology. On a real device this number is measured, not inferred.
 */
function openingVelocity(repsToFailure: number): number {
  return Math.min(0.95, Math.max(0.25, 0.3 + 0.028 * repsToFailure));
}

/** Time spent moving between exercises, seconds. */
const TRANSITION_S = 100;

/** Concentric+eccentric duration of a rep at a given velocity, seconds. */
function repDuration(velocity: number, opening: number): number {
  // Reps lengthen as they slow. Anchored at a ~2.2 s rep when fresh.
  return Math.max(0.8, 2.2 * (opening / velocity));
}

/**
 * Total velocity loss the set should reach by its final rep, given how close
 * to failure it was taken. Anchors: a set left well short barely decays; a set
 * taken to failure loses on the order of 40% of first-rep velocity.
 */
function targetVelocityLoss(rirAtEnd: number): number {
  const anchors: Array<[number, number]> = [
    [0, 0.42],
    [1, 0.34],
    [2, 0.27],
    [3, 0.2],
    [4, 0.14],
    [6, 0.07],
    [10, 0.03],
  ];
  if (rirAtEnd <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (rirAtEnd >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (rirAtEnd >= x0 && rirAtEnd <= x1) {
      const k = (rirAtEnd - x0) / (x1 - x0);
      return y0 + k * (y1 - y0);
    }
  }
  return last[1];
}

export interface GenerateOptions {
  seed?: number;
  startRestS?: number;
}

export function generateSession(
  plan: PlannedSet[],
  opts: GenerateOptions = {},
): SessionEvent[] {
  const rand = mulberry32(opts.seed ?? 7);
  const jitter = (scale: number) => (rand() - 0.5) * 2 * scale;

  const events: SessionEvent[] = [];
  let t = opts.startRestS ?? 8;
  let hr = 78;
  let hrCursor = 0;

  /** Emits 1 Hz samples up to `until`, matching a wrist device's HR channel. */
  const pushHr = (until: number, target: number) => {
    for (; hrCursor < until; hrCursor++) {
      hr += (target - hr) * 0.18 + jitter(1.2);
      events.push({ type: 'hr', t: hrCursor, bpm: Math.round(hr) } satisfies HrEvent);
    }
  };

  plan.forEach((set, setIdx) => {
    // Changing exercise costs more than a rest period: walking to the rack,
    // finding a bench, setting up. Without it a nine-set session came out at
    // fifteen minutes, which made every duration on the monthly report wrong.
    if (setIdx > 0 && plan[setIdx - 1].exerciseId !== set.exerciseId) {
      t += TRANSITION_S;
      pushHr(t, 96);
    }

    const v0 = openingVelocity(set.reps + set.rirAtEnd) * (1 + jitter(0.03));
    const totalLoss = targetVelocityLoss(set.rirAtEnd);

    pushHr(t, 92);
    events.push({ type: 'set_start', t: Number(t.toFixed(2)), exerciseId: set.exerciseId, setIdx });

    for (let repIdx = 0; repIdx < set.reps; repIdx++) {
      // Fatigue accrues faster late in the set, so decay is convex in progress.
      const progress = set.reps === 1 ? 1 : repIdx / (set.reps - 1);
      const decay = totalLoss * Math.pow(progress, 1.55);
      const velocity = Math.max(0.08, v0 * (1 - decay) * (1 + jitter(0.025)));

      const shortened = set.shortRomFromRep !== undefined && repIdx >= set.shortRomFromRep;
      const romFrac = Math.min(1, Math.max(0.55, (shortened ? 0.78 : 0.985) + jitter(0.02)));

      const durationS = repDuration(velocity, v0);

      t += durationS;
      events.push({
        type: 'rep',
        t: Number(t.toFixed(2)),
        exerciseId: set.exerciseId,
        setIdx,
        repIdx,
        concentricVelocity: Number(velocity.toFixed(3)),
        romFrac: Number(romFrac.toFixed(3)),
        durationS: Number(durationS.toFixed(2)),
      });
    }

    events.push({ type: 'set_end', t: Number(t.toFixed(2)), exerciseId: set.exerciseId, setIdx });

    const peak = 112 + (1 - set.rirAtEnd / 10) * 54;
    pushHr(t + 12, peak);
    t += set.restS;
    pushHr(t, 96);
  });

  return events.sort((a, b) => a.t - b.t);
}
