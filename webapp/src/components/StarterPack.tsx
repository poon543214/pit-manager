import { useState } from 'react';
import { DRIVERS } from '../shared/constants';
import { useGame } from '../useGame';
import { Button } from './Button';
import { DriverImg } from './Sprites';

const KINDS = ['Speed', 'Corner', 'Brake'] as const;

/** A connected wallet's one free starter pack: pick a driver and a part kind, then mint them in one transaction. */
export function StarterPack() {
  const { state, service, attempt, notify } = useGame();
  const [driver, setDriver] = useState(DRIVERS[0].id);
  const [kind, setKind] = useState(0);
  const [busy, setBusy] = useState(false);
  if (!state.wallet || state.starterClaimed !== false) return null;

  const claim = async () => {
    setBusy(true);
    await attempt(() => service.claimStarter(driver, kind)).then(
      () => service.getState().starterClaimed && notify('Starter pack minted: your NFTs are in the Garage'),
    );
    setBusy(false);
  };

  return (
    <section className="starter card" aria-labelledby="starter-title">
      <h2 id="starter-title">Free starter pack</h2>
      <p>One per wallet: a driver and four parts of one kind, minted to your wallet as NFTs, plus 200 coins. You only pay gas.</p>
      <div className="starter-drivers" role="radiogroup" aria-label="Starter driver">
        {DRIVERS.map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={driver === d.id}
            className={`driver-row ${driver === d.id ? 'on' : ''}`}
            onClick={() => setDriver(d.id)}
          >
            <DriverImg d={d} size={40} />
            <strong>{d.name}</strong>
            <span className="mini-stats">
              PACE {d.pace} · CONS {d.consistency} · WET {d.wet}
            </span>
          </button>
        ))}
      </div>
      <div className="stop-tires" role="radiogroup" aria-label="Starter part kind">
        {KINDS.map((k, i) => (
          <button key={k} type="button" role="radio" aria-checked={kind === i} className={kind === i ? 'on' : ''} onClick={() => setKind(i)}>
            {k} parts
          </button>
        ))}
      </div>
      <Button onClick={claim} disabled={busy}>
        {busy ? 'Confirm in MetaMask, then wait for the block…' : 'Claim starter pack'}
      </Button>
    </section>
  );
}
