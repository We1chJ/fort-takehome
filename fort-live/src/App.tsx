import { useMemo, useState } from 'react';
import { deriveState } from './engine/deriveState';
import { Assistant } from './ui/Assistant';
import { DEFAULT_SESSION_ID, getSession, sessionDuration } from './session/scenarios';
import { useSessionClock } from './session/useSessionClock';
import { DevScrubber } from './ui/DevScrubber';
import { Panel } from './ui/Panel';
import { PhoneFrame } from './ui/PhoneFrame';
import { Care } from './ui/Care';
import { Report } from './ui/Report';
import { Tabs, type Tab } from './ui/Tabs';

export default function App() {
  const [sessionId, setSessionId] = useState(DEFAULT_SESSION_ID);
  const [tab, setTab] = useState<Tab>('now');
  const session = useMemo(() => getSession(sessionId), [sessionId]);
  const duration = useMemo(() => sessionDuration(session), [session]);

  const clock = useSessionClock(duration);

  // The engine is a pure function of (session, time), so the entire view is
  // recomputed from scratch each frame rather than being kept in sync.
  const state = useMemo(() => deriveState(session, clock.now), [session, clock.now]);

  return (
    <>
      <PhoneFrame>
        <div className="app">
          <Tabs tab={tab} onChange={setTab} />
          {tab === 'now' && <Panel state={state} />}
          {tab === 'month' && <Report />}
          {tab === 'care' && <Care />}
          {/* Available from both views — the questions people have about a
              session and about a month are the same questions. */}
          <Assistant state={state} />
        </div>
      </PhoneFrame>
      {tab === 'now' && (
        <DevScrubber
          sessionId={sessionId}
          onSessionChange={(id) => {
            setSessionId(id);
            clock.restart();
          }}
          now={clock.now}
          duration={duration}
          playing={clock.playing}
          speed={clock.speed}
          onSeek={clock.seek}
          onPlayingChange={clock.setPlaying}
          onSpeedChange={clock.setSpeed}
          onRestart={clock.restart}
        />
      )}
    </>
  );
}
