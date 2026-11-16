import { useState } from 'react';
import { Button } from '../components/Button';
import { DriverCard } from '../components/DriverCard';
import { PerkIcon } from '../components/PerkIcon';
import { PartImg, TireImg } from '../components/Sprites';
import { DRIVERS, PARTS, SLOTS, SLOT_LABEL, TIRES, TIRE_SET_PRICE } from '../shared/constants';
import { shortAddress } from '../shared/plan';
import type { TireId } from '../shared/types';
import { useGame } from '../useGame';

const KIND_LABEL = { speed: 'Speed', corner: 'Corner', brake: 'Brake' } as const;
const VARIANT_LABEL = { endurance: 'Endurance', rain: 'Rain' } as const;

export function Market() {
  const { state, service, attempt, notify, go, demo } = useGame();
  // with a wallet, drivers and parts are NFTs bought with on-chain coins (ETH → coins with + at the top)
  const onChain = !!state.wallet;
  // NFTs always cost coins on chain; demo mode only waives tires, repairs and practice
  const short = (price: number) => (onChain ? state.coins < price : !demo && state.coins < price);
  const shortTires = (price: number) => !demo && state.coins < price;
  const [pending, setPending] = useState<string | null>(null);
  const priceLabel = (coins: number) => coins;
  const buying = (id: string, buy: () => Promise<void>) => async () => {
    setPending(id);
    await buy();
    setPending(null);
  };

  return (
    <div className="page">
      <section>
        <div className="section-head">
          <h2>Drivers</h2>
          <p>
            {onChain
              ? `Drivers and parts are NFTs bought with coins: each purchase mints one to ${shortAddress(state.wallet!)}. Need coins? Tap + next to your balance.`
              : 'Every driver has 20 stat points and one special skill, so none is best on every track.'}
          </p>
        </div>
        <div className="grid drivers">
          {DRIVERS.map((d) => {
            const owned = state.ownedDrivers.includes(d.id);
            return (
              <DriverCard
                key={d.id}
                driver={d}
                selected={owned}
                footer={
                  owned ? (
                    <span className="owned">Owned</span>
                  ) : (
                    <Button
                      disabled={short(d.price) || pending !== null}
                      aria-label={`Buy ${d.name} for ${priceLabel(d.price)} coins`}
                      title={short(d.price) ? `Not enough coins: you have ${state.coins}` : undefined}
                      onClick={buying(d.id, () =>
                        attempt(() => service.buyDriver(d.id)).then(() => {
                          if (service.getState().ownedDrivers.includes(d.id)) notify(`${d.name} joined your team`);
                        }),
                      )}
                    >
                      {pending === d.id ? 'Confirming…' : <>Buy <i className="coin" /> {priceLabel(d.price)}</>}
                    </Button>
                  )
                }
              />
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Parts</h2>
          <p>
            <b className="k-speed">Speed</b> +3 top speed · <b className="k-corner">Corner</b> +3 cornering ·{' '}
            <b className="k-brake">Brake</b> +3 braking, and +1 to the other two
          </p>
        </div>
        <div className="parts-table">
          {SLOTS.map((slot) => (
            <div className="parts-row" key={slot}>
              <div className="slot-name">
                {SLOT_LABEL[slot]}
                {PARTS.filter((p) => p.slot === slot && p.variant).length > 0 && (
                  <button
                    type="button"
                    className="track-more"
                    onClick={(e) => {
                      const track = e.currentTarget.closest('.parts-row')?.querySelector('.parts-track');
                      if (!track) return;
                      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
                      track.scrollTo({ left: atEnd ? 0 : track.scrollWidth, behavior: 'smooth' });
                    }}
                  >
                    +{PARTS.filter((p) => p.slot === slot && p.variant).length} versions →
                  </button>
                )}
              </div>
              <div className="parts-track" tabIndex={0} aria-label={`${SLOT_LABEL[slot]} parts`}>
              {PARTS.filter((p) => p.slot === slot).map((p) => {
                const owned = state.ownedParts.includes(p.id);
                return (
                  <div key={p.id} className={`card shop-part kind-${p.kind} ${owned ? 'selected' : ''}`}>
                    <div className="sp-head">
                      <PartImg p={p} size={48} />
                      <div className="sp-title">
                        <strong className="name-with-perk">
                          {p.name} <PerkIcon id={p.perk} />
                        </strong>
                        <span className="part-tags">
                          <span className={`tag k-${p.kind}`}>{KIND_LABEL[p.kind]}</span>
                          {p.variant && <span className="tag variant">{VARIANT_LABEL[p.variant]}</span>}
                        </span>
                      </div>
                    </div>
                    <dl className="sp-stats">
                      {(
                        [
                          ['SPD', p.speed],
                          ['CRN', p.corner],
                          ['BRK', p.brake],
                          ['TIRE', p.tire],
                          ['WET', p.wet],
                          ['REL', p.rel],
                        ] as const
                      )
                        .filter(([k, v]) => v > 0 || k === 'SPD' || k === 'CRN' || k === 'BRK')
                        .map(([k, v]) => (
                          <div key={k} className={k === 'SPD' || k === 'CRN' || k === 'BRK' ? '' : 'trait'}>
                            <dt>{k}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                    </dl>
                    <div className="sp-foot">
                    {owned ? (
                      <span className="owned">Owned</span>
                    ) : (
                      <Button
                        variant="dark"
                        disabled={short(p.price) || pending !== null}
                        aria-label={`Buy ${p.name} for ${priceLabel(p.price)} coins`}
                        title={short(p.price) ? `Not enough coins: you have ${state.coins}` : undefined}
                        onClick={buying(p.id, () =>
                          attempt(() => service.buyPart(p.id)).then(() => {
                            const s = service.getState();
                            if (!s.ownedParts.includes(p.id)) return;
                            notify(
                              s.loadout.parts[p.slot] === p.id
                                ? `${p.name} bought and fitted to your ${SLOT_LABEL[p.slot].toLowerCase()}`
                                : `${p.name} bought. Swap it in from Garage`,
                            );
                          }),
                        )}
                      >
                        {pending === p.id ? 'Confirming…' : <><i className="coin" /> {priceLabel(p.price)}</>}
                      </Button>
                    )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Tire sets</h2>
          <p>Each race uses one set to start and one for every pit stop.</p>
        </div>
        <div className="tire-shop">
          {(Object.keys(TIRES) as TireId[]).map((id) => (
            <div key={id} className="card part-card">
              <TireImg id={id} size={48} />
              <div className="part-info">
                <b>{TIRES[id].name}</b>
                <span className="mini-stats">{state.tireSets[id] ?? 0} in stock</span>
              </div>
              <Button
                variant="dark"
                disabled={shortTires(TIRE_SET_PRICE[id]) || pending !== null}
                aria-label={`Buy a set of ${TIRES[id].name} tires for ${TIRE_SET_PRICE[id]} coins`}
                onClick={buying(`tire-${id}`, () => {
                  const before = service.getState().tireSets[id] ?? 0;
                  return attempt(() => service.buyTires(id)).then(() => {
                    const now = service.getState().tireSets[id] ?? 0;
                    if (now > before) notify(`${TIRES[id].name} set added: ${now} in stock`);
                  });
                })}
              >
                {pending === `tire-${id}` ? 'Confirming…' : <><i className="coin" /> {TIRE_SET_PRICE[id]}</>}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {state.ownedDrivers.length > 0 && (
        <div className="cta-row">
          <Button onClick={() => go('garage')}>Go to Garage →</Button>
        </div>
      )}
    </div>
  );
}
