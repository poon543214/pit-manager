import { lapTime, projectedTotal } from "./simulateRace";
import { createRng } from '../shared/rng';
import type { Entrant, Track, Weather } from '../shared/types';

export interface PracticeReport {
  laps: number[];
  best: number;
  average: number;
  /** projected total for a race on these tyres with this pit plan */
  projected: number;
}

/** Short stint so the player can try setups before the race. */
export function practice(e: Entrant, track: Track, weather: Weather, seed: number, stint = 3): PracticeReport {
  const rng = createRng(seed);
  const laps = Array.from({ length: stint }, (_, i) => lapTime(e, track, weather, i, rng.gauss()));
  const projected = projectedTotal(e, track, weather);
  return {
    laps,
    best: Math.min(...laps),
    average: laps.reduce((a, b) => a + b, 0) / laps.length,
    projected,
  };
}
