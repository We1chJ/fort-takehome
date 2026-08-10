import { useMemo } from 'react';
import { getExercise } from '../data/patterns';
import { SESSIONS } from '../session/scenarios';
import type { SessionEvent } from '../session/types';
import './DevScrubber.css';

interface Props {
  sessionId: string;
  onSessionChange: (id: string) => void;
  now: number;
  duration: number;
  playing: boolean;
  speed: number;
  onSeek: (t: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onSpeedChange: (speed: number) => void;
  onRestart: () => void;
}

/**
 * Playback controls. Not part of the product — a real panel has no timeline,
 * because a real session only moves one way. This exists so the demo can be
 * driven, and it sits outside the phone deliberately.
 */
export function DevScrubber(p: Props) {
  const session = SESSIONS.find((s) => s.id === p.sessionId) ?? SESSIONS[0];

  return (
    <aside className="scrub">
      <div className="scrub-row scrub-sessions">
        {SESSIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`chip${s.id === p.sessionId ? ' chip-on' : ''}`}
            onClick={() => p.onSessionChange(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ExerciseList events={session.events} />

      <EventTape events={session.events} now={p.now} />

      <div className="scrub-row">
        <button type="button" className="chip" onClick={() => p.onPlayingChange(!p.playing)}>
          {p.playing ? 'pause' : 'play'}
        </button>
        <button type="button" className="chip" onClick={p.onRestart}>
          restart
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(1, p.duration)}
          step={0.5}
          value={p.now}
          onChange={(e) => p.onSeek(Number(e.target.value))}
          aria-label="session time"
        />
        <span className="num scrub-time">
          {mmss(p.now)} / {mmss(p.duration)}
        </span>
      </div>

      <div className="scrub-row">
        <span className="label">speed</span>
        {[1, 4, 8, 20].map((s) => (
          <button
            key={s}
            type="button"
            className={`chip${p.speed === s ? ' chip-on' : ''}`}
            onClick={() => p.onSpeedChange(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </aside>
  );
}

/**
 * What is actually in the session you picked.
 *
 * This replaced a paragraph about held-out accuracy and rep error. That belongs
 * in the write-up, not in front of someone trying to choose a session — the
 * question a chip raises is "what is in this one?", and the answer is a list of
 * movements, in the order they were performed, with a count.
 *
 * The names are the classifier's output resolved through the app's exercise
 * table, so this is a list of what the model decided, not of what MM-Fit
 * labelled. On w20 that difference is visible: the model reads several squat
 * sets as lateral raises, and no squat appears here at all.
 */
function ExerciseList({ events }: { events: SessionEvent[] }) {
  const items = useMemo(() => {
    const order: string[] = [];
    const count: Record<string, number> = {};
    for (const e of events) {
      if (e.type !== 'set_start') continue;
      if (!(e.exerciseId in count)) {
        order.push(e.exerciseId);
        count[e.exerciseId] = 0;
      }
      count[e.exerciseId]++;
    }
    return order.map((id) => ({ id, name: getExercise(id).name, sets: count[id] }));
  }, [events]);

  return (
    <ul className="exlist">
      {items.map((e) => (
        <li key={e.id} className="exlist-item">
          {e.name}
          <span className="exlist-sets num">×{e.sets}</span>
        </li>
      ))}
    </ul>
  );
}

const TAPE_LINES = 7;

/**
 * The wire, made visible.
 *
 * Everything the panel above knows, it learned from these lines and nothing
 * else. That is easy to assert in a README and easy to disbelieve, so the tape
 * puts the raw stream next to the rendering and lets the two be watched
 * together — a rep scrolls past here and the figure lights up there.
 *
 * It matters most on the MM-Fit session, where these lines came off a real
 * wrist. The stream is deliberately sparse (see BANDWIDTH_NOTE in types.ts) and
 * that is visible too: minutes of nothing but heart rate, then a burst of reps.
 * A panel fed a 100 Hz sample stream could not have a readout like this,
 * because there would be nothing to read.
 */
function EventTape({ events, now }: { events: SessionEvent[]; now: number }) {
  // Events are time-ordered, so stop at the first one that has not happened.
  const recent = useMemo(() => {
    const out: SessionEvent[] = [];
    for (const e of events) {
      if (e.t > now) break;
      out.push(e);
    }
    return { lines: out.slice(-TAPE_LINES), total: out.length };
  }, [events, now]);

  return (
    <div className="tape" aria-hidden>
      <div className="tape-head">
        <span>event stream</span>
        <span className="num">
          {recent.total} / {events.length}
        </span>
      </div>
      <ol className="tape-lines">
        {recent.lines.map((e) => (
          <li key={`${e.t}-${e.type}-${describe(e)}`} className={`tape-line tape-${e.type}`}>
            <span className="tape-t num">{mmss(e.t)}</span>
            <span className="tape-kind">{KIND[e.type]}</span>
            <span className="tape-detail num">{describe(e)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const KIND: Record<SessionEvent['type'], string> = {
  set_start: 'set',
  rep: 'rep',
  set_end: 'end',
  hr: 'hr',
};

function describe(e: SessionEvent): string {
  switch (e.type) {
    case 'set_start':
      return `${e.exerciseId} #${e.setIdx + 1}`;
    case 'rep':
      return `${e.exerciseId} r${e.repIdx + 1} ${e.concentricVelocity.toFixed(2)}m/s rom${e.romFrac
        .toFixed(2)
        .slice(1)}`;
    case 'set_end':
      return `${e.exerciseId} closed`;
    case 'hr':
      return `${Math.round(e.bpm)} bpm`;
  }
}

function mmss(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
