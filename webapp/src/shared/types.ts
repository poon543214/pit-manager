import type { ChainSeason } from '../chain/season';
export type Slot = 'engine' | 'aero' | 'gearbox' | 'suspension';
/** The three handling stats a track weighs. */
export type StatKind = 'speed' | 'corner' | 'brake';
/** A part's type: the handling stat it is built around. */
export type PartKind = StatKind;
/** Some types come in more than one version: endurance (tire care, reliability) or rain (wet grip). */
export type PartVariant = 'endurance' | 'rain';
export type TireId = 'soft' | 'medium' | 'hard';
export type Weather = 'dry' | 'wet';

export interface Driver {
  id: string;
  name: string;
  /** chibi look: skin tone, hair colour and cut */
  skin: string;
  hair: string;
  /** eye colour */
  eyes: string;
  hairStyle: 'short' | 'swept' | 'spiky' | 'curly' | 'long' | 'quiff' | 'cropped';
  /** short beard shadow */
  stubble?: boolean;
  /** race suit [main, accent, badge], coloured after a real team's livery (no logos) */
  suit: string[];
  pace: number;
  consistency: number;
  wet: number;
  price: number;
  /** special ability, see sim/perks.ts */
  perk: string;
}

export interface Part {
  id: string;
  slot: Slot;
  kind: PartKind;
  /** a second version of its type, trading some stat for a trait */
  variant?: PartVariant;
  name: string;
  speed: number;
  corner: number;
  brake: number;
  price: number;
  perk: string;
  /** tire care: each point makes tires wear slower */
  tire: number;
  /** wet grip: each point takes time off every wet lap */
  wet: number;
  /** reliability: each point means fewer mistakes and less part wear per race */
  rel: number;
}

export interface Track {
  id: string;
  name: string;
  focus: StatKind;
  tiles: string;
  weights: Record<StatKind, number>;
  laps: number;
  /** how hard the circuit is on tyres: 1 = average, higher = tyres reach their cliff sooner */
  tireWear: number;
  wetChance: number;
  baseLap: number;
  path: [number, number][];
}

export interface Tire {
  id: TireId;
  name: string;
  /** seconds gained per lap on fresh tyres */
  grip: number;
  /** seconds lost per lap of age */
  wear: number;
  /** laps (on an average dry track) before the tyre falls off the cliff */
  life: number;
  /** extra seconds per lap in the wet: harder compounds can't get up to temperature */
  wetPenalty: number;
  color: string;
}

export interface CarStats {
  speed: number;
  corner: number;
  brake: number;
  /** summed part traits (scaled by durability), 0 on a car without endurance or rain parts */
  tire: number;
  wet: number;
  rel: number;
}

/** Pit after this lap and fit this compound. */
export interface PitStop {
  lap: number;
  tire: TireId;
}

export interface Loadout {
  driverId: string | null;
  parts: Partial<Record<Slot, string>>;
  /** starting compound */
  tire: TireId;
  /** up to MAX_STOPS stops, in lap order */
  stops: PitStop[];
}

export interface Entrant {
  id: string;
  label: string;
  isPlayer: boolean;
  driver: Driver;
  stats: CarStats;
  /** starting compound */
  tire: TireId;
  stops: PitStop[];
  /** 0–100: how rested the driver is coming into the race (100 = fresh) */
  condition: number;
  color: string;
  /** perk ids from the driver and fitted parts */
  perks: string[];
}

export interface LapRecord {
  lap: number;
  time: number;
  /** compound run on this lap */
  tire: TireId;
  pitted: boolean;
  /** seconds spent in the pit lane on this lap */
  pitTime?: number;
  /** the driver made a costly error on this lap */
  mistake?: boolean;
}

export interface RaceEntryResult {
  entrant: Entrant;
  laps: LapRecord[];
  total: number;
  position: number;
  /** championship points for this finish */
  points: number;
  /** seconds each perk saved over the race */
  gains: Record<string, number>;
}

export interface RaceResult {
  /** drawn after every setup was committed, so nobody could plan against it */
  seed: number;
  /** the player's sealed setup and pit-wall calls: everything needed to check the race independently */
  proof?: { round: number; hash: string; salt: string; loadout: Loadout; calls: PitStop[] };
  /** entrant ids in the order the race was run; each car's random stream depends on its place here */
  grid?: string[];
  trackId: string;
  /** the weather that actually came, drawn with the seed */
  weather: Weather;
  /** what the forecast said */
  rainChance?: number;
  entries: RaceEntryResult[];
}

export type DayKind = 'market' | 'practice' | 'race' | 'rest';

/** One day of the weekly calendar (Sunday = 0). */
export interface DayPlan {
  day: number;
  kind: DayKind;
  /** which race of the week this day belongs to: 'A' (Sun–Tue) or 'B' (Thu–Sat); null on the rest day */
  leg: 'A' | 'B' | null;
  round: number | null;
  track: Track | null;
  weather: Weather | null;
  /** track and weather are announced on the practice day */
  announced: boolean;
  today: boolean;
}

/** A sealed race entry: only the hash is public until the setup is revealed. */
export interface Commitment {
  round: number;
  hash: string;
  salt: string;
  loadout: Loadout;
  /** the AI entrants commit too, before the seed exists */
  field: Entrant[];
  at: number;
  /** drawn once at the reveal and kept, so a reload replays the same race instead of re-rolling it */
  seed?: number;
  /** pit calls made from the pit wall during the race, in order */
  calls?: PitStop[];
}

export interface PlayerState {
  /** stands in for a wallet address until the chain service exists */
  playerId: string;
  /** practice runs used, keyed `${round}:${driverId}` */
  practiceRuns: Record<string, number>;
  coins: number;
  /** this round's sealed entry, if submitted */
  commit: Commitment | null;
  /** prize money won but not yet claimed */
  unclaimed: number;
  ownedDrivers: string[];
  ownedParts: string[];
  loadout: Loadout;
  history: { trackId: string; position: number; points: number; at: number }[];
  /** the current season: points per entrant id ('player' for you) and the prize pool so far */
  season: { number: number; points: Record<string, number>; pool: number };
  /** connected wallet address while drivers and parts are read from the chain; null when playing on browser holdings */
  wallet: string | null;
  /** the connected wallet's spendable ETH on the game's chain, e.g. "0.0421" (null when no wallet) */
  ethBalance: string | null;
  /** the on-chain season (real ETH pool) while a wallet is connected */
  chainSeason: ChainSeason | null;
  /** the browser's own drivers and parts, set aside while a wallet supplies them */
  mockOwned: { drivers: string[]; parts: string[]; coins?: number } | null;
  /** finished seasons where you made the top 3; soulbound trophies on chain */
  trophies: { season: number; rank: number; prize: number }[];
  /** 0–100 per owned driver: racing tires a driver out, sitting a race out lets them recover */
  driverCondition: Record<string, number>;
  /** tire sets in stock; each race uses one for the start and one per pit stop */
  tireSets: Record<TireId, number>;
  /** durability (0–100) per owned part; racing wears fitted parts down, repairs restore them */
  partWear: Record<string, number>;
}
