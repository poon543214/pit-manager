import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { PixelIcon, WeatherIcon } from '../components/PixelIcon';
import { TrackBackdrop } from '../components/TrackBackdrop';
import { buildCar, fitOf } from '../game/carBuild';
import { RaceCanvas } from '../game/RaceCanvas';
import type { CarFrame } from '../game/playback';
import { raceDuration } from '../game/playback';
import { playerEvents, type RaceEvent } from '../game/raceEvents';
import { GAP_LABEL, gapReport } from '../sim/explain';
import { DriverImg } from '../components/Sprites';
import { SetupScores } from '../components/SetupScores';
import { DRIVERS, MAX_STOPS, PARTS, POINTS, POOL_SHARE, SEASON_PAYOUT, SEASON_ROUNDS, TIRES, TRACKS, byId } from '../shared/constants';
import type { TireId } from '../shared/types';
import { useGame } from '../useGame';
import { planText, setsNeeded } from '../shared/plan';

const SPEEDS = [4, 8, 16, 32];
export const short = (hash: string) => `${hash.slice(0, 8)}…${hash.slice(-6)}`;

export function Race() {
  const { state, service, attempt, go, lastRace, setLastRace, demo, setRacing } = useGame();
  const car = useMemo(() => buildCar(fitOf(state.loadout.parts)), [state.loadout.parts]);
  const [live, setLive] = useState(false);
  const [speed, setSpeed] = useState(8);
  const [seek, setSeek] = useState<number | undefined>();
  const [hud, setHud] = useState<{ t: number; frames: CarFrame[] }>({ t: 0, frames: [] });
  // position changes seen while the race plays, added to the radio feed
  const [moves, setMoves] = useState<RaceEvent[]>([]);
  // the compound picked on the pit wall; null follows the next planned stop
  const [pitTire, setPitTire] = useState<TireId | null>(null);
  const lastPos = useRef({ pos: 0, t: 0 });
  const next = service.nextRace();
  const driver = byId(DRIVERS, state.loadout.driverId);
  const committed = state.commit?.round === next.round;
  // the setup going into this race: the sealed one once submitted
  const shown = committed ? state.commit!.loadout : state.loadout;
  const shownDriver = byId(DRIVERS, shown.driverId);
  const kinds = Object.values(shown.parts).flatMap((id) => byId(PARTS, id)?.kind ?? []);
  const build = (['speed', 'corner', 'brake'] as const)
    .map((k) => [k, kinds.filter((x) => x === k).length] as const)
    .filter(([, n]) => n)
    .map(([k, n]) => `${k[0].toUpperCase() + k.slice(1)} ×${n}`)
    .join(' · ');

  const track = lastRace ? byId(TRACKS, lastRace.trackId)! : next.track;
  const names = useMemo(
    () => new Map(lastRace?.entries.map((e) => [e.entrant.id, e.entrant]) ?? []),
    [lastRace],
  );
  useEffect(() => {
    setRacing(live);
    return () => setRacing(false);
  }, [live, setRacing]);
  const events = useMemo(() => (lastRace ? playerEvents(lastRace, track) : []), [lastRace, track]);

  const start = async () => {
    const result = await attempt(() => service.runRace());
    if (!result) return;
    setLastRace(result);
    setSeek(undefined);
    setMoves([]);
    setPitTire(null);
    lastPos.current = { pos: 0, t: 0 };
    setLive(true);
  };

  if (!live || !lastRace) {
    return (
      <div className="page race">
        <div className="race-stage">
          <TrackBackdrop track={next.track} weather={next.weather} car={car} />
          <section className="glass race-entry" aria-labelledby="entry-title">
            <div className="entry-head">
              <div>
                <h2 id="entry-title">{next.track.name}</h2>
                <p>
                  R{next.round} · {next.track.laps} laps · Rain {Math.round(next.rainChance * 100)}%
                </p>
              </div>
              <WeatherIcon wet={next.weather === 'wet'} size={33} />
            </div>
            {shown && shownDriver && (
              <div className="entry-setup">
                <h3>{committed ? 'Your sealed setup' : 'Your setup'}</h3>
                <div className="setup-row">
                  <DriverImg d={shownDriver} size={48} />
                  <div className="setup-text">
                    <b>{shownDriver.name}</b>
                    <span>
                      {planText(shown)} · condition {state.driverCondition[shown.driverId!] ?? 100}%
                    </span>
                    <span>{build || 'No parts fitted'}</span>
                  </div>
                  <SetupScores wear={state.partWear} loadout={shown} track={next.track} weather={next.weather} size="sm" />
                </div>
              </div>
            )}

            <p className="entry-prizes">
              Free entry · points {POINTS.slice(0, 3).join(' / ')}… to P10 · season pool <i className="coin" />{' '}
              {state.season.pool.toLocaleString()}
            </p>

            <details className="fair">
              <summary>How fair racing works</summary>
              <p className="entry-note">
                Racing is free, so no one’s loss pays anyone’s prize. Each race scores F1 points; after {SEASON_ROUNDS} races the
                season pool (a sponsor stake plus {Math.round(POOL_SHARE * 100)}% of every coin spent in the game) goes to the top 3:{' '}
                {SEASON_PAYOUT.map((p) => `${Math.round(p * 100)}%`).join(' / ')}.
              </p>
              <ol className="race-steps">
                <li className={committed ? 'done' : 'now'}>
                  <b>Morning · Submit setup</b>
                  <span>
                    {committed
                      ? `Sealed as ${short(state.commit!.hash)}. Your setup is locked.`
                      : 'Seal your setup as a hash. Nobody can see it until the race.'}
                  </span>
                </li>
                <li className={committed ? 'now' : ''}>
                  <b>Afternoon · Reveal and race</b>
                  <span>Your setup is checked against the hash, then the race seed and weather are drawn.</span>
                </li>
                <li>
                  <b>Evening · Points</b>
                  <span>Points go on the season table in Results; season prizes are claimed there.</span>
                </li>
              </ol>
            </details>

            {!driver && !committed ? (
              <>
                <p>
                  {state.ownedDrivers.length ? 'Pick a driver in Garage to race.' : 'Buy a driver in the Market to race.'}
                </p>
                <Button onClick={() => go(state.ownedDrivers.length ? 'garage' : 'market')}>
                  {state.ownedDrivers.length ? 'Go to Garage' : 'Go to Market'}
                </Button>
              </>
            ) : committed ? (
              <>
                <p className="entry-sealed">Setup sealed and locked. Reveal it to start the race.</p>
                <Button onClick={start}>Reveal and race</Button>
              </>
            ) : (
              <div className="entry-actions">
                <Button onClick={() => attempt(() => service.commitSetup())}>
                  Submit setup
                </Button>
                <Button variant="ghost" onClick={() => go('garage')}>
                  Change setup
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  const me = hud.frames.find((f) => f.id === 'player');
  const myPos = hud.frames.findIndex((f) => f.id === 'player') + 1;
  const mine = lastRace.entries.find((e) => e.entrant.isPlayer)!;
  const winner = lastRace.entries[0];

  const onTick = (t: number, frames: CarFrame[]) => {
    setHud({ t, frames });
    const pos = frames.findIndex((f) => f.id === 'player') + 1;
    const prev = lastPos.current;
    // a small step in time is a real overtake; a big one is a skip, which isn't news
    if (prev.pos && pos !== prev.pos && t - prev.t < 20 && !frames[pos - 1]?.finished) {
      const up = pos < prev.pos;
      setMoves((m) => [...m, { t, text: `${up ? 'Up' : 'Down'} to P${pos}`, tone: up ? 'good' : 'bad' }]);
    }
    lastPos.current = { pos, t };
  };

  // each call stays on the radio for most of a lap
  const hold = (winner.total / winner.laps.length) * 0.8;
  const feed = [...events, ...moves]
    .filter((e) => e.t <= hud.t && hud.t - e.t < hold)
    .sort((a, b) => a.t - b.t)
    .slice(-3);
  // the finish card leads with the same biggest cause Results explains, then two moments from the radio
  const rival = mine.position === 1 ? lastRace.entries[1] : winner;
  const biggest = gapReport(mine, rival, track, lastRace.weather)
    .filter((r) => (mine.position === 1 ? r.d <= -0.5 : r.d >= 0.5))
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  const story: RaceEvent[] = [
    ...(biggest
      ? [
          {
            t: -1,
            text: `${GAP_LABEL[biggest.f]}: ${mine.position === 1 ? 'gained' : 'lost'} ${Math.abs(biggest.d).toFixed(1)}s ${mine.position === 1 ? 'on' : 'to'} ${rival.entrant.label}`,
            tone: mine.position === 1 ? ('good' as const) : ('bad' as const),
          },
        ]
      : []),
    ...events.filter((e) => e.t > 0 && e.text !== 'Final lap').slice(0, 2),
  ];
  const toResults = async () => {
    await attempt(() => service.finishRace());
    setLive(false);
    go('results');
  };

  // pit wall: the next stop still ahead on the plan, and a call to box at the end of the current lap instead
  const lapNow = me?.lap ?? 1;
  const nextStop = mine.entrant.stops.find((s) => s.lap >= lapNow);
  const stopsDone = mine.entrant.stops.filter((s) => s.lap < lapNow).length;
  const boxingNow = nextStop?.lap === lapNow;
  const canBox =
    !!me && !me.finished && !me.inPit && lapNow < track.laps && (!!nextStop || stopsDone < MAX_STOPS);
  // sets free for a call: stock minus what the rest of the plan already needs (the stop being replaced is freed)
  const used = setsNeeded({ tire: mine.entrant.tire, stops: mine.entrant.stops.filter((s) => s !== nextStop) });
  const spare = {
    soft: state.tireSets.soft - used.soft,
    medium: state.tireSets.medium - used.medium,
    hard: state.tireSets.hard - used.hard,
  };
  const boxTire = pitTire ?? nextStop?.tire ?? 'medium';
  const callPit = () =>
    attempt(() => service.callPit(lapNow, boxTire)).then((r) => {
      if (r) setLastRace(r);
    });

  return (
    <div className="page race">
      <div className="race-stage">
        <RaceCanvas
          result={lastRace}
          track={track}
          speed={speed}
          seekTo={seek}
          onTick={onTick}
          onDone={() => attempt(() => service.finishRace())}
          playerCar={car}
        />
        <div className="hud-top">
          <span className="glass">
            LAP {Math.min(me?.lap ?? 1, track.laps)}/{track.laps}
          </span>
          <span className="glass">P{myPos || '-'}</span>
          {me?.inPit && <span className="pit-flag">PIT</span>}
        </div>
        <ol className="tower glass" aria-label="Running order">
          {hud.frames.map((f, i) => {
            const e = names.get(f.id)!;
            return (
              <li key={f.id} className={e.isPlayer ? 'me' : ''}>
                <b>{i + 1}</b>
                <i className="swatch" style={{ background: e.color }} />
                {e.label}
                {e.isPlayer && <span className="sr-only"> (you)</span>}
                {f.inPit && <em>PIT</em>}
                {f.finished && (
                  <em>
                    <PixelIcon name="flag" size={12} label="Finished" />
                  </em>
                )}
              </li>
            );
          })}
        </ol>

        <ul className="radio" aria-live="polite" aria-label="Race radio">
          {feed.map((e) => (
            <li key={`${e.t}-${e.text}`} className={`glass tone-${e.tone}`}>
              <i aria-hidden />
              {e.text}
            </li>
          ))}
        </ul>

        {me?.finished && (
          <section className="finish" role="status" aria-labelledby="finish-pos">
            <div className="finish-flag" aria-hidden />
            <div className="finish-body">
              <h2 id="finish-pos">P{mine.position}</h2>
              <p>
                {mine.position === 1
                  ? `Race win, ${(lastRace.entries[1].total - mine.total).toFixed(1)}s clear of ${lastRace.entries[1].entrant.label}`
                  : `${(mine.total - winner.total).toFixed(1)}s behind ${winner.entrant.label}`}
                {mine.points > 0 && ` · +${mine.points} pts`}
              </p>
              {story.length > 0 && (
                <ol className="finish-story" aria-label="Your race">
                  {story.map((e) => (
                    <li key={`${e.t}-${e.text}`} className={`tone-${e.tone}`}>
                      {e.text}
                    </li>
                  ))}
                </ol>
              )}
              <Button onClick={toResults}>See results →</Button>
            </div>
            <div className="finish-flag" aria-hidden />
          </section>
        )}

        {!me?.finished && (
          <section className="pit-call glass" aria-label="Pit wall">
            <h3>Pit wall</h3>
            <p className="pit-next" aria-live="polite">
              {boxingNow
                ? `Boxing at the end of this lap: ${TIRES[nextStop!.tire].name}s`
                : nextStop
                  ? `Next stop: end of L${nextStop.lap}, ${TIRES[nextStop.tire].name}s`
                  : stopsDone >= MAX_STOPS
                    ? `All ${MAX_STOPS} stops used`
                    : 'No stop planned'}
            </p>
            <div className="stop-tires" role="radiogroup" aria-label="Tires for the next pit call">
              {(Object.keys(TIRES) as TireId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={boxTire === id}
                  className={boxTire === id ? 'on' : ''}
                  disabled={spare[id] <= 0}
                  onClick={() => setPitTire(id)}
                >
                  <i className={`tire-dot t-${id}`} aria-hidden />
                  {TIRES[id].name} <span className="stock">×{Math.max(0, spare[id])}</span>
                </button>
              ))}
            </div>
            <Button onClick={callPit} disabled={!canBox}>
              {boxingNow ? `Change to ${TIRES[boxTire].name}s` : `Box at end of L${lapNow}`}
            </Button>
            {canBox && nextStop && !boxingNow && <p className="pit-note">Replaces your planned L{nextStop.lap} stop.</p>}
          </section>
        )}

        <div className="race-controls glass">
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map((s) => (
              <button key={s} role="radio" aria-checked={speed === s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
          <progress value={hud.t} max={raceDuration(lastRace)} aria-label="Race progress" />
          {/* skipping is for presenting only: in a real race you watch it through. Once home, the finish card leads on */}
          {demo && !me?.finished && (
            <Button variant="ghost" onClick={() => setSeek(raceDuration(lastRace))}>
              Skip to finish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
