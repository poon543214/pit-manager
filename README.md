# Pit Manager (Sepolia)

เกมบริหารทีม F1 แบบ pixel art บน blockchain นักแข่งและชิ้นส่วนรถเป็น NFT (ERC-721) ซื้อด้วย ETH และผู้เล่น 3 อันดับแรกของฤดูกาลรับรางวัลเป็น ETH

> **Branch นี้ (`deployed`)** ต่อกับ contract ที่ deploy แล้วบน **Sepolia testnet** และซื้อ NFT ด้วย Sepolia ETH ตรง
> ถ้าต้องการเวอร์ชันที่รันบน chain ในเครื่อง ไม่ต้องหา ETH และใช้ระบบเหรียญ ดู branch [`main`](https://github.com/poon543214/pit-manager/tree/main)

## สิ่งที่ต้องมี

- [Node.js](https://nodejs.org) 18 ขึ้นไป
- เบราว์เซอร์ที่ติดตั้ง [MetaMask](https://metamask.io)
- Sepolia ETH ในกระเป๋า ขอฟรีได้จาก Sepolia faucet (ราคา NFT: นักแข่ง 0.0022–0.003 ETH, ชิ้นส่วน 0.0012 ETH และต้องมีเผื่อค่า gas)

## วิธีรัน (ใช้ contract ที่ deploy แล้ว)

```bash
cd webapp
npm install
npm run dev
```

เปิด `http://localhost:5173` เกมต่อกับ contract ที่ `0x6eef330BBBa104DfC73307F131f763ff93F2c20C` บน Sepolia ตามค่าใน `webapp/src/chain/config.ts`

## เริ่มเล่น

1. หน้า Home กด **Connect wallet** แล้วอนุญาตใน MetaMask ถ้าอยู่ network อื่น เกมจะขอให้สลับไป **Sepolia**
2. ไปหน้า **Market** แล้วกด **Claim starter pack** จะได้นักแข่ง 1 คนและชิ้นส่วน 4 ชิ้น (จ่ายแค่ค่า gas)
3. ซื้อนักแข่งหรือชิ้นส่วนเพิ่มใน Market ด้วย Sepolia ETH (ยืนยันใน MetaMask) ยอด ETH แสดงมุมขวาบน
4. **Garage** จัดรถ เลือกยาง วางแผนพิท → **Race** → **Results**

ยาง ซ่อม และ practice ใช้เหรียญในเบราว์เซอร์ (เริ่มต้น 1,000 เหรียญ) โดย demo mode ซึ่งเปิดเป็นค่าเริ่มต้นไม่หักเหรียญ

## ฤดูกาลบน chain (ต้อง deploy contract ใหม่)

contract ที่ `0x6eef…` เป็นรุ่นก่อนเพิ่มระบบฤดูกาล หน้า Results จึงแสดงตารางฤดูกาลในเครื่องแทน ถ้าต้องการให้ส่งคะแนนขึ้น chain และ claim รางวัลเป็น ETH ได้ ให้ทำดังนี้

1. เปิด `contracts/contracts/PitWallNFT.sol` ใน [Remix](https://remix.ethereum.org) → Compiler ตั้ง EVM version เป็น **cancun** (หรือใช้ 0.8.25 ขึ้นไป) → Compile
2. Deploy & Run → Environment **Injected Provider - MetaMask** (Sepolia) → Deploy `PitWallNFT`
3. ใส่ address ใหม่ใน `CONTRACT_ADDRESS` ของ `webapp/src/chain/config.ts`
4. ถ้าต้องการให้กองรางวัลมีเงินตั้งแต่ต้น เรียก `sponsor()` ใน Remix พร้อมใส่ Value เช่น 0.01 ETH

หลังจากนั้น:
- **ผู้เล่น:** แข่งเสร็จกด **Post result** ที่ Results เพื่อส่งคะแนน
- **Steward (บัญชีที่ deploy):** เรียก `voidRace(player, round)` เพื่อยกเลิกผลที่ตรวจไม่ผ่าน และ `endSeason()` เพื่อปิดฤดูกาลใน Remix
- **Top 3:** กด **Claim … ETH** ที่ Results

หรือ deploy จาก terminal (เก็บ private key ไว้ใน shell เท่านั้น ห้ามใส่ในไฟล์):

```bash
cd contracts
npm install
export SEPOLIA_RPC_URL=https://...
export PRIVATE_KEY=0x...
npm run deploy:sepolia
```

## ทดสอบ

```bash
cd contracts && npm install && npm test     # contract
```

```bash
cd webapp && npm test                       # simulator
```

## ปัญหาที่เจอบ่อย

| อาการ | วิธีแก้ |
|---|---|
| "MetaMask not found" | ติดตั้ง MetaMask แล้วรีโหลดหน้า |
| "Switch MetaMask to the Sepolia network" | เปิด MetaMask → เลือก network Sepolia (เปิด Show test networks ในการตั้งค่าก่อน) |
| ซื้อแล้วขึ้น insufficient funds | ETH ไม่พอ ขอเพิ่มจาก Sepolia faucet |
| Remix compile ขึ้น `mcopy` not found | ตั้ง EVM version เป็น cancun หรือใช้ compiler 0.8.25 ขึ้นไป |
| "The contract at CONTRACT_ADDRESS doesn't match this game" | address ใน `config.ts` ไม่ใช่ PitWallNFT หรือคนละ network |

## โครงสร้าง

| โฟลเดอร์ | มีอะไร |
|---|---|
| `contracts/` | Smart contract `PitWallNFT.sol`, เทสต์ Hardhat, สคริปต์ deploy / metadata ([รายละเอียด](contracts/README.md)) |
| `webapp/` | เกม: Vite + React + TypeScript, ฉากแข่งวาดด้วย Canvas |
| `webapp/src/chain/` | เชื่อม MetaMask และ contract ด้วย Ethers.js |
| `BLOCKCHAIN_OVERVIEW.md` | สรุป flow ของ chain, NFT และระบบเกม |
