import { useMemo, useState } from 'react';
import { mmss } from '../engine/facts';
import { buildMonthlyReport } from '../engine/monthly';
import { DailyColumns, RankedBars, StatTile, WeeklyBars } from './Charts';
import './Report.css';

/**
 * The month.
 *
 * A deliberate second destination, not an extension of the live panel. During a
 * session the only thing on screen is the session; this page is somewhere you
 * go afterwards, on purpose, which keeps the pull-only rule intact — nothing
 * here ever interrupts a set.
 *
 * Four views rather than one scrolling column. A month of training is four
 * separate questions — how much, how hard, where, and what kind — and stacking
 * them vertically made you scroll past three answers to reach the one you
 * wanted. One question per screen, nothing below the fold, and the caption on
 * each is a single line or absent.
 *
 * The same restraint rules apply as on the panel: no goals, no targets, no
 * streak, no ring to close, and nothing compared to anybody but this lifter.
 * Every figure is descriptive. "You trained eighteen times" is a fact; "you hit
 * 90% of your target" would be a grade, and there is no target here to miss.
 */

const VIEWS = ['summary', 'energy', 'body', 'patterns'] as const;
type View = (typeof VIEWS)[number];

export function Report() {
  const r = useMemo(() => buildMonthlyReport(), []);
  const [view, setView] = useState<View>('summary');

  return (
    <div className="report">
      <header className="report-head">
        <h1>the last 30 days</h1>
        <span className="report-sub">
          {r.sessions} sessions · {r.totalSets} sets
        </span>
      </header>

      <nav className="subtabs" aria-label="report views">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            className={`subtab${v === view ? ' subtab-on' : ''}`}
            aria-current={v === view}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </nav>

      <div className="view">
        {view === 'summary' && (
          <>
            <div className="tiles">
              <StatTile
                value={(r.totalMinutes / 60).toFixed(1)}
                unit="hours"
                caption="training time"
              />
              <StatTile
                value={String(Math.round(r.totalKcal))}
                unit="kcal"
                caption="energy burned"
              />
              <StatTile
                value={String(Math.round(r.kcalPerDay))}
                unit="kcal"
                caption="per day"
              />
              <StatTile
                value={String(Math.round(r.minutesPerSession))}
                unit="min"
                caption="per session"
              />
            </div>
            <Panel label="minutes per week" grow>
              <WeeklyBars weeks={r.weeklyMinutes} />
            </Panel>
          </>
        )}

        {view === 'energy' && (
          <Panel
            label="kcal per day"
            note="Estimated from heart rate, ±20%."
            grow
          >
            <DailyColumns values={r.dailyKcal} windowDays={r.windowDays} height={170} />
          </Panel>
        )}

        {view === 'body' && (
          <Panel label="time under tension" note="Attributed, not measured." grow>
            <RankedBars rows={r.byMuscle.slice(0, 9)} unit={mmss} fill />
          </Panel>
        )}

        {view === 'patterns' && (
          <Panel
            label="movement patterns"
            note={
              r.untouchedPatterns.length > 0
                ? `Untrained patterns are listed too — a pie chart could not show ${r.untouchedPatterns.join(', ')}.`
                : undefined
            }
            grow
          >
            <RankedBars rows={r.byPattern} unit={mmss} emptyNote="not trained" fill />
          </Panel>
        )}
      </div>
    </div>
  );
}

function Panel({
  label,
  note,
  grow,
  children,
}: {
  label: string;
  note?: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`rpanel${grow ? ' rpanel-grow' : ''}`}>
      <h2>{label}</h2>
      <div className="rpanel-body">{children}</div>
      {note && <p className="rpanel-note">{note}</p>}
    </section>
  );
}
