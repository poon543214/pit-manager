import driversJson from '../data/drivers.json';
import rivalsJson from '../data/rivals.json';
import partsJson from '../data/parts.json';
import tracksJson from '../data/tracks.json';
import type { Driver, Part, Slot, Tire, TireId, Track } from './types';

export const COLORS = {
  red: '#E10600',
  white: '#FFFFFF',
  black: '#111111',
  grey: '#8A8A8A',
  skin: '#F2C6A0',
} as const;

export const SLOTS: Slot[] = ['engine', 'aero', 'gearbox', 'suspension'];
export const SLOT_LABEL: Record<Slot, string> = {
  engine: 'Engine',
  aero: 'Aero',
  gearbox: 'Gearbox',
  suspension: 'Suspension',
};

export const TIRES: Record<TireId, Tire> = {
  soft: { id: 'soft', name: 'Soft', grip: 1.8, wear: 0.3, life: 3, wetPenalty: 0, color: COLORS.red },
  medium: { id: 'medium', name: 'Medium', grip: 0.9, wear: 0.16, life: 5.5, wetPenalty: 0.6, color: COLORS.white },
  hard: { id: 'hard', name: 'Hard', grip: 0, wear: 0.07, life: 10, wetPenalty: 1.6, color: COLORS.black },
};

export const DRIVERS = driversJson as Driver[];
/** AI-only drivers that fill the grid; not for sale. */
export const RIVALS = rivalsJson as Driver[];
export const PARTS = partsJson as Part[];
export const TRACKS = tracksJson as Track[];

export const STARTING_COINS = 1000;
export const PIT_LOSS = 18; // seconds in the pit lane for fresh tyres, about what a real F1 stop costs
export const MAX_STOPS = 2;
/** Price of one set of tires; sets are used up by racing. */
export const TIRE_SET_PRICE: Record<TireId, number> = { soft: 30, medium: 25, hard: 20 };
export const STARTING_TIRE_SETS = 4;
/** Durability a fitted part loses per race (more in the rain); repairing costs this share of its price per 100% restored. */
export const PART_WEAR = 12;
export const WET_PART_WEAR = 4;
export const REPAIR_RATE = 0.5;
export const repairCost = (price: number, durability: number) => Math.ceil(((100 - durability) / 100) * price * REPAIR_RATE);
export const PRACTICE_COST = 20;
export const PRACTICE_RUNS_PER_TRACK = 3;
export const FIELD_SIZE = 10;
/** F1 points for P1–P10. */
export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
/**
 * Racing is free: no entry fee, so no player's loss pays another's prize. The season pool is a sponsor
 * stake plus a share of every coin spent in the game (the rest is burned), paid out to the season's top 3.
 */
export const SEASON_ROUNDS = 6;
export const SEASON_SPONSOR = 1000;
export const POOL_SHARE = 0.3;
export const SEASON_PAYOUT = [0.5, 0.3, 0.2];

/** The JSON stats, kept so chain stats can be undone when the wallet disconnects. */
const JSON_STATS = {
  drivers: new Map(DRIVERS.map((d) => [d.id, { pace: d.pace, consistency: d.consistency, wet: d.wet }])),
  parts: new Map(PARTS.map((p) => [p.id, { speed: p.speed, corner: p.corner, brake: p.brake }])),
};

/**
 * While a wallet is connected, the stats stored on chain are the ones the whole game uses
 * (Garage, sim, Results), so the catalog entries are updated in place. null restores the JSON values.
 */
export function applyCatalogStats(
  chain: {
    drivers: { id: string; pace: number; consistency: number; wet: number }[];
    parts: { id: string; speed: number; corner: number; brake: number }[];
  } | null,
) {
  for (const d of DRIVERS) Object.assign(d, JSON_STATS.drivers.get(d.id));
  for (const p of PARTS) Object.assign(p, JSON_STATS.parts.get(p.id));
  if (!chain) return;
  for (const c of chain.drivers) {
    const d = byId(DRIVERS, c.id);
    if (d) Object.assign(d, { pace: c.pace, consistency: c.consistency, wet: c.wet });
  }
  for (const c of chain.parts) {
    const p = byId(PARTS, c.id);
    if (p) Object.assign(p, { speed: c.speed, corner: c.corner, brake: c.brake });
  }
}

/** Display name for a season entrant id ('player' or 'ai-<driver>'). */
export const entrantName = (id: string, you = 'You') =>
  id === 'player' ? you : (byId([...DRIVERS, ...RIVALS], id.replace(/^ai-/, ''))?.name ?? id);

/** Which season and which race of it a round is. */
export const seasonRace = (round: number) => ((round - 1) % SEASON_ROUNDS) + 1;

export const byId = <T extends { id: string }>(list: T[], id: string | null | undefined) =>
  list.find((x) => x.id === id);

export const asset = (group: string, id: string) => `/assets/${group}/${id}.png`;
