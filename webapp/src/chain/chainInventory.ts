import { Contract, formatEther, type BrowserProvider, type JsonRpcSigner } from "ethers";
import drivers from "../data/drivers.json";
import parts from "../data/parts.json";
import { PIT_WALL_ABI } from "./abi";
import { CONTRACT_ADDRESS } from "./config";

// ข้อมูลเกม (รูปร่าง, perk, ราคา) มาจาก JSON ส่วนสถานะและความเป็นเจ้าของมาจาก chain
export type DriverDef = (typeof drivers)[number];
export type PartDef = (typeof parts)[number];

export type OwnedDriver = DriverDef & { kind: "driver"; tokenId: number };
export type OwnedPart = PartDef & { kind: "part"; tokenId: number };
export interface Inventory {
  drivers: OwnedDriver[];
  parts: OwnedPart[];
  /** รับ starter pack ไปแล้วหรือยัง (ได้ครั้งเดียวต่อกระเป๋า) */
  starterClaimed: boolean;
  /** เหรียญในเกมของกระเป๋านี้ (เก็บบน chain) */
  coins: number;
}

const driverByKey = new Map<string, DriverDef>(drivers.map((d) => [d.id, d]));
const partByKey = new Map<string, PartDef>(parts.map((p) => [p.id, p]));

const contractFor = (runner: BrowserProvider | JsonRpcSigner) => new Contract(CONTRACT_ADDRESS, PIT_WALL_ABI, runner);

export async function getInventory(provider: BrowserProvider, address: string): Promise<Inventory> {
  // อ่านอย่างเดียว: ฟรี ไม่มี popup (สไลด์ Week 10)
  const contract = contractFor(provider);
  // inventoryOf คืน token ทั้งหมดของกระเป๋าพร้อมค่าสถิติในคำสั่งเดียว (ERC721Enumerable)
  const [[ids, infos], starterClaimed, coins] = await Promise.all([
    contract.inventoryOf(address),
    contract.starterClaimed(address),
    contract.coins(address),
  ]).catch(
    (e) => {
      // contract เก่า (ไม่มี inventoryOf) หรือ address ผิด chain: บอกเป็นภาษาคน
      if (e?.code === "CALL_EXCEPTION" || e?.code === "BAD_DATA")
        throw new Error("The contract at CONTRACT_ADDRESS doesn't match this game. Deploy the new PitWallNFT and update src/chain/config.ts.");
      throw e;
    },
  );

  const out: Inventory = { drivers: [], parts: [], starterClaimed, coins: Number(coins) };
  const seen = new Set<string>();
  ids.forEach((rawId: bigint, i: number) => {
    const t = infos[i];
    const tokenId = Number(rawId);
    if (seen.has(t.key)) return; // ถือซ้ำชนิดเดียวกัน (ได้มาจากการโอน) เกมใช้ตัวเดียว
    seen.add(t.key);
    if (t.isDriver) {
      const def = driverByKey.get(t.key);
      if (!def) return console.warn(`driver key "${t.key}" (token ${tokenId}) ไม่มีใน drivers.json`);
      // ค่าสถิติใช้ค่าจาก chain เป็นหลัก
      out.drivers.push({ ...def, kind: "driver", tokenId, pace: Number(t.a), consistency: Number(t.b), wet: Number(t.c) });
    } else {
      const def = partByKey.get(t.key);
      if (!def) return console.warn(`part key "${t.key}" (token ${tokenId}) ไม่มีใน parts.json`);
      out.parts.push({ ...def, kind: "part", tokenId, speed: Number(t.a), corner: Number(t.b), brake: Number(t.c) });
    }
  });
  return out;
}

/** ETH ที่ใช้ได้ในกระเป๋า ปัดเป็น 4 ตำแหน่ง เช่น "0.0421" */
export async function ethBalance(provider: BrowserProvider, address: string): Promise<string> {
  return (+formatEther(await provider.getBalance(address))).toFixed(4);
}


// ---------- เขียน: ต้องเซ็นใน MetaMask และเสียค่า gas ----------
/** kind: 0 speed, 1 corner, 2 brake */
export async function claimStarter(signer: JsonRpcSigner, driverKey: string, kind: number): Promise<void> {
  const tx = await contractFor(signer).claimStarter(driverKey, kind);
  await tx.wait();
}

/** ซื้อ NFT ด้วยเหรียญ (ไม่ส่ง ETH) */
export async function buy(signer: JsonRpcSigner, key: string, isDriver: boolean): Promise<void> {
  const c = contractFor(signer);
  const tx = isDriver ? await c.buyDriver(key) : await c.buyPart(key);
  await tx.wait();
}

/** แลก ETH เป็นเหรียญ: จ่าย coins × COIN wei ตามอัตราใน contract */
export async function buyCoins(signer: JsonRpcSigner, coins: number): Promise<void> {
  const c = contractFor(signer);
  const rate: bigint = await c.COIN();
  const tx = await c.buyCoins({ value: rate * BigInt(coins) });
  await tx.wait();
}

/** ใช้เหรียญกับของในเกม (ยาง, ซ่อม, practice): contract หักเหรียญแล้วเผาทิ้ง */
export async function spendCoins(signer: JsonRpcSigner, coins: number, item: string): Promise<void> {
  const tx = await contractFor(signer).spendCoins(coins, item);
  await tx.wait();
}
