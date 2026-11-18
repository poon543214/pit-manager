import { AbiCoder, Contract, ZeroAddress, formatEther, keccak256, type BrowserProvider, type JsonRpcSigner } from "ethers";
import type { RaceResult } from "../shared/types";
import { PIT_WALL_ABI } from "./abi";
import { CONTRACT_ADDRESS } from "./config";

/** ฤดูกาลบน chain: กองรางวัลเป็น ETH จริง top 3 เคลมได้เมื่อ steward ปิดฤดูกาล */
export interface ChainSeason {
  season: number;
  /** ETH ในกองรางวัล เช่น "0.0123" */
  pool: string;
  myPoints: number;
  /** รอบล่าสุดที่ส่งผลขึ้น chain แล้ว (ส่งรอบที่ต่ำกว่าหรือเท่านี้ไม่ได้) */
  myLastRound: number;
  /** ETH ที่ชนะแล้วรอเคลม */
  claimable: string;
  top: { address: string; points: number }[];
}

const contractFor = (runner: BrowserProvider | JsonRpcSigner) => new Contract(CONTRACT_ADDRESS, PIT_WALL_ABI, runner);
const eth = (wei: bigint) => (+formatEther(wei)).toFixed(5);

export async function getSeason(provider: BrowserProvider, address: string): Promise<ChainSeason> {
  const c = contractFor(provider);
  const i = await c.seasonInfo(address);
  // The deployed contract checks rounds per season, so after endSeason an old race could be posted again.
  // Game rounds keep counting up across seasons, so the highest round posted in ANY season is the floor
  // for the next post; the game hides "Post" for every race at or below it (see SECURITY.md, item 3).
  const seasons = Array.from({ length: Number(i.currentSeason) - 1 }, (_, k) => k + 1);
  const earlier: bigint[] = await Promise.all(seasons.map((s) => c.lastRound(s, address)));
  const lastEver = Math.max(Number(i.myLastRound), ...earlier.map(Number));
  return {
    season: Number(i.currentSeason),
    pool: eth(i.pool),
    myPoints: Number(i.myPoints),
    myLastRound: lastEver,
    claimable: eth(i.myClaimable),
    top: (i.top as string[])
      .map((a, k) => ({ address: a, points: Number(i.topPoints[k]) }))
      .filter((t) => t.address !== ZeroAddress),
  };
}

/**
 * ลายนิ้วมือของผลแข่งทั้งเรซ: hash ของเซ็ตที่ซีลไว้, seed, คำสั่งพิท, อันดับและแต้ม
 * steward ใช้ record ตัวเต็ม (ปุ่ม Verify race) คำนวณซ้ำแล้วเทียบกับ hash นี้
 */
export function recordHash(r: RaceResult): string {
  const p = r.proof!;
  const me = r.entries.find((e) => e.entrant.isPlayer)!;
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "uint256[]", "string[]", "uint256", "uint256"],
      [p.hash, r.seed, p.calls.map((c) => c.lap), p.calls.map((c) => c.tire), me.position, me.points],
    ),
  );
}

// ---------- เขียน: เซ็นใน MetaMask ----------
export async function submitRace(signer: JsonRpcSigner, r: RaceResult): Promise<void> {
  const me = r.entries.find((e) => e.entrant.isPlayer)!;
  const tx = await contractFor(signer)
    .submitRace(r.proof!.round, me.points, recordHash(r))
    .catch((e: { reason?: string }) => {
      // the contract counts at most 6 races per player per season
      if (e?.reason?.includes('season race limit'))
        throw new Error('You have posted all 6 races of this on-chain season. Wait for the steward to end it.');
      throw e;
    });
  await tx.wait();
}

export async function claimPrize(signer: JsonRpcSigner): Promise<void> {
  const tx = await contractFor(signer).claim();
  await tx.wait();
}
