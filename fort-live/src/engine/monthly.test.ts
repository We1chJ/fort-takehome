import { describe, expect, it } from 'vitest';
import { PATTERNS } from '../data/patterns';
import { HISTORY, HISTORY_WINDOW_DAYS } from '../session/history';
import { buildMonthlyReport, trailingMean } from './monthly';
import { computeSets } from './setMetrics';
import { accumulate } from './recruitment';

const report = buildMonthlyReport();

describe('monthly report', () => {
  it('covers every session in the window and nothing outside it', () => {
    const inWindow = HISTORY.filter((h) => h.daysAgo <= HISTORY_WINDOW_DAYS);
    expect(report.sessions).toBe(inWindow.length);
    expect(report.windowDays).toBe(HISTORY_WINDOW_DAYS);
  });

  it('totals agree with the per-session numbers they came from', () => {
    expect(report.totalKcal).toBeCloseTo(
      report.days.reduce((a, d) => a + d.kcal, 0),
      6,
    );
    expect(report.totalMinutes).toBeCloseTo(
      report.days.reduce((a, d) => a + d.minutes, 0),
      6,
    );
    expect(report.kcalPerDay).toBeCloseTo(report.totalKcal / report.windowDays, 6);
    expect(report.kcalPerSession).toBeCloseTo(report.totalKcal / report.sessions, 6);
  });

  it('reaches the same tension totals as the live engine', () => {
    // The report must not be a second, drifting pipeline. Same events, same
    // accumulator, same answer.
    const direct = HISTORY.filter((h) => h.daysAgo <= HISTORY_WINDOW_DAYS).reduce(
      (sum, h) => sum + accumulate(computeSets(h.events)).totalTensionS,
      0,
    );
    expect(report.totalTensionSeconds).toBeCloseTo(direct, 6);
  });

  it('daily series has one slot per day and sums to the month', () => {
    expect(report.dailyKcal).toHaveLength(HISTORY_WINDOW_DAYS);
    expect(report.dailyKcal.reduce((a, b) => a + b, 0)).toBeCloseTo(report.totalKcal, 6);
    expect(report.dailyKcal.some((v) => v === 0)).toBe(true); // rest days exist
  });

  it('weekly buckets partition the window without double counting', () => {
    const summed = report.weeklyMinutes.reduce((a, w) => a + w.minutes, 0);
    expect(summed).toBeCloseTo(report.totalMinutes, 6);
    const sessions = report.weeklyMinutes.reduce((a, w) => a + w.sessions, 0);
    expect(sessions).toBe(report.sessions);
  });

  it('lists every movement pattern, including untrained ones', () => {
    // The whole reason this is a bar chart and not a pie: an absent pattern has
    // to be visible, and a pie can only draw slices that exist.
    expect(report.byPattern.map((p) => p.key).sort()).toEqual([...PATTERNS].sort());
    expect(report.untouchedPatterns).toContain('carry');
    const carry = report.byPattern.find((p) => p.key === 'carry')!;
    expect(carry.value).toBe(0);
  });

  it('shares sum to 1 wherever there is anything to share', () => {
    const patternShare = report.byPattern.reduce((a, p) => a + p.share, 0);
    expect(patternShare).toBeCloseTo(1, 6);
    const muscleShare = report.byMuscle.reduce((a, m) => a + m.share, 0);
    expect(muscleShare).toBeCloseTo(1, 6);
  });

  it('ranks descending', () => {
    for (const list of [report.byMuscle, report.byPattern, report.topExercises]) {
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].value).toBeGreaterThanOrEqual(list[i].value);
      }
    }
  });

  it('produces figures a human would accept', () => {
    // Guards the class of bug where a generator change silently makes every
    // session fifteen minutes long.
    expect(report.minutesPerSession).toBeGreaterThan(18);
    expect(report.minutesPerSession).toBeLessThan(90);
    expect(report.kcalPerSession).toBeGreaterThan(80);
    expect(report.kcalPerSession).toBeLessThan(700);
    // Muscles are under tension for a fraction of the session's wall clock.
    expect(report.totalTensionSeconds).toBeLessThan(report.totalMinutes * 60);
  });

  it('is pure — same input, same output', () => {
    expect(JSON.stringify(buildMonthlyReport())).toEqual(JSON.stringify(report));
  });

  it('has no NaN anywhere', () => {
    expect(JSON.stringify(report)).not.toContain('NaN');
    expect(JSON.stringify(report)).not.toContain('Infinity');
  });
});

describe('trailingMean', () => {
  it('averages over what exists rather than padding with zeros', () => {
    // Padding would drag the first days of the line toward an average the
    // lifter never actually had.
    expect(trailingMean([10, 20, 30], 7)).toEqual([10, 15, 20]);
  });

  it('uses only the trailing window once past it', () => {
    expect(trailingMean([0, 0, 0, 9, 9, 9], 3)).toEqual([0, 0, 0, 3, 6, 9]);
  });

  it('returns the same length as its input', () => {
    expect(trailingMean(report.dailyKcal, 7)).toHaveLength(report.dailyKcal.length);
  });
});
