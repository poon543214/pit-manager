import { TRACKS } from '../shared/constants';
import { createRng } from '../shared/rng';
import { weatherFromSeed } from '../sim/simulateRace';
import type { DayKind, DayPlan, Track, Weather } from '../shared/types';

export interface RaceSlot {
  round: number;
  track: Track;
  /** forecast's most likely weather; the real weather is only drawn at the race */
  weather: Weather;
  /** forecast chance of rain, 0–1 */
  rainChance: number;
  seed: number;
}

/**
 * Race calendar: rounds rotate through the tracks. Each round publishes a rain forecast;
 * whether it actually rains is drawn with the race seed, after every setup is sealed.
 */
export function raceForRound(round: number): RaceSlot {
  const track = TRACKS[(round - 1) % TRACKS.length];
  const rng = createRng(round * 7919);
  const raw = track.wetChance + rng.range(-0.2, 0.5);
  const rainChance = Math.round(Math.min(0.9, Math.max(0.05, raw)) * 20) / 20;
  const weather: Weather = rainChance >= 0.5 ? 'wet' : 'dry';
  return { round, track, weather, rainChance, seed: rng.int(1, 2 ** 30) };
}

/** The weather that actually arrives on race day, drawn from the (post-commit) race seed. */
export const raceWeather = (slot: RaceSlot, seed: number): Weather => weatherFromSeed(seed, slot.rainChance);

const WEEK: { kind: DayKind; leg: 'A' | 'B' | null }[] = [
  { kind: 'market', leg: 'A' }, // Sun
  { kind: 'practice', leg: 'A' }, // Mon: track + weather announced
  { kind: 'race', leg: 'A' }, // Tue: commit → reveal → claim
  { kind: 'rest', leg: null }, // Wed
  { kind: 'market', leg: 'B' }, // Thu
  { kind: 'practice', leg: 'B' }, // Fri
  { kind: 'race', leg: 'B' }, // Sat
];
const PRACTICE_DAY = { A: 1, B: 5 } as const;

/**
 * The week as the player sees it. Mock: the current leg (A Sun–Tue, B Wed–Sat) is the player's next round;
 * the other leg is the round before or after it. A chain version would read round and phase from block time.
 */
export function weekPlan(nextRound: number, today = new Date().getDay()): DayPlan[] {
  const current = today <= 2 ? 'A' : 'B';
  return WEEK.map(({ kind, leg }, day) => {
    const round = leg ? nextRound + (leg === current ? 0 : leg === 'B' ? 1 : -1) : null;
    const slot = round && round >= 1 ? raceForRound(round) : null;
    return {
      day,
      kind,
      leg,
      round: slot?.round ?? null,
      track: slot?.track ?? null,
      weather: slot?.weather ?? null,
      announced: leg ? today >= PRACTICE_DAY[leg] : false,
      today: day === today,
    };
  });
}
