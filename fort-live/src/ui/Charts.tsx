import { trailingMean } from '../engine/monthly';
import './Charts.css';

/**
 * Four chart forms, hand-rolled in SVG.
 *
 * Two rules run through all of them and both come from the same place — the
 * data's job picks the form, and colour is assigned by the job colour does:
 *
 *  1. **One hue for the data.** Muscle groups and movement patterns are nominal
 *     categories with no natural order, so shading each bar darker-where-bigger
 *     would double-encode length as colour and spend the only free channel on
 *     information the bar already carries. Every bar is the same accent. The
 *     one exception is the trend line, which is a different *thing* rather than
 *     a different category, and is drawn neutral.
 *  2. **Ranked bars, not pie.** Two reasons. Comparing angles is harder than
 *     comparing lengths, and — the deciding one — a pie can only draw what
 *     exists. A month with no carries has no carry slice, so the single most
 *     useful thing the report can tell you disappears. A bar chart draws that
 *     row at zero and the gap is the first thing you see.
 */

const AXIS_LABEL_EVERY = 7;

export function RankedBars({
  rows,
  unit,
  emptyNote,
  /** Spread rows to fill the height available, for a one-screen view. */
  fill,
  /** Widen for long names — exercise titles do not fit a muscle-name column. */
  labelWidth = 74,
}: {
  rows: Array<{ key: string; label: string; value: number; share: number }>;
  unit: (v: number) => string;
  emptyNote?: string;
  fill?: boolean;
  labelWidth?: number;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <div
      className={`ranked${fill ? ' ranked-fill-height' : ''}`}
      style={{ ['--label-w' as string]: `${labelWidth}px` }}
    >
      {rows.map((r) => (
        <div className="ranked-row" key={r.key}>
          <span className="ranked-label">{r.label}</span>
          <div className="ranked-track">
            <div
              className={`ranked-fill${r.value === 0 ? ' ranked-fill-zero' : ''}`}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
          <span className="ranked-value num">
            {r.value === 0 ? (emptyNote ?? '—') : unit(r.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Daily energy as columns, with a seven-day trailing mean over the top.
 *
 * Columns rather than a line because most days are rest days. A line drawn
 * through zeros implies the lifter was continuously burning something on the
 * way down and back up, which is not what happened — the reader should see
 * discrete days that did or did not have a session.
 *
 * Both marks are kcal on one axis. There is no second scale here, deliberately.
 */
export function DailyColumns({
  values,
  windowDays,
  height = 96,
}: {
  values: number[];
  windowDays: number;
  height?: number;
}) {
  const trend = trailingMean(values, 7);
  const max = Math.max(...values, ...trend, 1);
  const w = 320;
  const h = height;
  const gap = 1.5;
  const bw = (w - gap * (values.length - 1)) / values.length;

  const points = trend
    .map((v, i) => `${(i * (bw + gap) + bw / 2).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`)
    .join(' ');

  return (
    <figure className="chart">
      <div className="chart-legend">
        <span className="chart-key">
          <i className="chart-swatch chart-swatch-accent" /> daily
        </span>
        <span className="chart-key">
          <i className="chart-swatch chart-swatch-line" /> 7-day average
        </span>
      </div>

      <svg viewBox={`0 0 ${w} ${h + 14}`} className="chart-svg" role="img"
        aria-label="Energy burned per day over the last month, with a seven-day average">
        <line x1="0" y1={h} x2={w} y2={h} className="chart-axis" />
        {values.map((v, i) => (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={h - (v / max) * h}
            width={bw}
            height={Math.max(v > 0 ? 1.5 : 0, (v / max) * h)}
            rx={Math.min(1.6, bw / 2)}
            className="chart-col"
          >
            <title>{`${windowDays - i} days ago · ${Math.round(v)} kcal`}</title>
          </rect>
        ))}
        <polyline points={points} className="chart-trend" />
        {values.map((_, i) =>
          i % AXIS_LABEL_EVERY === 0 ? (
            <text key={i} x={i * (bw + gap)} y={h + 11} className="axis-tick">
              {windowDays - i}d
            </text>
          ) : null,
        )}
      </svg>
    </figure>
  );
}

/** Weekly training time. Five buckets, so bars rather than a line. */
export function WeeklyBars({
  weeks,
}: {
  weeks: Array<{ weeksAgo: number; minutes: number; sessions: number }>;
}) {
  const max = Math.max(...weeks.map((w) => w.minutes), 1);

  return (
    <figure className="chart">
      <div className="weekly">
        {weeks.map((wk) => (
          <div className="weekly-col" key={wk.weeksAgo}>
            <div className="weekly-track">
              <div
                className="weekly-fill"
                style={{ height: `${(wk.minutes / max) * 100}%` }}
                title={`${Math.round(wk.minutes)} min over ${wk.sessions} sessions`}
              />
            </div>
            <span className="weekly-value num">{Math.round(wk.minutes)}</span>
            <span className="weekly-tick">
              {wk.weeksAgo === 0 ? 'this wk' : `${wk.weeksAgo}w ago`}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** A headline number. Not a one-bar bar chart. */
export function StatTile({
  value,
  unit,
  caption,
}: {
  value: string;
  unit?: string;
  caption: string;
}) {
  return (
    <div className="tile">
      <div className="tile-value">
        <span className="num">{value}</span>
        {unit && <span className="tile-unit">{unit}</span>}
      </div>
      <span className="tile-caption">{caption}</span>
    </div>
  );
}

/**
 * A bare 30-day trace, no axes.
 *
 * Used where the shape is the whole message and the numbers live in the text
 * beside it. The last seven days are drawn heavier — that is the window the
 * reading compares against the rest, so the mark shows what the sentence means.
 */
export function Sparkline({
  values,
  highlightLast = 7,
}: {
  values: number[];
  highlightLast?: number;
}) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 26;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / span) * (h - 3) - 1.5;
  const pt = (v: number, i: number) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`;

  const cut = Math.max(0, values.length - highlightLast - 1);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" role="img" aria-hidden>
      <polyline points={values.slice(0, cut + 1).map(pt).join(' ')} className="spark-past" />
      <polyline
        points={values
          .slice(cut)
          .map((v, i) => pt(v, i + cut))
          .join(' ')}
        className="spark-recent"
      />
    </svg>
  );
}
