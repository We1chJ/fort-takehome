import type { MuscleSlug } from '../data/bodyPolygons';
import type { SessionEvent } from '../session/types';
import type { MuscleTension } from './recruitment';

/**
 * Session energy expenditure, and how it is divided across the figure.
 *
 * Two different claims live in this file and they deserve different amounts of
 * trust:
 *
 *  SESSION kcal is an estimate with real footing. Keytel et al. (2005) fit
 *  energy expenditure to heart rate, body mass, age and sex; it is the equation
 *  behind most consumer HR-based calorie readouts. It is imprecise —
 *  roughly ±20% at an individual level, and worse for resistance training than
 *  for steady-state cardio, because HR during a set reflects pressor response
 *  and breath-holding as much as oxygen cost. `errorBandPct` carries that.
 *
 *  PER-MUSCLE kcal is an ATTRIBUTION, not a measurement. No wearable can
 *  observe where in the body energy was spent. What the panel does is divide
 *  the session estimate by each region's share of TIME UNDER TENSION. Time is
 *  the right divisor available here — a muscle held under load for longer spent
 *  longer consuming energy — and unlike a load-based split it needs no number
 *  the sensor cannot see. It is still a division rule, and the fact ledger
 *  shows the split so it can be argued with rather than believed.
 */

export interface EnergyProfile {
  kcalTotal: number;
  errorBandPct: number;
  byMuscle: Partial<Record<MuscleSlug, number>>;
  /** Minutes of HR data actually used. */
  minutesCovered: number;
  meanHr: number;
}

export interface Subject {
  bodyMassKg: number;
  ageYears: number;
  sex: 'male' | 'female';
}

export const DEFAULT_SUBJECT: Subject = {
  bodyMassKg: 78,
  ageYears: 29,
  sex: 'male',
};

/** Keytel et al. (2005), kcal per minute at a given heart rate. */
export function kcalPerMinute(bpm: number, s: Subject): number {
  const kj =
    s.sex === 'male'
      ? -55.0969 + 0.6309 * bpm + 0.1988 * s.bodyMassKg + 0.2017 * s.ageYears
      : -20.4022 + 0.4472 * bpm - 0.1263 * s.bodyMassKg + 0.074 * s.ageYears;
  return Math.max(0, kj / 4.184);
}

export function computeEnergy(
  events: SessionEvent[],
  muscleTension: MuscleTension,
  subject: Subject = DEFAULT_SUBJECT,
): EnergyProfile {
  const hr = events.filter((e): e is Extract<SessionEvent, { type: 'hr' }> => e.type === 'hr');

  let kcalTotal = 0;
  let hrSum = 0;
  for (let i = 0; i < hr.length; i++) {
    const spanS = i === 0 ? 1 : hr[i].t - hr[i - 1].t;
    kcalTotal += kcalPerMinute(hr[i].bpm, subject) * (spanS / 60);
    hrSum += hr[i].bpm;
  }

  const totalTension = Object.values(muscleTension).reduce((a, b) => a + (b ?? 0), 0);
  const byMuscle: Partial<Record<MuscleSlug, number>> = {};
  if (totalTension > 0) {
    for (const [slug, s] of Object.entries(muscleTension) as Array<[MuscleSlug, number]>) {
      byMuscle[slug] = kcalTotal * (s / totalTension);
    }
  }

  return {
    kcalTotal,
    errorBandPct: 20,
    byMuscle,
    minutesCovered: hr.length / 60,
    meanHr: hr.length ? hrSum / hr.length : 0,
  };
}
