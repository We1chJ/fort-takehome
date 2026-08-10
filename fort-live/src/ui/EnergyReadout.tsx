import { REGION_NAMES } from '../data/muscleMap';
import type { MuscleSlug } from '../data/bodyPolygons';
import type { EnergyProfile } from '../engine/energy';
import './EnergyReadout.css';

interface Props {
  energy: EnergyProfile;
  selected: MuscleSlug | null;
  hr: number;
}

/**
 * The one number on the panel.
 *
 * Everything else here is shape and colour; this is the single place a figure
 * is quoted, and it is deliberately the one users asked for. Two honesty
 * measures ride along with it: the session total is shown rounded with its
 * error band available in the ledger, and tapping a muscle switches the
 * readout to that region's *attributed* share — the wording says attributed,
 * because no wearable can measure where in the body a calorie went.
 */
export function EnergyReadout({ energy, selected, hr }: Props) {
  const share = selected ? (energy.byMuscle[selected] ?? 0) : null;

  return (
    <div className="energy">
      <div className="energy-main">
        <span className="num energy-value">
          {Math.round(share ?? energy.kcalTotal)}
        </span>
        <span className="energy-unit">kcal</span>
        <span className="energy-scope">
          {selected ? `attributed to ${REGION_NAMES[selected]}` : 'this session'}
        </span>
      </div>
      {hr > 0 && (
        <div className="energy-hr">
          <span className="num">{hr}</span>
          <span className="label">bpm</span>
        </div>
      )}
    </div>
  );
}
