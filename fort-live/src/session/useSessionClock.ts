import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A playback clock over a recorded session.
 *
 * The panel in a real deployment runs at 1x against a live device. Here it
 * needs to be scrubbable and fast-forwardable, because a reviewer will not sit
 * through 23 minutes of rest periods. Because `deriveState` is pure, seeking is
 * nothing more than changing this number.
 */
export function useSessionClock(duration: number, initialSpeed = 8) {
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(initialSpeed);
  const frame = useRef<number>();
  const last = useRef<number>();

  useEffect(() => {
    if (!playing) return;

    const tick = (ts: number) => {
      if (last.current !== undefined) {
        const dt = (ts - last.current) / 1000;
        setNow((t) => {
          const next = t + dt * speed;
          if (next >= duration) {
            setPlaying(false);
            return duration;
          }
          return next;
        });
      }
      last.current = ts;
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      last.current = undefined;
    };
  }, [playing, speed, duration]);

  const seek = useCallback(
    (t: number) => setNow(Math.min(Math.max(0, t), duration)),
    [duration],
  );

  const restart = useCallback(() => {
    setNow(0);
    setPlaying(true);
  }, []);

  return { now, playing, speed, setPlaying, setSpeed, seek, restart };
}
