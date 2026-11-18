# การวิเคราะห์ความปลอดภัย: `PitWallNFT`

วิเคราะห์ช่องโหว่ของ contract ตัวเอง (`contracts/contracts/PitWallNFT.sol`) แต่ละข้อบอกว่าเป็นช่องโหว่แบบไหน, ถ้าไม่ป้องกันจะโดนโจมตีอย่างไร, ป้องกันไว้ที่บรรทัดไหน และมีเทสต์ใดยืนยัน
เลขบรรทัดอ้างอิงไฟล์ `contracts/contracts/PitWallNFT.sol` ใน branch นี้

## สรุป

| # | ประเภทช่องโหว่ | ป้องกันในโค้ดด้วย | สถานะ |
|---|---|---|---|
| 1 | Reentrancy (ถอนเงินซ้ำ) | Checks-Effects-Interactions ใน `claim()` และ `withdraw()` | ✅ ป้องกันแล้ว |
| 2 | Access control (คนทั่วไปเรียกฟังก์ชันของ owner) | modifier `onlyOwner` | ✅ ป้องกันแล้ว |
| 3 | ปั๊มแต้ม / ส่งผลซ้ำ (game logic abuse) | `require` 4 ข้อใน `submitRace` | ✅ ป้องกันแล้ว |
| 4 | Input ไม่ถูกต้อง / เงินค้างใน contract | ตรวจ `msg.value`, ยอดเหรียญ, ห้ามถือซ้ำ | ✅ ป้องกันแล้ว |
| 5 | Integer overflow / underflow | Solidity ≥ 0.8 ตรวจให้อัตโนมัติ | ✅ ป้องกันแล้ว |
| 6 | DoS จากลูปไม่จำกัด (`endSeason`) | – | ⚠️ ความเสี่ยงที่ยังเหลือ |
| 7 | ผลเรซคำนวณนอก chain (trust) | `recordHash` + `voidRace` + Verify race | ⚠️ ลดความเสี่ยง ไม่ได้ตัดออก |

---

## 1. Reentrancy

- **ความเสี่ยง:** `claim()` และ `withdraw()` ส่ง ETH ด้วย `call` ถ้าผู้รับเป็น contract ที่มี `receive()` เรียก `claim()` ซ้ำก่อนยอดถูกหัก จะถอนเงินได้หลายรอบจนกองรางวัลหมด (แบบเดียวกับเหตุการณ์ The DAO)
- **ป้องกันในโค้ด:** ตั้งยอดเป็น 0 **ก่อน** ส่ง ETH (Checks → Effects → Interactions) ถ้ามีการเรียกซ้ำ ยอดจะเป็น 0 แล้ว และติด `require(amount > 0)`

```solidity
// claim() บรรทัด 263–270
uint256 amount = claimable[msg.sender];
require(amount > 0, "nothing to claim");
claimable[msg.sender] = 0;                                   // effect ก่อน
(bool ok, ) = payable(msg.sender).call{value: amount}("");  // แล้วค่อย interaction
require(ok, "claim failed");
```

- `withdraw()` บรรทัด 360–365 ใช้รูปแบบเดียวกัน (`ownerFunds = 0` ก่อนส่ง)
- **เทสต์:** "ends with the top 3 claiming 50/30/20%..." ยืนยันว่า claim ครั้งที่สองจะ revert ด้วย `nothing to claim`

## 2. Access control

- **ความเสี่ยง:** ถ้าใครก็เรียก `endSeason`, `voidRace`, `withdraw` หรือ `setBaseURI` ได้ คนนั้นจะปิดฤดูกาลตอนตัวเองนำ, ลบแต้มคนอื่น, ถอนเงินของ owner หรือเปลี่ยนรูป NFT ทุกตัวได้
- **ป้องกันในโค้ด:** modifier `onlyOwner` (บรรทัด 102) บังคับใช้กับ `voidRace` (217), `endSeason` (247), `setBaseURI` (349), `withdraw` (360)
- **แยกเงิน owner กับเงินผู้เล่น:** `withdraw()` ถอนได้แค่ `ownerFunds` (70% ของ ETH ที่แลกเหรียญ) owner ถอน `seasonPool` หรือ `claimable` ของผู้เล่นไม่ได้เลย แม้จะเป็น owner ก็ตาม
- **เทสต์:** "tokenURI is baseURI + key, and only the owner sets it or withdraws", "the steward can void..." (คนอื่นเรียกแล้วโดน `not owner`), และเทสต์ withdraw ที่ยืนยันว่า owner ได้เฉพาะ 70%

## 3. ปั๊มแต้ม / ส่งผลซ้ำ

- **ความเสี่ยง:** `submitRace` ให้ผู้เล่นส่งแต้มเอง ถ้าไม่จำกัด คนเรียก contract ตรง ๆ จะส่ง round 1, 2, 3 … 1000 ครั้งละ 25 แต้ม แล้วชนะกองรางวัลแน่นอน (ช่องโหว่นี้มีอยู่จริงในเวอร์ชันแรก และแก้แล้ว)
- **ป้องกันในโค้ด** (บรรทัด 203–206):

| เงื่อนไข | กันอะไร |
|---|---|
| `driversHeld[msg.sender] > 0` | กระเป๋าที่ไม่มีนักแข่งส่งผลไม่ได้ |
| `points <= MAX_POINTS` (25) | แต้มเกินผู้ชนะ 1 เรซ |
| `round > lastRound[...]` | ส่งรอบเดิมซ้ำหรือย้อนรอบ |
| `racesPosted[...] < RACES_PER_SEASON` (6) | ส่งเกินจำนวนเรซในฤดูกาล แต้มสูงสุดจึงเป็น 150 |

- เรซที่ steward สั่ง `voidRace` ยังนับโควตา จึงส่งใหม่แทนไม่ได้
- **เทสต์:** "only a driver holder can post...", "caps each player at 6 races a season..."

## 4. Input ไม่ถูกต้อง และเงินค้างใน contract

- **ความเสี่ยง:** ส่ง ETH เศษที่แลกเป็นเหรียญไม่ลงตัวจะทำให้เงินค้างโดยไม่มีใครได้, ซื้อของเกินยอดเหรียญ, หรือซื้อ NFT ชนิดเดิมซ้ำ
- **ป้องกันในโค้ด:**
  - `buyCoins` (155): `msg.value > 0 && msg.value % COIN == 0`
  - `_pay` (172): `coins[msg.sender] >= amount`
  - `buyDriver` / `buyPart` (178, 188): ห้ามถือแบบเดียวกันซ้ำ (mapping `held` อัปเดตทุกครั้งที่ mint หรือโอนใน `_update`)
  - ชื่อแบบที่ไม่มีใน catalog → `unknown driver` / `unknown part`
- **เทสต์:** "ETH buys coins at the fixed rate...", "coins buy NFTs and in-game items; a duplicate or a short balance is refused"

## 5. Integer overflow / underflow

- **ความเสี่ยง:** ก่อน Solidity 0.8 การลบเกินยอด (เช่น `coins -= amount`) จะวนกลับเป็นตัวเลขมหาศาล
- **ป้องกัน:** `pragma solidity ^0.8.24` (บรรทัด 2) ทุกการบวก/ลบ/คูณถูกตรวจและ revert อัตโนมัติ และเรายังเช็ก `require` ก่อนลบทุกจุดด้วย

## 6. ความเสี่ยงที่ยังเหลือ: ลูปไม่จำกัดใน `endSeason`

- **ความเสี่ยง:** `topThree()` วนผู้เล่นทุกคนที่ส่งผลในฤดูกาล (บรรทัด 229) ถ้ามีผู้เล่นหลายพันคน `endSeason` อาจใช้ gas เกินลิมิตของ block จนปิดฤดูกาลไม่ได้ และเงินรางวัลจะค้าง
- **ทำไมยังรับได้ในโปรเจกต์นี้:** วัดจริงที่ 3 ผู้เล่นใช้ 107,057 gas จึงรองรับผู้เล่นระดับห้องเรียนได้สบาย
- **วิธีแก้ถ้าระบบจริง:** เก็บ top 3 ไว้อัปเดตทุกครั้งที่ `submitRace` (O(1) ต่อการส่ง) หรือให้ผู้เล่นยื่น claim อันดับเองแบบ pull

## 7. Trust ที่ยังเหลือ: ผลเรซคำนวณนอก chain

- **ความเสี่ยง:** เรซ 20 รอบ 10 คันคำนวณในเบราว์เซอร์ ผู้เล่นจึงแก้แต้มก่อนส่งได้
- **ที่ทำไว้:**
  - เรซเป็น deterministic จาก seed
  - ผลที่ส่งมี `recordHash` (hash ของเซ็ต, seed, คำสั่งพิท, อันดับ, แต้ม) ผูกไว้บน chain แก้ทีหลังไม่ได้
  - ปุ่ม Verify race คำนวณซ้ำแล้วเทียบผล และ steward `voidRace` ผลที่ตรวจไม่ผ่านได้
- **ข้อจำกัด:**
  - เป็นแบบ optimistic: เชื่อไว้ก่อนจนกว่าจะตรวจ
  - steward เป็นคนเดียว (owner)
  - commit hash ของการซีลเซ็ตเก็บไว้ในเบราว์เซอร์ ยังไม่ได้ขึ้น chain
- **ทางแก้ในอนาคต:** ส่ง commit hash ขึ้น chain ก่อนเรซ, เปิดช่วงให้ใครก็ยื่นค้านผลได้ (fraud proof) หรือใช้ zk proof ยืนยันการคำนวณ

---

## เปรียบเทียบ L1 กับ L2

### Gas ที่ใช้จริง

วัดด้วย `npx hardhat run scripts/gas-report.js` (EVM เดียวกับ Sepolia / Ethereum mainnet)

| Action | Gas used |
|---|---|
| deploy PitWallNFT | 5,883,264 |
| buyCoins (1,000 coins) | 90,091 |
| buyDriver | 211,079 |
| buyPart | 196,870 |
| spendCoins (tire set) | 30,112 |
| sponsor | 26,352 |
| submitRace (first of season) | 186,395 |
| submitRace (later round) | 90,607 |
| voidRace | 35,909 |
| endSeason (3 players) | 107,057 |
| claim | 30,040 |
| withdraw | 30,682 |

**ผู้เล่น 1 คนเริ่มเล่นครบ 1 ฤดูกาล:**
- buyCoins 1 ครั้ง + buyDriver 1 ครั้ง + buyPart 4 ครั้ง + submitRace 6 ครั้ง + claim 1 ครั้ง
- รวมประมาณ **1.76 ล้าน gas**
- ค่าธรรมเนียม = gas × gas price เช่น ที่ 10 gwei ≈ 0.0176 ETH ต่อผู้เล่นต่อฤดูกาล (ราคา gas บน L1 ขึ้นลงตามความหนาแน่นของเครือข่าย)

### เทียบ L1 กับ L2

| หัวข้อ | L1 (Ethereum / Sepolia) | L2 rollup (เช่น Optimism, Arbitrum, Base) |
|---|---|---|
| ค่าธรรมเนียม | สูง: ทุกธุรกรรมแข่งกันใน block ของ L1 | ต่ำกว่ามาก: รวมหลายธุรกรรมแล้วส่งข้อมูลลง L1 ทีเดียว |
| ความเร็วยืนยัน | ~12 วินาทีต่อ block | เร็วกว่า (ระดับวินาทีหรือต่ำกว่า) |
| ความปลอดภัย | ปลอดภัยที่สุด: ตรวจโดย validator ทั้งเครือข่าย | อิง L1 แต่เพิ่มความเชื่อใจ sequencer และช่วงท้าทายผล (optimistic) หรือ proof (zk) |
| ถอนเงินกลับ L1 | – | optimistic rollup รอราว 7 วัน, zk rollup เร็วกว่า |
| โค้ดของเรา | ใช้ได้เลย | ใช้ได้เลยเพราะ EVM-compatible (deploy ไฟล์เดิม เปลี่ยนแค่ network ใน MetaMask และ `config.ts`) |

**สรุปสำหรับ Pit Manager:**
- **เหมาะกับ L2:** เกมมีธุรกรรมเล็ก ๆ ถี่ (ซื้อชิ้นส่วน, ยาง, ส่งผลทุกเรซ) ค่าธรรมเนียม L1 จะสูงกว่าตัวของในเกม
- **ที่ใช้ Sepolia (L1 testnet) ในโปรเจกต์นี้:** ตรวจบน Etherscan ได้ตรงตามข้อกำหนด และขอ ETH ทดสอบได้ง่าย
- **ถ้าเปิดใช้จริง:** ควรย้ายไป L2 และเก็บ L1 ไว้เป็นชั้น settlement
