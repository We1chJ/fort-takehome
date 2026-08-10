import { useMemo, useState } from 'react';
import { SHARING_LABEL, type CareMember, type CareSignal } from '../data/careCircle';
import { changePct, readCircle, scoreBand, type MemberReading } from '../engine/care';
import { Sparkline } from './Charts';
import './Care.css';

/**
 * The people you look after, and the little they have chosen to share.
 *
 * The distinction this page is built around is care versus surveillance, and
 * it is not a matter of tone — it shows up in four concrete decisions:
 *
 *  - **They control it, and you can see that they do.** Each card states the
 *    sharing level in the person's own terms. A paused member still has a card,
 *    so pausing is ordinary rather than an absence someone has to explain.
 *  - **Trends, never raw data.** The most anyone shares is how their own
 *    numbers have moved against their own last month. There is no live feed,
 *    no location, and no way to look at a moment.
 *  - **Change, never cause.** The page can say a measurement moved. It cannot
 *    say why, and it says so out loud rather than leaving the gap for the
 *    reader to fill with the worst thing they can think of.
 *  - **The recommended action is a phone call.** Not an alert, not an
 *    appointment — the smallest step that is definitely appropriate.
 *
 * The page carries almost no prose. Closed, a row is a name and one number.
 * Open, it is that person's numbers and a three-word prompt. Two things paid
 * for that: the sentences describing how each measurement is derived moved to
 * the labels' `title`, and the sentences narrating what moved were cut outright
 * — a delta of −19% next to a falling sparkline already says "daily movement
 * down 19%", and saying it twice is how a care page starts sounding like a
 * ward round.
 *
 * What is deliberately NOT cut is the disclaimer at the foot of the page. It is
 * the only sentence left, and the fewer words surround a number, the more
 * authority the number borrows.
 */
export function Care() {
  const readings = useMemo(() => readCircle(), []);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="care">
      <header className="care-head">
        <h1>people you look after</h1>
        <span className="care-sub">{readings.filter((r) => r.status !== 'paused').length} sharing</span>
      </header>

      <div className="care-list">
        {readings.map((r) => (
          <MemberCard
            key={r.member.id}
            reading={r}
            open={openId === r.member.id}
            onToggle={() =>
              setOpenId((id) => (id === r.member.id ? null : r.member.id))
            }
          />
        ))}
        <InviteRow />
      </div>

      <p className="care-foot">Trends only, shared by choice. Nothing here is a diagnosis.</p>
    </div>
  );
}

function MemberCard({
  reading,
  open,
  onToggle,
}: {
  reading: MemberReading;
  open: boolean;
  onToggle: () => void;
}) {
  const { member, status, steadiness } = reading;
  const paused = status === 'paused';

  return (
    <article className={`member member-${status}`}>
      <button
        type="button"
        className="member-head"
        onClick={onToggle}
        aria-expanded={open}
        disabled={paused}
      >
        <span className="member-id">
          <span className="member-name">{member.name}</span>
          <span className="member-rel">
            {member.relation} · {member.ageYears}
          </span>
        </span>
        {paused && <span className="member-paused-tag">paused</span>}
        <ScoreRing score={steadiness} band={scoreBand(reading)} />
      </button>

      {open && !paused && (
        <div className="member-detail">
          {/* The one thing that survives the prose cull. It is the action, not a
              description of the data — and a page that can show a family the
              numbers but never suggests picking up the phone has quietly become
              the monitoring product this one is trying not to be. Three words is
              the smallest form it can take. */}
          {status === 'changed' && <p className="member-flag">worth a call</p>}

          <div className="member-signals">
            {member.signals.map((s) => (
              <SignalRow key={s.key} signal={s} />
            ))}
          </div>

          <footer className="member-sharing">
            <span>{SHARING_LABEL[member.sharing]}</span>
            <span>synced {synced(member)}</span>
          </footer>
        </div>
      )}
    </article>
  );
}

const RING_R = 21.5;
const RING_C = 2 * Math.PI * RING_R;

/**
 * The dial.
 *
 * It exists because of an ambiguity, not a decoration: a row reading
 * "Margaret  mother · 74      67" is two bare numbers, and the second one looks
 * like a second age. A ring gives the score a shape nothing else on the row
 * has, and settles it before anyone has to think about it.
 *
 * The hue is the only red/amber/green in the app, and it is doubly encoded —
 * the arc sweeps to the score as well. A colourblind reader loses nothing, and
 * the pairs clear ΔE 8.7 under simulation anyway (see tokens.css). The number
 * itself stays in ink: text wears text colours, and the mark beside it carries
 * the state.
 */
function ScoreRing({ score, band }: { score: number | null; band: string | null }) {
  return (
    <span className={`ring${band ? ` ring-${band}` : ' ring-none'}`}>
      <svg viewBox="0 0 46 46" aria-hidden>
        <circle className="ring-track" cx="23" cy="23" r={RING_R} />
        {score !== null && (
          <circle
            className="ring-arc"
            cx="23"
            cy="23"
            r={RING_R}
            strokeDasharray={`${(score / 100) * RING_C} ${RING_C}`}
          />
        )}
      </svg>
      <span className="ring-num num">{score ?? '—'}</span>
    </span>
  );
}

/**
 * The empty seat.
 *
 * A care network is worth nothing with one person in it, so the way to add
 * someone has to be visible before you have anyone to add. It is inert here —
 * but what it says when tapped is the actual product decision: the invitation
 * goes to them, and they choose what it carries.
 */
function InviteRow() {
  const [open, setOpen] = useState(false);

  return (
    <div className="invite">
      <button
        type="button"
        className="invite-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="invite-plus" aria-hidden>
          +
        </span>
        <span>invite someone</span>
      </button>
      {open && (
        <p className="invite-note">
          Not built in this prototype. An invitation would go to them, not to you — they
          pick what it carries, and you see nothing until they do.
        </p>
      )}
    </div>
  );
}

function SignalRow({ signal }: { signal: CareSignal }) {
  const delta = changePct(signal);
  const moved = Math.abs(delta) >= 0.05;

  return (
    <div className="signal">
      <div className="signal-text">
        {/* The sentence on how the device derives this used to sit under every
            row. It is now the label's title — off the screen, still in the
            document, so the provenance is a long-press away rather than four
            lines of prose per signal. */}
        <span className="signal-label" title={signal.provenance}>
          {signal.label}
        </span>
        <span className="signal-value num">
          {fmt(signal.current)} {signal.unit}
          {moved && (
            <span className="signal-delta">
              {delta > 0 ? '+' : '−'}
              {Math.round(Math.abs(delta) * 100)}%
            </span>
          )}
        </span>
      </div>
      <Sparkline values={signal.series} />
    </div>
  );
}

function fmt(n: number): string {
  return n >= 100 ? String(Math.round(n)) : n.toFixed(1);
}

function synced(m: CareMember): string {
  const h = m.lastSyncHoursAgo;
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.round(h)}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
