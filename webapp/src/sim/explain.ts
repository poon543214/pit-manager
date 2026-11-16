import { TIRES } from '../shared/constants';
import { trackWeights } from '../shared/fitScore';
import { planText } from '../shared/plan';
import type { CarStats, PartKind, RaceEntryResult, TireId, Track, Weather } from '../shared/types';
import { PERKS } from './perks';
import { MISTAKE_COST, lapDetail, tireLaps } from './simulateRace';

export type Factor = 'car' | 'driver' | 'fatigue' | 'tires' | 'pit' | 'mistakes' | 'perks' | 'scatter';

/** Seconds each factor added to an entrant's race (negative = it saved time). Sums to the race total minus base laps. */
export type Breakdown = Record<Factor, number>;

/**
 * Replays a finished race lap by lap without noise, so every second of the total can be put down to
 * the car, the driver, tyres, pit stops, mistakes or skills. What is left over is lap-to-lap scatter.
 */
export function raceBreakdown(entry: RaceEntryResult, track: Track, weather: Weather): Breakdown {
  const b: Breakdown = { car: 0, driver: 0, fatigue: 0, tires: 0, pit: 0, mistakes: 0, perks: 0, scatter: 0 };
  const laps = entry.laps.length;
  let age = 0;
  let outLap = false;
  for (const rec of entry.laps) {
    const d = lapDetail(entry.entrant, track, weather, age, 0, { lap: rec.lap, laps, outLap, mistakeRoll: 1, tire: rec.tire });
    const pit = rec.pitTime ?? 0;
    const mistake = rec.mistake ? MISTAKE_COST : 0;
    b.car += d.parts.car;
    b.driver += d.parts.driver;
    b.fatigue += d.parts.fatigue;
    b.tires += d.parts.tires;
    b.perks += d.parts.perks;
    b.pit += pit;
    b.mistakes += mistake;
    b.scatter += rec.time - d.time - pit - mistake;
    age = rec.pitted ? 0 : age + 1;
    outLap = rec.pitted;
  }
  return b;
}

/** Each set of tyres the entrant ran, in order, with how many laps it did. */
export function stints(entry: RaceEntryResult): { tire: TireId; laps: number }[] {
  const out: { tire: TireId; laps: number }[] = [];
  let n = 0;
  for (const rec of entry.laps) {
    n++;
    if (rec.pitted) {
      out.push({ tire: rec.tire, laps: n });
      n = 0;
    }
  }
  const last = entry.laps[entry.laps.length - 1];
  if (n && last) out.push({ tire: last.tire, laps: n });
  return out;
}

/** The kind of part the car leans on most. */
export const strongest = (s: CarStats): PartKind =>
  s.speed >= s.corner && s.speed >= s.brake ? 'speed' : s.corner >= s.brake ? 'corner' : 'brake';

/** The kind of part this track rewards most in this weather. */
export function trackWants(track: Track, weather: Weather): PartKind {
  const w = trackWeights(track, weather);
  return (Object.keys(w) as PartKind[]).reduce((x, k) => (w[k] > w[x] ? k : x));
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/** What the player is shown. Tyres and pit stops are one decision, so they are judged together. */
export type GapFactor = 'car' | 'driver' | 'fatigue' | 'strategy' | 'mistakes' | 'perks' | 'scatter';

export const GAP_LABEL: Record<GapFactor, string> = {
  car: 'Car setup',
  driver: 'Driver',
  fatigue: 'Fatigue',
  strategy: 'Tire strategy',
  mistakes: 'Mistakes',
  perks: 'Skills',
  scatter: 'Luck',
};

export interface GapRow {
  f: GapFactor;
  /** seconds you lost to the rival on this factor (negative = you gained) */
  d: number;
  /** what happened, in one sentence */
  why: string;
  /** what to try next race */
  tip: string;
}

/** Where the time between you and a rival came from, one row per factor. */
export function gapReport(me: RaceEntryResult, rival: RaceEntryResult, track: Track, weather: Weather): GapRow[] {
  const a = raceBreakdown(me, track, weather);
  const b = raceBreakdown(rival, track, weather);
  const d: Record<GapFactor, number> = {
    car: a.car - b.car,
    driver: a.driver - b.driver,
    fatigue: a.fatigue - b.fatigue,
    strategy: a.tires + a.pit - (b.tires + b.pit),
    mistakes: a.mistakes - b.mistakes,
    perks: a.perks - b.perks,
    scatter: a.scatter - b.scatter,
  };
  return (Object.keys(d) as GapFactor[]).map((f) => ({ f, d: d[f], ...explain(f, me, rival, a, b, track, weather) }));
}

function explain(
  f: GapFactor,
  me: RaceEntryResult,
  rival: RaceEntryResult,
  a: Breakdown,
  b: Breakdown,
  track: Track,
  weather: Weather,
) {
  const wet = weather === 'wet';
  const mine = me.entrant;
  const them = rival.entrant;
  const name = them.label;
  switch (f) {
    case 'car': {
      const wants = trackWants(track, weather);
      const built = strongest(mine.stats);
      // no fit number here: Car fit (parts and driver) is shown before the race, this row is the parts alone
      return {
        why:
          built === wants
            ? `Your car suits ${cap(wants)}, but ${name}’s parts fit ${track.name} better.`
            : `${track.name}${wet ? ' in the rain' : ''} rewards ${cap(wants)} parts; your car is built for ${cap(built)}.`,
        tip: `Fit ${cap(wants)} parts for ${track.name}${wet ? ' in the rain' : ''}.`,
      };
    }
    case 'driver':
      return wet
        ? {
            why: `In the rain, wet skill counts most: yours ${mine.driver.wet}, ${name}’s ${them.driver.wet}.`,
            tip: 'For a wet race, pick a driver with high wet skill.',
          }
        : {
            why: `Pace ${mine.driver.pace} vs ${them.driver.pace}.`,
            tip: 'Each point of pace is worth about 0.3s a lap.',
          };
    case 'fatigue': {
      const cond = mine.condition ?? 100;
      const theirs = them.condition ?? 100;
      return {
        why: `${mine.driver.name} started at ${cond}% condition (${name} ${theirs}%) and, with consistency ${mine.driver.consistency} against ${them.driver.consistency}, ${
          a.fatigue > b.fatigue ? 'faded more' : 'held up better'
        } over ${me.laps.length} laps.`,
        tip:
          cond < 80
            ? 'A tired driver is slower from lap one: race someone else so this driver can rest.'
            : 'A more consistent driver tires less over a long race.',
      };
    }
    case 'strategy': {
      // find what actually cost the time: a worn-out stint, slower compounds, or pit-lane time
      const mySets = stints(me);
      const theirSets = stints(rival);
      const theirPlan = `${name} ran ${planText(them)}.`;
      const worn = mySets
        .map((st) => ({ ...st, life: tireLaps(mine, track, weather, st.tire) }))
        .filter((st) => st.laps > st.life)
        .sort((x, y) => y.laps - y.life - (x.laps - x.life))[0];
      // average compound pace per lap, from grip and the rain penalty, weighted by laps run on each set
      const pace = (sets: { tire: TireId; laps: number }[]) =>
        sets.reduce((sum, st) => sum + st.laps * (TIRES[st.tire].grip - (wet ? TIRES[st.tire].wetPenalty : 0)), 0) /
        Math.max(1, sets.reduce((n, st) => n + st.laps, 0));
      const slower = pace(theirSets) - pace(mySets);
      const myStops = mySets.length - 1;
      const theirStops = theirSets.length - 1;
      const causes = [
        {
          lost: worn ? a.tires - b.tires : 0,
          why: worn
            ? `Your ${TIRES[worn.tire].name} set ran ${worn.laps} laps, but ${TIRES[worn.tire].name}s last about ${worn.life} here, so the last laps fell off the cliff.`
            : '',
          tip: worn ? `Pit before ${TIRES[worn.tire].name}s pass ${worn.life} laps, or run a harder tire in that stint.` : '',
        },
        {
          lost: !worn && slower > 0.1 ? a.tires - b.tires : 0,
          why: `Your tires averaged about ${slower.toFixed(1)}s a lap slower than ${name}’s${wet ? ' in the rain' : ''}, which adds up over ${me.laps.length} laps.`,
          tip: `Try ${planText(them)}, like ${name}.`,
        },
        {
          lost: a.pit - b.pit,
          why: `You stopped ${myStops || 'no'} time${myStops === 1 ? '' : 's'} (${a.pit.toFixed(1)}s in the pit lane) against ${theirStops} for ${name}.`,
          tip: 'Each stop costs pit-lane time: stop only when worn tires would lose more.',
        },
      ]
        .filter((c) => c.lost >= 0.5)
        .sort((x, y) => y.lost - x.lost);
      const top = causes[0];
      return top
        ? { why: `${top.why} ${theirPlan}`, tip: top.tip }
        : { why: `You ran ${planText(mine)}. ${theirPlan}`, tip: `Try ${planText(them)}, like ${name}.` };
    }
    case 'mistakes': {
      const laps = me.laps.filter((l) => l.mistake).map((l) => l.lap);
      const theirs = rival.laps.filter((l) => l.mistake).length;
      const list = laps.length > 1 ? `s ${laps.slice(0, -1).join(', ')} and ${laps[laps.length - 1]}` : ` ${laps[0]}`;
      return {
        why: laps.length
          ? `You went off on lap${list}; ${name} made ${theirs || 'no'} mistake${theirs === 1 ? '' : 's'}.`
          : `A clean race from you; ${name} made ${theirs} mistake${theirs === 1 ? '' : 's'}.`,
        tip: 'A more consistent driver, or an engine with Safe Map, makes fewer mistakes.',
      };
    }
    case 'perks': {
      // only the lap-time skills: pit and tyre skills are already counted in tire strategy
      const lapSkill = (id: string) => PERKS[id]?.effects.some((fx) => 's' in fx && fx.on !== 'pit');
      const top = Object.entries(me.gains)
        .filter(([id, s]) => s >= 0.05 && lapSkill(id))
        .sort((x, y) => y[1] - x[1])
        .slice(0, 2)
        .map(([id, s]) => `${PERKS[id]?.name ?? id} ${s.toFixed(1)}s`);
      return {
        why: `Your skills saved ${(-a.perks).toFixed(1)}s${top.length ? ` (${top.join(', ')})` : ''}; ${name}’s saved ${(-b.perks).toFixed(1)}s.`,
        tip: 'Pick parts whose skills fit the race: rain, start, finish or pit.',
      };
    }
    case 'scatter':
      return {
        why: 'Random lap-to-lap variation.',
        tip: 'A more consistent driver keeps this smaller.',
      };
  }
}
