import { useEffect, useRef, useState } from 'react';
import { answer, buildContext, SUGGESTED, type Answer } from '../engine/assistant';
import type { DerivedState } from '../engine/deriveState';
import './Assistant.css';

interface Turn {
  id: number;
  question: string;
  reply: Answer;
}

/**
 * A circle in the corner, and the conversation behind it.
 *
 * It is the only persistent control on the live panel, and it earns that by
 * being completely inert: no dot, no unread count, no "I noticed something"
 * nudge. Same rule as everything else here — the user opens it, it never opens
 * itself. A badge would turn the whole design inside out.
 *
 * Every reply is assembled from computed numbers (see engine/assistant.ts) and
 * shows its working, the same as the fact ledger. Nothing is generated.
 */
export function Assistant({ state }: { state: DerivedState }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, open]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    const reply = answer(q, buildContext(state));
    setTurns((t) => [...t, { id: nextId.current++, question: q, reply }]);
    setDraft('');
  };

  return (
    <>
      <button
        type="button"
        className="fab"
        onClick={() => setOpen(true)}
        aria-label="ask about your training"
      >
        <span className="fab-mark" aria-hidden />
      </button>

      <div
        className={`scrim${open ? ' scrim-on' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      <section className={`chat${open ? ' chat-open' : ''}`} aria-hidden={!open}>
        <header className="chat-head">
          <div>
            <h2>ask</h2>
            <p className="chat-scope">
              Answers come from your own sessions. Nothing here is generated.
            </p>
          </div>
          <button type="button" className="chat-close" onClick={() => setOpen(false)}>
            close
          </button>
        </header>

        <div className="chat-scroll" ref={scrollRef}>
          {turns.length === 0 && (
            <p className="chat-empty">
              I can describe what your sessions measured — how much, how hard, what you
              have covered, and roughly what it cost. I cannot answer anything clinical.
            </p>
          )}

          {turns.map((t) => (
            <div className="turn" key={t.id}>
              <p className="turn-q">{t.question}</p>
              <div className={`turn-a${t.reply.deferral ? ' turn-a-defer' : ''}`}>
                <p>{t.reply.text}</p>
                <Evidence rows={t.reply.evidence} />
              </div>
            </div>
          ))}
        </div>

        <div className="chips">
          {SUGGESTED.map((s) => (
            <button key={s} type="button" className="chip-ask" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>

        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ask about your training"
            aria-label="ask about your training"
          />
          <button type="submit" disabled={!draft.trim()}>
            ask
          </button>
        </form>
      </section>
    </>
  );
}

/** The working behind an answer, collapsed by default. */
function Evidence({ rows }: { rows: Answer['evidence'] }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <div className="turn-evidence">
      <button type="button" onClick={() => setOpen((o) => !o)}>
        {open ? 'hide the numbers' : 'show the numbers'}
      </button>
      {open && (
        <dl>
          {rows.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd className="num">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
