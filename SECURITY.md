# การวิเคราะห์ความปลอดภัย: `PitWallNFT`

วิเคราะห์ช่องโหว่ของ contract ตัวเอง (`contracts/contracts/PitWallNFT.sol`) แต่ละข้อบอกว่าเป็นช่องโหว่แบบไหน, ถ้าไม่ป้องกันจะโดนโจมตีอย่างไร, ป้องกันไว้ที่บรรทัดไหน และมีเทสต์ใดยืนยัน
เลขบรรทัดอ้างอิงไฟล์ `contracts/contracts/PitWallNFT.sol` ใน branch นี้

## สรุป

| # | ประเภทช่องโหว่ | ป้องกันในโค้ดด้วย | สถานะ |
|---|---|---|---|
| 1 | Reentrancy (ถอนเงินซ้ำ) | Checks-Effects-Interactions ใน `claim()` และ `withdraw()` | ✅ ป้องกันแล้ว |
| 2 | Access control (คนทั่วไปเรียกฟังก์ชันของ owner) | modifier `onlyOwner` | ✅ ป้องกันแล้ว |
| 3 | ปั๊มแต้ม / ส่งผลซ้ำ (game logic abuse) | `require` 4 ข้อใน `submitRace` + `lastPostedRound` ข้ามฤดูกาล | ✅ แก้ในโค้ดแล้ว (รอ deploy ใหม่) |
| 4 | Input ไม่ถูกต้อง / เงินค้างใน contract | ตรวจ `msg.value`, ยอดเหรียญ, ห้ามถือซ้ำ | ✅ ป้องกันแล้ว |
| 5 | Integer overflow / underflow | Solidity ≥ 0.8 ตรวจให้อัตโนมัติ | ✅ ป้องกันแล้ว |
| 6 | DoS จากลูปไม่จำกัด (`endSeason`) | – | ⚠️ ความเสี่ยงที่ยังเหลือ |
| 7 | ผลเรซคำนวณนอก chain (trust) | `recordHash` + `voidRace` + Verify race | ⚠️ ลดความเสี่ยง ไม่ได้ตัดออก |

---

## 1. Reentrancy

- **ความเสี่ยง:** `claim()` และ `withdraw()` ส่ง ETH ด้วย `call` ถ้าผู้รับเป็น contract ที่มี `receive()` เรียก `claim()` ซ้ำก่อนยอดถูกหัก จะถอนเงินได้หลายรอบจนกองรางวัลหมด (แบบเดียวกับเหตุการณ์ The DAO)
- **ป้องกันในโค้ด:** ตั้งยอดเป็น 0 **ก่อน** ส่ง ETH (Checks → Effects → Interactions) ถ้ามีการเรียกซ้ำ ยอดจะเป็น 0 แล้ว และติด `require(amount > 0)`

```solidity
// claim() บรรทัด 267–274
uint256 amount = claimable[msg.sender];
require(amount > 0, "nothing to claim");
claimable[msg.sender] = 0;                                   // effect ก่อน
(bool ok, ) = payable(msg.sender).call{value: amount}("");  // แล้วค่อย interaction
require(ok, "claim failed");
```

- `withdraw()` บรรทัด 365–370 ใช้รูปแบบเดียวกัน (`ownerFunds = 0` ก่อนส่ง)
- **เทสต์:** "ends with the top 3 claiming 50/30/20%..." ยืนยันว่า claim ครั้งที่สองจะ revert ด้วย `nothing to claim`

## 2. Access control

- **ความเสี่ยง:** ถ้าใครก็เรียก `endSeason`, `voidRace`, `withdraw` หรือ `setBaseURI` ได้ คนนั้นจะปิดฤดูกาลตอนตัวเองนำ, ลบแต้มคนอื่น, ถอนเงินของ owner หรือเปลี่ยนรูป NFT ทุกตัวได้
- **ป้องกันในโค้ด:** modifier `onlyOwner` (บรรทัด 105) บังคับใช้กับ `voidRace` (221), `endSeason` (251), `setBaseURI` (354), `withdraw` (365)
- **แยกเงิน owner กับเงินผู้เล่น:** `withdraw()` ถอนได้แค่ `ownerFunds` (70% ของ ETH ที่แลกเหรียญ) owner ถอน `seasonPool` หรือ `claimable` ของผู้เล่นไม่ได้เลย แม้จะเป็น owner ก็ตาม
- **เทสต์:** "tokenURI is baseURI + key, and only the owner sets it or withdraws", "the steward can void..." (คนอื่นเรียกแล้วโดน `not owner`), และเทสต์ withdraw ที่ยืนยันว่า owner ได้เฉพาะ 70%

## 3. ปั๊มแต้ม / ส่งผลซ้ำ

- **ความเสี่ยง:** `submitRace` ให้ผู้เล่นส่งแต้มเอง ถ้าไม่จำกัด คนเรียก contract ตรง ๆ จะส่ง round 1, 2, 3 … 1000 ครั้งละ 25 แต้ม แล้วชนะกองรางวัลแน่นอน (ช่องโหว่นี้มีอยู่จริงในเวอร์ชันแรก และแก้แล้ว)
- **ป้องกันในโค้ด** (บรรทัด 206–209):

| เงื่อนไข | กันอะไร |
|---|---|
| `driversHeld[msg.sender] > 0` | กระเป๋าที่ไม่มีนักแข่งส่งผลไม่ได้ |
| `points <= MAX_POINTS` (25) | แต้มเกินผู้ชนะ 1 เรซ |
| `round > lastPostedRound[msg.sender]` | ส่งรอบเดิมซ้ำหรือย้อนรอบ **ข้ามทุกฤดูกาล** |
| `racesPosted[...] < RACES_PER_SEASON` (6) | ส่งเกินจำนวนเรซในฤดูกาล แต้มสูงสุดจึงเป็น 150 |

- เรซที่ steward สั่ง `voidRace` ยังนับโควตา จึงส่งใหม่แทนไม่ได้
- **ช่องโหว่ที่เจอจริงบน Sepolia: ส่งเรซเดิมซ้ำในฤดูกาลใหม่**
  - **ที่เกิดขึ้น:** contract รุ่นแรกเช็กรอบแยกตามฤดูกาล (`lastRound[season][player]`) หลัง `endSeason` ค่าเริ่มที่ 0 ใหม่ จึงส่ง R5 ผลเดิมซ้ำได้
  - **หลักฐาน:** record hash เดียวกัน `0x04aaea75…7f48` ถูกส่ง 2 ครั้ง คือ [ฤดูกาล 1](https://sepolia.etherscan.io/tx/0x83410d2206c0f1e1205d2c7d1938c0380e2f08425f2a597241e218aac14713a5) และ [ฤดูกาล 2](https://sepolia.etherscan.io/tx/0x5001e7560c30c6ebde1b85c3905efa834f3bb5f7fcc388c282be1c780c8ea958)
  - **ผลกระทบ:** ผลเรซเดียวนับแต้มได้หลายฤดูกาล ถ้าทำทุกฤดูกาลจะเก็บแต้มฟรีได้เรื่อย ๆ
  - **แก้แล้วในโค้ด:**
    - เพิ่ม `lastPostedRound[player]` นับรอบรวมทุกฤดูกาล เลขรอบของเกมนับต่อเนื่องข้ามฤดูกาลอยู่แล้ว
    - `seasonInfo` คืนค่านี้ให้หน้าเว็บซ่อนปุ่ม Post ของเรซที่ส่งไปแล้ว
  - **ข้อจำกัด:** contract บน Sepolia ตอนนี้ยังเป็นรุ่นเก่า ต้อง deploy ใหม่จึงจะมีผล
  - **แต้มรีเซ็ตทุกฤดูกาลถูกต้องอยู่แล้ว** เพราะ `seasonPoints[season][player]` แยกตามฤดูกาล
- **เทสต์:** "only a driver holder can post...", "caps each player at 6 races a season...", "a race posted in one season cannot be posted again after endSeason..."

## 4. Input ไม่ถูกต้อง และเงินค้างใน contract

- **ความเสี่ยง:** ส่ง ETH เศษที่แลกเป็นเหรียญไม่ลงตัวจะทำให้เงินค้างโดยไม่มีใครได้, ซื้อของเกินยอดเหรียญ, หรือซื้อ NFT ชนิดเดิมซ้ำ
- **ป้องกันในโค้ด:**
  - `buyCoins` (158): `msg.value > 0 && msg.value % COIN == 0`
  - `_pay` (175): `coins[msg.sender] >= amount`
  - `buyDriver` / `buyPart` (181, 191): ห้ามถือแบบเดียวกันซ้ำ (mapping `held` อัปเดตทุกครั้งที่ mint หรือโอนใน `_update`)
  - ชื่อแบบที่ไม่มีใน catalog → `unknown driver` / `unknown part`
- **เทสต์:** "ETH buys coins at the fixed rate...", "coins buy NFTs and in-game items; a duplicate or a short balance is refused"

## 5. Integer overflow / underflow

- **ความเสี่ยง:** ก่อน Solidity 0.8 การลบเกินยอด (เช่น `coins -= amount`) จะวนกลับเป็นตัวเลขมหาศาล
- **ป้องกัน:** `pragma solidity ^0.8.24` (บรรทัด 2) ทุกการบวก/ลบ/คูณถูกตรวจและ revert อัตโนมัติ และเรายังเช็ก `require` ก่อนลบทุกจุดด้วย

## 6. ความเสี่ยงที่ยังเหลือ: ลูปไม่จำกัดใน `endSeason`

- **ความเสี่ยง:** `topThree()` วนผู้เล่นทุกคนที่ส่งผลในฤดูกาล (บรรทัด 233) ถ้ามีผู้เล่นหลายพันคน `endSeason` อาจใช้ gas เกินลิมิตของ block จนปิดฤดูกาลไม่ได้ และเงินรางวัลจะค้าง
- **ทำไมยังรับได้ในโปรเจกต์นี้:** บน Sepolia ปิดฤดูกาล 1 ผู้เล่นใช้จริง 167,871 gas และในเครื่อง 3 ผู้เล่นใช้ 107,035 gas จึงรองรับผู้เล่นระดับห้องเรียนได้สบาย
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

### Gas และค่าธรรมเนียมจริงบน Sepolia

หน่วย **gas** คือปริมาณงานที่ธุรกรรมใช้ ค่าธรรมเนียมเป็น ETH = gas × gas price
ค่าในตารางมาจาก receipt ของธุรกรรมจริงบน Sepolia (gas price ตอนนั้น ≈ 1 gwei = 0.000000001 ETH ต่อ gas) กดลิงก์เพื่อดูบน Etherscan

| Action | Gas บน Sepolia | ค่าธรรมเนียม (ETH) | Gas ในเครื่อง (Hardhat) |
|---|---|---|---|
| [deploy PitWallNFT](https://sepolia.etherscan.io/tx/0x7b58b497438c5207a2cf4520b54d1b03dff15b903cbf4778c6317b92b1dc4cb9) | 35,426,720 | 0.03543 | 5,896,051 |
| [buyCoins (1,000 coins)](https://sepolia.etherscan.io/tx/0xf9ad9b7b581d9562546c53cb98d0a18793c7105a75f66a0eaa2d6aef7234b10f) | 354,141 | 0.000354 | 90,069 |
| [buyDriver](https://sepolia.etherscan.io/tx/0x09b49805fdff5296cb83f5141640051b59d279a057b2c8da3dea5aaa69fb01a8) | 935,868 | 0.000936 | 211,057 |
| [buyPart](https://sepolia.etherscan.io/tx/0xe9adf249ca8bd4499a9cbb9be7a49d33fe0c408b7d2dd9e8bf6478b04827fae0) | 855,313 | 0.000855 | 196,848 |
| [submitRace (first of season)](https://sepolia.etherscan.io/tx/0x83410d2206c0f1e1205d2c7d1938c0380e2f08425f2a597241e218aac14713a5) | 796,325 | 0.000796 | 208,270 |
| [endSeason (1 player)](https://sepolia.etherscan.io/tx/0x30e801b617198fd8aee0b6a0a71df3cb25bc3ce7d3576286bfc95e438d056d9c) | 167,871 | 0.000168 | 107,035 (3 players) |
| [claim](https://sepolia.etherscan.io/tx/0xcc1e3f91ba822d4b6e562dee615bf33a97731b3d85220efffaeddb7283a5feb5) | 30,669 | 0.0000307 | 30,018 |
| [sponsor](https://sepolia.etherscan.io/tx/0xe6c6c51e3928ac25f94da69867b54492979dabee60dcf626a9547fbcb58967d0) | 17,550 | 0.0000176 | 26,416 |

- **ทำไมค่าในเครื่องต่ำกว่า:** `scripts/gas-report.js` วัดบน Hardhat ซึ่งใช้กฎค่า gas ของ EVM รุ่นเก่ากว่า Sepolia ตอนนี้
  - งานที่สร้างข้อมูลใหม่ใน storage (mint NFT, บันทึกผลเรซ, deploy) บน Sepolia แพงกว่าในเครื่องราว 4–6 เท่า
  - งานที่แค่แก้ค่าเดิม (`claim`) ใกล้เคียงกัน
  - **ค่าที่ใช้อ้างอิงคือค่าจาก Sepolia** ส่วนค่าในเครื่องใช้เทียบระหว่างฟังก์ชันด้วยกันเท่านั้น

**ผู้เล่น 1 คนเริ่มเล่นครบ 1 ฤดูกาล (ค่าจริงบน Sepolia ที่ 1 gwei):**
- buyCoins 1 + buyDriver 1 + buyPart 4 + submitRace 6 + claim 1 ครั้ง
- ≈ 354,141 + 935,868 + 4 × 855,313 + 6 × 796,325 + 30,669 ≈ **9.5 ล้าน gas ≈ 0.0095 ETH**
- ใช้ค่า submitRace ครั้งแรกทั้ง 6 ครั้ง จึงเป็นค่าประมาณด้านสูง (ครั้งต่อ ๆ ไปเขียนข้อมูลใหม่น้อยกว่า)
- ถ้า gas price ขึ้นเป็น 10 gwei ค่าธรรมเนียมจะเป็น 10 เท่า ≈ 0.095 ETH ต่อผู้เล่นต่อฤดูกาล

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
