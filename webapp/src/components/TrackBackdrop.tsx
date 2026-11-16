import { useEffect, useRef } from 'react';
import { carImage, drawCar, loadPlayerCar, type CarImage } from '../game/carSprite';
import { GRASS, buildGeometry, pointAt, renderTrack } from '../game/trackRenderer';
import type { Track, Weather } from '../shared/types';

const CRUISE = 260; // world px per second

/** Full-bleed attract loop: our car laps the next circuit while the camera follows. Static under reduced motion. */
export function TrackBackdrop({ track, weather, car: built }: { track: Track; weather: Weather; car?: CarImage }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // read the built car each frame so refitting a part doesn't restart the lap
  const carRef = useRef(built);
  carRef.current = built;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const geo = buildGeometry(track);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let alive = true;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = canvas.width = Math.max(1, Math.round(canvas.clientWidth));
      h = canvas.height = Math.max(1, Math.round(canvas.clientHeight));
      ctx.imageSmoothingEnabled = false;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const drops = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random() }));

    Promise.all([renderTrack(track, geo), loadPlayerCar('#E10600')]).then(([bg, car]) => {
      if (!alive) return;
      let d = geo.length * 0.92;
      let cx: number | null = null;
      let cy = 0;
      let last = performance.now();
      const frame = (now: number) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        if (!still) d += dt * CRUISE;
        const p = pointAt(geo, d, 0);
        // ease the camera so corners swing gently instead of snapping
        if (cx === null) {
          cx = p.x;
          cy = p.y;
        } else {
          const k = 1 - Math.exp(-dt * 2.5);
          cx += (p.x - cx) * k;
          cy += (p.y - cy) * k;
        }
        const ox = Math.round(cx - w / 2);
        const oy = Math.round(cy - h / 2);
        ctx.fillStyle = GRASS;
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bg.canvas, ox + bg.ox, oy + bg.oy, w, h, 0, 0, w, h);
        drawCar(ctx, carRef.current ?? car ?? carImage('#E10600'), p.x - ox, p.y - oy, p.angle);
        if (weather === 'wet') {
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          for (const r of drops) {
            if (!still) {
              r.y = (r.y + dt * 1.6) % 1;
              r.x = (r.x + dt * 0.08) % 1;
            }
            ctx.fillRect(Math.round(r.x * w), Math.round(r.y * h), 2, 10);
          }
        }
        if (!still) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });

    return () => {
      alive = false;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [track, weather]);

  return <canvas ref={ref} className="backdrop" aria-hidden />;
}
