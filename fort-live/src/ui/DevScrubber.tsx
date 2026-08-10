import { SESSIONS } from '../session/scenarios';
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

      <p className="scrub-note">{session.note}</p>

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

function mmss(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
