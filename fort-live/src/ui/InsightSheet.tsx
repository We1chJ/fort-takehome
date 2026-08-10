import { useRef, useState } from 'react';
import { PATTERNS, type Pattern } from '../data/patterns';
import type { DerivedState } from '../engine/deriveState';
import { renderPassage, SILENT_MESSAGE } from '../engine/newsworthiness';
import { FactLedger } from './FactLedger';
import './InsightSheet.css';

interface Props {
  state: DerivedState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Everything the panel could say, behind a deliberate act of asking.
 *
 * Nothing in here ever appears on its own. There is no notification, no badge,
 * no auto-expand when something interesting happens — the handle looks the same
 * on a session with news and a session without. That is the point: the user
 * decides when they want to be told something, and the system's resting state
 * is silence.
 *
 * If nothing has departed from this lifter's own baseline, the sheet opens and
 * says so. A system that always has something to say is a system that will
 * eventually say something worthless.
 *
 * Motion here is CSS. An animation library was tried and removed — the whole
 * app needs three transitions, and a transform transition plus a dozen lines of
 * pointer events covers all of them without the dependency.
 */
export function InsightSheet({ state, open, onOpenChange }: Props) {
  const passage = renderPassage(state.surfaced);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    startY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startY.current === null) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  };

  const onPointerUp = () => {
    if (startY.current === null) return;
    if (dragY > 90) onOpenChange(false);
    startY.current = null;
    setDragY(0);
  };

  return (
    <>
      <button
        type="button"
        className="handle"
        onClick={() => onOpenChange(true)}
        aria-expanded={open}
        aria-label="show detail"
      >
        <span className="handle-bar" />
      </button>

      <div
        className={`scrim${open ? ' scrim-on' : ''}`}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <section
        className={`sheet${open ? ' sheet-open' : ''}`}
        aria-hidden={!open}
        style={
          dragY > 0
            ? { transform: `translateY(${dragY}px)`, transition: 'none' }
            : undefined
        }
      >
        <div
          className="sheet-grip-area"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="sheet-grip" />
        </div>

        <p className={`passage${passage ? '' : ' passage-silent'}`}>
          {passage ?? SILENT_MESSAGE}
        </p>

        <PatternStrip touched={state.patternsTouched} />

        <FactLedger facts={state.facts} surfaced={state.surfaced} energy={state.energy} />
      </section>
    </>
  );
}

/**
 * Fort Foundations organises training around seven movement patterns rather
 * than muscle groups (fort-research.md §7.7 ⑪). The strip shows which have
 * been touched today — as presence and absence, with no target attached. An
 * untouched pattern is drawn dim, not red.
 */
function PatternStrip({ touched }: { touched: Pattern[] }) {
  const set = new Set(touched);
  return (
    <div className="patterns">
      {PATTERNS.map((p) => (
        <span key={p} className={`pattern${set.has(p) ? ' pattern-on' : ''}`}>
          {p}
        </span>
      ))}
    </div>
  );
}
