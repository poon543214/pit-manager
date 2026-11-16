# Pit Manager

เกมบริหารทีม F1 แบบ pixel art บน blockchain นักแข่งและชิ้นส่วนรถเป็น NFT (ERC-721) เหรียญในเกมเก็บบน chain และผู้เล่น 3 อันดับแรกของฤดูกาลรับรางวัลเป็น ETH

> **Branch นี้ (`main`)** รันบน **Hardhat local chain** ในเครื่อง ไม่ต้องใช้ testnet และไม่ต้องหา ETH
> ถ้าต้องการเวอร์ชันที่ต่อ Sepolia ดู branch [`deployed`](https://github.com/poon543214/pit-manager/tree/deployed)

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
4. ไปหน้า **Market** ซื้อนักแข่งและชิ้นส่วนด้วยเหรียญ (ชิ้นส่วนมี 5 สาย: Speed, Corner, Brake, Endurance, Rain)
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
| `BLOCKCHAIN_OVERVIEW.md` | สรุป flow ของ chain, NFT และระบบเกมทั้งหมด |
