/**
 * Special abilities. Every driver and every part carries one perk that only fires
 * in a certain situation, so builds have themes (rain, tyre saving, pit play, starts, finishes)
 * instead of being a single sum of stats.
 */
export type PerkEffect =
  | { on: 'lap1'; s: number } // seconds off the opening lap
  | { on: 'final2'; s: number } // seconds off each of the last two laps
  | { on: 'wet'; s: number } // seconds off every wet lap
  | { on: 'dry'; s: number } // seconds off every dry lap
  | { on: 'outlap'; s: number } // seconds off the lap after a pit stop
  | { on: 'fresh'; s: number } // seconds off laps on tyres two laps old or newer
  | { on: 'pit'; s: number } // seconds off each pit stop
  | { on: 'wear'; mult: number } // tyre wear multiplier
  | { on: 'cliff'; mult: number } // worn-tyre cliff multiplier
  | { on: 'scatter'; mult: number } // lap-time scatter multiplier
  | { on: 'wetCalm' }; // rain doesn't add extra scatter

export interface Perk {
  id: string;
  name: string;
  text: string;
  /** what the perk plays into, for grouping and synergy hints */
  theme: 'start' | 'finish' | 'rain' | 'tyres' | 'pit' | 'steady' | 'dry';
  effects: PerkEffect[];
}

const list: Perk[] = [
  // drivers
  { id: 'launch-control', name: 'Launch Control', theme: 'start', text: 'Opening lap 4s faster.', effects: [{ on: 'lap1', s: 4 }] },
  { id: 'tyre-whisperer', name: 'Tyre Whisperer', theme: 'tyres', text: 'Tires wear 6% slower.', effects: [{ on: 'wear', mult: 0.94 }] },
  { id: 'pit-lane-pro', name: 'Pit Lane Pro', theme: 'pit', text: 'Pit stops 2.5s quicker.', effects: [{ on: 'pit', s: 2.5 }] },
  { id: 'closer', name: 'Closer', theme: 'finish', text: 'Last two laps 2s faster each.', effects: [{ on: 'final2', s: 2 }] },
  {
    id: 'rain-dancer',
    name: 'Rain Dancer',
    theme: 'rain',
    text: 'Wet laps 0.1s faster, and rain never rattles them.',
    effects: [{ on: 'wet', s: 0.1 }, { on: 'wetCalm' }],
  },
  // engines
  { id: 'overboost', name: 'Overboost', theme: 'start', text: 'Opening lap 2s faster.', effects: [{ on: 'lap1', s: 2 }] },
  { id: 'smooth-torque', name: 'Smooth Torque', theme: 'rain', text: 'Wet laps 0.15s faster.', effects: [{ on: 'wet', s: 0.15 }] },
  { id: 'safe-map', name: 'Safe Map', theme: 'steady', text: 'Lap times scatter 30% less.', effects: [{ on: 'scatter', mult: 0.7 }] },
  // aero
  { id: 'slipstream', name: 'Slipstream', theme: 'dry', text: 'Dry laps 0.15s faster.', effects: [{ on: 'dry', s: 0.15 }] },
  { id: 'tyre-saver', name: 'Tyre Saver', theme: 'tyres', text: 'Tires wear 5% slower.', effects: [{ on: 'wear', mult: 0.95 }] },
  { id: 'stable-rear', name: 'Stable Rear', theme: 'tyres', text: 'Worn-tire cliff 20% softer.', effects: [{ on: 'cliff', mult: 0.8 }] },
  // gearboxes
  { id: 'push-mode', name: 'Push Mode', theme: 'finish', text: 'Last two laps 1.2s faster each.', effects: [{ on: 'final2', s: 1.2 }] },
  { id: 'out-lap', name: 'Out-lap Launch', theme: 'pit', text: 'Lap after a pit stop 1.2s faster.', effects: [{ on: 'outlap', s: 1.2 }] },
  { id: 'wet-brake', name: 'Wet Brake', theme: 'rain', text: 'Wet laps 0.12s faster.', effects: [{ on: 'wet', s: 0.12 }] },
  // suspension
  { id: 'fresh-rubber', name: 'Fresh Rubber', theme: 'pit', text: '0.3s faster on tires up to two laps old.', effects: [{ on: 'fresh', s: 0.3 }] },
  { id: 'compliant', name: 'Compliant', theme: 'tyres', text: 'Tires wear 3% slower.', effects: [{ on: 'wear', mult: 0.97 }] },
  { id: 'quick-jack', name: 'Quick Jack', theme: 'pit', text: 'Pit stops 1.5s quicker.', effects: [{ on: 'pit', s: 1.5 }] },
];

export const PERKS: Record<string, Perk> = Object.fromEntries(list.map((p) => [p.id, p]));

export const THEME_LABEL: Record<Perk['theme'], string> = {
  start: 'Start',
  finish: 'Finish',
  rain: 'Rain',
  tyres: 'Tires',
  pit: 'Pit',
  steady: 'Steady',
  dry: 'Dry',
};
