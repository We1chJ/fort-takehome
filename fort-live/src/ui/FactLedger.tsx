import { useState } from 'react';
import type { EnergyProfile } from '../engine/energy';
import type { Fact } from '../engine/facts';
import { MAX_SURFACED, SURPRISE_THRESHOLD } from '../engine/newsworthiness';
import './FactLedger.css';

interface Props {
  facts: Fact[];
  surfaced: Fact[];
  energy: EnergyProfile;
}

/**
 * The receipts.
 *
 * Every claim the panel makes is listed here with the numbers it was computed
 * from and the window it was measured over — including the claims that did not
 * clear the newsworthiness threshold, marked as held back. Nothing the user
 * reads is unaccounted for, and nothing the system knows is hidden.
 *
 * This is the direct architectural answer to how Strava's Athlete Intelligence
 * failed: a language model was handed raw data and produced confident prose the
 * numbers contradicted. Here no text is generated from data at all. Claims are
 * written next to the arithmetic that justifies them, a statistical filter
 * decides which are worth saying, and the ledger makes the whole chain
 * inspectable.
 */
/**
 * Two different reasons a fact stays quiet, and the ledger should not conflate
 * them: it either failed to clear the threshold, or it cleared it and lost the
 * ranking. Saying "below the bar" about a 1.40 sd fact when the bar is 0.9 is
 * exactly the kind of small dishonesty this whole screen exists to avoid.
 */
function heldBackReason(f: Fact): string {
  return Math.abs(f.surprise) >= SURPRISE_THRESHOLD
    ? `clears the ${SURPRISE_THRESHOLD} sd bar, outranked — only ${MAX_SURFACED} are shown`
    : `below the ${SURPRISE_THRESHOLD} sd bar`;
}

export function FactLedger({ facts, surfaced, energy }: Props) {
  const [open, setOpen] = useState(false);
  const surfacedIds = new Set(surfaced.map((f) => f.id));

  return (
    <div className="ledger">
      <button type="button" className="ledger-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? 'hide the numbers' : 'show the numbers'}
      </button>

      {open && (
        <div className="ledger-body">
          {facts.length === 0 && <p className="ledger-none">Nothing computed yet.</p>}

          {facts.map((f) => {
            const shown = surfacedIds.has(f.id);
            return (
              <article key={f.id} className={`entry${shown ? '' : ' entry-held'}`}>
                <header>
                  <span className="entry-claim">{f.claim}</span>
                  <span className="entry-state">
                    {shown ? 'shown' : 'held back'}
                  </span>
                </header>
                <dl>
                  {f.evidence.map((e) => (
                    <div key={e.label}>
                      <dt>{e.label}</dt>
                      <dd className="num">{e.value}</dd>
                    </div>
                  ))}
                  <div>
                    <dt>measured over</dt>
                    <dd>{f.window}</dd>
                  </div>
                  <div>
                    <dt>departure from your baseline</dt>
                    <dd className="num">
                      {f.surprise.toFixed(2)} sd
                      {!shown && ` · ${heldBackReason(f)}`}
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })}

          <article className="entry entry-method">
            <header>
              <span className="entry-claim">How the kcal figure is built</span>
            </header>
            <dl>
              <div>
                <dt>session estimate</dt>
                <dd className="num">
                  {Math.round(energy.kcalTotal)} kcal ± {energy.errorBandPct}%
                </dd>
              </div>
              <div>
                <dt>method</dt>
                <dd>Keytel et al. (2005), from heart rate, mass, age and sex</dd>
              </div>
              <div>
                <dt>mean heart rate used</dt>
                <dd className="num">{Math.round(energy.meanHr)} bpm</dd>
              </div>
              <div>
                <dt>per-muscle figures</dt>
                <dd>
                  Attributed, not measured. The session estimate is divided by each
                  region’s share of time under tension. No wearable can observe where
                  in the body a calorie was spent.
                </dd>
              </div>
              <div>
                <dt>why time and not load</dt>
                <dd>
                  A wrist sensor cannot see the weight on the bar, and asking for it
                  reintroduces manual logging. Seconds under tension, discounted by
                  range of motion, is what the device does observe.
                </dd>
              </div>
              <div>
                <dt>recruitment shares</dt>
                <dd>
                  A lookup: primary muscles weighted 1.0, secondary 0.4, from
                  free-exercise-db. Which muscles a lift uses is data; how much each
                  contributes is a convention.
                </dd>
              </div>
            </dl>
          </article>
        </div>
      )}
    </div>
  );
}
