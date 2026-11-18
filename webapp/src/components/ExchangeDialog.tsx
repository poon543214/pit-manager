import { useEffect, useRef, useState } from 'react';
import { CHAIN_NAME, COIN_ETH, IS_LOCAL } from '../chain/config';
import { useGame } from '../useGame';
import { Button } from './Button';

const PACKS = [100, 300, 500, 1000];
const MAX_COINS = 100_000;
const ethOf = (coins: number) => +(coins * COIN_ETH).toFixed(5);

/** Exchange ETH for game coins: one on-chain purchase, then coins buy everything in the game. */
export function ExchangeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, service, attempt, notify } = useGame();
  const ref = useRef<HTMLDialogElement>(null);
  const [coins, setCoins] = useState(500);
  const [busy, setBusy] = useState<'buy' | 'faucet' | null>(null);

  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const cost = ethOf(coins);
  const balance = state.ethBalance === null ? null : +state.ethBalance;
  const short = balance !== null && cost > balance;
  const valid = Number.isInteger(coins) && coins > 0 && coins <= MAX_COINS;

  const exchange = async () => {
    setBusy('buy');
    const before = service.getState().coins;
    await attempt(() => service.buyCoins(coins));
    setBusy(null);
    if (service.getState().coins > before) {
      notify(`+${coins} coins: you now have ${service.getState().coins.toLocaleString()}`);
      onClose();
    }
  };
  const faucet = async () => {
    setBusy('faucet');
    await attempt(() => service.topUpTestEth()).then(() => notify(`Test ETH added: ${service.getState().ethBalance} ETH`));
    setBusy(null);
  };

  return (
    <dialog ref={ref} className="glass dialog exchange" onCancel={onClose} aria-labelledby="exchange-title">
      <h2 id="exchange-title">Get coins</h2>
      <p>
        Coins buy drivers, parts, tire sets, repairs and practice. 1 coin = {COIN_ETH} ETH, paid from your wallet on {CHAIN_NAME}.
        30% of every exchange goes to the season prize pool.
      </p>

      <div className="stop-tires exchange-packs" role="radiogroup" aria-label="Coin pack">
        {PACKS.map((n) => (
          <button key={n} type="button" role="radio" aria-checked={coins === n} className={coins === n ? 'on' : ''} onClick={() => setCoins(n)}>
            <i className="coin" /> {n.toLocaleString()}
          </button>
        ))}
      </div>
      <label className="exchange-amount">
        Coins
        <input
          type="number"
          min={1}
          max={MAX_COINS}
          step={1}
          value={coins}
          onChange={(e) => setCoins(Math.floor(+e.target.value))}
        />
      </label>

      <dl className="exchange-sum">
        <dt>You pay</dt>
        <dd>{valid ? `${cost} ETH` : '–'}</dd>
        <dt>In wallet</dt>
        <dd className={short ? 'bad' : ''}>{balance === null ? '–' : `${state.ethBalance} ETH`}</dd>
        <dt>Coins after</dt>
        <dd>{valid ? (state.coins + coins).toLocaleString() : '–'}</dd>
      </dl>
      {short && <p className="exchange-note">Not enough ETH in this wallet for {coins.toLocaleString()} coins.</p>}
      {!IS_LOCAL && <p className="exchange-hint">Need test ETH? Get free {CHAIN_NAME} ETH from a {CHAIN_NAME} faucet. Each exchange also pays a small gas fee.</p>}

      <div className="dialog-actions">
        {IS_LOCAL && (
          <Button variant="ghost" onClick={faucet} disabled={busy !== null} className="exchange-faucet">
            {busy === 'faucet' ? 'Adding…' : '+10 test ETH'}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} disabled={busy === 'buy'}>
          Cancel
        </Button>
        <Button onClick={exchange} disabled={!valid || short || busy !== null}>
          {busy === 'buy' ? 'Confirm in MetaMask…' : `Exchange ${valid ? cost : ''} ETH`}
        </Button>
      </div>
    </dialog>
  );
}
