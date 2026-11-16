import { setsNeeded } from '../shared/plan';
import { REL_WEAR, REST, perkMult, raceToll } from '../sim/simulateRace';
import { PART_WEAR, SEASON_PAYOUT, SEASON_ROUNDS, SEASON_SPONSOR, WET_PART_WEAR } from '../shared/constants';
import type { Loadout, PlayerState, RaceResult } from '../shared/types';
import type { MockStore } from './mockStore';

/**
 * Records the result and holds the player's prize until they claim it.
 * A chain version would leave the prize in the pool contract for a claim() call.
 */
/** `parts`: the part ids the player's car raced with, which wear down. */
export function settleRace(store: MockStore, result: RaceResult, parts: Loadout['parts']) {
  const me = result.entries.find((e) => e.entrant.isPlayer);
  if (!me) return;
  // reliability points and wear perks slow how fast the fitted parts wear
  const wearRate = Math.max(0.3, 1 - REL_WEAR * (me.entrant.stats.rel ?? 0)) * perkMult(me.entrant.perks, 'partWear');
  const lost = Math.round((PART_WEAR + (result.weather === 'wet' ? WET_PART_WEAR : 0)) * wearRate);
  store.update((s) => ({
    ...s,
    commit: null,

    partWear: {
      ...s.partWear,
      ...Object.fromEntries(
        Object.values(parts).flatMap((id) =>
          id ? [[id, Math.max(0, (s.partWear[id] ?? 100) - lost)]] : [],
        ),
      ),
    },
    // the sets the race actually ran are used up
    tireSets: (() => {
      const used = setsNeeded(me.entrant);
      return { soft: s.tireSets.soft - used.soft, medium: s.tireSets.medium - used.medium, hard: s.tireSets.hard - used.hard };
    })(),
    // the driver who raced is worn down; everyone who sat it out recovers
    driverCondition: Object.fromEntries(
      s.ownedDrivers.map((id) => {
        const now = s.driverCondition[id] ?? 100;
        return [id, id === me.entrant.driver.id ? Math.max(0, now - raceToll(me.entrant.driver.consistency, perkMult(me.entrant.perks, 'toll'))) : Math.min(100, now + REST)];
      }),
    ),
    history: [...s.history, { trackId: result.trackId, position: me.position, points: me.points, at: Date.now() }],
    ...seasonAfter(s, result),
  }));
}

/** Standings for a season: entrant ids by points, best first. */
export const standings = (points: Record<string, number>) => Object.entries(points).sort((a, b) => b[1] - a[1]);

/**
 * Adds this race's points to the season. After the last round the pool is paid to the top 3
 * (your share waits to be claimed, and becomes a trophy) and a new season starts with the sponsor stake.
 */
function seasonAfter(s: PlayerState, result: RaceResult): Pick<PlayerState, 'season' | 'unclaimed' | 'trophies'> {
  const points = { ...s.season.points };
  for (const e of result.entries) points[e.entrant.id] = (points[e.entrant.id] ?? 0) + e.points;
  const round = s.history.length + 1;
  if (round % SEASON_ROUNDS !== 0) return { season: { ...s.season, points }, unclaimed: s.unclaimed, trophies: s.trophies };
  const rank = standings(points).findIndex(([id]) => id === 'player');
  const prize = rank >= 0 && rank < SEASON_PAYOUT.length ? Math.floor(s.season.pool * SEASON_PAYOUT[rank]) : 0;
  return {
    season: { number: s.season.number + 1, points: {}, pool: SEASON_SPONSOR },
    unclaimed: s.unclaimed + prize,
    trophies: prize ? [...s.trophies, { season: s.season.number, rank: rank + 1, prize }] : s.trophies,
  };
}
