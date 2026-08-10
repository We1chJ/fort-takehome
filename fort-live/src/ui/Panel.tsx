import { useState } from 'react';
import type { MuscleSlug } from '../data/bodyPolygons';
import { currentExerciseName, type DerivedState } from '../engine/deriveState';
import { BodyMap } from './BodyMap';
import { EnergyReadout } from './EnergyReadout';
import { InsightSheet } from './InsightSheet';
import { LastSetStrip } from './LastSetStrip';
import { SessionRibbon } from './SessionRibbon';
import './Panel.css';

/**
 * The screen.
 *
 * One view, nothing above the fold that moves on its own, and no route to
 * anywhere else. The ordering is deliberate: the body first because it is
 * readable at arm's length in bad gym light, the last set below it because
 * that is the question a lifter actually has between sets, and the number last
 * because it is the least useful thing here.
 */
export function Panel({ state }: { state: DerivedState }) {
  const [selected, setSelected] = useState<MuscleSlug | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="panel">
      <header className="panel-head">
        <span className="panel-exercise">{currentExerciseName(state)}</span>
        <span className="panel-status label">
          {state.phase === 'working'
            ? `set ${(state.activeSet?.setIdx ?? 0) + 1}`
            : state.phase === 'resting'
              ? `resting ${formatRest(state.restElapsedS)}`
              : 'ready'}
        </span>
      </header>

      <BodyMap
        fill={state.fill}
        active={state.activeRegions}
        suggested={state.suggestedView}
        pulseKey={state.lastCompletedSet?.setIdx ?? -1}
        selected={selected}
        onSelect={setSelected}
      />

      <div className="panel-lower">
        <LastSetStrip
          set={state.lastCompletedSet}
          phrase={state.lastSetPhrase}
          z={state.lastSetZ}
        />
        <EnergyReadout energy={state.energy} selected={selected} hr={state.currentHr} />
        <SessionRibbon sets={state.sets} />
      </div>

      <InsightSheet state={state} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function formatRest(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`;
}
