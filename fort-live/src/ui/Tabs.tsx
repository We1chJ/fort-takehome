import './Tabs.css';

export type Tab = 'now' | 'month' | 'care';

/**
 * Two words at the top of the screen.
 *
 * It sits at the top rather than the bottom for two reasons: the bottom edge
 * already belongs to the insight sheet's handle, and a bottom bar would put a
 * permanent navigation strip inside the one view that is supposed to hold
 * nothing but the session.
 *
 * No icons, no badge, no dot when the report has something new in it. The
 * report never asks to be looked at.
 */
export function Tabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabs" aria-label="views">
      {(['now', 'month', 'care'] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          className={`tab${t === tab ? ' tab-on' : ''}`}
          aria-current={t === tab}
          onClick={() => onChange(t)}
        >
          {t}
        </button>
      ))}
    </nav>
  );
}
