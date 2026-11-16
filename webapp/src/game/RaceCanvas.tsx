import { useEffect, useRef } from 'react';
import type { RaceResult, Track } from '../shared/types';
import { createCamera } from './camera';
import { carImage, drawCar, loadPlayerCar, type CarImage } from './carSprite';
import { frameAt, raceDuration, type CarFrame } from './playback';
import { ASPHALT, GRASS, buildGeometry, pointAt, renderTrack } from './trackRenderer';

const VIEW_W = 720;
const VIEW_H = 450;

interface Props {
  result: RaceResult;
  track: Track;
  /** sim seconds per real second */
  speed: number;
  /** jump to this race time when it changes (e.g. "skip to end") */
  seekTo?: number;
  onTick: (t: number, frames: CarFrame[]) => void;
  onDone?: () => void;
  /** the player's built car; falls back to the stock sprite */
  playerCar?: CarImage;
}

export function RaceCanvas({ result, track, speed, seekTo, onTick, onDone, playerCar }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speedRef = useRef(speed);
  const timeRef = useRef(0);
  const cb = useRef({ onTick, onDone });
  speedRef.current = speed;
  cb.current = { onTick, onDone };

  useEffect(() => {
    if (seekTo !== undefined) timeRef.current = seekTo;
  }, [seekTo]);

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    const geo = buildGeometry(track);
    const cam = createCamera(VIEW_W, VIEW_H);
    const duration = raceDuration(result);
    // a full grid doesn't fit side by side: three racing lines, inside / middle / outside
    const lanes = new Map(result.entries.map((e, i) => [e.entrant.id, ((i % 3) - 1) * 26]));
    const pitSlot = new Map(result.entries.map((e, i) => [e.entrant.id, (i - (result.entries.length - 1) / 2) * 40]));
    const sprites = new Map<string, CarImage>(result.entries.map((e) => [e.entrant.id, carImage(e.entrant.color)]));
    // after the flag every car rolls on at one cool-down pace, so the spacing on screen keeps the real time gaps
    const winner = result.entries[0];
    const lapPace = geo.length / (winner.total / winner.laps.length);
    const coolPace = Math.min(lapPace * 0.6, (geo.length * 0.8) / Math.max(1, duration - winner.total));
    // reduced motion: the cars still race (they are the content), but the rain hangs still
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H }));

    let raf = 0;
    let last = performance.now();
    let done = false;
    let alive = true;

    Promise.all([renderTrack(track, geo), playerCar ?? loadPlayerCar(result.entries.find((e) => e.entrant.isPlayer)!.entrant.color)])
      .then(([bg, playerImg]) => {
        if (!alive) return;
        sprites.set('player', playerImg);
        const loop = (now: number) => {
          const dt = Math.min(0.1, (now - last) / 1000);
          last = now;
          timeRef.current = Math.min(duration, timeRef.current + dt * speedRef.current);
          const t = timeRef.current;
          const frames = frameAt(result, t);

          const place = (f: CarFrame) => {
            if (f.inPit) {
              const p = pointAt(geo, 0, -ASPHALT / 2 - 58);
              return { x: p.x + Math.cos(p.angle) * pitSlot.get(f.id)!, y: p.y + Math.sin(p.angle) * pitSlot.get(f.id)!, angle: p.angle };
            }
            const d = geo.length * f.progress + (f.finished ? coolPace * (t - f.finishTime) : 0);
            return pointAt(geo, d, lanes.get(f.id)!);
          };

          const me = frames.find((f) => f.id === 'player')!;
          const mp = place(me);
          cam.follow(mp.x, mp.y, dt * Math.max(1, speedRef.current / 8));
          const o = cam.origin();

          ctx.fillStyle = GRASS;
          ctx.fillRect(0, 0, VIEW_W, VIEW_H);
          ctx.drawImage(bg.canvas, o.x + bg.ox, o.y + bg.oy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

          // draw others first so the player car sits on top
          for (const f of [...frames].sort((a) => (a.id === 'player' ? 1 : -1))) {
            const p = place(f);
            drawCar(ctx, sprites.get(f.id)!, p.x - o.x, p.y - o.y, p.angle);
            if (f.id === 'player') {
              ctx.fillStyle = '#E10600';
              ctx.fillRect(Math.round(p.x - o.x) - 5, Math.round(p.y - o.y) - 50, 10, 10);
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(Math.round(p.x - o.x) - 3, Math.round(p.y - o.y) - 48, 6, 6);
            }
          }

          if (result.weather === 'wet') {
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            for (const d of drops) {
              if (!still) {
                d.y = (d.y + dt * 840) % VIEW_H;
                d.x = (d.x + dt * 60) % VIEW_W;
              }
              ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 10);
            }
          }

          cb.current.onTick(t, frames);
          if (t >= duration && !done) {
            done = true;
            cb.current.onDone?.();
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [result, track, playerCar]);

  return <canvas ref={ref} width={VIEW_W} height={VIEW_H} className="race-canvas" />;
}
