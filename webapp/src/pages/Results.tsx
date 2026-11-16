import { useState } from 'react';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { WeatherIcon } from '../components/PixelIcon';
import { DriverImg } from '../components/Sprites';
import { SEASON_PAYOUT, SEASON_ROUNDS, TRACKS, byId, entrantName } from '../shared/constants';
import { useGame } from '../useGame';
import { fmt } from './Practice';
import { short } from './Race';
import { GAP_LABEL, gapReport, type GapRow } from '../sim/explain';
import { verifyRace, type Check } from '../sim/verify';
import { planShort, planText, shortAddress } from '../shared/plan';

const signed = (s: number) => `${s > 0 ? '+' : '−'}${Math.abs(s).toFixed(1)}s`;

/** `small`: the factors under half a second each, summed, so the column adds up to the real gap. */
function GapList({ title, rows, tone, small }: { title: string; rows: GapRow[]; tone: 'loss' | 'gain'; small: number }) {
  if (!rows.length && Math.abs(small) < 0.05) return null;
  return (
    <div className={`gap-col ${tone}`}>
      <h3>{title}</h3>
      <ul>
        {rows.map((r) => (
          <li key={r.f}>
            <b className="gap-s">{Math.abs(r.d).toFixed(1)}s</b>
            <span>
              <b>{GAP_LABEL[r.f]}</b> {r.why}
            </span>
          </li>
        ))}
        {Math.abs(small) >= 0.05 && (
          <li className="gap-small">
            <b className="gap-s">{Math.abs(small).toFixed(1)}s</b>
            <span>
              <b>Small effects</b> Everything under half a second each, added together.
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function Results() {
  const { lastRace, state, go, service, attempt, isOpen, notify, forget } = useGame();
  const claim = () => attempt(() => service.claimPrize()).then((n) => n && notify(`${n} coins added to your balance`));
  const claimBox = state.unclaimed > 0 && (
    <div className="claim card">
      <span>
        <b>
          <i className="coin" /> {state.unclaimed}
        </b>{' '}
        season prize waiting
      </span>
      <Button onClick={claim}>Claim prize</Button>
    </div>
  );
  const [confirming, setConfirming] = useState(false);
  const [checks, setChecks] = useState<Check[] | null>(null);

  // season table: everyone's points so far; you are always shown, even outside the top 5
  const table = Object.entries(state.season.points).sort((a, b) => b[1] - a[1]);
  const myRank = table.findIndex(([id]) => id === 'player');
  const racesIn = state.history.length % SEASON_ROUNDS;
  // with a wallet the season that counts is the on-chain one: real ETH, posted races, top 3 claim
  const cs = state.chainSeason;
  const [busy, setBusy] = useState<'post' | 'claim' | null>(null);
  const run = (what: 'post' | 'claim', fn: () => Promise<unknown>) => async () => {
    setBusy(what);
    await fn();
    setBusy(null);
  };
  const postable = cs && lastRace?.proof && lastRace.proof.round > cs.myLastRound ? lastRace : null;
  const postedThis = cs && lastRace?.proof && lastRace.proof.round <= cs.myLastRound;
  const chainSeason = cs && (
    <section className="season card" aria-labelledby="chain-season-title">
      <h2 id="chain-season-title">On-chain season {cs.season}</h2>
      <p className="muted">
        Prize pool <i className="eth-mark" aria-hidden /> {cs.pool} ETH · top 3 share 50% / 30% / 20% when the steward closes the
        season
      </p>
      {cs.top.length === 0 ? (
        <p className="muted">No race posted this season yet. Post yours to get on the board.</p>
      ) : (
        <ol className="standings">
          {cs.top.map((t, i) => (
            <li key={t.address} className={t.address.toLowerCase() === state.wallet?.toLowerCase() ? 'me' : ''}>
              <b>P{i + 1}</b> <span>{t.address.toLowerCase() === state.wallet?.toLowerCase() ? 'You' : shortAddress(t.address)}</span>{' '}
              <b>{t.points}</b>
            </li>
          ))}
        </ol>
      )}
      <p>Your posted points: {cs.myPoints}</p>
      {postable && (
        <Button
          disabled={busy !== null}
          onClick={run('post', () =>
            attempt(() => service.postRace(postable)).then(
              () => service.getState().chainSeason?.myLastRound === postable.proof!.round && notify(`R${postable.proof!.round} posted on chain`),
            ),
          )}
        >
          {busy === 'post' ? 'Confirm in MetaMask…' : `Post R${postable.proof!.round} result (+${postable.entries.find((e) => e.entrant.isPlayer)!.points} pts)`}
        </Button>
      )}
      {postedThis && <p className="muted">This race is posted.</p>}
      {+cs.claimable > 0 && (
        <Button
          disabled={busy !== null}
          onClick={run('claim', () => attempt(() => service.claimChainPrize()).then(() => notify(`${cs.claimable} ETH sent to your wallet`)))}
        >
          {busy === 'claim' ? 'Confirm in MetaMask…' : `Claim ${cs.claimable} ETH`}
        </Button>
      )}
    </section>
  );

  const season = (
    <section className="season card" aria-labelledby="season-title">
      <h2 id="season-title">
        Season {state.season.number} · race {racesIn} of {SEASON_ROUNDS}
      </h2>
      <p className="muted">
        Pool <i className="coin" /> {state.season.pool.toLocaleString()} · top 3 share{' '}
        {SEASON_PAYOUT.map((p) => `${Math.round(p * 100)}%`).join(' / ')}
      </p>
      {table.length === 0 ? (
        <p className="muted">A new season: points start with the next race.</p>
      ) : (
        <ol className="standings">
          {table.slice(0, 5).map(([id, pts], i) => (
            <li key={id} className={id === 'player' ? 'me' : ''}>
              <b>P{i + 1}</b> <span>{entrantName(id)}</span> <b>{pts}</b>
            </li>
          ))}
          {myRank >= 5 && (
            <li className="me">
              <b>P{myRank + 1}</b> <span>You</span> <b>{table[myRank][1]}</b>
            </li>
          )}
        </ol>
      )}
      {state.trophies.length > 0 && (
        <p className="trophies">
          Trophies: {state.trophies.map((t) => `S${t.season} P${t.rank}`).join(' · ')}
        </p>
      )}
    </section>
  );

  const history = (
    <section className="r-history">
      <h2>Race history</h2>
      {state.history.length === 0 ? (
        <p className="muted">No races yet. Your finishes and points will be listed here.</p>
      ) : (
        <ul className="history">
          {[...state.history].reverse().map((h, i) => (
            <li key={i}>
              <span>R{state.history.length - i}</span>
              <span>{byId(TRACKS, h.trackId)?.name}</span>
              <b>P{h.position}</b>
              <span>
                {h.points ? `+${h.points} pts` : '–'}
              </span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="reset-link" onClick={() => setConfirming(true)}>
        Start new game…
      </button>
      <ConfirmDialog
        open={confirming}
        title="Start a new game?"
        body="This erases your drivers, parts, coins and race history. It can’t be undone."
        confirmLabel="Erase and start over"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          attempt(() => service.reset()).then(() => {
            forget();
            go('market');
          });
        }}
      />
    </section>
  );

  if (!lastRace) {
    return (
      <div className="page results results-solo">
        {claimBox}
        {chainSeason ?? season}
        {history}
      </div>
    );
  }

  const track = byId(TRACKS, lastRace.trackId)!;
  const winner = lastRace.entries[0];
  const me = lastRace.entries.find((e) => e.entrant.isPlayer)!;
  // compare against the winner, or against P2 when you won
  const won = me.position === 1;
  const rival = won ? lastRace.entries[1] : winner;
  const rivalName = rival.entrant.label;
  const report = gapReport(me, rival, track, lastRace.weather);
  // every factor is shown, so the two columns always add up to the gap
  const losses = report.filter((r) => r.d >= 0.5).sort((a, b) => b.d - a.d);
  const wins = report.filter((r) => r.d <= -0.5).sort((a, b) => a.d - b.d);
  const small = report.filter((r) => Math.abs(r.d) < 0.5).reduce((s, r) => s + r.d, 0);
  const lost = losses.reduce((s, r) => s + r.d, 0) + Math.max(0, small);
  const gained = -wins.reduce((s, r) => s + r.d, 0) + Math.max(0, -small);
  const gap = Math.abs(me.total - rival.total).toFixed(1);
  const key = won ? wins[0] : losses[0];

  // lap by lap: positive = you were slower than the rival on that lap
  const lapGaps = me.laps.map((l, i) => ({ ...l, d: l.time - (rival.laps[i]?.time ?? l.time), theirPit: rival.laps[i]?.pitted }));
  const lapScale = Math.max(0.5, ...lapGaps.filter((l) => !l.pitted && !l.theirPit).map((l) => Math.abs(l.d)));
  const worst = lapGaps.reduce((a, b) => (b.d > a.d ? b : a));

  return (
    <div className="page results">
      <div className="r-side">
        <section className="card podium">
          <div className="podium-art">
            <DriverImg d={me.entrant.driver} size={96} />
          </div>
          <div>
            <p className="podium-meta">
              {track.name} <WeatherIcon wet={lastRace.weather === 'wet'} size={14} />
            </p>
            <h2 className="big">P{me.position}</h2>
            <p>
              {me.points > 0 ? `+${me.points} points` : 'No points: only P1–P10 score.'}
              {myRank >= 0 && racesIn > 0 && ` Season: P${myRank + 1}.`}
            </p>
          </div>
        </section>
        {claimBox}
        {chainSeason ?? season}
        <div className="cta-row">
          <Button variant="ghost" onClick={() => go('garage')}>
            Back to Garage
          </Button>
          {isOpen('race') && <Button onClick={() => go('race')}>Next race →</Button>}
        </div>
        {history}
      </div>

      <div className="r-main">
      <table className="timing">
        <thead>
          <tr>
            <th>#</th>
            <th>Driver</th>
            <th>Tires (pit lap)</th>
            <th>Total time</th>
            <th>Gap</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {lastRace.entries.map((e) => (
            <tr key={e.entrant.id} className={e.entrant.isPlayer ? 'me' : ''}>
              <td>{e.position}</td>
              <td>
                <i className="swatch" style={{ background: e.entrant.color }} /> {e.entrant.label}
                {e.entrant.isPlayer && ' (you)'}
              </td>
              <td className="nowrap" title={planText(e.entrant)}>
                {planShort(e.entrant)}
              </td>
              <td className="mono">{fmt(e.total)}</td>
              <td className="mono">{e === winner ? '-' : `+${(e.total - winner.total).toFixed(3)}`}</td>
              <td>{e.points || '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="report card" aria-labelledby="why-title">
        <h2 id="why-title">{won ? 'Why you won' : `Why you finished P${me.position}`}</h2>
        <p className="why-lead">
          {won ? `You beat ${rivalName} by ${gap}s.` : `You finished ${gap}s behind ${rivalName}.`}
          {key && ` The biggest reason: ${GAP_LABEL[key.f].toLowerCase()}.`}{' '}
          <span className="muted">{lastRace.weather === 'wet' ? 'It rained.' : 'It stayed dry.'}</span>
        </p>
        <div className="gaps">
          <GapList title="Where you lost time" rows={losses} tone="loss" small={Math.max(0, small)} />
          <GapList title="Where you gained time" rows={wins} tone="gain" small={Math.min(0, small)} />
        </div>
        <p className="gap-sum muted">
          {won
            ? `Gained ${gained.toFixed(1)}s − lost ${lost.toFixed(1)}s = ${gap}s ahead`
            : `Lost ${lost.toFixed(1)}s − gained ${gained.toFixed(1)}s = ${gap}s behind`}
        </p>
        {!won && losses[0] && (
          <p className="next-tip">
            <b>Next time:</b> {losses[0].tip}
          </p>
        )}
        <details className="laps">
          <summary>Lap by lap vs {rivalName}</summary>
          <div
            className="lap-strip"
            role="img"
            aria-label={`Your worst lap against ${rivalName} was lap ${worst.lap}, ${signed(worst.d)}.`}
          >
            {lapGaps.map((l) => (
              <span key={l.lap} className={`lap ${l.d > 0 ? 'loss' : 'gain'}`} title={`Lap ${l.lap}: ${signed(l.d)}`}>
                <span className="lap-plot">
                  <i style={{ height: `${Math.min(1, Math.abs(l.d) / lapScale) * 50}%` }} />
                </span>
                <b>{l.pitted ? 'P' : l.mistake ? 'X' : l.lap}</b>
              </span>
            ))}
          </div>
          <p className="lap-key muted">Red bars: laps where you were slower. White bars: laps where you were faster. P = your pit stop, X = your mistake.</p>
        </details>
      </section>
      {lastRace.proof && (
        <section className="proof" aria-label="Race proof">
          <p>
            Setup sealed as <code>{short(lastRace.proof.hash)}</code>. Race seed {lastRace.seed}, drawn after every entry was
            sealed. Anyone can re-run this race from its record.
          </p>
          <Button variant="ghost" onClick={() => setChecks(verifyRace(lastRace))}>
            Verify race
          </Button>
          {checks && (
            <ul className="checks" aria-live="polite">
              {checks.map((c) => (
                <li key={c.text} className={c.ok ? 'pass' : 'fail'}>
                  <b>{c.ok ? 'Pass' : 'Fail'}</b> {c.text}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
