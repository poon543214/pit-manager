import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { REGIONS, buildCarUrl, fitOf } from '../game/carBuild';
import { PARTS, SLOT_LABEL, byId } from '../shared/constants';
import type { Loadout, Slot } from '../shared/types';
import { Button } from './Button';
import { PerkIcon } from './PerkIcon';
import { PartImg } from './Sprites';

const S = 7; // blueprint scale: one car pixel = 7 screen pixels
const W = 520;
const H = 64 * S;
const CW = 140; // callout width
const CAR_X = (W - 32 * S) / 2;

/** Callout placement and the car point its leader line lands on (car grid units). */
const CALLOUTS: { slot: Slot; side: 'left' | 'right'; top: number; to: [number, number]; open: 'down' | 'up' }[] = [
  { slot: 'aero', side: 'left', top: 0, to: [2, 3.5], open: 'down' },
  { slot: 'engine', side: 'right', top: 216, to: [19, 38], open: 'up' },
  { slot: 'suspension', side: 'left', top: 300, to: [4, 48], open: 'up' },
  { slot: 'gearbox', side: 'right', top: 340, to: [18, 48], open: 'up' },
];
const CALLOUT_H = 60;

interface Props {
  parts: Loadout['parts'];
  owned: string[];
  marketOpen: boolean;
  onFit: (slot: Slot, partId: string | undefined) => void;
  onMarket: () => void;
  /** setup is sealed for the race: show it, but nothing can change */
  locked?: boolean;
}

export function CarBuilder({ parts, owned, marketOpen, onFit, onMarket, locked }: Props) {
  const [hover, setHover] = useState<Slot | null>(null);
  const [open, setOpen] = useState<Slot | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const focus = open ?? hover;

  // the blueprint is drawn at a fixed size; on a narrow screen shrink the whole thing to fit
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    setScale(Math.min(1, el.clientWidth / W)); // before first paint, so it never flashes at full size
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.cb-pop, .cb-callout, .cb-hot')) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = (slot: Slot) => setOpen((o) => (o === slot ? null : slot));

  return (
    <div className="cb-frame" ref={frame} style={{ height: H * scale }}>
      <div
        className={`cb${scale < 1 ? ' scaled' : ''}`}
        ref={root}
        style={{ width: W, height: H, transform: scale < 1 ? `scale(${scale})` : undefined }}
      >
        <div className="cb-floor" style={{ left: CAR_X - 16, width: 32 * S + 32, height: H }} aria-hidden />
        <img className="cb-car pixel" src={buildCarUrl(fitOf(parts))} width={32 * S} height={H} alt="Your car" style={{ left: CAR_X }} />

        <svg className="cb-lines" width={W} height={H} aria-hidden>
          {CALLOUTS.map((c) => {
            const ax = c.side === 'left' ? CW : W - CW;
            const ay = c.top + CALLOUT_H / 2;
            const tx = CAR_X + c.to[0] * S;
            const ty = c.to[1] * S;
            const kx = ax + (c.side === 'left' ? 12 : -12);
            const on = focus === c.slot;
            return (
              <g key={c.slot} className={on ? 'on' : ''}>
                <polyline points={`${ax},${ay} ${kx},${ay} ${tx},${ty}`} />
                <rect x={tx - 3} y={ty - 3} width={6} height={6} />
              </g>
            );
          })}
          {focus &&
            REGIONS[focus].map((r, i) => (
              <rect key={i} className="cb-region" x={CAR_X + r.x * S} y={r.y * S} width={r.w * S} height={r.h * S} />
            ))}
        </svg>

        {(Object.keys(REGIONS) as Slot[]).flatMap((slot) =>
          REGIONS[slot].map((r, i) => (
            <button
              key={`${slot}${i}`}
              className="cb-hot"
              style={{ left: CAR_X + r.x * S, top: r.y * S, width: r.w * S, height: r.h * S }}
              onMouseEnter={() => setHover(slot)}
              onMouseLeave={() => setHover(null)}
              onClick={() => toggle(slot)}
              disabled={locked}
              tabIndex={-1}
              aria-hidden
            />
          )),
        )}

        {CALLOUTS.map((c) => {
          const part = byId(PARTS, parts[c.slot]);
          return (
            <button
              key={c.slot}
              className={`cb-callout glass ${focus === c.slot ? 'on' : ''}`}
              style={{ [c.side]: 0, top: c.top, width: CW, height: CALLOUT_H }}
              aria-expanded={open === c.slot}
              aria-haspopup="listbox"
              onMouseEnter={() => setHover(c.slot)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(c.slot)}
              onBlur={() => setHover(null)}
              onClick={() => toggle(c.slot)}
              disabled={locked}
            >
              <span className="cb-slot">{SLOT_LABEL[c.slot]}</span>
              {part ? (
                <span className="cb-part">
                  <i className={`cb-kind k-${part.kind}`} />
                  {part.name}
                  <PerkIcon id={part.perk} size={12} inButton />
                </span>
              ) : (
                <span className="cb-part cb-empty">Empty · choose</span>
              )}
            </button>
          );
        })}

        {open &&
          (() => {
            const c = CALLOUTS.find((x) => x.slot === open)!;
            const choices = PARTS.filter((p) => p.slot === open && owned.includes(p.id));
            const pos =
              c.open === 'down' ? { top: c.top + CALLOUT_H + 6 } : { bottom: H - c.top + 6 };
            return (
              <div className="cb-pop glass" style={{ [c.side]: 0, ...pos }} role="listbox" aria-label={SLOT_LABEL[open]}>
                {choices.length === 0 && (
                  <div className="cb-none">
                    <span>No {SLOT_LABEL[open].toLowerCase()} parts owned.</span>
                    {marketOpen ? (
                      <Button variant="ghost" onClick={onMarket}>
                        Go to Market
                      </Button>
                    ) : (
                      <span>The Market opens Sunday and Thursday.</span>
                    )}
                  </div>
                )}
                {choices.map((p) => (
                  <button
                    key={p.id}
                    role="option"
                    aria-selected={parts[open] === p.id}
                    className={`cb-opt ${parts[open] === p.id ? 'on' : ''}`}
                    onClick={() => {
                      onFit(open, p.id);
                      setOpen(null);
                    }}
                  >
                    <PartImg p={p} size={28} />
                    <span>
                      <strong className="name-with-perk">
                        {p.name} <PerkIcon id={p.perk} size={12} inButton />
                      </strong>
                      <small>
                        SPD {p.speed} · CRN {p.corner} · BRK {p.brake}
                      </small>
                    </span>
                    <i className={`cb-kind k-${p.kind}`} title={p.kind} />
                  </button>
                ))}
                {parts[open] && (
                  <button
                    className="cb-opt cb-remove"
                    onClick={() => {
                      onFit(open, undefined);
                      setOpen(null);
                    }}
                  >
                    Remove {SLOT_LABEL[open].toLowerCase()}
                  </button>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
