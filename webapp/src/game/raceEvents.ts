import { TIRES } from '../shared/constants';
import { MISTAKE_COST, tireAgeLimit } from '../sim/simulateRace';
import type { RaceResult, Track } from '../shared/types';

export interface RaceEvent {
  /** race time (s) the event happens */
  t: number;
  text: string;
  tone: 'good' | 'bad' | 'info';
}

/**
 * The moments in the player's race worth calling out while it plays, read straight from the lap records,
 * so the radio never says anything the result doesn't back up.
 */
export function playerEvents(result: RaceResult, track: Track): RaceEvent[] {
  const me = result.entries.find((e) => e.entrant.isPlayer);
  if (!me) return [];
  const out: RaceEvent[] = [
    // the weather is drawn at the reveal; this is the first the player hears of it
    { t: 0, text: result.weather === 'wet' ? 'Lights out: it’s raining' : 'Lights out: a dry race', tone: 'info' },
  ];
  const laps = me.laps.length;
  let start = 0;
  let age = 0;
  let worn = false;
  me.laps.forEach((rec, i) => {
    const tire = TIRES[rec.tire].name;
    if (!worn && age > tireAgeLimit(me.entrant, track, result.weather, rec.tire)) {
      worn = true;
      out.push({ t: start, text: `L${rec.lap} · ${tire}s are gone, losing time every lap`, tone: 'bad' });
    }
    if (rec.mistake) out.push({ t: start + rec.time * 0.4, text: `L${rec.lap} · Off at a corner, +${MISTAKE_COST}s`, tone: 'bad' });
    if (rec.pitted) {
      const drive = rec.time - (rec.pitTime ?? 0);
      const next = TIRES[me.laps[i + 1]?.tire ?? rec.tire].name;
      out.push({ t: start + drive, text: `L${rec.lap} · Box box: ${next}s on, ${rec.pitTime?.toFixed(1)}s stop`, tone: 'info' });
    }
    if (rec.lap === laps && laps > 1) out.push({ t: start, text: 'Final lap', tone: 'info' });
    start += rec.time;
    if (rec.pitted) {
      age = 0;
      worn = false;
    } else {
      age++;
    }
  });
  return out.sort((a, b) => a.t - b.t);
}
