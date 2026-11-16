import { TRACKS, byId } from '../shared/constants';
import { shortAddress } from '../shared/plan';
import { useGame } from '../useGame';
import { WeatherIcon } from './PixelIcon';

export function StatusBar() {
  const { state, service, demo, racing, lastRace, page } = useGame();
  const next = service.nextRace();
  // while a race plays, the round has already moved on: name the race on screen instead
  const live = racing && page === 'race' && lastRace;
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
        <span className="wallet-chip" title={`Wallet ${state.wallet} on Sepolia`}>
          {shortAddress(state.wallet)}
        </span>
      )}
      <span className="coins" aria-label={demo ? 'Unlimited coins (demo mode)' : `${state.coins} coins`}>
        <i className="coin" /> {demo ? '∞' : state.coins.toLocaleString()}
      </span>
      {state.ethBalance !== null && (
        <span className="coins eth" title="Sepolia ETH in your wallet: what NFT purchases are paid with" aria-label={`${state.ethBalance} Sepolia ETH`}>
          <i className="eth-mark" aria-hidden /> {state.ethBalance} ETH
        </span>
      )}
    </div>
  );
}
