import { TRACKS, byId } from '../shared/constants';
import { applyCalls, planText } from '../shared/plan';
import { commitHash } from '../shared/seal';
import type { RaceResult } from '../shared/types';
import { simulateRace, weatherFromSeed } from './simulateRace';

export interface Check {
  ok: boolean;
  text: string;
}

/**
 * Checks a finished race from its published record alone, the way anyone could on chain:
 * the sealed setup matches its hash, the car raced that setup plus the recorded pit calls,
 * the weather follows from the seed, and re-running every car from the seed gives the same times.
 */
export function verifyRace(r: RaceResult): Check[] {
  const p = r.proof;
  const track = byId(TRACKS, r.trackId);
  if (!p || !track || !r.grid) return [{ ok: false, text: 'This race has no proof record to check.' }];
  const me = r.entries.find((e) => e.entrant.isPlayer)!.entrant;
  const ran = { tire: p.loadout.tire, stops: applyCalls(p.loadout.stops, p.calls) };
  const sameRun = me.driver.id === p.loadout.driverId && planText(me) === planText(ran);

  const order = r.grid.map((id) => r.entries.find((e) => e.entrant.id === id)!.entrant);
  const replay = simulateRace(order, track, r.seed, r.weather, r.entries[0].laps.length, r.rainChance);
  const sameTimes = replay.entries.every((e, i) => e.entrant.id === r.entries[i].entrant.id && Math.abs(e.total - r.entries[i].total) < 1e-6);

  return [
    { ok: commitHash(p.round, p.loadout, p.salt) === p.hash, text: 'Sealed setup matches its hash' },
    {
      ok: sameRun,
      text: `Your car ran the sealed plan${p.calls.length ? ` plus ${p.calls.length} pit-wall call${p.calls.length > 1 ? 's' : ''}` : ''}`,
    },
    { ok: r.rainChance === undefined || weatherFromSeed(r.seed, r.rainChance) === r.weather, text: 'Weather follows from the seed' },
    { ok: sameTimes, text: `All ${r.entries.length} cars replay to the same times` },
  ];
}
