import { PERKS } from '../sim/perks';
import { perkMult, traitSteady, traitWear } from '../sim/simulateRace';
import type { CarStats, Driver } from './types';

export type BuildAxis = 'speed' | 'corner' | 'brake' | 'tires' | 'wet' | 'steady';

export const AXIS_LABEL: Record<BuildAxis, string> = {
  speed: 'Speed',
  corner: 'Cornering',
  brake: 'Braking',
  tires: 'Tire care',
  wet: 'Wet',
  steady: 'Consistency',
};

/** Short labels for the chart corners. */
export const AXIS_SHORT: Record<BuildAxis, string> = {
  speed: 'SPD',
  corner: 'CRN',
  brake: 'BRK',
  tires: 'TIRE',
  wet: 'WET',
  steady: 'CONS',
};

export const AXES: BuildAxis[] = ['speed', 'corner', 'brake', 'tires', 'wet', 'steady'];

const clamp = (n: number) => Math.max(0, Math.min(10, n));
/** Car stats run from 1 (no parts) to 13 (four parts of one kind). */
const car = (v: number) => (v - 1) / 12;

/**
 * The whole build (driver + parts + skills) on six 0–10 axes, each read from the same numbers the race uses:
 * - Speed / Cornering / Braking: the car's stat (70%) and the driver's pace (30%)
 * - Tire care: how much slower tires wear than on a plain car (endurance parts and tire skills)
 * - Wet: the driver's wet skill (60%) and the car's wet grip from rain parts (40%), plus wet skills
 * - Consistency: the driver's consistency (60%), reliability from parts and steadying skills
 */
export function buildProfile(stats: CarStats, driver: Driver | undefined, perks: string[]): Record<BuildAxis, number> {
  const pace = (driver?.pace ?? 0) / 10;
  const effects = perks.flatMap((id) => PERKS[id]?.effects ?? []);
  const tireMult = traitWear({ stats }) * effects.reduce((m, f) => (f.on === 'wear' ? m * f.mult : m), 1);
  const cliff = effects.reduce((m, f) => (f.on === 'cliff' ? m * f.mult : m), 1);
  const wetSkill = effects.reduce((s, f) => (f.on === 'wet' ? s + f.s : s), 0) + (effects.some((f) => f.on === 'wetCalm') ? 0.2 : 0);
  const scatter = effects.reduce((m, f) => (f.on === 'scatter' ? m * f.mult : m), 1) * traitSteady({ stats });
  const fatigue = perkMult(perks, 'fatigue');

  return {
    speed: clamp(10 * (0.7 * car(stats.speed) + 0.3 * pace)),
    corner: clamp(10 * (0.7 * car(stats.corner) + 0.3 * pace)),
    brake: clamp(10 * (0.7 * car(stats.brake) + 0.3 * pace)),
    // 40% slower wear (the most parts can give) fills most of the axis; a softer cliff adds the rest
    tires: clamp(((1 - tireMult) / 0.45) * 9 + (1 - cliff) * 5),
    wet: clamp(10 * (0.6 * ((driver?.wet ?? 0) / 10) + 0.4 * Math.min(1, stats.wet / 12)) + wetSkill * 4),
    steady: clamp(10 * (0.6 * ((driver?.consistency ?? 0) / 10)) + (1 - scatter) * 8 + (1 - fatigue) * 4),
  };
}
