import type { MuscleSlug } from '../data/bodyPolygons';
import { NON_MUSCLE_REGIONS, REGION_NAMES } from '../data/muscleMap';
import { getExercise, PATTERNS, type Pattern } from '../data/patterns';
import { HISTORY, HISTORY_WINDOW_DAYS, type HistoricSession } from '../session/history';
import { computeEnergy, DEFAULT_SUBJECT, type Subject } from './energy';
import { accumulate } from './recruitment';
import { computeSets } from './setMetrics';

/**
 * Thirty days, aggregated.
 *
 * Same discipline as the live panel: every number here is computed from the
 * same `SessionEvent` streams the panel reads, through the same engine. There
 * is no separate reporting pipeline that could drift from what the panel says.
 *
 * Time is kept as "days ago" rather than calendar dates. It sidesteps timezones
 * entirely, and it keeps this module pure — a report that renders differently
 * depending on when you open it cannot be tested.
 */

export interface DaySummary {
  daysAgo: number;
  kcal: number;
  /** Wall-clock length of the session, minutes. */
  minutes: number;
  /** Seconds the muscles actually spent loaded — always far less than minutes. */
  tensionSeconds: number;
  label: string;
  sets: number;
}

export interface NamedTotal {
  key: string;
  label: string;
  value: number;
  /** Fraction of the month's total, 0..1. */
  share: number;
}

export interface MonthlyReport {
  windowDays: number;
  sessions: number;
  totalKcal: number;
  totalMinutes: number;
  totalTensionSeconds: number;
  totalSets: number;
  /** Averaged across every day in the window, rest days included. */
  kcalPerDay: number;
  /** Averaged across days that had a session. */
  kcalPerSession: number;
  minutesPerSession: number;

  /** Newest first. */
  days: DaySummary[];
  /** One entry per day in the window, oldest first. Rest days are zero. */
  dailyKcal: number[];
  /** Seven-day trailing mean of `dailyKcal`, same length. */
  dailyKcalTrend: number[];
  /** Oldest first, ~4-5 buckets of 7 days. */
  weeklyMinutes: Array<{ weeksAgo: number; minutes: number; sessions: number }>;

  byMuscle: NamedTotal[];
  byPattern: NamedTotal[];
  /** Patterns with no time at all this month. The report's most useful output. */
  untouchedPatterns: Pattern[];
  topExercises: NamedTotal[];
}

function summariseSession(s: HistoricSession, subject: Subject): DaySummary {
  const sets = computeSets(s.events);
  const totals = accumulate(sets);
  const energy = computeEnergy(s.events, totals.byMuscle, subject);
  const last = s.events[s.events.length - 1];

  return {
    daysAgo: s.daysAgo,
    label: s.label,
    kcal: energy.kcalTotal,
    minutes: last ? last.t / 60 : 0,
    tensionSeconds: totals.totalTensionS,
    sets: sets.length,
  };
}

export function buildMonthlyReport(
  history: HistoricSession[] = HISTORY,
  windowDays = HISTORY_WINDOW_DAYS,
  subject: Subject = DEFAULT_SUBJECT,
): MonthlyReport {
  const inWindow = history.filter((h) => h.daysAgo <= windowDays);
  const days = inWindow
    .map((h) => summariseSession(h, subject))
    .sort((a, b) => a.daysAgo - b.daysAgo);

  const totalKcal = days.reduce((a, d) => a + d.kcal, 0);
  const totalMinutes = days.reduce((a, d) => a + d.minutes, 0);
  const totalTensionSeconds = days.reduce((a, d) => a + d.tensionSeconds, 0);
  const totalSets = days.reduce((a, d) => a + d.sets, 0);

  // Index 0 is the oldest day in the window, so the series reads left to right.
  const dailyKcal = Array.from({ length: windowDays }, () => 0);
  for (const d of days) {
    const i = windowDays - d.daysAgo;
    if (i >= 0 && i < windowDays) dailyKcal[i] += d.kcal;
  }

  const weeks = Math.ceil(windowDays / 7);
  const weeklyMinutes = Array.from({ length: weeks }, (_, w) => {
    const weeksAgo = weeks - 1 - w;
    const inBucket = days.filter(
      (d) => d.daysAgo > weeksAgo * 7 && d.daysAgo <= (weeksAgo + 1) * 7,
    );
    return {
      weeksAgo,
      minutes: inBucket.reduce((a, d) => a + d.minutes, 0),
      sessions: inBucket.length,
    };
  });

  // Muscle and pattern totals re-run the same accumulator over every session.
  const muscleTotals = new Map<string, number>();
  const patternTotals = new Map<Pattern, number>();
  const exerciseTotals = new Map<string, number>();

  for (const h of inWindow) {
    const sets = computeSets(h.events);
    const totals = accumulate(sets);

    for (const [slug, seconds] of Object.entries(totals.byMuscle) as Array<
      [MuscleSlug, number]
    >) {
      if (NON_MUSCLE_REGIONS.includes(slug)) continue;
      // Merge by display name: the figure splits calves across three regions.
      const name = REGION_NAMES[slug];
      muscleTotals.set(name, (muscleTotals.get(name) ?? 0) + seconds);
    }
    for (const [p, seconds] of Object.entries(totals.byPattern) as Array<
      [Pattern, number]
    >) {
      patternTotals.set(p, (patternTotals.get(p) ?? 0) + seconds);
    }
    for (const set of sets) {
      const name = getExercise(set.exerciseId).name;
      exerciseTotals.set(name, (exerciseTotals.get(name) ?? 0) + set.tensionSeconds);
    }
  }

  const rank = (m: Map<string, number>): NamedTotal[] => {
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    return [...m.entries()]
      .map(([key, value]) => ({
        key,
        label: key,
        value,
        share: total > 0 ? value / total : 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Patterns are listed in full, including the untrained ones at zero. An
  // absent pattern is the single most useful thing a monthly view can show, and
  // it is exactly what a pie chart of the trained patterns would hide.
  const patternTotal = [...patternTotals.values()].reduce((a, b) => a + b, 0);
  const byPattern: NamedTotal[] = PATTERNS.map((p) => {
    const value = patternTotals.get(p) ?? 0;
    return { key: p, label: p, value, share: patternTotal > 0 ? value / patternTotal : 0 };
  }).sort((a, b) => b.value - a.value);

  return {
    windowDays,
    sessions: days.length,
    totalKcal,
    totalMinutes,
    totalTensionSeconds,
    totalSets,
    kcalPerDay: totalKcal / windowDays,
    kcalPerSession: days.length ? totalKcal / days.length : 0,
    minutesPerSession: days.length ? totalMinutes / days.length : 0,
    days: [...days].sort((a, b) => a.daysAgo - b.daysAgo),
    dailyKcal,
    dailyKcalTrend: trailingMean(dailyKcal, 7),
    weeklyMinutes,
    byMuscle: rank(muscleTotals),
    byPattern,
    untouchedPatterns: PATTERNS.filter((p) => (patternTotals.get(p) ?? 0) === 0),
    topExercises: rank(exerciseTotals).slice(0, 8),
  };
}

/**
 * Trailing mean over `window` days. Early entries average over what exists
 * rather than padding with zeros, which would drag the start of the line down
 * toward an average nobody actually had.
 */
export function trailingMean(series: number[], window: number): number[] {
  return series.map((_, i) => {
    const from = Math.max(0, i - window + 1);
    const slice = series.slice(from, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
