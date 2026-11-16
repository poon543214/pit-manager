import { DRIVERS, PARTS, TIRES, TIRE_SET_PRICE, byId } from '../shared/constants';
import type { TireId } from '../shared/types';
import { spend, type MockStore } from './mockStore';

/** Fixed-price shop. A chain version would list NFTs and settle a purchase on-chain. */
/** `free` is demo mode: purchases skip the coin check and cost nothing. */
export function createMockMarket(store: MockStore, free: () => boolean) {
  return {
    buyDriver(id: string) {
      const d = byId(DRIVERS, id);
      const s = store.get();
      if (!d) throw new Error("That driver isn't in the Market.");
      if (s.ownedDrivers.includes(id)) throw new Error(`You already own ${d.name}.`);
      if (!free() && s.coins < d.price) throw new Error(`${d.name} costs ${d.price} coins and you have ${s.coins}.`);
      store.update((st) => ({
        ...st,
        ...spend(st, d.price, free()),
        ownedDrivers: [...st.ownedDrivers, id],
        loadout: st.loadout.driverId ? st.loadout : { ...st.loadout, driverId: id },
      }));
    },
    buyTires(id: TireId, count = 1) {
      const cost = TIRE_SET_PRICE[id] * count;
      const s = store.get();
      if (!free() && s.coins < cost) throw new Error(`${count} set${count > 1 ? 's' : ''} of ${TIRES[id].name}s cost ${cost} coins and you have ${s.coins}.`);
      store.update((st) => ({
        ...st,
        ...spend(st, cost, free()),
        tireSets: { ...st.tireSets, [id]: (st.tireSets[id] ?? 0) + count },
      }));
    },
    buyPart(id: string) {
      const p = byId(PARTS, id);
      const s = store.get();
      if (!p) throw new Error("That part isn't in the Market.");
      if (s.ownedParts.includes(id)) throw new Error(`You already own ${p.name}.`);
      if (!free() && s.coins < p.price) throw new Error(`${p.name} costs ${p.price} coins and you have ${s.coins}.`);
      store.update((st) => ({
        ...st,
        ...spend(st, p.price, free()),
        ownedParts: [...st.ownedParts, id],
        loadout: st.loadout.parts[p.slot]
          ? st.loadout
          : { ...st.loadout, parts: { ...st.loadout.parts, [p.slot]: id } },
      }));
    },
  };
}
