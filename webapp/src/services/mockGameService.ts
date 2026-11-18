import { createMockMarket } from '../mock/mockMarket';
import { createMockStore, spend } from '../mock/mockStore';
import { raceForRound, raceWeather, weekPlan } from '../mock/mockClock';
import { commitHash, drawSeed, newSalt } from '../mock/commit';
import { settleRace } from '../mock/mockPrize';
import {
  DRIVERS,
  FIELD_SIZE,
  repairCost,
  MAX_STOPS,
  PARTS,
  PRACTICE_COST,
  PRACTICE_RUNS_PER_TRACK,
  RIVALS,
  SLOTS,
  TIRES,
  TIRE_SET_PRICE,
  byId,
  applyCatalogStats,
} from '../shared/constants';
import { carStats } from '../shared/fitScore';
import { applyCalls, cleanStops, shortOf } from '../shared/plan';
import { createRng } from '../shared/rng';
import type { Entrant, Loadout, PlayerState, RaceResult, TireId, Track, Weather } from '../shared/types';
import { practice } from '../sim/practice';
import { projectedTotal, simulateRace } from '../sim/simulateRace';
import { buy, buyCoins, ethBalance, getInventory, spendCoins } from '../chain/chainInventory';
import { CONTRACT_ADDRESS } from '../chain/config';
import { claimPrize, getSeason, submitRace } from '../chain/season';
import { connectWallet, onWalletChange, reconnectWallet, topUpTestEth, type WalletSession } from '../chain/wallet';
import type { GameService } from './gameService';

/** The driver's perk plus one from each fitted part. */
const perksOf = (driverPerk: string, parts: Loadout['parts']) => [
  driverPerk,
  ...Object.values(parts).flatMap((id) => (id ? [byId(PARTS, id)!.perk] : [])),
];

function playerEntrant(loadout: Loadout, condition = 100, wear: Record<string, number> = {}): Entrant {
  const driver = byId(DRIVERS, loadout.driverId);
  if (!driver) throw new Error('Pick a driver in Garage first.');
  return {
    id: 'player',
    label: driver.name,
    isPlayer: true,
    driver,
    stats: carStats(loadout.parts, wear),
    tire: loadout.tire,
    stops: loadout.stops,
    condition,
    color: '#E10600',
    perks: perksOf(driver.perk, loadout.parts),
  };
}

const condOf = (s: PlayerState, driverId: string | null) => (driverId ? (s.driverCondition[driverId] ?? 100) : 100);

/** Every tyre plan the AI considers: no stop, one stop on any lap, or two stops on every other lap. */
function candidatePlans(laps: number): Pick<Entrant, 'tire' | 'stops'>[] {
  const ids = Object.keys(TIRES) as TireId[];
  const out: Pick<Entrant, 'tire' | 'stops'>[] = [];
  for (const tire of ids) {
    out.push({ tire, stops: [] });
    for (let a = 1; a < laps; a++) for (const t1 of ids) out.push({ tire, stops: [{ lap: a, tire: t1 }] });
    for (let a = 2; a < laps; a += 2)
      for (let b = a + 2; b < laps; b += 2)
        for (const t1 of ids) for (const t2 of ids) out.push({ tire, stops: [{ lap: a, tire: t1 }, { lap: b, tire: t2 }] });
  }
  return out;
}

/**
 * Rival strategy styles. Teams don't know the perfect plan: they read the forecast, follow their habits
 * (stopping a lot or a little, loving or hating a compound) and add a hunch.
 */
type Style = 'aggressive' | 'saver' | 'gambler' | 'balanced';
const STYLES: Record<string, Style> = {
  charles: 'aggressive', kimi: 'saver', max: 'balanced', oscar: 'saver', fernando: 'gambler',
  lewis: 'gambler', george: 'saver', lando: 'aggressive',
  nova: 'balanced', theo: 'aggressive', aiko: 'saver', leo: 'aggressive', sana: 'gambler', finn: 'balanced',
};
/** perStop: seconds a team pretends a stop costs or saves; perLap: per-lap liking (negative) or dislike of a compound; hunch: noise. */
const HABITS: Record<Style, { perStop: number; perLap: Record<TireId, number>; hunch: number }> = {
  aggressive: { perStop: -6, perLap: { soft: -0.3, medium: 0, hard: 0.3 }, hunch: 3 },
  saver: { perStop: 8, perLap: { soft: 0.3, medium: 0, hard: -0.3 }, hunch: 3 },
  gambler: { perStop: 0, perLap: { soft: 0, medium: 0, hard: 0 }, hunch: 6 },
  balanced: { perStop: 0, perLap: { soft: 0, medium: 0, hard: 0 }, hunch: 2 },
};

/** Laps run on each compound under a plan. */
function stintLaps(plan: Pick<Entrant, 'tire' | 'stops'>, laps: number): Record<TireId, number> {
  const out: Record<TireId, number> = { soft: 0, medium: 0, hard: 0 };
  let from = 0;
  let tire = plan.tire;
  for (const s of plan.stops) {
    out[tire] += s.lap - from;
    from = s.lap;
    tire = s.tire;
  }
  out[tire] += laps - from;
  return out;
}

function aiField(playerDriverId: string, seed: number, track: Track, weather: Weather, rainChance: number): Entrant[] {
  const rng = createRng(seed ^ 0x5eed);
  const pool = [...DRIVERS.filter((d) => d.id !== playerDriverId), ...RIVALS];
  const plans = candidatePlans(track.laps);
  return pool.slice(0, FIELD_SIZE - 1).map((driver) => {
    const parts: Loadout['parts'] = {};
    for (const slot of SLOTS) parts[slot] = rng.pick(PARTS.filter((p) => p.slot === slot)).id;
    const base: Entrant = {
      id: `ai-${driver.id}`,
      label: driver.name,
      isPlayer: false,
      driver,
      stats: carStats(parts),
      tire: 'medium',
      stops: [],
      // rival teams rotate drivers too, so they arrive anywhere from a little tired to fresh
      condition: rng.int(75, 100),
      color: driver.suit[0],
      perks: perksOf(driver.perk, parts),
    };
    // each team judges plans its own way: a projection under the weather it believes, plus its habits and a hunch
    const style = STYLES[driver.id] ?? 'balanced';
    const habit = HABITS[style];
    const believed = style === 'gambler' && rainChance >= 0.25 && rainChance <= 0.75 ? (weather === 'wet' ? 'dry' : 'wet') : weather;
    const ranked = plans
      .map((plan) => {
        const lapsOn = stintLaps(plan, track.laps);
        const lean = (Object.keys(lapsOn) as TireId[]).reduce((sum, t) => sum + lapsOn[t] * habit.perLap[t], 0);
        const t = projectedTotal({ ...base, ...plan }, track, believed) + plan.stops.length * habit.perStop + lean + rng.gauss() * habit.hunch;
        return { plan, t };
      })
      .sort((a, b) => a.t - b.t);
    return { ...base, ...ranked[0].plan };
  });
}

export function createMockGameService(): GameService {
  const store = createMockStore();
  let demo = false;
  const market = createMockMarket(store, () => demo);
  const round = () => store.get().history.length + 1;

  // ---------- wallet: ownership from the chain ----------
  let session: WalletSession | null = null;

  /** Keep the loadout to what is owned: an unowned driver or part comes off the car. */
  const prune = (l: Loadout, drivers: string[], parts: string[]): Loadout => ({
    ...l,
    driverId: l.driverId && drivers.includes(l.driverId) ? l.driverId : (drivers[0] ?? null),
    parts: Object.fromEntries(Object.entries(l.parts).filter(([, id]) => id && parts.includes(id))),
  });

  const syncWallet = async () => {
    const s0 = session!;
    // the balance is read with the NFTs, so it is fresh after every claim, buy and refresh
    const [inv, eth, chainSeason] = await Promise.all([
      getInventory(s0.provider, s0.address),
      ethBalance(s0.provider, s0.address),
      // a contract without the season (an older deploy) still loads NFTs; Results then shows the local season
      getSeason(s0.provider, s0.address).catch((e) => {
        console.warn('on-chain season unavailable:', e?.shortMessage ?? e);
        return null;
      }),
    ]);
    const drivers = inv.drivers.map((d) => d.id);
    const parts = inv.parts.map((p) => p.id);
    applyCatalogStats(inv);
    store.update((st) => ({
      ...st,
      mockOwned: st.mockOwned ?? { drivers: st.ownedDrivers, parts: st.ownedParts, coins: st.coins },
      wallet: s0.address,
      // with a wallet, coins are the on-chain balance
      coins: inv.coins,
      ethBalance: eth,
      chainSeason,
      ownedDrivers: drivers,
      ownedParts: parts,
      loadout: prune(st.loadout, drivers, parts),
    }));
  };

  const dropWallet = () => {
    session = null;
    applyCatalogStats(null);
    store.update((st) => {
      if (!st.mockOwned) return { ...st, wallet: null, ethBalance: null, chainSeason: null };
      const { drivers, parts, coins = st.coins } = st.mockOwned;
      return { ...st, coins, wallet: null, ethBalance: null, chainSeason: null, mockOwned: null, ownedDrivers: drivers, ownedParts: parts, loadout: prune(st.loadout, drivers, parts) };
    });
  };

  // after a reload, pick the wallet back up without a popup; if MetaMask is locked or gone, fall back to the browser
  if (store.get().wallet) {
    reconnectWallet()
      .then((found) => {
        if (!found || found.address.toLowerCase() !== store.get().wallet?.toLowerCase()) return dropWallet();
        session = found;
        return syncWallet();
      })
      .catch(dropWallet);
  }
  // switching account or network in MetaMask re-reads (or drops) the wallet
  onWalletChange(() => {
    if (!session) return;
    reconnectWallet()
      .then((found) => {
        if (!found) return dropWallet();
        session = found;
        return syncWallet();
      })
      .catch(dropWallet);
  });

  /** The revealed race as it stands: the sealed setup with any pit-wall calls applied, from the stored seed. */
  const liveRace = (): RaceResult => {
    const s = store.get();
    const c = s.commit!;
    const slot = raceForRound(c.round);
    const seed = c.seed!;
    // condition is read at the reveal, not when the setup was sealed
    const me = playerEntrant({ ...c.loadout, stops: applyCalls(c.loadout.stops, c.calls ?? []) }, condOf(s, c.loadout.driverId), s.partWear);
    const weather = raceWeather(slot, seed);
    const result = simulateRace([me, ...c.field], slot.track, seed, weather, slot.track.laps, slot.rainChance);
    return { ...result, proof: { round: c.round, hash: c.hash, salt: c.salt, loadout: c.loadout, calls: c.calls ?? [] } };
  };
  /**
   * With a wallet (and outside demo mode) coins are spent on chain: one MetaMask confirm, then the balance is re-read.
   * Returns false when the caller should charge the browser's coins instead.
   */
  const payOnChain = async (cost: number, item: string) => {
    if (!session || demo) return false;
    const have = store.get().coins;
    if (have < cost) throw new Error(`That costs ${cost} coins and you have ${have}. Tap + to exchange ETH for coins.`);
    await spendCoins(session.signer, cost, item);
    await syncWallet();
    return true;
  };
  const runsKey = (driverId: string | null) => `${round()}:${driverId}`;
  const practiceLeft = () => {
    const s = store.get();
    if (!s.loadout.driverId) return 0;
    return Math.max(0, PRACTICE_RUNS_PER_TRACK - (s.practiceRuns[runsKey(s.loadout.driverId)] ?? 0));
  };

  return {
    getState: store.get,
    subscribe: store.subscribe,

    // with a wallet, buying mints an NFT paid with on-chain coins; without one, the browser shop sells for local coins
    async buyDriver(id) {
      if (!session) return market.buyDriver(id);
      const d = byId(DRIVERS, id)!;
      if (store.get().ownedDrivers.includes(id)) throw new Error('This wallet already owns that driver.');
      if (store.get().coins < d.price) throw new Error(`${d.name} costs ${d.price} coins and you have ${store.get().coins}. Tap + to exchange ETH for coins.`);
      await buy(session.signer, id, true);
      await syncWallet();
    },
    async buyPart(id) {
      if (!session) return market.buyPart(id);
      const p = byId(PARTS, id)!;
      if (store.get().ownedParts.includes(id)) throw new Error('This wallet already owns that part.');
      if (store.get().coins < p.price) throw new Error(`${p.name} costs ${p.price} coins and you have ${store.get().coins}. Tap + to exchange ETH for coins.`);
      await buy(session.signer, id, false);
      await syncWallet();
    },

    async buyCoins(coins) {
      if (!session) throw new Error('Connect your wallet first.');
      if (!Number.isInteger(coins) || coins <= 0) throw new Error('Pick how many coins to buy.');
      await buyCoins(session.signer, coins);
      await syncWallet();
    },

    async topUpTestEth() {
      if (!session) throw new Error('Connect your wallet first.');
      await topUpTestEth(session.address);
      await syncWallet();
    },

    async postRace(result) {
      if (!session) throw new Error('Connect your wallet first.');
      if (!result.proof) throw new Error('This race has no record to post.');
      const posted = store.get().chainSeason?.myLastRound ?? 0;
      if (result.proof.round <= posted) throw new Error(`R${result.proof.round} is already posted for this season.`);
      await submitRace(session.signer, result);
      await syncWallet();
    },

    async claimChainPrize() {
      if (!session) throw new Error('Connect your wallet first.');
      await claimPrize(session.signer);
      await syncWallet();
    },

    async buyTires(id, count = 1) {
      if (await payOnChain(TIRE_SET_PRICE[id] * count, `tires:${id}x${count}`))
        store.update((st) => ({ ...st, tireSets: { ...st.tireSets, [id]: (st.tireSets[id] ?? 0) + count } }));
      else market.buyTires(id, count);
    },

    async repairPart(id) {
      const s = store.get();
      const p = byId(PARTS, id);
      if (!p || !s.ownedParts.includes(id)) throw new Error("You don't own that part.");
      const cost = repairCost(p.price, s.partWear[id] ?? 100);
      if (cost <= 0) throw new Error(`${p.name} is already in perfect shape.`);
      if (!demo && s.coins < cost) throw new Error(`Repairing ${p.name} costs ${cost} coins and you have ${s.coins}.`);
      const paid = await payOnChain(cost, `repair:${id}`);
      store.update((st) => ({ ...st, ...(paid ? {} : spend(st, cost, demo)), partWear: { ...st.partWear, [id]: 100 } }));
    },

    async setLoadout(patch) {
      const s = store.get();
      if (s.commit?.round === round()) {
        throw new Error(`Your setup is locked for R${s.commit.round}. It unlocks after the race.`);
      }
      if (patch.driverId && !s.ownedDrivers.includes(patch.driverId)) throw new Error("You don't own this driver yet. Buy them in the Market.");
      for (const id of Object.values(patch.parts ?? {})) {
        if (id && !s.ownedParts.includes(id)) throw new Error("You don't own this part yet. Buy it in the Market.");
      }
      // stops are kept tidy here so every caller sees the same, valid plan
      const laps = raceForRound(round()).track.laps;
      const stops = patch.stops ? cleanStops(patch.stops, laps, MAX_STOPS) : undefined;
      store.update((st) => ({ ...st, loadout: { ...st.loadout, ...patch, ...(stops && { stops }) } }));
    },

    nextRace: () => raceForRound(round()),
    schedule: () => weekPlan(round()),
    practiceLeft,

    async runPractice() {
      const s = store.get();
      if (!demo && s.coins < PRACTICE_COST) throw new Error(`Practice costs ${PRACTICE_COST} coins and you have ${s.coins}.`);
      const slot = raceForRound(round());
      const me = playerEntrant(s.loadout, condOf(s, s.loadout.driverId), s.partWear);
      if (practiceLeft() === 0) {
        throw new Error(`${me.driver.name} has used all ${PRACTICE_RUNS_PER_TRACK} practice runs for ${slot.track.name}.`);
      }
      const paid = await payOnChain(PRACTICE_COST, `practice:${slot.round}`);
      const report = practice(me, slot.track, slot.weather, Date.now() & 0xffffff);
      const key = runsKey(me.driver.id);
      store.update((st) => ({
        ...st,
        ...(paid ? {} : spend(st, PRACTICE_COST, demo)),
        practiceRuns: { ...st.practiceRuns, [key]: (st.practiceRuns[key] ?? 0) + 1 },
      }));
      return report;
    },

    async commitSetup() {
      const s = store.get();
      const slot = raceForRound(round());
      if (s.commit?.round === slot.round) throw new Error(`Your setup for R${slot.round} is already submitted.`);
      const me = playerEntrant(s.loadout, condOf(s, s.loadout.driverId), s.partWear); // throws if no driver is picked
      const short = shortOf(s.loadout, s.tireSets);
      if (short) throw new Error(`This plan needs more ${TIRES[short].name} sets than you have. Buy more in the Market.`);
      const salt = newSalt();
      const hash = await commitHash(slot.round, s.loadout, salt);
      // the AI field seals its plans now too, from the forecast only; the race seed doesn't exist yet
      const field = aiField(me.driver.id, slot.seed, slot.track, slot.weather, slot.rainChance);
      store.update((st) => ({
        ...st,
        commit: { round: slot.round, hash, salt, loadout: st.loadout, field, at: Date.now() },
      }));
      return hash;
    },

    async runRace() {
      const s = store.get();
      const slot = raceForRound(round());
      const c = s.commit;
      if (!c || c.round !== slot.round) throw new Error('Submit your setup before the race.');
      // reveal: the sealed setup must hash to exactly what was committed
      const check = await commitHash(c.round, c.loadout, c.salt);
      if (check !== c.hash) throw new Error("The revealed setup doesn't match the submitted hash, so the entry is void.");
      // the seed is drawn once; revealing again (after a reload) replays the same race
      if (c.seed === undefined) store.update((st) => ({ ...st, commit: { ...c, seed: drawSeed(), calls: [] } }));
      return liveRace();
    },

    async callPit(lap, tire) {
      const c = store.get().commit;
      if (!c || c.seed === undefined) throw new Error('No race is running.');
      const laps = raceForRound(c.round).track.laps;
      if (lap < 1 || lap >= laps) throw new Error('There are no more laps to pit on.');
      const calls = c.calls ?? [];
      if (calls.some((x) => x.lap > lap)) throw new Error('That lap has already gone by.');
      const before = applyCalls(c.loadout.stops, calls);
      const sameLap = calls.find((x) => x.lap === lap);
      const plannedAhead = before.some((x) => x.lap >= lap);
      if (!sameLap && !plannedAhead && before.length >= MAX_STOPS) throw new Error(`You have used all ${MAX_STOPS} pit stops.`);
      const next = sameLap ? calls.map((x) => (x === sameLap ? { lap, tire } : x)) : [...calls, { lap, tire }];
      const short = shortOf({ tire: c.loadout.tire, stops: applyCalls(c.loadout.stops, next) }, store.get().tireSets);
      if (short) throw new Error(`No ${TIRES[short].name} sets left in stock.`);
      store.update((st) => ({ ...st, commit: { ...c, calls: next } }));
      return liveRace();
    },

    async finishRace() {
      const c = store.get().commit;
      if (!c || c.seed === undefined) return;
      settleRace(store, liveRace(), c.loadout.parts);
    },

    async claimPrize() {
      const amount = store.get().unclaimed;
      if (amount <= 0) throw new Error('There is no prize to claim.');
      store.update((st) => ({ ...st, coins: st.coins + amount, unclaimed: 0 }));
      return amount;
    },

    setDemo(on) {
      demo = on;
    },

    async connectWallet() {
      if (!/^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS))
        throw new Error('No contract address yet. Deploy PitWallNFT and put its address in src/chain/sepolia-deployment.json.');
      session = await connectWallet();
      await syncWallet();
      return session.address;
    },

    async refreshWallet() {
      if (!session) throw new Error('Connect your wallet first.');
      await syncWallet();
      const s = store.get();
      return s.ownedDrivers.length + s.ownedParts.length;
    },

    async disconnectWallet() {
      dropWallet();
    },

    async reset() {
      session = null;
      store.reset();
    },
  };
}
