import { useEffect, useMemo, useState } from 'react';
import {
  BODY_VIEWBOX,
  REGIONS,
  type BodyView,
  type MuscleSlug,
} from '../data/bodyPolygons';
import { NON_MUSCLE_REGIONS, REGION_NAMES } from '../data/muscleMap';
import './BodyMap.css';

interface Props {
  fill: Partial<Record<MuscleSlug, number>>;
  /** Regions worked by the set that just finished — these get the pulse. */
  active: MuscleSlug[];
  /** Which way the engine thinks the figure should face. */
  suggested: BodyView;
  /** Set index, used only to re-trigger the pulse when a new set lands. */
  pulseKey: number;
  selected: MuscleSlug | null;
  onSelect: (slug: MuscleSlug | null) => void;
}

/**
 * The figure.
 *
 * Intensity is drawn, never scored. A region's fill is its accumulated share of
 * the session's mechanical work on a single scale, so the picture reads the way
 * the session felt — and there is no number anywhere on it to be graded by.
 *
 * The polygons are blunt and low-poly. Rather than fight that toward anatomical
 * realism, which at this resolution would look worse, the figure leans flat:
 * one accent, no gradients, no outlines. It reads as a diagram of you, not a
 * render of you.
 */
export function BodyMap({
  fill,
  active,
  suggested,
  pulseKey,
  selected,
  onSelect,
}: Props) {
  const [view, setView] = useState<BodyView>(suggested);
  const [userTurned, setUserTurned] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  // The swell has to replay when a second set hits the same muscles, and a
  // keyframe array only re-runs when the animated value changes. So the pulse
  // is a flag that goes up on a new set and comes down on its own.
  useEffect(() => {
    if (pulseKey < 0) return;
    setPulsing(true);
    const id = window.setTimeout(() => setPulsing(false), 1700);
    return () => window.clearTimeout(id);
  }, [pulseKey]);

  // Follow the engine's suggestion until the user turns the figure themselves,
  // then stop overriding them. Auto-rotation that fights the user is worse than
  // no auto-rotation.
  useEffect(() => {
    if (!userTurned) setView(suggested);
  }, [suggested, userTurned]);

  const regions = REGIONS[view];
  const activeSet = useMemo(() => new Set(active), [active]);

  return (
    <div className="body">
      <svg viewBox={BODY_VIEWBOX} className="body-svg" role="img" aria-label={`${view} view`}>
        {regions.map((region) => {
          if (NON_MUSCLE_REGIONS.includes(region.muscle)) {
            return region.points.map((points, i) => (
              <polygon key={`${region.muscle}-${i}`} points={points} className="region-inert" />
            ));
          }

          const level = fill[region.muscle] ?? 0;
          const isActive = pulsing && activeSet.has(region.muscle) && level > 0.02;
          const isSelected = selected === region.muscle;

          // Fill and swell are both CSS. A transition interpolates toward
          // whatever the latest value is, however often it is told, which suits
          // a component that re-derives every frame; the swell replays whenever
          // its class comes back.
          return region.points.map((points, i) => (
            <polygon
              key={`${region.muscle}-${i}`}
              points={points}
              className={[
                'region',
                isSelected ? 'region-selected' : '',
                isActive ? 'region-pulse' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ fillOpacity: 0.1 + level * 0.9 }}
              onClick={() => onSelect(isSelected ? null : region.muscle)}
            />
          ));
        })}
      </svg>

      <div className="body-controls">
        <button
          type="button"
          className="body-flip"
          onClick={() => {
            setUserTurned(true);
            setView((v) => (v === 'anterior' ? 'posterior' : 'anterior'));
          }}
        >
          {view === 'anterior' ? 'front' : 'back'}
        </button>
        {selected && <span className="selected-name">{REGION_NAMES[selected]}</span>}
      </div>
    </div>
  );
}
