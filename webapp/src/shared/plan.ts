import { TIRES } from './constants';
import type { PitStop, TireId } from './types';

/** "0x56FB…06b8" */
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

/** "Medium → Hard (L8) → Soft (L15)", or "Medium, no stop". */
export function planText(p: { tire: TireId; stops: PitStop[] }): string {
  const start = TIRES[p.tire].name;
  if (!p.stops.length) return `${start}, no stop`;
  return [start, ...p.stops.map((s) => `${TIRES[s.tire].name} (L${s.lap})`)].join(' → ');
}

/** Compact form for tables: "M → H (8) → S (15)". */
export function planShort(p: { tire: TireId; stops: PitStop[] }): string {
  const t = (id: TireId) => TIRES[id].name[0];
  return [t(p.tire), ...p.stops.map((s) => `${t(s.tire)} (${s.lap})`)].join(' → ');
}

/**
 * The stops actually run once pit-wall calls are applied: each call replaces the next planned stop
 * still ahead of it (if any) with a stop at the end of the call's lap.
 */
export function applyCalls(stops: PitStop[], calls: PitStop[]): PitStop[] {
  let out = [...stops];
  for (const call of calls) {
    const next = out.filter((s) => s.lap >= call.lap).sort((a, b) => a.lap - b.lap)[0];
    out = [...out.filter((s) => s !== next), call].sort((a, b) => a.lap - b.lap);
  }
  return out;
}

/** Tire sets a plan uses: one for the start, one per stop. */
export function setsNeeded(p: { tire: TireId; stops: PitStop[] }): Record<TireId, number> {
  const out: Record<TireId, number> = { soft: 0, medium: 0, hard: 0 };
  for (const t of [p.tire, ...p.stops.map((s) => s.tire)]) out[t]++;
  return out;
}

/** The first compound the plan needs more sets of than are in stock, or null if it can be run. */
export function shortOf(p: { tire: TireId; stops: PitStop[] }, stock: Record<TireId, number>): TireId | null {
  const need = setsNeeded(p);
  return (Object.keys(need) as TireId[]).find((t) => need[t] > (stock[t] ?? 0)) ?? null;
}

/** Keep stops in lap order, inside the race, one per lap, at most `max`. */
export function cleanStops(stops: PitStop[], laps: number, max: number): PitStop[] {
  const seen = new Set<number>();
  return [...stops]
    .filter((s) => s.lap >= 1 && s.lap < laps && !seen.has(s.lap) && seen.add(s.lap))
    .sort((a, b) => a.lap - b.lap)
    .slice(0, max);
}
