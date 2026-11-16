import { PIT_LOSS } from '../shared/constants';
import type { RaceEntryResult, RaceResult } from '../shared/types';

export interface CarFrame {
  id: string;
  /** distance covered in the race, in laps (e.g. 2.4) */
  progress: number;
  lap: number;
  inPit: boolean;
  finished: boolean;
  finishTime: number;
}

/** Where every car is at race time t (seconds). */
export function frameAt(result: RaceResult, t: number): CarFrame[] {
  const frames = result.entries.map((e) => carAt(e, t));
  return frames.sort((a, b) =>
    a.finished && b.finished ? a.finishTime - b.finishTime : b.progress - a.progress,
  );
}

function carAt(e: RaceEntryResult, t: number): CarFrame {
  let elapsed = 0;
  const total = e.laps.length;
  for (const lap of e.laps) {
    if (t < elapsed + lap.time) {
      const into = t - elapsed;
      const drive = lap.pitted ? lap.time - (lap.pitTime ?? PIT_LOSS) : lap.time;
      if (into >= drive) {
        return { id: e.entrant.id, progress: lap.lap, lap: lap.lap, inPit: true, finished: false, finishTime: 0 };
      }
      return {
        id: e.entrant.id,
        progress: lap.lap - 1 + into / drive,
        lap: lap.lap,
        inPit: false,
        finished: false,
        finishTime: 0,
      };
    }
    elapsed += lap.time;
  }
  return { id: e.entrant.id, progress: total, lap: total, inPit: false, finished: true, finishTime: e.total };
}

export const raceDuration = (r: RaceResult) => Math.max(...r.entries.map((e) => e.total));
