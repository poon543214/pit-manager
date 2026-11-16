import { PIT_LOSS, POINTS, TIRES } from '../shared/constants';
import { carFit, driverFit } from '../shared/fitScore';
import { createRng } from '../shared/rng';
import { PERKS } from './perks';
import type { Entrant, LapRecord, RaceResult, Tire, TireId, Track, Weather } from '../shared/types';

/** Seconds per lap a perfect car / perfect driver finds over a poor one. */
export const CAR_GAIN = 6;
export const DRIVER_GAIN = 3;
/** A mistake (lock-up, off at a corner) costs this much. */
export const MISTAKE_COST = 6;
/** Chance of a mistake per lap for each point of consistency below 10. */
const MISTAKE_RATE = 0.02;
/** Extra seconds per lap in the rain for a driver with no wet skill. */
export const WET_PENALTY = 2.5;
/** Seconds per lap², once a tyre is past its life; capped when the tyre is finished. */
const CLIFF = 1;
export const CLIFF_CAP = 6;
/** Rain keeps tyres cool, so they wear more slowly. */
const WET_WEAR = 0.75;
/** Seconds per lap a driver with consistency 1 has lost to fatigue by the final lap; it builds up over the race. */
export const FATIGUE_MAX = 1.6;
/** Seconds per lap a fully worn-out driver (condition 0) loses from the start. */
export const TIRED_PACE = 1.2;
/** Condition a race costs: a base, plus more for a less consistent driver. Sitting a race out gives back REST. */
export const RACE_TOLL = 18;
export const TOLL_PER_POINT = 2;
export const REST = 25;

/** Condition lost by racing this driver once. */
export const raceToll = (consistency: number) => RACE_TOLL + (10 - consistency) * TOLL_PER_POINT;

/** Effective tyre age: laps run, scaled by how hard this track and weather are on tyres. */
export const tireStress = (track: Track, weather: Weather) => track.tireWear * (weather === 'wet' ? WET_WEAR : 1);

/** Laps this tyre lasts before the cliff at this track today. */
export const tireLife = (tire: Tire, track: Track, weather: Weather) => tire.life / tireStress(track, weather);

/** Seconds the tyre adds (or saves, if negative) on a lap at the given age. */
export function tireLoss(tire: Tire, track: Track, weather: Weather, age: number, wearMult = 1, cliffMult = 1): number {
  const a = age * tireStress(track, weather) * wearMult;
  const cliff = Math.min(CLIFF_CAP, CLIFF * Math.max(0, a - tire.life) ** 2) * cliffMult;
  return -tire.grip + tire.wear * a + cliff + (weather === 'wet' ? tire.wetPenalty : 0);
}

export interface LapContext {
  lap: number;
  laps: number;
  /** this lap follows a pit stop */
  outLap: boolean;
  /** 0–1 roll for a mistake this lap; omit to charge the expected cost instead (projections) */
  mistakeRoll?: number;
  /** compound on this lap; defaults to the starting one */
  tire?: TireId;
}

/** Corners and heavy braking zones punish errors; straights forgive them. */
const trackRisk = (track: Track) => 0.5 + track.weights.corner + track.weights.brake * 1.5;

const effectsOf = (e: Entrant) => (e.perks ?? []).flatMap((id) => (PERKS[id]?.effects ?? []).map((fx) => ({ id, fx })));

/** Lap time plus what each perk saved on it. */
export function lapDetail(e: Entrant, track: Track, weather: Weather, tireAge: number, noise: number, ctx: LapContext) {
  const gains: Record<string, number> = {};
  const add = (id: string, s: number) => (gains[id] = (gains[id] ?? 0) + s);
  const fx = effectsOf(e);
  const wet = weather === 'wet';

  let t = track.baseLap;
  const car = carFit(e.stats, track, weather) * CAR_GAIN;
  const pace = driverFit(e.driver, weather) * DRIVER_GAIN;
  const rain = wet ? WET_PENALTY * (1 - e.driver.wet / 10) : 0;
  t -= car;
  t -= pace;
  if (wet) t += rain;

  // fatigue: builds through the race (less for a consistent driver), worse for a driver who came in tired
  const tired = 1 - (e.condition ?? 100) / 100;
  const stamina = (11 - e.driver.consistency) / 10;
  const fatigue = TIRED_PACE * tired + FATIGUE_MAX * stamina * (ctx.lap / ctx.laps) ** 2 * (1 + tired);
  t += fatigue;

  // tyres, with wear and cliff perks credited by how much each one alone would have saved
  const tire = TIRES[ctx.tire ?? e.tire];
  const wears = fx.filter((f) => f.fx.on === 'wear') as { id: string; fx: { on: 'wear'; mult: number } }[];
  const cliffs = fx.filter((f) => f.fx.on === 'cliff') as { id: string; fx: { on: 'cliff'; mult: number } }[];
  const wearMult = wears.reduce((m, f) => m * f.fx.mult, 1);
  const cliffMult = cliffs.reduce((m, f) => m * f.fx.mult, 1);
  const plain = tireLoss(tire, track, weather, tireAge);
  const withPerks = tireLoss(tire, track, weather, tireAge, wearMult, cliffMult);
  t += withPerks;
  const saved = plain - withPerks;
  if (saved > 0) {
    const solo = [
      ...wears.map((f) => ({ id: f.id, v: plain - tireLoss(tire, track, weather, tireAge, f.fx.mult, 1) })),
      ...cliffs.map((f) => ({ id: f.id, v: plain - tireLoss(tire, track, weather, tireAge, 1, f.fx.mult) })),
    ];
    const sum = solo.reduce((a, b) => a + b.v, 0);
    for (const x of solo) if (sum > 0) add(x.id, (saved * x.v) / sum);
  }

  // situational perks
  let perks = 0;
  for (const { id, fx: f } of fx) {
    const hit =
      (f.on === 'lap1' && ctx.lap === 1) ||
      (f.on === 'final2' && ctx.lap > ctx.laps - 2) ||
      (f.on === 'wet' && wet) ||
      (f.on === 'dry' && !wet) ||
      (f.on === 'outlap' && ctx.outLap) ||
      (f.on === 'fresh' && tireAge <= 2);
    if (hit && 's' in f) {
      t -= f.s;
      perks -= f.s;
      add(id, f.s);
    }
  }

  // consistency 10 → ±0.15s spread, consistency 1 → ±1.5s; rain makes everyone ragged unless calm
  const calm = fx.some((f) => f.fx.on === 'wetCalm');
  const scatter = fx.reduce((m, f) => (f.fx.on === 'scatter' ? m * f.fx.mult : m), 1);
  const rainShake = wet && !calm ? 1.6 : 1;
  const spread = (0.15 + (10 - e.driver.consistency) * 0.15) * rainShake * scatter;
  t += noise * spread;

  // mistakes: the real cost of a low-consistency driver
  const chance =
    (10 - e.driver.consistency) * MISTAKE_RATE * trackRisk(track) * rainShake * scatter * (1 + tired + (ctx.lap / ctx.laps) * 0.5);
  let mistake = false;
  if (ctx.mistakeRoll === undefined) t += chance * MISTAKE_COST;
  else if (ctx.mistakeRoll < chance) {
    mistake = true;
    t += MISTAKE_COST;
  }
  // where the lap time came from, for the post-race breakdown; noise and mistakes are left to the caller
  const parts = { car: -car, driver: rain - pace, fatigue, tires: withPerks, perks };
  return { time: t, gains, mistake, parts };
}

/** Laps an entrant's tyres last before the cliff, counting wear perks. */
export function tireAgeLimit(e: Entrant, track: Track, weather: Weather, tire: TireId = e.tire): number {
  const wearMult = effectsOf(e).reduce((m, f) => (f.fx.on === 'wear' ? m * f.fx.mult : m), 1);
  return TIRES[tire].life / (tireStress(track, weather) * wearMult);
}

/** Whole laps a set of tyres runs before the cliff: tyre age 0 up to the limit is fine. */
export const tireLaps = (e: Entrant, track: Track, weather: Weather, tire: TireId = e.tire) =>
  Math.floor(tireAgeLimit(e, track, weather, tire)) + 1;

export function lapTime(e: Entrant, track: Track, weather: Weather, tireAge: number, noise: number, ctx?: LapContext) {
  return lapDetail(e, track, weather, tireAge, noise, ctx ?? { lap: tireAge + 1, laps: track.laps, outLap: false }).time;
}

/** Seconds in the pit lane for this entrant, and which perks shaved it. */
export function pitStop(e: Entrant) {
  const gains: Record<string, number> = {};
  let time = PIT_LOSS;
  for (const { id, fx } of effectsOf(e)) {
    if (fx.on === 'pit') {
      time -= fx.s;
      gains[id] = (gains[id] ?? 0) + fx.s;
    }
  }
  return { time: Math.max(2, time), gains };
}

/** Lap-by-lap race for one entrant. Noise comes from `noise()`; pass () => 0 for a projection. */
function runEntrant(
  e: Entrant,
  track: Track,
  weather: (lap: number) => Weather,
  laps: number,
  noise: () => number,
  roll?: () => number,
) {
  const records: LapRecord[] = [];
  const gains: Record<string, number> = {};
  const merge = (g: Record<string, number>) => {
    for (const [k, v] of Object.entries(g)) gains[k] = (gains[k] ?? 0) + v;
  };
  let age = 0;
  let outLap = false;
  let tire = e.tire;
  for (let lap = 1; lap <= laps; lap++) {
    const d = lapDetail(e, track, weather(lap), age, noise(), { lap, laps, outLap, mistakeRoll: roll?.(), tire });
    merge(d.gains);
    let time = d.time;
    const stopHere = lap < laps ? e.stops.find((s) => s.lap === lap) : undefined;
    let pitTime: number | undefined;
    records.push({ lap, time, tire, pitted: !!stopHere, mistake: d.mistake || undefined });
    if (stopHere) {
      const stop = pitStop(e);
      merge(stop.gains);
      pitTime = stop.time;
      time += stop.time;
      Object.assign(records[records.length - 1], { time, pitTime });
      tire = stopHere.tire;
      age = 0;
    } else {
      age++;
    }
    outLap = !!stopHere;
  }
  return { records, gains, total: records.reduce((s, r) => s + r.time, 0) };
}

/** Noise-free race total for an entrant's tyre and pit plan. */
export function projectedTotal(e: Entrant, track: Track, weather: Weather, laps = track.laps): number {
  return runEntrant(e, track, () => weather, laps, () => 0).total;
}

/** The weather that actually arrives, drawn from the race seed against the forecast's rain chance. */
export const weatherFromSeed = (seed: number, rainChance: number): Weather =>
  createRng(seed ^ 0x7a11).next() < rainChance ? 'wet' : 'dry';

export function simulateRace(
  entrants: Entrant[],
  track: Track,
  seed: number,
  weather: Weather,
  laps = track.laps,
  rainChance?: number,
): RaceResult {
  // each car draws from its own stream, so changing one car's plan mid-race leaves every other car's race untouched
  const rows = entrants.map((e, i) => {
    const rng = createRng((seed + (i + 1) * 0x9e3779b1) >>> 0);
    const r = runEntrant(e, track, () => weather, laps, rng.gauss, rng.next);
    return { entrant: e, laps: r.records, total: r.total, gains: r.gains };
  });

  rows.sort((a, b) => a.total - b.total);
  return {
    seed,
    trackId: track.id,
    weather,
    rainChance,
    grid: entrants.map((e) => e.id),
    entries: rows.map((r, i) => ({ ...r, position: i + 1, points: POINTS[i] ?? 0 })),
  };
}
