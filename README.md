# Pit Manager

เกมบริหารทีม F1 แบบ pixel art บน blockchain นักแข่งและชิ้นส่วนรถเป็น NFT (ERC-721) เหรียญในเกมเก็บบน chain และผู้เล่น 3 อันดับแรกของฤดูกาลรับรางวัลเป็น ETH

> **Branch นี้ (`local-hardhat`)** รันบน **Hardhat local chain** ในเครื่อง ไม่ต้องใช้ testnet และไม่ต้องหา ETH (ใช้ตอนพัฒนา)
> เวอร์ชันส่งงานที่ deploy บน Sepolia ผ่าน Remix อยู่ที่ branch [`sepolia`](https://github.com/poon543214/pit-manager/tree/sepolia)

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

> branch นี้ตั้งค่าไว้สำหรับ local เท่านั้น ถ้าจะใช้ Sepolia ให้สลับไป branch `sepolia` (ค่า Sepolia ใน `config.ts` ของ branch นี้ยังชี้ไป contract รุ่นเก่า)

## สิ่งที่ต้องมี

- [Node.js](https://nodejs.org) 18 ขึ้นไป
- เบราว์เซอร์ที่ติดตั้ง [MetaMask](https://metamask.io)

## วิธีรัน

เปิด terminal 3 หน้าต่าง ทำตามลำดับ

**1. เปิด chain local** (ค้างไว้ตลอดที่เล่น)

```bash
cd contracts
npm install
npm run chain
```

ได้ node ที่ `http://127.0.0.1:8545` (chain id `31337`)

**2. Deploy contract** (ทำครั้งเดียวต่อการเปิด chain 1 ครั้ง)

```bash
cd contracts
npm run deploy:local
```

คำสั่งนี้ deploy `PitWallNFT` แล้วใส่ 1 ETH เข้ากองรางวัลฤดูกาล และเขียน address ลง `webapp/src/chain/local-deployment.json` ให้เกมอ่านเอง ไม่ต้องแก้โค้ด

**3. เปิดเกม**

```bash
cd webapp
npm install
npm run dev
```

เปิด `http://localhost:5173`

## เริ่มเล่น

1. หน้า Home กด **Connect wallet** แล้วอนุญาตใน MetaMask จะมีขั้นให้กด **เพิ่มและสลับไป network "Hardhat Local"** ด้วย
2. กด **+** ข้างยอดเหรียญ แล้วกด **+10 test ETH** เพื่อโอน ETH ทดสอบจาก node เข้าบัญชี MetaMask ของคุณ ไม่ต้อง import private key (ยอด ETH แสดงเฉพาะในหน้าต่างเติมเหรียญนี้)
3. แลกเหรียญ: กด **+** → เลือกจำนวน → **Exchange** (1 เหรียญ = 0.00001 ETH) นักแข่ง 1 คน + ชิ้นส่วน 4 ชิ้นใช้ประมาณ 700–800 เหรียญ
4. ไปหน้า **Market** ซื้อนักแข่งและชิ้นส่วนด้วยเหรียญ (ชิ้นส่วนมี 3 type: Speed, Corner, Brake และบาง type มีเวอร์ชัน Endurance หรือ Rain)
5. **Garage** จัดรถ เลือกยาง วางแผนพิท → **Race** → **Results**
6. ที่ Results กด **Post result** เพื่อส่งคะแนนขึ้น chain

## Steward (ปิดฤดูกาล / ตรวจผล)

รันในโฟลเดอร์ `contracts` ขณะที่ chain ยังเปิดอยู่ (เซ็นด้วยบัญชี deployer ของ Hardhat)

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run steward` | ดูฤดูกาล กองรางวัล และ top 3 |
| `STEWARD=end npm run steward` | ปิดฤดูกาล top 3 กด **Claim** ที่หน้า Results ได้ |
| `STEWARD=void PLAYER=0x… ROUND=3 npm run steward` | ยกเลิกผลเรซที่ตรวจไม่ผ่าน |
| `STEWARD=sponsor ETH=0.5 npm run steward` | เติมกองรางวัล |

## ทดสอบ

```bash
cd contracts && npm test     # contract 12 ข้อ
```

```bash
cd webapp && npm test        # simulator 9 ข้อ
```

## ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|---|---|
| ปิด chain แล้วเปิดใหม่ เกมหา NFT ไม่เจอ | chain เริ่มจากศูนย์ทุกครั้ง ให้รัน `npm run deploy:local` ใหม่ |
| MetaMask ขึ้น `nonce too high` หรือธุรกรรมค้าง | MetaMask → Settings → Advanced → **Clear activity tab data** |
| กด +10 test ETH แล้วขึ้นว่า chain ไม่ทำงาน | ยังไม่ได้รัน `npm run chain` หรือปิดไปแล้ว |
| "The contract at CONTRACT_ADDRESS doesn't match this game" | ยังไม่ได้ deploy ตามขั้นที่ 2 |

## ใช้ Sepolia แทน (ไม่บังคับ)

Deploy `contracts/contracts/PitWallNFT.sol` บน Sepolia (Remix ใช้ EVM **cancun**) แล้วใส่ address ในรายการ `sepolia` ของ `webapp/src/chain/config.ts` จากนั้นรัน

```bash
cd webapp && VITE_CHAIN=sepolia npm run dev
```

## โครงสร้าง

| โฟลเดอร์ | มีอะไร |
|---|---|
| `contracts/` | Smart contract `PitWallNFT.sol`, เทสต์ Hardhat, สคริปต์ deploy / steward / metadata ([รายละเอียด](contracts/README.md)) |
| `webapp/` | เกม: Vite + React + TypeScript, ฉากแข่งวาดด้วย Canvas |
| `webapp/src/chain/` | เชื่อม MetaMask และ contract ด้วย Ethers.js |
| `OVERVIEW.md` | สรุประบบเกมทั้งหมด และ chain / NFT ทุกจุด |
