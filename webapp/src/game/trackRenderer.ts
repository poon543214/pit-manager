import { COLORS, asset } from '../shared/constants';
import { createRng } from '../shared/rng';
import type { Track } from '../shared/types';

/** World is drawn at 2× the path units so 32×64 car sprites render 1:1. */
export const WORLD_SCALE = 2;
export const ASPHALT = 104;
export const GRASS = '#1C1C1C';
const ROAD = '#3A3A3A';
const KERB = 124;
const MARGIN = 320;

export interface TrackGeometry {
  points: { x: number; y: number; d: number }[];
  length: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Smooth closed Catmull-Rom spline through the control points, sampled with arc length. */
export function buildGeometry(track: Track, step = 6): TrackGeometry {
  const P = track.path.map(([x, y]) => ({ x: x * WORLD_SCALE, y: y * WORLD_SCALE }));
  const n = P.length;
  const raw: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const samples = Math.max(4, Math.ceil(segLen / step));
    for (let s = 0; s < samples; s++) {
      const t = s / samples, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  let d = 0;
  const points = raw.map((p, i) => {
    if (i > 0) d += Math.hypot(p.x - raw[i - 1].x, p.y - raw[i - 1].y);
    return { ...p, d };
  });
  const last = raw[raw.length - 1];
  const length = d + Math.hypot(raw[0].x - last.x, raw[0].y - last.y);
  const xs = raw.map((p) => p.x), ys = raw.map((p) => p.y);
  return {
    points,
    length,
    bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
  };
}

/** Position + heading at distance d along the lap, with a sideways offset. */
export function pointAt(g: TrackGeometry, d: number, offset = 0) {
  d = ((d % g.length) + g.length) % g.length;
  const pts = g.points;
  let lo = 0, hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (pts[mid].d <= d) lo = mid; else hi = mid - 1;
  }
  const a = pts[lo];
  const b = pts[(lo + 1) % pts.length];
  const segEnd = lo + 1 < pts.length ? b.d : g.length;
  const t = segEnd > a.d ? (d - a.d) / (segEnd - a.d) : 0;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  return {
    x: a.x + (b.x - a.x) * t - Math.sin(angle) * offset,
    y: a.y + (b.y - a.y) * t + Math.cos(angle) * offset,
    angle,
  };
}

function tracePath(ctx: CanvasRenderingContext2D, g: TrackGeometry) {
  ctx.beginPath();
  g.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Pre-render the whole circuit once; the race view just blits a window of it. */
export async function renderTrack(track: Track, g: TrackGeometry) {
  const { minX, minY, maxX, maxY } = g.bounds;
  const ox = -minX + MARGIN, oy = -minY + MARGIN;
  const c = document.createElement('canvas');
  c.width = Math.ceil(maxX - minX + MARGIN * 2);
  c.height = Math.ceil(maxY - minY + MARGIN * 2);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // grass: generated tile if available, otherwise speckled dark grey
  const tile = await loadImage(asset('tracks', track.tiles));
  if (tile) {
    ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
    ctx.fillRect(0, 0, c.width, c.height);
  } else {
    ctx.fillStyle = GRASS;
    ctx.fillRect(0, 0, c.width, c.height);
    const rng = createRng(track.id.length * 1013);
    for (let i = 0; i < (c.width * c.height) / 240; i++) {
      ctx.fillStyle = rng.next() < 0.5 ? '#242424' : '#161616';
      ctx.fillRect(Math.floor(rng.next() * c.width / 8) * 8, Math.floor(rng.next() * c.height / 8) * 8, 8, 8);
    }
  }

  ctx.translate(ox, oy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';

  // run-off outline
  tracePath(ctx, g);
  ctx.strokeStyle = COLORS.black;
  ctx.lineWidth = KERB + 8;
  ctx.stroke();
  // kerbs: white base with red dashes
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = KERB;
  ctx.stroke();
  ctx.setLineDash([24, 24]);
  ctx.strokeStyle = COLORS.red;
  ctx.stroke();
  ctx.setLineDash([]);
  // asphalt
  ctx.strokeStyle = ROAD;
  ctx.lineWidth = ASPHALT;
  ctx.stroke();
  // centre line
  ctx.setLineDash([12, 36]);
  ctx.strokeStyle = '#555555';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.setLineDash([]);

  // pit box beside the start line
  const s = pointAt(g, 0);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.fillStyle = COLORS.black;
  ctx.fillRect(-180, -ASPHALT / 2 - 88, 360, 60);
  ctx.fillStyle = COLORS.grey;
  ctx.fillRect(-176, -ASPHALT / 2 - 84, 352, 52);
  ctx.fillStyle = COLORS.white;
  for (let x = -160; x < 160; x += 48) ctx.fillRect(x, -ASPHALT / 2 - 84, 4, 52);
  // chequered start/finish line
  const sq = 8;
  for (let row = 0; row < 2; row++) {
    for (let y = -ASPHALT / 2; y < ASPHALT / 2; y += sq) {
      ctx.fillStyle = ((y / sq + row) & 1) === 0 ? COLORS.white : COLORS.black;
      ctx.fillRect(row * sq - sq, y, sq, sq);
    }
  }
  ctx.restore();

  return { canvas: c, ox, oy };
}
