# Pit Manager

เกมบริหารทีม F1 แบบ pixel art บน blockchain นักแข่งและชิ้นส่วนรถเป็น NFT (ERC-721) เหรียญในเกมเก็บบน chain และผู้เล่น 3 อันดับแรกของฤดูกาลรับรางวัลเป็น ETH

> **Branch นี้ (`sepolia`)** ใช้ contract ที่ deploy บน **Sepolia testnet** ผ่าน Remix ตรวจได้บน Etherscan
> ถ้าต้องการเวอร์ชันที่รันบน chain ในเครื่อง (Hardhat local, มีปุ่มเติม ETH ทดสอบ) ดู branch [`local-hardhat`](https://github.com/poon543214/pit-manager/tree/local-hardhat)

## Branch ไหนใช้ทำอะไร

| Branch | ใช้ทำอะไร |
|---|---|
| [`sepolia`](https://github.com/poon543214/pit-manager/tree/sepolia) | **เวอร์ชันส่งงาน:** contract อยู่บน Sepolia testnet (deploy ด้วย Remix, verify บน Etherscan) |
| [`local-hardhat`](https://github.com/poon543214/pit-manager/tree/local-hardhat) | **เวอร์ชันพัฒนา:** รันทุกอย่างในเครื่องด้วย Hardhat local chain |
| [`deployed`](https://github.com/poon543214/pit-manager/tree/deployed) | เวอร์ชันแรกที่ขึ้น Sepolia (contract รุ่นเก่า เก็บไว้เป็นประวัติ) |

ตัวเกม, smart contract (`PitWallNFT.sol`), เทสต์ของ contract และกติกาทั้งหมด **เหมือนกันทั้ง 2 branch** ต่างกันที่ contract อยู่บน chain ไหนและวิธีรัน

สิ่งที่มีเฉพาะใน `sepolia`:
- ไฟล์ Remix `contracts/remix/PitWallNFT.sol`
- ข้อความ error ของธุรกรรมที่อ่านเข้าใจ (`webapp/src/chain/errors.ts` + เทสต์)
- `scripts/gas-report.js`
- `SECURITY.md`

### ความต่างระหว่าง `sepolia` กับ `local-hardhat`

| เรื่อง | `sepolia` | `local-hardhat` |
|---|---|---|
| Chain | Sepolia testnet (chainId 11155111) เครือข่ายสาธารณะ | Hardhat node ในเครื่อง (chainId 31337) |
| Deploy contract | วาง `contracts/remix/PitWallNFT.sol` ใน **Remix** (0.8.24, optimization 200) | `npm run deploy:local` สั่งครั้งเดียว |
| Address ของ contract | อยู่ใน `webapp/src/chain/sepolia-deployment.json` ใส่เองหลัง deploy | สคริปต์ deploy เขียนให้อัตโนมัติใน `local-deployment.json` |
| ตรวจสอบจากภายนอก | ✅ เปิดดู contract, โค้ด (verified) และทุกธุรกรรมบน Etherscan ได้ | ❌ อยู่ในเครื่องเท่านั้น ไม่มี explorer |
| ETH ที่ใช้ | Sepolia ETH จาก faucet (มีจำกัด ต้องขอล่วงหน้า) | ปุ่ม **+10 test ETH** ในเกม เติมได้ไม่จำกัด |
| ความเร็วธุรกรรม | รอ block ~12 วินาที | เสร็จทันที |
| ค่า gas | จ่ายจริง (ด้วย Sepolia ETH) | ฟรี |
| ข้อมูลหลังปิดเครื่อง | อยู่ถาวรบน chain | หายทั้งหมดเมื่อปิด node ต้อง deploy ใหม่ |
| Steward (`endSeason`, `voidRace`, `sponsor`) | เรียกใน Remix ด้วยกระเป๋า owner | `npm run steward` (เซ็นด้วยบัญชี #0 ของ Hardhat) |
| กองรางวัลเริ่มต้น | ต้องเรียก `sponsor()` เอง | deploy แล้วใส่ 1 ETH ให้อัตโนมัติ |
| ปุ่ม **Contract ↗** (ไป Etherscan) ในหน้า Home | มี | ไม่มี |
| ปัญหาที่เจอบ่อย | faucet ให้ ETH ไม่พอ, เครือข่ายช้าบางช่วง | ปิด node แล้ว NFT หาย, MetaMask nonce ไม่ตรง (ต้อง Clear activity) |
| เหมาะกับ | ส่งงาน, เดโมให้อาจารย์, อ้างอิงธุรกรรมในรายงาน | พัฒนา, ทดลองเร็ว ๆ, ลองแก้ contract ก่อน deploy จริง |

> ใน branch `sepolia` สลับไปรันบน chain ในเครื่องได้ด้วย `VITE_CHAIN=local npm run dev` (ต้องเปิด `npm run chain` และ `npm run deploy:local` ก่อน)

## Contract บน Sepolia

| รายการ | ค่า |
|---|---|
| Contract address | [`0x3EA5ca51341aBdcb50D0A0BD1cCC3C728308f0aD`](https://sepolia.etherscan.io/address/0x3EA5ca51341aBdcb50D0A0BD1cCC3C728308f0aD#code) (source verified บน Etherscan) |
| Compiler | Solidity v0.8.24, optimization 200 runs |
| Deploy tx | [`0x7b58b497…4cb9`](https://sepolia.etherscan.io/tx/0x7b58b497438c5207a2cf4520b54d1b03dff15b903cbf4778c6317b92b1dc4cb9) |
| `buyCoins` (0.01 ETH → 1,000 coins) | [`0xf9ad9b7b…b10f`](https://sepolia.etherscan.io/tx/0xf9ad9b7b581d9562546c53cb98d0a18793c7105a75f66a0eaa2d6aef7234b10f) |
| `buyDriver` | [`0x09b49805…01a8`](https://sepolia.etherscan.io/tx/0x09b49805fdff5296cb83f5141640051b59d279a057b2c8da3dea5aaa69fb01a8) |
| `buyPart` | [`0xe9adf249…fae0`](https://sepolia.etherscan.io/tx/0xe9adf249ca8bd4499a9cbb9be7a49d33fe0c408b7d2dd9e8bf6478b04827fae0) |
| `submitRace` | [`0x83410d22…13a5`](https://sepolia.etherscan.io/tx/0x83410d2206c0f1e1205d2c7d1938c0380e2f08425f2a597241e218aac14713a5) |
| `endSeason` | [`0x30e801b6…6d9c`](https://sepolia.etherscan.io/tx/0x30e801b617198fd8aee0b6a0a71df3cb25bc3ce7d3576286bfc95e438d056d9c) |
| `claim` (ได้รับ 0.0015 ETH) | [`0xcc1e3f91…feb5`](https://sepolia.etherscan.io/tx/0xcc1e3f91ba822d4b6e562dee615bf33a97731b3d85220efffaeddb7283a5feb5) |

> ⚠️ **contract ที่ address นี้มีบั๊ก:** ส่งผลเรซเดิมซ้ำในฤดูกาลใหม่ได้ ดูหลักฐาน [submitRace ครั้งที่ 2](https://sepolia.etherscan.io/tx/0x5001e7560c30c6ebde1b85c3905efa834f3bb5f7fcc388c282be1c780c8ea958) ซึ่งใช้ R5 ผลเดิม
> แก้แล้วในโค้ด (`lastPostedRound`) รายละเอียดใน [SECURITY.md](SECURITY.md) ข้อ 3 ต้อง deploy `contracts/remix/PitWallNFT.sol` ใหม่แล้วอัปเดต address ในตารางนี้

## สิ่งที่ต้องมี

- [Node.js](https://nodejs.org) 18 ขึ้นไป
- เบราว์เซอร์ที่ติดตั้ง [MetaMask](https://metamask.io) และเปิด **Show test networks** แล้วเลือก **Sepolia**
- Sepolia ETH ประมาณ **0.05 ETH** (ขอฟรีจาก Sepolia faucet) ใช้กับ:
  - deploy contract (~5.9 ล้าน gas)
  - เติมกองรางวัล 0.01 ETH
  - แลกเหรียญ 1,000 เหรียญ = 0.01 ETH
  - ค่า gas ระหว่างเล่น

## 1. Deploy contract บน Remix

ไฟล์ที่ใช้คือ **`contracts/remix/PitWallNFT.sol`** เป็นไฟล์เดียวที่รวม OpenZeppelin 5.0.2 ไว้แล้ว ไม่ต้อง import อะไรเพิ่ม

1. เปิด [remix.ethereum.org](https://remix.ethereum.org) → สร้างไฟล์ใหม่ `PitWallNFT.sol` → วางเนื้อหาจาก `contracts/remix/PitWallNFT.sol`
2. แท็บ **Solidity Compiler**
   - Compiler: **0.8.24**
   - **Advanced Configurations → เปิด Enable optimization, runs = 200** (สำคัญมาก: ถ้าไม่เปิด contract จะใหญ่ 26.9 KB เกินลิมิต 24 KB และ deploy ไม่ผ่าน เปิดแล้วเหลือ 14.7 KB)
   - EVM version: ค่าเริ่มต้น
   - กด **Compile PitWallNFT.sol**
3. แท็บ **Deploy & Run**
   - Environment: **Injected Provider - MetaMask** (ต้องอยู่บน Sepolia)
   - Contract: **PitWallNFT** (ไม่มี constructor argument)
   - กด **Deploy** แล้วยืนยันใน MetaMask
4. คัดลอก address ของ contract ไปใส่ใน **`webapp/src/chain/sepolia-deployment.json`**:

```json
{ "address": "0x..." }
```

5. ใส่เงินกองรางวัล: ใน Remix ช่อง **VALUE** ใส่ `0.01` เลือกหน่วย **Ether** แล้วกด **sponsor**

### Verify บน Etherscan (ให้เปิดอ่านโค้ดบนเว็บได้)

- **วิธีที่ 1 (ใน Remix):** เปิด plugin **Contract Verification** → เลือก Etherscan → ใส่ API key ฟรีจาก etherscan.io → Verify
- **วิธีที่ 2 (บนเว็บ):** หน้า contract บน Sepolia Etherscan → **Contract → Verify and Publish**
  - Compiler type: Solidity (Single file)
  - Compiler: v0.8.24
  - License: MIT
  - Optimization: Yes, 200 runs
  - วางเนื้อหา `contracts/remix/PitWallNFT.sol` ทั้งไฟล์

## 2. เปิดเกม

```bash
cd webapp
npm install
npm run dev
```

เปิด `http://localhost:5173` เกมจะต่อ Sepolia เป็นค่าเริ่มต้น

## 3. เริ่มเล่น

1. หน้า Home กด **Connect wallet** แล้วอนุญาตใน MetaMask ถ้าอยู่ network อื่น เกมจะขอให้สลับเป็น Sepolia
2. กด **+** ข้างยอดเหรียญ → เลือกจำนวน → **Exchange** (1 เหรียญ = 0.00001 ETH) นักแข่ง 1 คน + ชิ้นส่วน 4 ชิ้นใช้ประมาณ 700–800 เหรียญ
3. **Market** ซื้อนักแข่งและชิ้นส่วนด้วยเหรียญ ทุกครั้งต้องยืนยันใน MetaMask และรอ block ~12 วินาที
4. **Garage** จัดรถ เลือกยาง วางแผนพิท → **Race** → **Results**
5. ที่ Results กด **Post result** เพื่อส่งคะแนนขึ้น chain
6. ที่หน้า Home กด **Contract ↗** เพื่อเปิด contract บน Etherscan

> เปิด **Demo mode** ไว้ตอนนำเสนอ: ยาง ซ่อม และ practice ไม่ต้องส่งธุรกรรม (ประหยัดเวลาและ gas) ส่วนการแลกเหรียญ ซื้อ NFT ส่งผล และ claim ยังเป็นธุรกรรมจริง

## 4. Steward (ปิดฤดูกาล / ตรวจผล) ผ่าน Remix

ใช้กระเป๋าเดียวกับที่ deploy (owner) ใน Remix แท็บ Deploy & Run → **At Address** ใส่ address ของ contract แล้วเรียก:

| ฟังก์ชัน | ทำอะไร |
|---|---|
| `seasonInfo(address)` / `topThree(season)` | ดูกองรางวัลและอันดับ (อ่านอย่างเดียว ไม่เสีย gas) |
| `voidRace(player, round)` | ยกเลิกผลเรซที่ Verify race ไม่ผ่าน |
| `endSeason()` | ปิดฤดูกาล top 3 กด **Claim** ที่หน้า Results ได้ |
| `sponsor()` + VALUE | เติมกองรางวัล |
| `withdraw()` | owner ถอนส่วน 70% ของ ETH ที่แลกเหรียญ (แตะกองรางวัลไม่ได้) |

## ทดสอบ

```bash
cd contracts && npm install && npm test            # contract 12 ข้อ
```

```bash
cd contracts && npx hardhat run scripts/gas-report.js   # gas ที่แต่ละฟังก์ชันใช้
```

```bash
cd webapp && npm test                                # simulator + error handling 15 ข้อ
```

## ความปลอดภัย

ดู [SECURITY.md](SECURITY.md) มีการวิเคราะห์ช่องโหว่ของ contract นี้พร้อมบรรทัดโค้ดที่ป้องกัน และเปรียบเทียบ L1 กับ L2 ด้วยค่า gas ที่วัดจริง

## ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|---|---|
| Remix deploy ไม่ผ่าน "contract code size exceeds 24576 bytes" | ยังไม่ได้เปิด optimization (ขั้นที่ 1 ข้อ 2) |
| "No contract address yet" | ยังไม่ได้ใส่ address ใน `webapp/src/chain/sepolia-deployment.json` |
| "Not enough Sepolia ETH to pay for this and its gas fee" | ขอ ETH เพิ่มจาก Sepolia faucet |
| "You cancelled the transaction in MetaMask" | กด Reject ใน MetaMask ไป ไม่มีอะไรถูกส่ง กดใหม่ได้ |
| ธุรกรรมค้างนาน | Sepolia ช้าบางช่วง รอสักครู่ หรือดูสถานะบน Etherscan |

## รันบน chain ในเครื่องแทน (ไม่บังคับ)

```bash
cd webapp && VITE_CHAIN=local npm run dev
```

ต้องเปิด `npm run chain` และ `npm run deploy:local` ในโฟลเดอร์ `contracts` ก่อน (ดูรายละเอียดใน branch `local-hardhat`)

## การใช้ AI

โปรเจกต์นี้ใช้ Claude (Anthropic) ช่วยพัฒนา:
- เขียนตัวจำลองเรซ และการคิดค่าความเร็วจากทุกส่วนมารวมกัน
- วิเคราะห์ความปลอดภัย
- จัดทำเอกสาร

สมาชิกตรวจ ทดสอบ และอธิบายโค้ดทุกส่วนที่ส่งได้

## โครงสร้าง

| โฟลเดอร์ / ไฟล์ | มีอะไร |
|---|---|
| `contracts/contracts/PitWallNFT.sol` | Smart contract ต้นฉบับ |
| `contracts/remix/PitWallNFT.sol` | ไฟล์เดียวสำหรับ deploy บน Remix และ verify บน Etherscan |
| `contracts/test/` | เทสต์ Hardhat |
| `contracts/scripts/` | deploy (local), steward (local), gas-report, build-metadata |
| `webapp/` | เกม: Vite + React + TypeScript, ฉากแข่งวาดด้วย Canvas |
| `webapp/src/chain/` | เชื่อม MetaMask และ contract ด้วย Ethers.js, ข้อความ error ของธุรกรรม |
| `OVERVIEW.md` | สรุประบบเกม และ chain / NFT ทุกจุด |
| `SECURITY.md` | วิเคราะห์ความปลอดภัย + L1 กับ L2 |
| `SLIDES_PLAN.md` | แผนสไลด์นำเสนอ |
