import type { RepEvent, SessionEvent } from '../session/types';

export interface RepMetric {
  repIdx: number;
  t: number;
  velocity: number;
  romFrac: number;
  durationS: number;
}

export interface SetMetrics {
  setIdx: number;
  exerciseId: string;
  startT: number;
  /** Time of the last rep seen so far. */
  endT: number;
  /** False while the set is still in progress. */
  complete: boolean;
  reps: RepMetric[];

  /** Time under tension, seconds — summed rep durations, not wall clock. */
  tutS: number;
  /** Fastest rep in the set. Velocity loss is measured from here, not rep 1. */
  bestVelocity: number;
  lastVelocity: number;
  meanVelocity: number;
  /** (best - last) / best, as a fraction. 0 when fewer than two reps. */
  velocityLoss: number;
  meanRomFrac: number;
  /** Mean range of motion over the final third of the set. */
  tailRomFrac: number;
  /** How far the final third of reps fell short of the best ROM in the set. */
  romDrop: number;
  /**
   * THE CURRENCY. Seconds under tension, discounted by range of motion:
   * `Σ over reps of durationS × romFrac`.
   *
   * This replaced mechanical work in joules, which needed a load in kilograms
   * and a bar travel distance in metres. A wrist sensor supplies neither, and
   * asking the user for them reintroduces the logging the product deletes.
   *
   * Time and range, by contrast, are exactly what the device observes. A half
   * rep earns half the credit of a full one, and a grinding set earns more
   * than a fast one of the same rep count because its reps take longer — both
   * of which fall out of the definition rather than being bolted on.
   *
   * What it deliberately does NOT capture is intensity: forty seconds under a
   * light load and forty under a heavy one score the same. That information is
   * genuinely absent from the sensor, so the panel keeps it out of the body map
   * entirely and puts effort where it can be measured — the velocity trace on
   * the last-set strip.
   */
  tensionSeconds: number;
  /** Modelled, not measured. See estimateRir. */
  estimatedRir: number;
}

/**
 * Reps-in-reserve from within-set velocity loss.
 *
 * This inverts the anchors the generator uses, which makes the round trip
 * consistent but does NOT make it validated — a self-consistent loop is not
 * evidence. The honest statement for the write-up: velocity-loss-based
 * autoregulation is well established in the strength literature, the specific
 * loss-to-RIR mapping is movement- and athlete-specific, and no open dataset
 * pairs wrist-derived per-rep velocity with honest RIR labels to fit it
 * against. Replacing this function with a fitted one is the first thing real
 * data would buy.
 */
export function estimateRir(velocityLoss: number): number {
  const anchors: Array<[number, number]> = [
    [0.03, 10],
    [0.07, 6],
    [0.14, 4],
    [0.2, 3],
    [0.27, 2],
    [0.34, 1],
    [0.42, 0],
  ];
  if (velocityLoss <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (velocityLoss >= last[0]) return 0;
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (velocityLoss >= x0 && velocityLoss <= x1) {
      const k = (velocityLoss - x0) / (x1 - x0);
      return y0 + k * (y1 - y0);
    }
  }
  return 0;
}

function summarise(
  setIdx: number,
  exerciseId: string,
  startT: number,
  reps: RepMetric[],
  complete: boolean,
): SetMetrics {
  const velocities = reps.map((r) => r.velocity);
  const bestVelocity = velocities.length ? Math.max(...velocities) : 0;
  const lastVelocity = velocities.length ? velocities[velocities.length - 1] : 0;
  const meanVelocity = velocities.length
    ? velocities.reduce((a, b) => a + b, 0) / velocities.length
    : 0;
  const velocityLoss =
    velocities.length > 1 && bestVelocity > 0
      ? Math.max(0, (bestVelocity - lastVelocity) / bestVelocity)
      : 0;

  const romFracs = reps.map((r) => r.romFrac);
  const meanRomFrac = romFracs.length
    ? romFracs.reduce((a, b) => a + b, 0) / romFracs.length
    : 0;
  const bestRom = romFracs.length ? Math.max(...romFracs) : 0;
  const tailStart = Math.floor((romFracs.length * 2) / 3);
  const tail = romFracs.slice(tailStart);
  const tailMean = tail.length ? tail.reduce((a, b) => a + b, 0) / tail.length : bestRom;
  const romDrop = bestRom > 0 ? Math.max(0, (bestRom - tailMean) / bestRom) : 0;

  const tensionSeconds = reps.reduce((sum, r) => sum + r.durationS * r.romFrac, 0);

  return {
    setIdx,
    exerciseId,
    startT,
    endT: reps.length ? reps[reps.length - 1].t : startT,
    complete,
    reps,
    tutS: reps.reduce((a, r) => a + r.durationS, 0),
    bestVelocity,
    lastVelocity,
    meanVelocity,
    velocityLoss,
    meanRomFrac,
    tailRomFrac: tailMean,
    romDrop,
    tensionSeconds,
    estimatedRir: estimateRir(velocityLoss),
  };
}

/**
 * Folds an event prefix into per-set metrics. Pure: same events in, same
 * metrics out, no clock read, no mutation of the input.
 */
export function computeSets(events: SessionEvent[]): SetMetrics[] {
  const open = new Map<
    number,
    { exerciseId: string; startT: number; reps: RepMetric[] }
  >();
  const order: number[] = [];
  const closed = new Set<number>();

  for (const e of events) {
    if (e.type === 'set_start') {
      open.set(e.setIdx, { exerciseId: e.exerciseId, startT: e.t, reps: [] });
      order.push(e.setIdx);
    } else if (e.type === 'rep') {
      const s = open.get(e.setIdx);
      if (s) s.reps.push(repMetric(e));
    } else if (e.type === 'set_end') {
      closed.add(e.setIdx);
    }
  }

  return order.map((idx) => {
    const s = open.get(idx)!;
    return summarise(idx, s.exerciseId, s.startT, s.reps, closed.has(idx));
  });
}

function repMetric(e: RepEvent): RepMetric {
  return {
    repIdx: e.repIdx,
    t: e.t,
    velocity: e.concentricVelocity,
    romFrac: e.romFrac,
    durationS: e.durationS,
  };
}
