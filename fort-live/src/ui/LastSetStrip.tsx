import { getExercise } from '../data/patterns';
import type { SetMetrics } from '../engine/setMetrics';
import './LastSetStrip.css';

interface Props {
  set: SetMetrics | null;
  phrase: string;
  /** Standard deviations from this lifter's own usual. Sign only, never shown. */
  z: number;
}

/**
 * What just happened, in one strip.
 *
 * Each bar is one rep, its height the concentric velocity of that rep. The
 * shape is the point: a flat row means the set was well short of failure, a
 * falling row means fatigue arrived. A lifter reads that in about a second
 * without being told a number, which is the whole idea.
 *
 * The marker sits at the rep where velocity had fallen far enough to matter.
 * It is drawn as a tick and a word, not as a warning colour — nothing here
 * turns red.
 */
export function LastSetStrip({ set, phrase, z }: Props) {
  if (!set || set.reps.length === 0) {
    return (
      <div className="strip strip-empty">
        <span className="label">no completed sets yet</span>
      </div>
    );
  }

  const ex = getExercise(set.exerciseId);
  const best = set.bestVelocity || 1;
  // The threshold conventionally used as an autoregulation cutoff in
  // velocity-based training. Marked, not enforced — the panel never tells
  // anyone to stop.
  const thresholdIdx = set.reps.findIndex((r) => (best - r.velocity) / best >= 0.2);

  return (
    <div className="strip">
      <div className="strip-head">
        <span className="label">last set</span>
        <span className="label strip-meta">
          {ex.name} · {set.reps.length} reps · {Math.round(set.tensionSeconds)}s
        </span>
      </div>

      <div className="bars" aria-hidden>
        {/* Plain CSS rather than a motion library: three transitions in this
            app did not justify ~100 KB of dependency, and a transition only
            fires when the value actually changes — which here is exactly once
            per new set, giving the stagger for free. */}
        {set.reps.map((rep, i) => {
          const h = Math.max(0.12, rep.velocity / best);
          const short = rep.romFrac < 0.9;
          return (
            <div className="bar-slot" key={rep.repIdx}>
              <div
                className={`bar${short ? ' bar-short' : ''}`}
                style={{ transform: `scaleY(${h})`, transitionDelay: `${i * 45}ms` }}
              />
              {i === thresholdIdx && <span className="tick" />}
            </div>
          );
        })}
      </div>

      <div className="strip-foot">
        <span className={`verdict${z >= 0.7 ? ' verdict-strong' : ''}`}>{phrase}</span>
        {set.romDrop > 0.08 && <span className="aside">last reps came up short</span>}
      </div>
    </div>
  );
}
