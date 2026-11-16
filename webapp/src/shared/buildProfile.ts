import { PERKS, type PerkEffect } from '../sim/perks';
import { perkMult, traitSteady, traitWear } from '../sim/simulateRace';
import type { CarStats, Driver } from './types';

export type BuildAxis = 'top' | 'launch' | 'corner' | 'brake' | 'long' | 'wet';

export const AXIS_LABEL: Record<BuildAxis, string> = {
  top: 'Top speed',
  launch: 'Launch',
  corner: 'Cornering',
  brake: 'Braking',
  long: 'Long run',
  wet: 'Wet',
};

/** Short labels for the chart corners. */
export const AXIS_SHORT: Record<BuildAxis, string> = {
  top: 'TOP',
  launch: 'LAUNCH',
  corner: 'CRN',
  brake: 'BRK',
  long: 'LONG',
  wet: 'WET',
};

/** Clockwise from the top. */
export const AXES: BuildAxis[] = ['top', 'launch', 'corner', 'brake', 'long', 'wet'];

const clamp = (n: number) => Math.max(0, Math.min(10, n));
/** Car stats run from 1 (no parts) to 13 (four parts of one kind). */
const car = (v: number) => (v - 1) / 12;
/** Seconds a perk takes off when its trigger fires. */
const secs = (fx: PerkEffect[], on: PerkEffect['on']) => fx.reduce((s, f) => (f.on === on && 's' in f ? s + f.s : s), 0);

/**
 * The whole build (driver + parts + skills) as six race qualities, each 0–10 and read from what the race simulates:
 * - Top speed: the car's Speed stat with the driver's pace, plus dry-lap skills
 * - Launch: the opening lap, out-laps and fresh tires (pace plus start, out-lap and fresh-tire skills)
 * - Cornering / Braking: the car's stat with the driver's pace, plus track-type skills
 * - Long run: holding pace over a stint: consistency, tire care, fatigue, old-tire and finishing skills
 * - Wet: wet skill, wet grip from rain parts and rain skills
 */
export function buildProfile(stats: CarStats, driver: Driver | undefined, perks: string[]): Record<BuildAxis, number> {
  const pace = (driver?.pace ?? 0) / 10;
  const fx = perks.flatMap((id) => PERKS[id]?.effects ?? []);
  const focus = (kind: 'speed' | 'corner' | 'brake') => fx.reduce((s, f) => (f.on === 'focus' && f.kind === kind ? s + f.s : s), 0);
  const tireMult = traitWear({ stats }) * fx.reduce((m, f) => (f.on === 'wear' ? m * f.mult : m), 1);
  const cliff = fx.reduce((m, f) => (f.on === 'cliff' ? m * f.mult : m), 1);
  const scatter = fx.reduce((m, f) => (f.on === 'scatter' ? m * f.mult : m), 1) * traitSteady({ stats });
  const calm = fx.some((f) => f.on === 'wetCalm') ? 0.2 : 0;

  return {
    top: clamp(10 * (0.7 * car(stats.speed) + 0.3 * pace) + (secs(fx, 'dry') + focus('speed')) * 8),
    launch: clamp(4 * pace + secs(fx, 'lap1') * 1.2 + secs(fx, 'outlap') * 1 + secs(fx, 'fresh') * 4),
    corner: clamp(10 * (0.7 * car(stats.corner) + 0.3 * pace) + focus('corner') * 8),
    brake: clamp(10 * (0.7 * car(stats.brake) + 0.3 * pace) + focus('brake') * 8),
    long: clamp(
      4 * ((driver?.consistency ?? 0) / 10) +
        ((1 - tireMult) / 0.45) * 3 +
        (1 - cliff) * 3 +
        (1 - perkMult(perks, 'fatigue')) * 3 +
        (1 - scatter) * 3 +
        secs(fx, 'old') * 8 +
        secs(fx, 'final2') * 0.8,
    ),
    wet: clamp(10 * (0.6 * ((driver?.wet ?? 0) / 10) + 0.4 * Math.min(1, stats.wet / 9)) + (secs(fx, 'wet') + calm) * 4),
  };
}
