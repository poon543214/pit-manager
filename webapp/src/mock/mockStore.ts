import { POINTS, POOL_SHARE, SEASON_SPONSOR, STARTING_COINS, STARTING_TIRE_SETS } from '../shared/constants';
import type { PlayerState } from '../shared/types';

const KEY = 'pit-manager:v1';

const newPlayerId = () => `PM-${Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;

const fresh = (): PlayerState => ({
  playerId: newPlayerId(),
  practiceRuns: {},
  commit: null,
  unclaimed: 0,
  coins: STARTING_COINS,
  ownedDrivers: [],
  ownedParts: [],
  loadout: { driverId: null, parts: {}, tire: 'medium', stops: [] },
  history: [],
  driverCondition: {},
  tireSets: { soft: STARTING_TIRE_SETS, medium: STARTING_TIRE_SETS, hard: STARTING_TIRE_SETS },
  partWear: {},
  season: { number: 1, points: {}, pool: SEASON_SPONSOR },
  trophies: [],
  wallet: null,
  starterClaimed: null,
  ethBalance: null,
  chainSeason: null,
  mockOwned: null,
});

/** Spend coins: a share feeds the season pool, the rest is burned. Demo mode spends nothing. */
export function spend(s: PlayerState, cost: number, free: boolean): Pick<PlayerState, 'coins' | 'season'> {
  if (free) return { coins: s.coins, season: s.season };
  return { coins: s.coins - cost, season: { ...s.season, pool: s.season.pool + Math.round(cost * POOL_SHARE) } };
}

/** Saves from before multi-stop plans had a single `pitLap`: carry it over as one stop on the same tire. */
function migrate(s: PlayerState): PlayerState {
  const old = s.loadout as PlayerState['loadout'] & { pitLap?: number | null };
  // races from the entry-fee era recorded prize coins; they now count as championship points
  s = { ...s, history: s.history.map((h) => ({ ...h, points: h.points ?? POINTS[h.position - 1] ?? 0 })) };
  // a commit sealed with the old 16-byte salt / SHA-256 hash can't be revealed against keccak256
  if (s.commit && s.commit.salt.length !== 66) s = { ...s, commit: null };
  if (Array.isArray(old.stops)) return s;
  const { pitLap, ...rest } = old;
  return {
    ...s,
    loadout: { ...rest, stops: pitLap ? [{ lap: pitLap, tire: old.tire }] : [] },
    // a setup sealed under the old rules can't be raced under the new ones
    commit: null,
  };
}

type Listener = (s: PlayerState) => void;

/** Player state kept in localStorage. Stands in for wallet + on-chain inventory. */
export function createMockStore() {
  let state = load();
  const listeners = new Set<Listener>();
  save(); // persist fields added since the save was written (e.g. playerId)

  function load(): PlayerState {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate({ ...fresh(), ...JSON.parse(raw) });
    } catch {
      /* storage unavailable: fall through */
    }
    return fresh();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }

  return {
    get: () => state,
    update(fn: (s: PlayerState) => PlayerState) {
      state = fn(state);
      save();
      listeners.forEach((l) => l(state));
    },
    reset() {
      state = fresh();
      save();
      listeners.forEach((l) => l(state));
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
export type MockStore = ReturnType<typeof createMockStore>;
