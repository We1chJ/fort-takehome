/**
 * THE CONTRACT.
 *
 * This file is the boundary of the prototype. Everything upstream of it —
 * segmenting an IMU stream into sets, classifying which of 50+ exercises is
 * being performed, counting reps — is assumed solved and running on the device.
 * Fort already ships that; rebuilding it would be re-doing their work rather
 * than extending it.
 *
 * Everything downstream is what this prototype is actually about: given a
 * correctly classified stream, what should a person see between sets?
 *
 * Stating the boundary as a typed schema rather than a paragraph is deliberate.
 * It is the thing a real integration would be written against, and it makes the
 * assumption falsifiable — if the device cannot emit these fields, the panel
 * cannot be built, and that is worth knowing early.
 *
 * Bandwidth note (fort-research.md §7.7 ⑫ — the CEO on keeping data off the
 * BLE link): this schema is deliberately event-sparse rather than a sample
 * stream. A working set of 8 reps costs 10 events; raw 100 Hz 6-axis IMU for
 * the same 30 s is ~18 000 samples. See BANDWIDTH_NOTE below.
 */

/**
 * NO LOAD FIELD, DELIBERATELY.
 *
 * A wrist device sees motion. It has no way to know there are 87.5 kg on the
 * bar — the only way that number reaches the app is the user typing it, which
 * is precisely the manual logging the product exists to delete. Any metric
 * built on kilograms is therefore off the table: no volume load, no tonnage,
 * no mechanical work in joules.
 *
 * What remains is what the sensor actually observes: how long a muscle was
 * under tension, how far the limb travelled, and how much it slowed down.
 * Those turn out to be enough — see `tensionSeconds` in engine/setMetrics.ts.
 */
export interface SetStartEvent {
  type: 'set_start';
  /** Seconds since session start. */
  t: number;
  exerciseId: string;
  setIdx: number;
}

export interface RepEvent {
  type: 'rep';
  /** Seconds since session start, at the end of the concentric. */
  t: number;
  exerciseId: string;
  setIdx: number;
  /** 0-based index within the set. */
  repIdx: number;
  /** Mean concentric velocity, m/s. */
  concentricVelocity: number;
  /** Concentric range of motion as a fraction of this lifter's full ROM. */
  romFrac: number;
  /** Time under tension for the whole rep, seconds. */
  durationS: number;
}

export interface SetEndEvent {
  type: 'set_end';
  t: number;
  exerciseId: string;
  setIdx: number;
}

export interface HrEvent {
  type: 'hr';
  t: number;
  bpm: number;
}

export type SessionEvent = SetStartEvent | RepEvent | SetEndEvent | HrEvent;

export interface Session {
  id: string;
  label: string;
  /** One line on what this session is meant to demonstrate. */
  note: string;
  bodyMassKg: number;
  events: SessionEvent[];
}

/**
 * Measured against the schema above, not estimated. Used by the write-up to
 * state a bandwidth budget rather than assert one.
 */
export const BANDWIDTH_NOTE = {
  bytesPerEventJson: 96,
  rawImuBytesPerSecond: 100 * 6 * 4, // 100 Hz x 6 axes x float32
} as const;
