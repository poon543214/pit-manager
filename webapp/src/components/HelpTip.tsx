import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HELP, type HelpTopic } from '../sim/help';

const TIP_W = 300;

/**
 * A small "?" beside a section heading. Clicking it explains what that choice does in the race.
 * The panel renders at the body so the stepped glass corners can't clip it.
 */
export function HelpTip({ topic }: { topic: HelpTopic }) {
  const help = HELP[topic];
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!at) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Element;
      if (!t.closest('.help-tip') && t !== btn.current) setAt(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAt(null);
      btn.current?.focus();
    };
    const close = () => setAt(null);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', close);
    document.querySelector('main')?.addEventListener('scroll', close);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', close);
      document.querySelector('main')?.removeEventListener('scroll', close);
    };
  }, [at]);

  const left = at ? Math.min(window.innerWidth - TIP_W - 8, Math.max(8, at.left - 12)) : 0;

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={`help-btn${at ? ' on' : ''}`}
        aria-label={help.title}
        aria-expanded={!!at}
        aria-controls={at ? id : undefined}
        onClick={() => setAt((cur) => (cur ? null : btn.current!.getBoundingClientRect()))}
      >
        ?
      </button>
      {at &&
        createPortal(
          <div id={id} className="help-tip glass" role="region" aria-label={help.title} style={{ left, top: at.bottom + 8, width: TIP_W }}>
            <b>{help.title}</b>
            <ul>
              {help.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
