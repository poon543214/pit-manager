import { Button } from '../components/Button';
import { WeatherIcon } from '../components/PixelIcon';
import { CarBuilder } from '../components/CarBuilder';
import { PerkIcon } from '../components/PerkIcon';
import { PERKS } from '../sim/perks';
import { DriverImg, TireImg } from '../components/Sprites';
import { StatBar } from '../components/StatBar';
import { SetupScores } from '../components/SetupScores';
import { HelpTip } from '../components/HelpTip';
import { StarterPack } from '../components/StarterPack';
import { DRIVERS, MAX_STOPS, PARTS, SLOTS, TIRES, byId, repairCost } from '../shared/constants';
import { carStats, trackWeights } from '../shared/fitScore';
import { tireLife } from '../sim/simulateRace';
import type { PitStop, TireId } from '../shared/types';
import { setsNeeded, shortOf } from '../shared/plan';
import { useGame } from '../useGame';

export function Garage() {
  const { state, service, attempt, go, isOpen, notify, demo } = useGame();
  const locked = state.commit?.round === service.nextRace().round;
  const { loadout } = state;
  const next = service.nextRace();
  const stats = carStats(loadout.parts, state.partWear);
  const driver = byId(DRIVERS, loadout.driverId);
  const myDrivers = DRIVERS.filter((d) => state.ownedDrivers.includes(d.id));
  const w = trackWeights(next.track, next.weather);
  const weightText = (['speed', 'corner', 'brake'] as const)
    .map((k) => `${k === 'speed' ? 'SPD' : k === 'corner' ? 'CRN' : 'BRK'} ${Math.round(w[k] * 100)}%`)
    .join(' · ');
  const tireNote = (id: TireId) => {
    const t = TIRES[id];
    const life = (w: 'dry' | 'wet') => Math.max(1, Math.round(tireLife(t, next.track, w)));
    const paceText = t.grip === 0 ? 'baseline' : `−${t.grip.toFixed(1)}s/lap`;
    const rain = t.wetPenalty >= 1 ? ' · slow in rain' : t.wetPenalty > 0 ? ' · ok in rain' : ' · best in rain';
    return `${paceText} · ~${life('dry')} laps dry, ~${life('wet')} wet${rain}`;
  };
  const laps = next.track.laps;
  const fitted = SLOTS.flatMap((slot) => byId(PARTS, loadout.parts[slot]) ?? []);
  const shortTire = shortOf(loadout, state.tireSets);
  const setStops = (stops: PitStop[]) => attempt(() => service.setLoadout({ stops }));
  const setStop = (i: number, patch: Partial<PitStop>) =>
    setStops(loadout.stops.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  // a new stop goes halfway through what's left of the race; the player moves it from there
  const addStop = () => {
    const from = loadout.stops[loadout.stops.length - 1]?.lap ?? 0;
    const lap = Math.min(laps - 1, Math.max(from + 1, Math.round((from + laps) / 2)));
    setStops([...loadout.stops, { lap, tire: 'medium' }]);
  };
  const activePerks = [
    ...(driver ? [{ from: driver.name, id: driver.perk }] : []),
    ...SLOTS.flatMap((slot) => {
      const p = byId(PARTS, loadout.parts[slot]);
      return p ? [{ from: p.name, id: p.perk }] : [];
    }),
  ];

  if (!myDrivers.length) {
    return (
      <div className="page empty">
        <h2>No driver yet</h2>
        {state.starterClaimed === false ? (
          <div className="empty-starter">
            <StarterPack />
          </div>
        ) : isOpen('market') ? (
          <>
            <p>Buy a driver in the Market to start setting up your car.</p>
            <Button onClick={() => go('market')}>Go to Market</Button>
          </>
        ) : (
          <p>The Market opens Sunday and Thursday. Buy a driver there to start setting up your car.</p>
        )}
      </div>
    );
  }

  return (
    <div className="page garage">
      <div className="g-col">
        <section className="card race-brief">
          <div>
            <h2>{next.track.name}</h2>
            <p>
              R{next.round} · {next.track.laps} laps · rewards{' '}
              <b className={`k-${next.track.focus}`}>{next.track.focus.toUpperCase()}</b>
            </p>
            <p className="weather-line">
              <WeatherIcon wet={next.weather === 'wet'} size={14} />
              Rain {Math.round(next.rainChance * 100)}% · decided on race day
            </p>
            <p className="weights-line">
              Rewards {weightText}
            </p>
          </div>
          <SetupScores wear={state.partWear} loadout={state.loadout} track={next.track} weather={next.weather} />
        </section>


        {locked && (
          <p className="lock-note card" role="status">
            <b>Setup locked for R{state.commit!.round}.</b> It was sealed for the race and unlocks once the race is run.
          </p>
        )}

        <section className="g-panel">
          <h2 className="h-help">
            Driver <HelpTip topic="driver" />
          </h2>
          <div className="driver-list" role="radiogroup" aria-label="Driver">
            {myDrivers.map((d) => (
              <button
                key={d.id}
                role="radio"
                aria-checked={loadout.driverId === d.id}
                disabled={locked}
                className={`driver-row ${loadout.driverId === d.id ? 'on' : ''}`}
                onClick={() => attempt(() => service.setLoadout({ driverId: d.id }))}
              >
                <DriverImg d={d} size={40} />
                <strong className="name-with-perk">
                  {d.name} <PerkIcon id={d.perk} size={12} inButton />
                </strong>
                <span className="mini-stats">
                  PACE {d.pace} · CONS {d.consistency} · WET {d.wet} · COND {state.driverCondition[d.id] ?? 100}%
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="g-col g-car">
        <section className="g-panel">
          <div className="g-car-head">
            <h2 className="h-help">
              Car <HelpTip topic="car" />
            </h2>
            <p className="muted">{locked ? 'Sealed for the race.' : 'Point at a part on the car to change it.'}</p>
          </div>
          <CarBuilder
            parts={loadout.parts}
            owned={state.ownedParts}
            marketOpen={isOpen('market')}
            locked={locked}
            onMarket={() => go('market')}
            onFit={(slot, id) => attempt(() => service.setLoadout({ parts: { ...loadout.parts, [slot]: id } }))}
          />
        </section>

        <section className="g-panel">
          <h2>Car stats</h2>
          <div className="card">
            <StatBar label="SPD" value={Math.round(stats.speed)} max={13} tone="red" />
            <StatBar label="CRN" value={Math.round(stats.corner)} max={13} tone="white" />
            <StatBar label="BRK" value={Math.round(stats.brake)} max={13} tone="black" />
          </div>
          {fitted.length > 0 && (
            <ul className="wear-list" aria-label="Part condition">
              {fitted.map((p) => {
                const dur = state.partWear[p.id] ?? 100;
                const cost = repairCost(p.price, dur);
                return (
                  <li key={p.id}>
                    <span className="wear-name">{p.name}</span>
                    <span className={`wear-bar${dur < 50 ? ' low' : ''}`} aria-hidden>
                      <i style={{ width: `${dur}%` }} />
                    </span>
                    <span className="wear-num">{dur}%</span>
                    <button
                      type="button"
                      className="wear-fix"
                      disabled={cost <= 0}
                      aria-label={cost > 0 ? `Repair ${p.name} for ${cost} coins` : `${p.name} is in perfect shape`}
                      onClick={() => attempt(() => service.repairPart(p.id)).then(() => notify(`${p.name} repaired`))}
                    >
                      {cost > 0 ? (
                        <>
                          Repair <i className="coin" /> {demo ? 0 : cost}
                        </>
                      ) : (
                        'New'
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="g-col">
        <section className="g-panel">
          <h2 className="h-help">
            Start tires <HelpTip topic="tires" />
          </h2>
          <div className="tire-row" role="radiogroup" aria-label="Start tires">
            {(Object.keys(TIRES) as TireId[]).map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={loadout.tire === id}
                disabled={locked}
                className={`chip tire ${loadout.tire === id ? 'on' : ''}`}
                onClick={() => attempt(() => service.setLoadout({ tire: id }))}
              >
                <TireImg id={id} size={32} />
                <span>
                  {TIRES[id].name} <span className="stock">×{state.tireSets[id] ?? 0}</span>
                  <small>
                    {tireNote(id)}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="g-panel">
          <h2 className="h-help">
            Pit stops <HelpTip topic="pit" />
            <span className="stop-count">
              {loadout.stops.length}/{MAX_STOPS}
            </span>
          </h2>
          {loadout.stops.length === 0 && (
            <p className="muted stop-none">No stop: one set of {TIRES[loadout.tire].name}s for all {laps} laps.</p>
          )}
          <ol className="stop-list">
            {loadout.stops.map((stop, i) => (
              <li key={i} className="stop-row">
                <div className="stop-line">
                  <b>Stop {i + 1}</b>
                  <label>
                    after lap{' '}
                    <select
                      value={stop.lap}
                      disabled={locked}
                      onChange={(e) => setStop(i, { lap: Number(e.target.value) })}
                    >
                      {Array.from({ length: laps - 1 }, (_, k) => k + 1)
                        .filter((lap) => lap === stop.lap || !loadout.stops.some((s) => s.lap === lap))
                        .map((lap) => (
                          <option key={lap} value={lap}>
                            {lap}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="stop-x"
                    aria-label={`Remove stop ${i + 1}`}
                    disabled={locked}
                    onClick={() => setStops(loadout.stops.filter((_, k) => k !== i))}
                  >
                    ×
                  </button>
                </div>
                <div className="stop-tires" role="radiogroup" aria-label={`Tires fitted at stop ${i + 1}`}>
                  {(Object.keys(TIRES) as TireId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={stop.tire === id}
                      disabled={locked}
                      className={stop.tire === id ? 'on' : ''}
                      onClick={() => setStop(i, { tire: id })}
                    >
                      <i className={`tire-dot t-${id}`} aria-hidden />
                      {TIRES[id].name}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {shortTire && (
            <p className="stock-note">
              Not enough {TIRES[shortTire].name} sets for this plan ({setsNeeded(loadout)[shortTire]} needed, {state.tireSets[shortTire] ?? 0} in
              stock). Buy more in the Market.
            </p>
          )}
          {loadout.stops.length < MAX_STOPS && !locked && (
            <button type="button" className="add-stop" onClick={addStop}>
              + Add pit stop
            </button>
          )}
        </section>

        <section className="g-panel">
          <h2 className="h-help">
            Skills in play <HelpTip topic="skills" />
          </h2>
          {activePerks.length ? (
            <ul className="perk-grid">
              {activePerks.map((p) => (
                <li key={p.from}>
                  <span className="pg-head">
                    <PerkIcon id={p.id} size={14} />
                    <b>{PERKS[p.id]?.name}</b>
                  </span>
                  <span className="pg-text">{PERKS[p.id]?.text}</span>
                  <span className="pg-from">{p.from}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Pick a driver and fit parts to bring their skills.</p>
          )}
        </section>

        <div className="cta-row">
          {!driver && <span className="muted">Pick a driver to race.</span>}
          {isOpen('practice') && (
            <Button variant="ghost" onClick={() => go('practice')}>
              Practice
            </Button>
          )}
          {isOpen('race') && (
            <Button onClick={() => go('race')} disabled={!driver}>
              Go to race →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
