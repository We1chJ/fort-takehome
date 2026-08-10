import { getExercise } from '../data/patterns';
import type { SetMetrics } from '../engine/setMetrics';
import './SessionRibbon.css';

/**
 * The session so far, as one row of marks.
 *
 * Each mark is a set; its height is how deep that set went, measured by
 * velocity loss. No counts, no targets, no completion state — the ribbon
 * answers "what has today been" and nothing else. Grouped by exercise so the
 * shape of the session is visible without labels.
 */
export function SessionRibbon({ sets }: { sets: SetMetrics[] }) {
  if (sets.length === 0) return <div className="ribbon ribbon-empty" />;

  const groups: Array<{ exerciseId: string; sets: SetMetrics[] }> = [];
  for (const set of sets) {
    const last = groups[groups.length - 1];
    if (last && last.exerciseId === set.exerciseId) last.sets.push(set);
    else groups.push({ exerciseId: set.exerciseId, sets: [set] });
  }

  return (
    <div className="ribbon">
      {groups.map((g, gi) => (
        <div className="ribbon-group" key={`${g.exerciseId}-${gi}`}>
          <div className="ribbon-marks">
            {g.sets.map((s) => (
              <span
                key={s.setIdx}
                className={`mark${s.complete ? '' : ' mark-open'}`}
                style={{ height: `${6 + Math.min(1, s.velocityLoss / 0.45) * 12}px` }}
                title={`${getExercise(s.exerciseId).name} · set ${s.setIdx + 1}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
