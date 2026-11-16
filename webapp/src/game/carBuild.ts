/**
 * The player's car, drawn from what is fitted. One 32×64 grid (nose up) serves the
 * garage blueprint (scaled up) and the race sprite, so the car you build is the car you race.
 */
import { COLORS, PARTS, byId } from '../shared/constants';
import type { Loadout, PartKind, Slot } from '../shared/types';

const { red, white, black, grey } = COLORS;
const TYRE = '#2A2A2A';
const GHOST = 'rgba(138,138,138,0.55)';

export type Fit = Partial<Record<Slot, PartKind>>;

/** Part kinds fitted in a loadout. */
export const fitOf = (parts: Loadout['parts']): Fit =>
  Object.fromEntries(
    Object.entries(parts)
      .filter(([, id]) => id)
      .map(([slot, id]) => [slot, byId(PARTS, id)!.kind]),
  );

/** Where each slot sits on the 32×64 grid: hotspot boxes for the garage. */
export const REGIONS: Record<Slot, { x: number; y: number; w: number; h: number }[]> = {
  aero: [
    { x: 0, y: 0, w: 32, h: 7 },
    { x: 2, y: 53, w: 28, h: 10 },
  ],
  suspension: [
    { x: 0, y: 8, w: 12, h: 15 },
    { x: 20, y: 8, w: 12, h: 15 },
    { x: 0, y: 40, w: 9, h: 15 },
    { x: 23, y: 40, w: 9, h: 15 },
  ],
  engine: [{ x: 10, y: 33, w: 12, h: 11 }],
  gearbox: [{ x: 11, y: 44, w: 10, h: 9 }],
};

type Ctx = CanvasRenderingContext2D;

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = black;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}
const px = (ctx: Ctx, x: number, y: number, w: number, h: number, fill: string) => {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
};
/** dashed outline marking an empty slot */
function ghost(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = GHOST;
  for (let i = 0; i < w; i += 2) {
    ctx.fillRect(x + i, y, 1, 1);
    ctx.fillRect(x + i, y + h - 1, 1, 1);
  }
  for (let j = 0; j < h; j += 2) {
    ctx.fillRect(x, y + j, 1, 1);
    ctx.fillRect(x + w - 1, y + j, 1, 1);
  }
}

function wheels(ctx: Ctx, kind: PartKind | undefined) {
  // stance: stiff-low sits tight, soft-flex wide on coils, dive-control on double wishbones
  const out = kind === 'corner' ? 0 : 1;
  const front: [number, number][] = [[out, 9], [32 - out - 7, 9]];
  const rear: [number, number][] = [[out, 42], [32 - out - 7, 42]];
  for (const [x, y] of [...front, ...rear]) {
    box(ctx, x, y, 7, 12, TYRE);
    px(ctx, x + 1, y + 2, 1, 8, '#3d3d3d');
  }
  const arms = (y: number, leftEdge: number, rightEdge: number) => {
    const l = out + 7;
    const r = 32 - out - 7;
    if (!kind) {
      ghost(ctx, l, y + 4, leftEdge - l, 3);
      ghost(ctx, rightEdge, y + 4, r - rightEdge, 3);
      return;
    }
    if (kind === 'speed') {
      px(ctx, l, y + 5, leftEdge - l, 2, black);
      px(ctx, rightEdge, y + 5, r - rightEdge, 2, black);
      px(ctx, l, y + 5, leftEdge - l, 1, red);
      px(ctx, rightEdge, y + 5, r - rightEdge, 1, red);
    } else if (kind === 'corner') {
      // coil spring: white bar with black turns
      for (const [x0, w] of [[l, leftEdge - l], [rightEdge, r - rightEdge]] as const) {
        px(ctx, x0, y + 3, w, 1, black);
        px(ctx, x0, y + 4, w, 3, white);
        px(ctx, x0, y + 7, w, 1, black);
        for (let i = 1; i < w; i += 2) px(ctx, x0 + i, y + 4, 1, 3, grey);
      }
    } else {
      for (const dy of [3, 7]) {
        px(ctx, l, y + dy, leftEdge - l, 1, black);
        px(ctx, rightEdge, y + dy, r - rightEdge, 1, black);
      }
      px(ctx, l, y + 3, 1, 5, grey);
      px(ctx, r - 1, y + 3, 1, 5, grey);
    }
  };
  arms(9, 12, 20);
  arms(42, 12, 20);
}

function frontWing(ctx: Ctx, kind: PartKind | undefined) {
  if (!kind) return ghost(ctx, 3, 1, 26, 5);
  if (kind === 'speed') {
    box(ctx, 5, 3, 22, 2, red);
    px(ctx, 6, 3, 20, 1, white);
  } else if (kind === 'corner') {
    box(ctx, 1, 1, 30, 5, white);
    px(ctx, 2, 3, 28, 1, black);
    px(ctx, 1, 1, 2, 5, red);
    px(ctx, 29, 1, 2, 5, red);
  } else {
    box(ctx, 3, 2, 26, 3, black);
    box(ctx, 2, 0, 2, 6, grey);
    box(ctx, 28, 0, 2, 6, grey);
  }
}

function rearWing(ctx: Ctx, kind: PartKind | undefined) {
  if (!kind) return ghost(ctx, 4, 54, 24, 7);
  if (kind === 'speed') {
    box(ctx, 7, 56, 18, 3, red);
    px(ctx, 8, 57, 16, 1, white);
  } else if (kind === 'corner') {
    box(ctx, 3, 54, 26, 8, white);
    px(ctx, 4, 57, 24, 1, black);
    px(ctx, 4, 59, 24, 1, black);
  } else {
    box(ctx, 5, 55, 22, 5, black);
    px(ctx, 13, 56, 6, 3, grey); // airbrake flap
    box(ctx, 4, 53, 2, 9, grey);
    box(ctx, 26, 53, 2, 9, grey);
  }
}

function engine(ctx: Ctx, kind: PartKind | undefined) {
  if (!kind) {
    px(ctx, 12, 34, 8, 9, '#2a2a2a');
    ghost(ctx, 12, 34, 8, 9);
    return;
  }
  if (kind === 'speed') {
    box(ctx, 13, 33, 6, 11, white);
    px(ctx, 14, 34, 4, 9, red);
    px(ctx, 15, 34, 2, 9, black);
    px(ctx, 11, 35, 2, 3, black);
    px(ctx, 19, 35, 2, 3, black);
  } else if (kind === 'corner') {
    box(ctx, 12, 34, 8, 7, white);
    px(ctx, 14, 36, 4, 3, red);
  } else {
    box(ctx, 12, 34, 8, 9, black);
    for (let y = 35; y < 43; y += 2) px(ctx, 13, y, 6, 1, grey);
  }
}

function gearbox(ctx: Ctx, kind: PartKind | undefined) {
  if (!kind) {
    px(ctx, 13, 45, 6, 7, '#2a2a2a');
    ghost(ctx, 13, 45, 6, 7);
    return;
  }
  if (kind === 'speed') {
    box(ctx, 14, 44, 4, 9, white);
    px(ctx, 15, 45, 2, 7, red);
  } else if (kind === 'corner') {
    box(ctx, 13, 45, 6, 4, white);
  } else {
    box(ctx, 12, 45, 8, 7, black);
    for (let x = 13; x < 20; x += 2) px(ctx, x, 49, 1, 3, grey); // diffuser fins
  }
}

function draw(ctx: Ctx, fit: Fit, body: string) {
  const stripe = body === white ? red : white;
  wheels(ctx, fit.suspension);
  // nose and chassis
  box(ctx, 12, 5, 8, 15, body);
  box(ctx, 8, 18, 16, 26, body);
  box(ctx, 5, 26, 22, 14, body);
  px(ctx, 8, 26, 16, 14, body);
  px(ctx, 15, 5, 2, 18, stripe);
  // cockpit, halo, helmet
  box(ctx, 12, 23, 8, 9, black);
  px(ctx, 14, 26, 4, 4, red);
  px(ctx, 12, 22, 8, 1, grey);
  engine(ctx, fit.engine);
  gearbox(ctx, fit.gearbox);
  frontWing(ctx, fit.aero);
  rearWing(ctx, fit.aero);
}

const cache = new Map<string, HTMLCanvasElement>();
const key = (fit: Fit, body: string) => `${body}|${fit.engine}|${fit.aero}|${fit.gearbox}|${fit.suspension}`;

export function buildCar(fit: Fit, body: string = red): HTMLCanvasElement {
  const k = key(fit, body);
  let c = cache.get(k);
  if (!c) {
    c = document.createElement('canvas');
    c.width = 32;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    draw(ctx, fit, body);
    cache.set(k, c);
  }
  return c;
}

const urls = new Map<string, string>();
export function buildCarUrl(fit: Fit, body: string = red): string {
  const k = key(fit, body);
  let u = urls.get(k);
  if (!u) {
    u = buildCar(fit, body).toDataURL();
    urls.set(k, u);
  }
  return u;
}
