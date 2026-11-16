import { describe, expect, it } from 'vitest';
import { DRIVERS, PARTS, RIVALS, SLOTS, TIRES, TRACKS } from '../../shared/constants';
import { carStats } from '../../shared/fitScore';
import { applyCalls } from '../../shared/plan';
import { commitHash } from '../../shared/seal';
import type { Entrant, Loadout, TireId, Track, Weather } from '../../shared/types';
import { raceBreakdown } from '../explain';
import { projectedTotal, simulateRace, weatherFromSeed } from '../simulateRace';
import { verifyRace } from '../verify';

const ids = Object.keys(TIRES) as TireId[];
const SALT = `0x${'ab'.repeat(32)}`;

function entrant(i: number, plan: Pick<Entrant, 'tire' | 'stops'>, player = false): Entrant {
  const driver = [...DRIVERS, ...RIVALS][i];
  const kind = (['speed', 'corner', 'brake'] as const)[i % 3];
  const parts = Object.fromEntries(PARTS.filter((p) => p.kind === kind).map((p) => [p.slot, p.id]));
  return {
    id: player ? 'player' : `ai-${driver.id}`,
    label: driver.name,
    isPlayer: player,
    driver,
    stats: carStats(parts),
    condition: 90,
    color: '#fff',
    perks: [driver.perk],
    ...plan,
  };
}

const field = (playerPlan: Pick<Entrant, 'tire' | 'stops'>) => [
  entrant(0, playerPlan, true),
  ...Array.from({ length: 9 }, (_, i) => entrant(i + 1, { tire: ids[i % 3], stops: [{ lap: 8 + (i % 5), tire: ids[(i + 1) % 3] }] })),
];

describe('simulateRace', () => {
  const track = TRACKS[1];
  const plan = { tire: 'medium' as TireId, stops: [{ lap: 9, tire: 'hard' as TireId }] };

  it('replays identically from the same seed', () => {
    const a = simulateRace(field(plan), track, 1234, 'dry');
    const b = simulateRace(field(plan), track, 1234, 'dry');
    expect(b.entries.map((e) => e.total)).toEqual(a.entries.map((e) => e.total));
  });

  it("a pit-wall change to one car leaves every other car's race untouched", () => {
    const a = simulateRace(field(plan), track, 99, 'wet');
    const b = simulateRace(field({ tire: 'soft', stops: [{ lap: 3, tire: 'soft' }] }), track, 99, 'wet');
    const others = (r: typeof a) =>
      Object.fromEntries(r.entries.filter((e) => !e.entrant.isPlayer).map((e) => [e.entrant.id, e.total]));
    expect(others(b)).toEqual(others(a));
  });

  it('the post-race breakdown accounts for every second', () => {
    for (const weather of ['dry', 'wet'] as Weather[]) {
      const r = simulateRace(field(plan), track, 7, weather);
      for (const e of r.entries) {
        const parts = Object.values(raceBreakdown(e, track, weather)).reduce((a, b) => a + b, 0);
        expect(parts + track.baseLap * e.laps.length).toBeCloseTo(e.total, 6);
      }
    }
  });
});

describe('balance', () => {
  /** Every plan with up to two stops, each on any lap and compound. */
  const plans = (laps: number) =>
    ids.flatMap((tire) => [
      { tire, stops: [] },
      ...Array.from({ length: laps - 1 }, (_, a) => ids.map((t1) => ({ tire, stops: [{ lap: a + 1, tire: t1 }] }))).flat(),
      ...Array.from({ length: laps - 1 }, (_, a) =>
        Array.from({ length: laps - 2 - a }, (_, k) => ids.flatMap((t1) => ids.map((t2) => ({ tire, stops: [{ lap: a + 1, tire: t1 }, { lap: a + 2 + k, tire: t2 }] })))).flat(2),
      ).flat(),
    ]);
  const key = (p: { tire: TireId; stops: { lap: number; tire: TireId }[] }) => `${p.tire}|${p.stops.map((s) => `${s.lap}${s.tire}`).join(',')}`;

  it('covers every plan with up to two stops', () => {
    // 3 starts × (no stop + 19 laps × 3 compounds + C(19,2) lap pairs × 9 compound pairs)
    expect(plans(20)).toHaveLength(3 * (1 + 19 * 3 + 171 * 9));
  });

  it('no tire plan is within a second of the best on every track and weather', () => {
    const scenarios = TRACKS.flatMap((track: Track) => (['dry', 'wet'] as Weather[]).map((weather) => ({ track, weather })));
    const gapByPlan = new Map<string, number>();
    for (const { track, weather } of scenarios) {
      const base = entrant(2, { tire: 'medium', stops: [] }, true);
      const times = plans(track.laps).map((p) => ({ k: key(p), t: projectedTotal({ ...base, ...p }, track, weather) }));
      const best = Math.min(...times.map((x) => x.t));
      for (const { k, t } of times) gapByPlan.set(k, Math.max(gapByPlan.get(k) ?? 0, t - best));
    }
    const dominant = [...gapByPlan.entries()].filter(([, worst]) => worst < 1);
    expect(dominant).toEqual([]);
  });

  it('every part family is in the best build somewhere, and no family is best everywhere', () => {
    // builds: all four parts of the track's own kind, or one or two slots swapped to endurance, or a full rain set
    const pick = (slot: string, kind: string) => PARTS.find((p) => p.slot === slot && p.kind === kind)!.id;
    const masks = [1, 2, 4, 8, 3, 5, 6, 9, 10, 12];
    const coarse = (laps: number) => plans(laps).filter((p) => p.stops.every((s) => s.lap % 2 === 0));
    const winners = new Set<string>();
    for (const track of TRACKS) {
      for (const weather of ['dry', 'wet'] as Weather[]) {
        const builds: [string, Loadout['parts']][] = [
          [track.focus, Object.fromEntries(SLOTS.map((s) => [s, pick(s, track.focus)]))],
          ['rain', Object.fromEntries(SLOTS.map((s) => [s, pick(s, 'rain')]))],
          ...masks.map((m): [string, Loadout['parts']] => [
            'endurance',
            Object.fromEntries(SLOTS.map((s, i) => [s, pick(s, m & (1 << i) ? 'endurance' : track.focus)])),
          ]),
        ];
        const timed = builds.map(([family, parts]) => {
          const base = { ...entrant(2, { tire: 'medium', stops: [] }, true), stats: carStats(parts) };
          return { family, t: Math.min(...coarse(track.laps).map((p) => projectedTotal({ ...base, ...p }, track, weather))) };
        });
        winners.add(timed.reduce((a, b) => (b.t < a.t ? b : a)).family);
      }
    }
    expect([...winners].sort()).toEqual(expect.arrayContaining(['endurance', 'rain']));
    expect(winners.size).toBeGreaterThanOrEqual(3);
  });
});

describe('verifyRace', () => {
  const track = TRACKS[0];
  const loadout: Loadout = { driverId: DRIVERS[0].id, parts: {}, tire: 'medium', stops: [{ lap: 10, tire: 'hard' }] };
  const calls = [{ lap: 6, tire: 'soft' as TireId }];
  const record = () => {
    const seed = 4242;
    const weather = weatherFromSeed(seed, 0.4);
    const me = entrant(0, { tire: loadout.tire, stops: applyCalls(loadout.stops, calls) }, true);
    const r = simulateRace([me, ...field(loadout).slice(1)], track, seed, weather, track.laps, 0.4);
    return { ...r, proof: { round: 3, hash: commitHash(3, loadout, SALT), salt: SALT, loadout, calls } };
  };

  it('passes an honest race', () => {
    expect(verifyRace(record()).every((c) => c.ok)).toBe(true);
  });

  it('catches a tampered time', () => {
    const r = record();
    r.entries[0] = { ...r.entries[0], total: r.entries[0].total - 5 };
    expect(verifyRace(r).find((c) => c.text.includes('replay'))?.ok).toBe(false);
  });

  it('catches a setup that differs from what was sealed', () => {
    const r = record();
    r.proof = { ...r.proof, loadout: { ...loadout, tire: 'soft' } };
    expect(verifyRace(r)[0].ok).toBe(false);
  });
});

describe('applyCalls', () => {
  it('a pit-wall call replaces the next planned stop ahead of it', () => {
    const stops = [
      { lap: 6, tire: 'hard' as TireId },
      { lap: 14, tire: 'soft' as TireId },
    ];
    expect(applyCalls(stops, [{ lap: 4, tire: 'medium' }])).toEqual([
      { lap: 4, tire: 'medium' },
      { lap: 14, tire: 'soft' },
    ]);
  });
});
