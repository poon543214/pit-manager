/**
 * Procedural placeholder sprites in the brief's palette. Used until the
 * generated PNGs land in public/assets/ — then the <img> wins automatically.
 */
import { COLORS } from '../shared/constants';
import type { PartKind, Slot, TireId } from '../shared/types';

const { red, white, black, grey } = COLORS;

type Ctx = CanvasRenderingContext2D;

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** Filled rect with a 1px black outline. */
function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = black;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

/** Pixel "ellipse" made of horizontal spans, with outline. */
function blob(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, fill: string) {
  for (const [col, grow] of [[black, 1], [fill, 0]] as const) {
    ctx.fillStyle = col;
    const RX = rx + grow;
    const RY = ry + grow;
    for (let y = -RY; y <= RY; y++) {
      const span = Math.round(RX * Math.sqrt(Math.max(0, 1 - (y * y) / (RY * RY))));
      ctx.fillRect(cx - span, cy + y, span * 2, 1);
    }
  }
}

const cache = new Map<string, string>();
const memo = (key: string, draw: () => HTMLCanvasElement) => {
  let url = cache.get(key);
  if (!url) {
    url = draw().toDataURL();
    cache.set(key, url);
  }
  return url;
};

export type HairStyle = 'short' | 'swept' | 'spiky' | 'curly' | 'long' | 'quiff' | 'cropped';

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return toHex(x.map((v, i) => v + (y[i] - v) * t));
};

/**
 * Chibi racer on a 32×32 grid, drawn at 2× into 64×64. Shapes are filled
 * first and the 1px black outline is traced around them afterwards.
 * suit = [main, accent (shoulders, collar, belt), badge].
 */
export function driverSprite(id: string, look: { skin: string; hair: string; hairStyle: HairStyle; eyes?: string; stubble?: boolean }, suit: string[]): string {
  return memo(`driver:${id}`, () => {
    const N = 32;
    const g: (string | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
    const fill = (x: number, y: number, w: number, h: number, c: string) => {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && i < N && j >= 0 && j < N) g[j][i] = c;
    };
    const dot = (x: number, y: number, c: string | null) => { g[y][x] = c; };
    const { skin, hair, hairStyle } = look;
    const [main, accent = black, badge = white] = suit;
    const zip = mix(main, black, 0.22);
    const hand = skin;

    // legs + boots
    fill(11, 25, 10, 2, main);
    fill(11, 27, 4, 2, main); fill(17, 27, 4, 2, main);
    fill(10, 29, 5, 2, '#2A2A2A'); fill(17, 29, 5, 2, '#2A2A2A');
    // arms + hands
    fill(7, 18, 3, 5, main); fill(22, 18, 3, 5, main);
    fill(7, 22, 3, 1, accent); fill(22, 22, 3, 1, accent);
    fill(7, 23, 3, 2, hand); fill(22, 23, 3, 2, hand);
    // torso
    fill(10, 17, 12, 9, main);
    fill(10, 17, 3, 3, accent); fill(19, 17, 3, 3, accent);
    fill(13, 17, 6, 1, accent);
    fill(15, 18, 2, 6, zip);
    fill(10, 23, 12, 1, accent);
    fill(12, 20, 2, 1, badge); fill(18, 19, 2, 2, badge);

    // hair that falls behind the head
    if (hairStyle === 'long') { fill(7, 6, 3, 11, hair); fill(22, 6, 3, 11, hair); }
    if (hairStyle === 'curly') { fill(6, 3, 20, 9, hair); fill(7, 2, 18, 1, hair); fill(6, 12, 3, 2, hair); fill(23, 12, 3, 2, hair); }

    // face
    fill(9, 5, 14, 12, skin);
    dot(9, 16, null); dot(22, 16, null);
    fill(8, 11, 1, 2, skin); fill(23, 11, 1, 2, skin);

    // hair on top
    if (hairStyle === 'quiff') {
      // volume swept up and back, forehead showing, side parting on the left
      fill(13, 0, 7, 1, hair); fill(10, 1, 13, 1, hair);
      fill(8, 2, 16, 5, hair);
      fill(8, 7, 4, 1, hair); fill(19, 7, 5, 1, hair); fill(12, 7, 2, 1, hair);
      fill(8, 8, 2, 2, hair); fill(22, 8, 2, 2, hair);
    } else if (hairStyle === 'cropped') {
      // short and tidy with a high hairline
      fill(9, 2, 14, 1, hair); fill(8, 3, 16, 3, hair);
      fill(8, 6, 3, 1, hair); fill(21, 6, 3, 1, hair);
      fill(8, 7, 1, 3, hair); fill(23, 7, 1, 3, hair);
    } else {
      fill(9, 2, 14, 1, hair);
      fill(8, 3, 16, 5, hair);
    }
    if (hairStyle === 'quiff' || hairStyle === 'cropped') {
      // drawn above
    } else if (hairStyle === 'short') {
      fill(8, 8, 2, 3, hair); fill(22, 8, 2, 3, hair);
      for (const x of [10, 11, 13, 14, 17, 18, 20, 21]) dot(x, 8, hair);
    } else if (hairStyle === 'swept') {
      fill(8, 8, 2, 3, hair); fill(22, 8, 2, 2, hair);
      fill(10, 8, 7, 1, hair); fill(10, 9, 3, 1, hair);
    } else if (hairStyle === 'spiky') {
      for (const x of [9, 12, 15, 18, 21]) { dot(x, 1, hair); dot(x + 1, 1, hair); dot(x + 1, 0, hair); }
      fill(8, 8, 2, 2, hair); fill(22, 8, 2, 2, hair);
      for (const x of [11, 15, 16, 20]) dot(x, 8, hair);
    } else if (hairStyle === 'curly') {
      for (const x of [8, 12, 16, 20]) fill(x + 1, 1, 2, 1, hair);
      for (const x of [10, 12, 14, 16, 18, 20]) dot(x + 1, 8, hair);
    } else {
      fill(10, 8, 5, 1, hair); fill(17, 8, 5, 1, hair); fill(10, 9, 2, 1, hair); fill(20, 9, 2, 1, hair);
    }

    // outline: every empty pixel touching a filled one
    const out: [number, number][] = [];
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        if (g[y][x]) continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx]);
        if (near) out.push([x, y]);
      }
    for (const [x, y] of out) g[y][x] = black;

    // face details (drawn after the outline so they sit inside it)
    const brow = mix(hair, black, 0.3);
    fill(11, 10, 3, 1, brow); fill(18, 10, 3, 1, brow);
    const eye = look.eyes ?? black;
    fill(12, 11, 1, 2, eye); fill(19, 11, 1, 2, eye);
    if (hairStyle === 'quiff') {
      // sweep lines: lighter strands rising from the parting toward the back right
      const lite = mix(hair, white, 0.28);
      const dark = mix(hair, black, 0.3);
      for (const [x, y] of [[11, 6], [12, 5], [13, 4], [14, 3], [15, 2], [16, 1], [16, 6], [17, 5], [18, 4], [19, 3], [20, 2]]) dot(x, y, lite);
      for (const [x, y] of [[9, 3], [9, 4], [10, 5], [10, 6], [11, 7]]) dot(x, y, dark);
    }
    if (look.stubble) {
      const beard = mix(skin, hair, 0.4);
      fill(10, 14, 2, 1, beard); fill(20, 14, 2, 1, beard);
      fill(10, 15, 12, 1, beard); fill(11, 16, 10, 1, beard);
      fill(9, 12, 1, 4, beard); fill(22, 12, 1, 4, beard);
    }
    const blush = mix(skin, '#E0504A', 0.35);
    fill(10, 13, 2, 1, blush); fill(20, 13, 2, 1, blush);
    fill(15, 14, 2, 1, mix(skin, '#8A3A2A', 0.45));
    // limb seams
    fill(10, 18, 1, 5, black); fill(21, 18, 1, 5, black);

    const [c, ctx] = canvas(64, 64);
    ctx.fillStyle = 'rgba(17,17,17,0.3)';
    ctx.fillRect(16, 62, 32, 2);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const col = g[y][x];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * 2, y * 2, 2, 2);
      }
    return c;
  });
}

const ACCENT: Record<PartKind, string> = { speed: red, corner: white, brake: black };

export function partSprite(slot: Slot, kind: PartKind): string {
  return memo(`part:${slot}:${kind}`, () => {
    const [c, ctx] = canvas(32, 32);
    const a = ACCENT[kind];
    const body = kind === 'brake' ? grey : black;
    if (slot === 'engine') {
      box(ctx, 6, 11, 20, 13, body);
      for (let i = 0; i < 3; i++) box(ctx, 8 + i * 6, 6, 4, 4, a);
      box(ctx, 3, 15, 2, 5, grey); box(ctx, 27, 15, 2, 5, grey);
      ctx.fillStyle = a; ctx.fillRect(8, 19, 16, 2);
    } else if (slot === 'aero') {
      const tilt = kind === 'speed' ? 0 : kind === 'corner' ? 2 : 4;
      box(ctx, 3, 10, 26, 4 + tilt, a);
      box(ctx, 3, 8, 3, 12, body); box(ctx, 26, 8, 3, 12, body);
      box(ctx, 13, 18 + tilt / 2, 2, 8, grey); box(ctx, 17, 18 + tilt / 2, 2, 8, grey);
    } else if (slot === 'gearbox') {
      blob(ctx, 16, 16, 11, 11, body);
      blob(ctx, 16, 16, 7, 7, a);
      blob(ctx, 16, 16, 3, 3, grey);
      ctx.fillStyle = body;
      for (const [x, y] of [[15, 2], [15, 27], [2, 15], [27, 15]]) ctx.fillRect(x, y, 3, 3);
    } else {
      box(ctx, 10, 3, 12, 3, grey); box(ctx, 10, 26, 12, 3, grey);
      for (let i = 0; i < 5; i++) box(ctx, 9 + (i % 2) * 2, 7 + i * 4, 12, 2, a);
      box(ctx, 15, 6, 2, 20, body);
    }
    return c;
  });
}

export function tireSprite(id: TireId): string {
  return memo(`tire:${id}`, () => {
    const [c, ctx] = canvas(32, 32);
    const stripe = id === 'soft' ? red : id === 'medium' ? white : grey;
    blob(ctx, 16, 16, 13, 13, black);
    blob(ctx, 16, 16, 10, 10, stripe);
    blob(ctx, 16, 16, 8, 8, black);
    blob(ctx, 16, 16, 4, 4, grey);
    return c;
  });
}

/** 32×64 top-down car, nose up. */
export function carCanvas(body: string): HTMLCanvasElement {
  const [c, ctx] = canvas(32, 64);
  const stripe = body === white ? red : white;
  const wing = body === black ? grey : black;
  // wheels
  for (const [x, y] of [[1, 9], [24, 9], [1, 43], [24, 43]]) box(ctx, x, y, 7, 12, '#2A2A2A');
  // front wing
  box(ctx, 3, 2, 26, 4, wing);
  ctx.fillStyle = stripe; ctx.fillRect(4, 3, 3, 2); ctx.fillRect(25, 3, 3, 2);
  // nose, chassis, sidepods
  box(ctx, 12, 5, 8, 15, body);
  box(ctx, 8, 18, 16, 32, body);
  box(ctx, 5, 26, 22, 16, body);
  ctx.fillStyle = body; ctx.fillRect(8, 26, 16, 16);
  // stripe
  ctx.fillStyle = stripe; ctx.fillRect(15, 5, 2, 48);
  // cockpit + halo + helmet
  box(ctx, 12, 24, 8, 9, black);
  ctx.fillStyle = red; ctx.fillRect(14, 27, 4, 4);
  ctx.fillStyle = grey; ctx.fillRect(12, 23, 8, 1);
  // rear wing
  box(ctx, 4, 53, 24, 7, wing);
  ctx.fillStyle = stripe; ctx.fillRect(6, 56, 20, 1);
  return c;
}
