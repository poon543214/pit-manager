import { useState } from 'react';
import { ExchangeDialog } from '../components/ExchangeDialog';
import { Button } from '../components/Button';
import { WeatherIcon } from '../components/PixelIcon';
import { DriverImg } from '../components/Sprites';
import { StatBar } from '../components/StatBar';
import { TrackBackdrop } from '../components/TrackBackdrop';
import { SetupScores } from '../components/SetupScores';
import { buildCar, fitOf } from '../game/carBuild';
import { DRIVERS, PRACTICE_COST, PRACTICE_RUNS_PER_TRACK, SEASON_ROUNDS, TRACKS, byId, seasonRace } from '../shared/constants';
import { carStats } from '../shared/fitScore';
import type { DayKind, DayPlan } from '../shared/types';
import { useGame } from '../useGame';
import { planText, shortAddress } from '../shared/plan';

const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const KIND: Record<DayKind, string> = { market: 'Market', practice: 'Practice', race: 'Race day', rest: 'Rest' };

export function Home() {
  const { state, service, go, demo, setDemo, isOpen, attempt, notify, connectWallet } = useGame();
  const [exchange, setExchange] = useState(false);
  const committed = state.commit?.round === service.nextRace().round;
  const week = service.schedule();
  const today = week.find((d) => d.today)!;
  const next = service.nextRace();
  const driver = byId(DRIVERS, state.loadout.driverId);
  const stats = carStats(state.loadout.parts, state.partWear);
  const parts = Object.values(state.loadout.parts).filter(Boolean).length;
  const runsLeft = service.practiceLeft();
  const last = state.history[state.history.length - 1];
  // unclaimed coins only ever come from a season payout now
  const trophy = state.trophies[state.trophies.length - 1];
  const prizeFrom = trophy ? `for P${trophy.rank} in season ${trophy.season}` : 'season prize';

  // the race this week's panel is about: today's leg, or the next leg after a rest day
  const leg = today.leg ?? 'B';
  const legDays = week.filter((d) => d.leg === leg);
  const showTrack = demo || legDays.some((d) => d.announced);
  const open = (kind: 'market' | 'practice' | 'race') => isOpen(kind);
  const dayOf = (kind: DayKind) => DAY[legDays.find((d) => d.kind === kind)!.day];

  return (
    <div className="home">
      <TrackBackdrop track={next.track} weather={next.weather} car={buildCar(fitOf(state.loadout.parts))} />

      <header className="home-logo">
        <span className="flag" aria-hidden />
        PIT MANAGER
      </header>

      {state.wallet ? (
        <div className="glass home-id">
          <span>
            <small>Wallet</small>
            {shortAddress(state.wallet)}
          </span>
          <span>
            <small>Coins</small>
            <span className="coin-val">
              <i className="coin" /> {state.coins.toLocaleString()}
              <button type="button" className="coin-plus" aria-label="Get coins with ETH" title="Exchange ETH for coins" onClick={() => setExchange(true)}>
                +
              </button>
            </span>
            <ExchangeDialog open={exchange} onClose={() => setExchange(false)} />
          </span>
          <span className="home-wallet-actions">
            <button
              type="button"
              onClick={() =>
                attempt(() => service.refreshWallet()).then((n) => n !== undefined && notify(`${n} NFTs read from the chain`))
              }
            >
              Refresh NFTs
            </button>
            <button type="button" onClick={() => attempt(() => service.disconnectWallet())}>
              Disconnect
            </button>
          </span>
        </div>
      ) : (
        <div className="home-connect">
          <Button onClick={connectWallet}>Connect wallet</Button>
        </div>
      )}

      <section className="glass home-today" aria-labelledby="today-title">
        <div className="today-head">
          <h1 id="today-title">
            {DAY[today.day]} · {demo ? 'Demo' : KIND[today.kind]}
          </h1>
          <p>
            {demo
              ? 'Every action is open, whatever the day.'
              : today.leg
                ? `Race ${leg} · race on ${dayOf('race')}`
                : `Next: race ${leg} on ${dayOf('race')}`}
          </p>
        </div>

        <div className="today-track">
          {showTrack ? (
            <>
              <div>
                <h2>{next.track.name}</h2>
                <p>
                  R{next.round} · {next.track.laps} laps · Rain {Math.round(next.rainChance * 100)}% · rewards{' '}
                  <b className={`k-${next.track.focus}`}>{next.track.focus.toUpperCase()}</b>
                </p>
              </div>
              <WeatherIcon wet={next.weather === 'wet'} size={33} />
            </>
          ) : (
            <p>Track and weather are announced on {dayOf('practice')}.</p>
          )}
        </div>

        <ul className="today-actions">
          {open('market') && (
            <li>
              <div>
                <strong>Market</strong>
                <span>Buy drivers and parts for tracks you haven’t seen yet.</span>
              </div>
              <Button variant="ghost" onClick={() => go('market')}>
                Open Market
              </Button>
            </li>
          )}
          {open('practice') && (
            <li>
              <div>
                <strong>Practice</strong>
                <span>
                  {driver
                    ? `${runsLeft} of ${PRACTICE_RUNS_PER_TRACK} runs left for ${driver.name} · ${PRACTICE_COST} coins each`
                    : 'Pick a driver first.'}
                </span>
              </div>
              <Button variant="ghost" disabled={!driver} onClick={() => go('practice')}>
                Practice
              </Button>
            </li>
          )}
          {open('race') && (
            <li>
              <div>
                <strong>Race</strong>
                <span>
                  {committed
                    ? 'Setup submitted and locked. Reveal and race when you’re ready.'
                    : `Free entry · season ${state.season.number}, race ${seasonRace(next.round)} of ${SEASON_ROUNDS} · pool ${state.season.pool.toLocaleString()}`}
                </span>
              </div>
              <Button disabled={!driver && !committed} onClick={() => go('race')}>
                {committed ? 'Reveal' : 'Enter'}
              </Button>
            </li>
          )}
          {state.unclaimed > 0 && (
            <li>
              <div>
                <strong>Prize waiting</strong>
                <span>
                  {state.unclaimed} coins {prizeFrom}
                </span>
              </div>
              <Button
                onClick={() =>
                  attempt(() => service.claimPrize()).then((n) => n && notify(`${n} coins added to your balance`))
                }
              >
                Claim
              </Button>
            </li>
          )}
          {last && (
            <li>
              <div>
                <strong>Last race</strong>
                <span>
                  P{last.position} at {byId(TRACKS, last.trackId)?.name}
                </span>
              </div>
              <Button variant="ghost" onClick={() => go('results')}>
                Results
              </Button>
            </li>
          )}
          {!demo && today.kind === 'rest' && (
            <li className="today-rest">
              <span>No events today. The Market opens again on Thursday.</span>
            </li>
          )}
        </ul>

        <button
          type="button"
          role="switch"
          aria-checked={demo}
          className="demo-switch"
          onClick={() => setDemo(!demo)}
        >
          <span className="switch-track" aria-hidden>
            <span className="switch-thumb" />
          </span>
          <span>
            Demo mode
            <small>{demo ? 'Every action is open and coins are unlimited' : 'Only today’s schedule is open'}</small>
          </span>
        </button>
      </section>

      <div className="home-left">
      <section className="glass home-car" aria-labelledby="car-title">
        <h2 id="car-title" className="sr-only">
          Current driver and car
        </h2>
        {driver ? (
          <>
            <div className="car-driver">
              <DriverImg d={driver} size={64} />
              <div>
                <strong>{driver.name}</strong>
                <span>
                  {parts}/4 parts · condition {state.driverCondition[driver.id] ?? 100}%
                </span>
                <span>{planText(state.loadout)}</span>
              </div>
              <SetupScores wear={state.partWear} loadout={state.loadout} track={next.track} weather={next.weather} size="sm" />
            </div>
            <div className="car-stats">
              <StatBar label="PACE" value={driver.pace} tone="red" />
              <StatBar label="SPD" value={Math.round(stats.speed)} max={13} tone="red" />
              <StatBar label="CONS" value={driver.consistency} tone="white" />
              <StatBar label="CRN" value={Math.round(stats.corner)} max={13} tone="white" />
              <StatBar label="WET" value={driver.wet} tone="black" />
              <StatBar label="BRK" value={Math.round(stats.brake)} max={13} tone="black" />
            </div>
          </>
        ) : (
          <div className="car-empty">
            <strong>No driver yet</strong>
            <span>
              {state.wallet
                ? state.starterClaimed === false
                  ? 'Claim your free starter pack in the Garage: a driver and four parts as NFTs.'
                  : 'This wallet holds no driver NFT yet. Buy one in the Market.'
                : 'Connect your wallet to load the drivers and parts you own as NFTs.'}
            </span>
          </div>
        )}
      </section>

      {driver || !isOpen('market') ? (
        <Button className="home-garage" onClick={() => go('garage')}>
          Go to Garage
        </Button>
      ) : (
        <Button className="home-garage" onClick={() => go('market')}>
          Go to Market
        </Button>
      )}
      </div>

      <section className="glass home-week" aria-labelledby="week-title">
        <h2 id="week-title">This week</h2>
        <ol>
          {week.map((d) => (
            <WeekDay key={d.day} d={d} reveal={demo} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function WeekDay({ d, reveal }: { d: DayPlan; reveal: boolean }) {
  const known = d.track && (reveal || d.announced);
  return (
    <li className={`week-day kind-${d.kind} ${d.today ? 'is-today' : ''}`} aria-current={d.today ? 'date' : undefined}>
      <span className="wd-name">{DAY[d.day].slice(0, 3)}</span>
      <span className="wd-kind">{KIND[d.kind]}</span>
      <span className="wd-track">
        {d.leg ? (known ? d.track!.name.replace(' GP', '') : `Race ${d.leg}`) : '—'}
      </span>
    </li>
  );
}
