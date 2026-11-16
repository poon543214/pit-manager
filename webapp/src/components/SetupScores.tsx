import { useEffect, useRef, useState } from 'react';
import { DRIVERS, byId } from '../shared/constants';
import { carStats, fitScore } from '../shared/fitScore';
import type { Loadout, Track, Weather } from '../shared/types';

interface Props {
  loadout: Loadout;
  track: Track;
  weather: Weather;
  /** part durability by id; worn parts give less */
  wear?: Record<string, number>;
  /** large on the Garage and race entry, compact beside the Home car card */
  size?: 'lg' | 'sm';
}

/**
 * Car fit, shown the same way everywhere: how well the driver and parts suit the track.
 * It deliberately says nothing about tyres or the pit plan; that is the player's call.
 */
export function SetupScores({ loadout, track, weather, wear, size = 'lg' }: Props) {
  const driver = byId(DRIVERS, loadout.driverId);
  const fit = fitScore(carStats(loadout.parts, wear), driver, track, weather);
  const fitMove = useMove(fit);
  return (
    <div className={`scores scores-${size}`}>
      <div className="score" title="How well your driver and parts suit this track and weather, out of 100. Tires and the pit plan are not counted.">
        <b>{fit}</b>
        <small>Car fit</small>
        <Move by={fitMove} />
      </div>
    </div>
  );
}

/** How much a score just moved, cleared after a moment; null until the first change. */
function useMove(value: number) {
  const prev = useRef(value);
  const [move, setMove] = useState<{ by: number; key: number } | null>(null);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    setMove({ by: value - from, key: Date.now() });
    const t = setTimeout(() => setMove(null), 2200);
    return () => clearTimeout(t);
  }, [value]);
  return move;
}

function Move({ by }: { by: { by: number; key: number } | null }) {
  return (
    <span className="score-move" aria-live="polite">
      {by && (
        <i key={by.key} className={by.by > 0 ? 'up' : 'down'}>
          {by.by > 0 ? '+' : '−'}
          {Math.abs(by.by)}
        </i>
      )}
    </span>
  );
}
