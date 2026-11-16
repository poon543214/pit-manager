import { MAX_STOPS, PART_WEAR, PIT_LOSS, TIRES, WET_PART_WEAR } from '../shared/constants';
import { CAR_GAIN, CLIFF_CAP, DRIVER_GAIN, FATIGUE_MAX, MISTAKE_COST, RELIABILITY, REL_WEAR, REST, TIRE_CARE, TIRED_PACE, WET_GRIP, WET_PENALTY, raceToll } from './simulateRace';

export type HelpTopic = 'driver' | 'car' | 'tires' | 'pit' | 'skills';

const s1 = (n: number) => `${n.toFixed(1).replace(/\.0$/, '')}s`;

/**
 * What each Garage choice does in the race, in plain lines: how it works, never what to pick. Built from the simulator's own numbers
 * so the help can never drift from what the race actually does.
 */
export const HELP: Record<HelpTopic, { title: string; lines: string[] }> = {
  driver: {
    title: 'How the driver affects the race',
    lines: [
      `Pace: each point is worth about ${s1(DRIVER_GAIN / 10)} a lap.`,
      `Wet skill: in the rain it counts for 70% of the driver’s speed, and a low score adds up to ${s1(WET_PENALTY)} a lap.`,
      `Consistency: low consistency means bigger lap-to-lap swings and more mistakes, each costing ${MISTAKE_COST}s. Twisty and heavy-braking tracks and rain make mistakes more likely.`,
      `Fatigue: drivers slow down as a race goes on, up to ${s1(FATIGUE_MAX)} a lap by the end for the least consistent, and make more mistakes late on.`,
      `Condition: each race costs a driver ${raceToll(10)}–${raceToll(1)} points (more for low consistency); sitting a race out gives back ${REST}. A driver at 0% is ${s1(TIRED_PACE)} a lap slower from the start and tires faster.`,
    ],
  },
  car: {
    title: 'How parts affect the race',
    lines: [
      'Each part adds Speed, Corner or Brake. The track’s “Rewards” line shows how much each one counts here.',
      `Endurance parts trade some of that for Tire care (each point makes tires wear ${Math.round(TIRE_CARE * 100)}% slower) and Reliability (each point means ${Math.round(RELIABILITY * 100)}% fewer mistakes and ${Math.round(REL_WEAR * 100)}% less part wear).`,
      `Rain parts carry Wet grip: each point is ${WET_GRIP}s a lap faster in the rain and nothing in the dry.`,
      `A car built exactly for the track is up to ${s1(CAR_GAIN)} a lap faster than a poor fit.`,
      'Rain halves the value of Speed and moves it to Corner and Brake.',
      'Every part also brings a skill (see Skills in play).',
      `Racing wears fitted parts down by ${PART_WEAR}% a race (${PART_WEAR + WET_PART_WEAR}% in the rain). A worn part gives less, down to half its stats at 0%. Repairs restore it to 100%.`,
    ],
  },
  tires: {
    title: 'How tires affect the race',
    lines: [
      ...Object.values(TIRES).map(
        (t) =>
          `${t.name}: ${t.grip ? `${s1(t.grip)} a lap faster when new` : 'no extra grip'}, loses ${s1(t.wear)} more each lap${
            t.wetPenalty ? `, ${s1(t.wetPenalty)} a lap slower in rain` : ', best in rain'
          }.`,
      ),
      'Each race uses one set from your stock to start and one per pit stop. Buy sets in the Market.',
      `Past their life, tires fall off a cliff and can cost up to ${CLIFF_CAP}s a lap. The laps each set lasts here are shown on the buttons.`,
    ],
  },
  pit: {
    title: 'How the pit stop affects the race',
    lines: [
      `You can stop up to ${MAX_STOPS} times. Each stop costs about ${PIT_LOSS}s in the pit lane and fits a fresh set of the compound you pick for it.`,
      'Fresh tires have their full grip back and start wearing again from zero.',
    ],
  },
  skills: {
    title: 'How skills affect the race',
    lines: [
      'Your driver and each fitted part bring one skill.',
      'A skill only fires in its situation: the start, the last two laps, rain, dry laps, one track type, fresh or old tires, pit stops, fatigue, or wear.',
      'After the race, Results shows how much time each skill saved.',
    ],
  },
};
