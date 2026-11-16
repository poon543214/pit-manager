import { Button } from '../components/Button';
import { DRIVERS, PARTS, PRACTICE_COST, PRACTICE_RUNS_PER_TRACK, SLOTS, SLOT_LABEL, byId } from '../shared/constants';
import type { Loadout } from '../shared/types';
import { useGame } from '../useGame';
import { planText } from '../shared/plan';

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(3).padStart(6, '0')}`;
};

const kindOf = (id?: string) => {
  const kind = byId(PARTS, id)?.kind;
  return kind ? kind[0].toUpperCase() + kind.slice(1) : 'empty';
};

/** What this run changed from the run before it, old → new. */
function changes(now: Loadout, before?: Loadout): string[] {
  if (!before) return [];
  const out: string[] = [];
  if (now.driverId !== before.driverId)
    out.push(`${byId(DRIVERS, before.driverId)?.name} → ${byId(DRIVERS, now.driverId)?.name}`);
  if (planText(now) !== planText(before)) out.push(`${planText(before)} ⇒ ${planText(now)}`);
  for (const slot of SLOTS)
    if (now.parts[slot] !== before.parts[slot])
      out.push(`${SLOT_LABEL[slot]} ${kindOf(before.parts[slot])} → ${kindOf(now.parts[slot])}`);
  return out;
}

export function Practice() {
  const { state, service, attempt, go, practiceLog, addPractice } = useGame();
  const next = service.nextRace();
  const driver = byId(DRIVERS, state.loadout.driverId);
  const left = service.practiceLeft();
  const runs = practiceLog.filter((r) => r.round === next.round);

  const run = async () => {
    const report = await attempt(() => service.runPractice());
    if (report) addPractice({ round: next.round, loadout: state.loadout, report });
  };

  const bestProjected = runs.length ? Math.min(...runs.map((r) => r.report.projected)) : 0;

  return (
    <div className="page practice">
      <section className="card race-brief">
        <div>
          <h2>Practice at {next.track.name}</h2>
          <p>
            Each run is 3 laps for <i className="coin" /> {PRACTICE_COST}, in the forecast’s likely conditions:{' '}
            {next.weather === 'wet' ? 'wet' : 'dry'} ({Math.round(next.rainChance * 100)}% chance of rain). Change your setup in
            Garage, then run again to compare. Your runs stay here until the race.
          </p>
          {driver && (
            <p className="runs-left">
              <b>
                {left} of {PRACTICE_RUNS_PER_TRACK}
              </b>{' '}
              runs left for {driver.name} at this track
            </p>
          )}
        </div>
        <div className="cta-col">
          <Button onClick={run} disabled={!driver || left === 0}>
            Run practice
          </Button>
          <Button variant="ghost" onClick={() => go('garage')}>
            Change setup
          </Button>
        </div>
      </section>

      {!driver && (
        <p className="muted">
          {state.ownedDrivers.length ? 'Pick a driver in Garage to practice.' : 'Buy a driver in the Market to practice.'}
        </p>
      )}

      {runs.length > 0 && (
        <table className="timing">
          <thead>
            <tr>
              <th>Setup</th>
              <th>L1</th>
              <th>L2</th>
              <th>L3</th>
              <th>Best lap</th>
              <th>Projected race time</th>
              <th>vs best</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r, i) => {
              const l = r.loadout;
              const parts = Object.values(l.parts).filter(Boolean).length;
              const diff = changes(l, runs[i + 1]?.loadout);
              const gap = r.report.projected - bestProjected;
              return (
                <tr key={runs.length - i} className={gap === 0 ? 'best' : ''}>
                  <td>
                    {byId(DRIVERS, l.driverId)?.name} · {parts}/4 parts · {planText(l)}
                    {diff.length > 0 && <span className="run-diff">Changed: {diff.join(', ')}</span>}
                  </td>
                  {r.report.laps.map((t, j) => (
                    <td key={j} className="mono">
                      {fmt(t)}
                    </td>
                  ))}
                  <td className="mono">{fmt(r.report.best)}</td>
                  <td className="mono">{fmt(r.report.projected)}</td>
                  <td className="mono">{gap === 0 ? 'Best' : `+${gap.toFixed(3)}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export { fmt };
