import { PARTS, byId } from './constants';
import type { CarStats, Driver, Loadout, StatKind, Track, Weather } from './types';

const BASE_STAT = 1;
const PER_SLOT_MAIN = 3;
const PER_SLOT_OTHER = 1;
const SLOTS = 4;

/** How much of a part's stats it still gives at this durability: half when worn out, all when new. */
export const partEfficiency = (durability = 100) => 0.5 + (0.5 * durability) / 100;

/** `wear`: durability (0–100) per part id; parts not listed are new. */
export function carStats(parts: Loadout['parts'], wear: Record<string, number> = {}): CarStats {
  const s: CarStats = { speed: BASE_STAT, corner: BASE_STAT, brake: BASE_STAT, tire: 0, wet: 0, rel: 0 };
  for (const id of Object.values(parts)) {
    const p = byId(PARTS, id);
    if (!p) continue;
    const k = partEfficiency(wear[p.id]);
    s.speed += p.speed * k;
    s.corner += p.corner * k;
    s.brake += p.brake * k;
    s.tire += (p.tire ?? 0) * k;
    s.wet += (p.wet ?? 0) * k;
    s.rel += (p.rel ?? 0) * k;
  }
  return s;
}

/**
 * What the circuit rewards today. Rain cuts grip, so top speed is worth half as much
 * and the difference goes to cornering and braking.
 */
export function trackWeights(track: Track, weather: Weather): Record<StatKind, number> {
  const w = track.weights;
  if (weather === 'dry') return w;
  const shift = w.speed / 2;
  return { speed: w.speed - shift, corner: w.corner + shift / 2, brake: w.brake + shift / 2 };
}

/** 0–1: the car's setup against the best car possible for this track and weather. */
export function carFit(stats: CarStats, track: Track, weather: Weather): number {
  const w = trackWeights(track, weather);
  const raw = stats.speed * w.speed + stats.corner * w.corner + stats.brake * w.brake;
  // best possible: all four parts of the most-rewarded kind
  const top = Math.max(w.speed, w.corner, w.brake);
  const main = BASE_STAT + SLOTS * PER_SLOT_MAIN;
  const other = BASE_STAT + SLOTS * PER_SLOT_OTHER;
  const best = main * top + other * (1 - top);
  return Math.min(1, raw / best);
}

/** 0–1: driver skill for the conditions. In the rain wet skill carries most of it. */
export function driverFit(driver: Driver, weather: Weather): number {
  const skill = weather === 'wet' ? driver.pace * 0.3 + driver.wet * 0.7 : driver.pace;
  return skill / 10;
}

/** Combined 0–100 score shown in the UI. */
export function fitScore(stats: CarStats, driver: Driver | undefined, track: Track, weather: Weather) {
  const car = carFit(stats, track, weather);
  const drv = driver ? driverFit(driver, weather) : 0;
  return Math.round((car * 0.6 + drv * 0.4) * 100);
}
