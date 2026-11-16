import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PERKS, THEME_LABEL, type Perk } from '../sim/perks';
import { PixelIcon, type IconName } from './PixelIcon';

const THEME_ICON: Record<Perk['theme'], IconName> = {
  start: 'start',
  finish: 'flag',
  rain: 'rain',
  tyres: 'tyres',
  pit: 'pit',
  steady: 'steady',
  dry: 'sun',
};

const TIP_W = 240;

/**
 * A skill as a single icon. Hovering or focusing it shows the details in a floating glass tip,
 * rendered at the body so clipped glass panels can't cut it off.
 */
/** `inButton`: the icon sits inside a button, so it must not be a tab stop of its own; the button's name already includes it. */
export function PerkIcon({ id, size = 14, inButton = false }: { id: string; size?: number; inButton?: boolean }) {
  const p = PERKS[id];
  const ref = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<DOMRect | null>(null);
  if (!p) return null;

  let tip = null;
  if (at) {
    const below = at.top < 120;
    const left = Math.min(window.innerWidth - TIP_W / 2 - 8, Math.max(TIP_W / 2 + 8, at.left + at.width / 2));
    tip = createPortal(
      <div
        className={`perk-tip glass ${below ? 'below' : ''}`}
        role="tooltip"
        style={{ left, top: below ? at.bottom + 8 : at.top - 8, width: TIP_W }}
      >
        <span className={`perk-theme theme-${p.theme}`}>{THEME_LABEL[p.theme]}</span>
        <b>{p.name}</b>
        <span>{p.text}</span>
      </div>,
      document.body,
    );
  }

  return (
    <>
      <span
        ref={ref}
        className={`perk-icon theme-${p.theme}`}
        role="img"
        aria-label={`${p.name}: ${p.text}`}
        tabIndex={inButton ? undefined : 0}
        onMouseEnter={() => setAt(ref.current!.getBoundingClientRect())}
        onMouseLeave={() => setAt(null)}
        onFocus={() => setAt(ref.current!.getBoundingClientRect())}
        onBlur={() => setAt(null)}
      >
        <PixelIcon name={THEME_ICON[p.theme]} size={size} />
      </span>
      {tip}
    </>
  );
}

export { THEME_ICON };
