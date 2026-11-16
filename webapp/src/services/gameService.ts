import type { PracticeReport } from '../sim/practice';
import type { RaceSlot } from '../mock/mockClock';
import type { DayPlan, Loadout, PlayerState, RaceResult, TireId } from '../shared/types';

/**
 * Everything pages are allowed to do. Swap mockGameService for a
 * chainGameService later without touching pages or the simulator.
 */
export interface GameService {
  getState(): PlayerState;
  subscribe(listener: (s: PlayerState) => void): () => void;

  buyDriver(id: string): Promise<void>;
  buyPart(id: string): Promise<void>;
  /** Tire sets are consumables (an ERC-1155 balance on chain): racing burns them. */
  buyTires(id: TireId, count?: number): Promise<void>;
  /** Restore a part to full durability for coins. */
  repairPart(id: string): Promise<void>;

  setLoadout(patch: Partial<Loadout>): Promise<void>;

  nextRace(): RaceSlot;
  /** this week's calendar, Sunday first, with today flagged */
  schedule(): DayPlan[];
  /** practice runs the selected driver has left at the next track */
  practiceLeft(): number;
  runPractice(): Promise<PracticeReport>;
  /** Morning of race day: pay the entry fee and seal the setup. Returns the commitment hash. */
  commitSetup(): Promise<string>;
  /** Afternoon: reveal the sealed setup, check it against the hash, draw the seed and race. */
  runRace(): Promise<RaceResult>;
  /**
   * Pit wall: box at the end of `lap` and fit `tire`. Replaces the next planned stop still ahead.
   * Returns the race re-run from the same seed; only the player's car changes.
   */
  callPit(lap: number, tire: TireId): Promise<RaceResult>;
  /** The race has been watched to the end: record the result and hold the prize for claiming. */
  finishRace(): Promise<void>;
  /** Evening: move the prize won into the player's coins. Returns the amount. */
  claimPrize(): Promise<number>;

  reset(): Promise<void>;

  /**
   * Wallet = identity: connect MetaMask, then read which driver and part NFTs this address owns.
   * While connected, ownership comes from the chain; returns the address.
   */
  connectWallet(): Promise<string>;
  /** Re-read the wallet's NFTs (after a transfer, say). Returns how many it owns. */
  refreshWallet(): Promise<number>;
  /** One free starter pack per wallet: a driver plus one part per slot of a kind (0 speed, 1 corner, 2 brake). */
  claimStarter(driverId: string, kind: number): Promise<void>;
  /** Exchange ETH for game coins on chain (1 coin = 0.00001 ETH). */
  buyCoins(coins: number): Promise<void>;
  /** Local chain only: add free test ETH to the connected wallet. */
  topUpTestEth(): Promise<void>;
  /** Post a finished race's points and record hash to the on-chain season. */
  postRace(result: RaceResult): Promise<void>;
  /** Collect won season prizes as ETH. */
  claimChainPrize(): Promise<void>;
  /** Back to the browser's own holdings. */
  disconnectWallet(): Promise<void>;

  /** Demo mode: coins are unlimited (nothing is charged). Mock only; a chain service would ignore it. */
  setDemo(on: boolean): void;
}
