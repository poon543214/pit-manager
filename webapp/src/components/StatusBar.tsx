import { useState } from 'react';
import { CHAIN_NAME } from '../chain/config';
import { TRACKS, byId } from '../shared/constants';
import { shortAddress } from '../shared/plan';
import { useGame } from '../useGame';
import { ExchangeDialog } from './ExchangeDialog';
import { WeatherIcon } from './PixelIcon';

export function StatusBar() {
  const { state, service, demo, racing, lastRace, page } = useGame();
  const next = service.nextRace();
  // while a race plays, the round has already moved on: name the race on screen instead
  const live = racing && page === 'race' && lastRace;
  const [exchange, setExchange] = useState(false);
  // with a wallet the coins are the on-chain balance, so demo mode doesn't hide them
  const unlimited = demo && !state.wallet;
  return (
    <div className="status-bar">
      {live ? (
        <span className="next">
          R{next.round - 1}
          <span className="next-track"> · {byId(TRACKS, lastRace.trackId)?.name}</span>{' '}
          <WeatherIcon wet={lastRace.weather === 'wet'} size={14} /> Live
        </span>
      ) : (
        <span className="next">
          R{next.round}<span className="next-track"> · {next.track.name}</span>{' '}
          <WeatherIcon wet={next.weather === 'wet'} size={14} /> {Math.round(next.rainChance * 100)}%
        </span>
      )}
      {state.wallet && (
        <span className="wallet-chip" title={`Wallet ${state.wallet} on ${CHAIN_NAME}`}>
          {shortAddress(state.wallet)}
        </span>
      )}
      <span className="coins" aria-label={unlimited ? 'Unlimited coins (demo mode)' : `${state.coins} coins`}>
        <i className="coin" /> {unlimited ? '∞' : state.coins.toLocaleString()}
        {state.wallet && (
          <button type="button" className="coin-plus" aria-label="Get coins with ETH" title="Exchange ETH for coins" onClick={() => setExchange(true)}>
            +
          </button>
        )}
      </span>
      {state.ethBalance !== null && (
        <span className="coins eth" title={`${CHAIN_NAME} ETH in your wallet: exchange it for coins with +`} aria-label={`${state.ethBalance} ETH`}>
          <i className="eth-mark" aria-hidden /> {state.ethBalance} ETH
        </span>
      )}
      {state.wallet && <ExchangeDialog open={exchange} onClose={() => setExchange(false)} />}
    </div>
  );
}
