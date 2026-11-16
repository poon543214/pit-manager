# Pit Manager: Blockchain, NFT และระบบเกม

สรุปทุกส่วนที่เกมใช้ blockchain, flow ของ NFT และ chain, และระบบเกมทั้งหมด (ตรงกับโค้ดเวอร์ชันปัจจุบัน)

---

## 1. ภาพรวม

- **เกม:** เกมบริหารทีม F1 แบบ pixel art จัดรถให้เข้ากับสนาม เลือกยางและแผนพิท แล้วดูเรซ 20 รอบ 10 คัน
- **Blockchain:** **Hardhat local chain** ในเครื่อง (chainId `31337` / `0x7a69`, `http://127.0.0.1:8545`) เป็นค่าเริ่มต้น เลือก Sepolia ได้ด้วย `VITE_CHAIN=sepolia`
- **เงิน:** มีเหรียญ (coin) สกุลเดียว เก็บบน chain กดปุ่ม **+** ข้างยอดเหรียญเพื่อแลก ETH เป็นเหรียญ แล้วใช้เหรียญซื้อทุกอย่าง
- **Contract:** `PitWallNFT` (ERC-721 Enumerable) contract เดียว ทำทั้ง NFT, ร้านค้า และฤดูกาล play-to-earn
- **กระเป๋า:** MetaMask ผ่าน Ethers.js v6 (`BrowserProvider`)
- **หลักการ:** ความเป็นเจ้าของ, ค่าสถิติ, เงิน และคะแนนฤดูกาลอยู่บน chain ส่วนการจำลองเรซคำนวณในเบราว์เซอร์ แต่ตรวจซ้ำได้จาก seed

### Tech stack

| ชั้น | เทคโนโลยี |
|---|---|
| Frontend | Vite + React 18 + TypeScript, plain CSS |
| ฉากแข่ง | HTML Canvas 2D (pixel art) |
| เชื่อม chain | Ethers.js v6, MetaMask |
| Smart contract | Solidity 0.8.24, OpenZeppelin 5.0.2 (ERC721Enumerable) |
| เครื่องมือ contract | Hardhat 2.29 (compile, test 11 ข้อ), Remix (deploy) |
| Metadata | JSON + PNG สำหรับ IPFS (`build-metadata.js`) |
| ทดสอบเกม | Vitest 9 ข้อ (determinism, balance, verify) |

---

## 2. อะไรอยู่บน chain และอะไรอยู่ในเบราว์เซอร์

| ข้อมูล | อยู่ที่ | หมายเหตุ |
|---|---|---|
| ความเป็นเจ้าของนักแข่งและชิ้นส่วน | **Chain** (ERC-721) | โอน/ขายได้เหมือน NFT ทั่วไป |
| ค่าสถิติ (pace, consistency, wet / speed, corner, brake) | **Chain** | เกมใช้ค่าจาก chain ทับค่าใน JSON |
| ราคา NFT | **Chain** | `priceOf(key)` เป็น wei |
| starter pack รับแล้วหรือยัง | **Chain** | `starterClaimed` |
| ยอดเหรียญ (coins) | **Chain** | `coins(address)` แลกจาก ETH ด้วย `buyCoins()` |
| กองรางวัล, คะแนนฤดูกาล, เงินรอเคลม | **Chain** | ETH (local chain หรือ Sepolia) |
| hash ของบันทึกเรซแต่ละเรซ | **Chain** | `recordAt[season][player][round]` |
| หน้าตา, ชื่อ, perk | JSON ในเกม + metadata IPFS | ผูกกับ token ด้วย `key` |
| เหรียญในเกม, ยาง, ความทนชิ้นส่วน, ความล้านักแข่ง | เบราว์เซอร์ (`localStorage`) | ใช้เป็น coin sink ในเกม |
| การจำลองเรซ | เบราว์เซอร์ | deterministic จาก seed ตรวจซ้ำได้ |

---

## 3. Smart contract: `PitWallNFT`

### Catalog (ตั้งใน constructor)

**นักแข่ง 5 แบบ** (ค่าสถิติรวม 20 แต้มเท่ากันทุกคน)

| key | ชื่อ | Pace | Consistency | Wet | ราคา (coin) | เทียบเป็น ETH | Perk |
|---|---|---|---|---|---|---|---|
| `charles` | Charles Lekirk | 9 | 5 | 6 | 300 | 0.0030 | launch-control |
| `kimi` | Kimino Tonelli | 8 | 5 | 7 | 280 | 0.0028 | tyre-whisperer |
| `max` | Max Verstappood | 7 | 8 | 5 | 260 | 0.0026 | pit-lane-pro |
| `oscar` | Oscar Pasta | 6 | 9 | 5 | 240 | 0.0024 | closer |
| `fernando` | Fernando Aloson | 5 | 6 | 9 | 220 | 0.0022 | rain-dancer |

**ชิ้นส่วน 12 แบบ** = 4 ช่อง × 3 สาย ราคาชิ้นละ 120 coin (0.0012 ETH)

| สาย (kind) | Speed | Corner | Brake | ตัวอย่าง key |
|---|---|---|---|---|
| 0 Speed | 3 | 1 | 1 | `engine_speed` |
| 1 Corner | 1 | 3 | 1 | `aero_corner` |
| 2 Brake | 1 | 1 | 3 | `gearbox_brake` |

ช่อง: `engine`, `aero`, `gearbox`, `suspension`

### ค่าคงที่สำคัญ

| ค่า | ค่า | ความหมาย |
|---|---|---|
| `COIN` | 0.00001 ETH | อัตราแลก 1 เหรียญ |
| `STARTER_COINS` | 200 | เหรียญที่ได้พร้อม starter pack |
| `POOL_BPS` | 3000 | 30% ของ ETH ที่แลกเป็นเหรียญเข้ากองรางวัล |
| `SHARES` | 5000 / 3000 / 2000 | top 3 ได้ 50 / 30 / 20% |
| `MAX_POINTS` | 25 | แต้มสูงสุดต่อเรซ (ชนะ) |
| `RACES_PER_SEASON` | 6 | ส่งผลได้สูงสุด 6 เรซต่อฤดูกาล |

### ฟังก์ชันทั้งหมด

| ฟังก์ชัน | ใครเรียก | จ่ายเงิน | ทำอะไร |
|---|---|---|---|
| `claimStarter(driverKey, kind)` | ผู้เล่น | ฟรี (gas) | รับนักแข่ง 1 + ชิ้นส่วน 4 ช่องสายเดียวกัน ครั้งเดียวต่อกระเป๋า |
| `buyCoins()` | ผู้เล่น | ETH (จำนวนเต็มเหรียญ) | แลก ETH เป็นเหรียญ แบ่ง 30% เข้ากอง 70% ให้ owner |
| `spendCoins(amount, item)` | ผู้เล่น | เหรียญ | ใช้เหรียญซื้อยาง ซ่อม practice (เหรียญถูกเผา) |
| `buyDriver(key)` | ผู้เล่น | เหรียญ | mint นักแข่ง ห้ามซื้อซ้ำชนิดที่มีอยู่ |
| `buyPart(key)` | ผู้เล่น | เหรียญ | mint ชิ้นส่วน ห้ามซื้อซ้ำ |
| `sponsor()` | ใครก็ได้ | ใส่เท่าไรก็ได้ | เติมกองรางวัล |
| `submitRace(round, points, record)` | ผู้เล่น | ฟรี (gas) | ส่งผลเรซ: แต้ม + hash บันทึกเรซ |
| `voidRace(player, round)` | owner (steward) | - | ยกเลิกแต้มเรซที่ตรวจไม่ผ่าน |
| `endSeason()` | owner (steward) | - | ปิดฤดูกาล แจกสิทธิ์เคลมให้ top 3 |
| `claim()` | ผู้ชนะ | - | ถอนรางวัลเป็น ETH เข้ากระเป๋า |
| `withdraw()` | owner | - | ถอนเฉพาะส่วน 70% ของ ETH ที่แลก (`ownerFunds`) |
| `setBaseURI(uri)` | owner | - | ตั้ง `ipfs://<CID>/` ให้ metadata |
| `inventoryOf(address)` | เกม (อ่าน) | ฟรี | token ทั้งหมดของกระเป๋าพร้อมค่าสถิติในคำสั่งเดียว |
| `tokenInfo(id)` | อ่าน | ฟรี | token นี้คืออะไร ค่าสถิติเท่าไร |
| `priceOf(key)` | อ่าน | ฟรี | ราคาเป็นเหรียญ |
| `coins(address)` | เกม (อ่าน) | ฟรี | ยอดเหรียญของกระเป๋า |
| `seasonInfo(address)` | เกม (อ่าน) | ฟรี | ฤดูกาล, กอง, แต้มของฉัน, รอบล่าสุด, เงินรอเคลม, top 3 |
| `topThree(season)` | อ่าน | ฟรี | 3 อันดับแรกของฤดูกาล |
| `tokenURI(id)` | อ่าน | ฟรี | `baseURI + key + ".json"` |

### กฎที่ contract บังคับ (กันโกง)

- รับ starter pack ได้ครั้งเดียวต่อกระเป๋า
- ถือ NFT ชนิดเดียวกันซ้ำไม่ได้ (เช็กผ่าน mapping `held` ซึ่งอัปเดตทุกครั้งที่ mint/โอน)
- ซื้อ NFT ต้องมี **เหรียญพอ** และแลกเหรียญต้องส่ง ETH เป็นจำนวนเต็มเหรียญ (เหรียญแลกกลับเป็น ETH ไม่ได้)
- ส่งผลเรซได้ต้อง **ถือ NFT นักแข่ง** อย่างน้อย 1 ตัว
- แต้มต่อเรซ **ไม่เกิน 25**
- เลข round ต้อง **เพิ่มขึ้นเสมอ** ในฤดูกาลเดียวกัน (ส่งซ้ำไม่ได้)
- **ไม่เกิน 6 เรซต่อฤดูกาล** เรซที่โดน void ยังนับโควตา
- owner ถอนได้แค่ `ownerFunds` แตะกองรางวัลและเงินรอเคลมของผู้เล่นไม่ได้

### Events

| Event | เกิดเมื่อ |
|---|---|
| `Transfer` | mint หรือโอน NFT (มาตรฐาน ERC-721) |
| `StarterClaimed` | รับ starter pack |
| `RaceSubmitted` | ส่งผลเรซ |
| `RaceVoided` | steward ยกเลิกผล |
| `SeasonEnded` | ปิดฤดูกาล พร้อม top 3 และเงินรางวัล |
| `Claimed` | ผู้ชนะถอนเงิน |

---

## 4. Flow ฝั่ง chain

### 4.1 ต่อกระเป๋า

```
Home → กด Connect wallet → MetaMask ขออนุญาต → เพิ่ม/สลับเป็น Hardhat Local ให้อัตโนมัติ (ensureNetwork)
     → อ่านพร้อมกัน: inventoryOf + starterClaimed + coins + ETH balance + seasonInfo
     → แสดง address, coins, ETH มุมขวาบน → เปิดหน้าอื่นได้
```

- ยังไม่ต่อกระเป๋า: เปิดได้แค่ Home ถ้ากดไปหน้าอื่นจะขึ้น popup ให้ connect ก่อน (`WalletGate`)
- เปิดเว็บครั้งถัดไปจะต่ออัตโนมัติแบบไม่มี popup (`eth_accounts`)
- สลับบัญชีหรือ disconnect ใน MetaMask แล้วเกมกลับไป Home และล้างข้อมูล NFT
- ถ้า contract ไม่มีระบบฤดูกาล (deploy เก่า) NFT ยังโหลดได้ และ Results ใช้ตารางฤดูกาลในเครื่องแทน

### 4.2 ได้ NFT

| ขั้น | ผู้เล่นทำ | บน chain |
|---|---|---|
| 1 | เลือกนักแข่ง + สายชิ้นส่วนใน StarterPack | `claimStarter` mint 5 token + 200 เหรียญ |
| 2 | (local) กด + → **+10 test ETH** | `hardhat_setBalance` ที่ node ไม่ต้อง import บัญชี |
| 3 | กด + → เลือกจำนวนเหรียญ → Exchange | `buyCoins()` จ่าย ETH: 30% → `seasonPool`, 70% → `ownerFunds` |
| 4 | ซื้อนักแข่ง/ชิ้นส่วนใน Market ด้วยเหรียญ | `buyDriver` / `buyPart` หักเหรียญ |
| 5 | ซื้อยาง / ซ่อม / practice (นอก demo mode) | `spendCoins` หักเหรียญ |
| 6 | เกมอ่านกระเป๋าใหม่ | `inventoryOf` + `coins` → Garage และยอดมุมขวาบนอัปเดต |

### 4.3 แข่งและซีลเซ็ต (commit–reveal)

```
Garage: จัดนักแข่ง + ชิ้นส่วน + ยาง + แผนพิท
   → ซีล: commitHash = keccak256(abi.encode(round, driverId, engine, aero,
                                 gearbox, suspension, tire, stopLaps[], stopTires[], salt))
   → reveal: สุ่ม seed ครั้งเดียว เก็บคู่กับ commit
   → Race: จำลองจาก seed (+ คำสั่งพิทระหว่างแข่งถูกบันทึก)
   → Results: ได้อันดับ + แต้ม F1
```

- hash ซีลใช้รูปแบบเดียวกับที่ Solidity คำนวณ (`abi.encode` + `keccak256`) ใช้ใน contract ได้ทันที
- seed สุ่มหลังซีลเซ็ตแล้ว จึงเปลี่ยนเซ็ตตามสภาพอากาศไม่ได้

### 4.4 Play to earn (ฤดูกาลบน chain)

```
แลก ETH เป็นเหรียญ (30%) / sponsor  ──►  seasonPool (ETH)
แข่งเสร็จ ──► Results: "Post R5 result (+18 pts)" ──► submitRace(round, points, recordHash)
                                                      │
steward ตรวจ (Verify race) ──► voidRace ถ้าไม่ผ่าน ◄────┘
steward ──► endSeason() ──► claimable[top1..3] = 50 / 30 / 20 % ของกอง
ผู้ชนะ ──► Results: "Claim 0.00045 ETH" ──► claim() ──► ETH เข้ากระเป๋า
```

| ขั้น | ใคร | ที่ไหน | ฟังก์ชัน |
|---|---|---|---|
| เติมกอง | คนแลกเหรียญ (อัตโนมัติ 30%) / sponsor | ปุ่ม + / steward | `buyCoins` / `sponsor` |
| ส่งผล | ผู้เล่น | Results → ปุ่ม Post | `submitRace` |
| ดูตาราง | ทุกคน | Results → แผง "On-chain season" | `seasonInfo` |
| ตรวจ | steward | Results → Verify race + `npm run steward` | `voidRace` |
| ปิดฤดูกาล | steward | `STEWARD=end npm run steward` | `endSeason` |
| รับเงิน | top 3 | Results → ปุ่ม Claim | `claim` |

- **recordHash** = `keccak256(abi.encode(commitHash, seed, callLaps[], callTires[], position, points))` เป็นลายนิ้วมือของเรซทั้งเรซ
- ถ้าผู้เล่นไม่ถึง 3 คน ส่วนที่ไม่มีคนได้ยกไปฤดูกาลหน้า
- แต้มเท่ากัน: คนที่ส่งผลก่อนได้อันดับดีกว่า

### 4.5 Metadata (IPFS)

| ขั้น | คำสั่ง / ที่อยู่ |
|---|---|
| รูป 17 ไฟล์ (512px) | `contracts/nft-metadata/images/*.png` |
| อัปโหลดรูปขึ้น IPFS | ได้ `IMAGE_CID` |
| สร้าง JSON | `IMAGE_CID=... node scripts/build-metadata.js` → `nft-metadata/json/<key>.json` |
| อัปโหลด JSON | ได้ `JSON_CID` |
| ผูกกับ contract | `setBaseURI("ipfs://<JSON_CID>/")` |

---

## 5. ระบบเกม

### 5.1 Game loop

| หน้า | ทำอะไร |
|---|---|
| **Home** | ต่อกระเป๋า, ดู address / coins / ETH, Refresh NFTs, Disconnect, ปฏิทินสัปดาห์ |
| **Market** | ซื้อนักแข่ง / ชิ้นส่วน / ยางด้วยเหรียญ, รับ starter pack |
| **Garage** | ใส่ชิ้นส่วน 4 ช่อง, ดู Car fit, เลือกยางเริ่ม, วางแผนพิทสูงสุด 2 ครั้ง, ซ่อมชิ้นส่วน, ซีลเซ็ต |
| **Practice** | วิ่ง 3 รอบเทียบเซ็ต 20 coin/ครั้ง สูงสุด 3 ครั้งต่อนักแข่งต่อสนาม |
| **Race** | ดูเรซแบบ top-down, pit wall สั่งเข้าพิทระหว่างแข่ง, Skip ได้เฉพาะ demo mode |
| **Results** | อันดับ, เวลาต่อรอบ, "Why you finished P_", คำแนะนำหลังแข่ง, Verify race, ฤดูกาล (on-chain หรือในเครื่อง) |

### 5.2 การแข่ง

| ระบบ | รายละเอียด |
|---|---|
| ระยะ | 20 รอบ, 10 คัน (ผู้เล่น + AI 9 คัน) |
| ค่าเข้า | ฟรี |
| แต้ม | F1: 25-18-15-12-10-8-6-4-2-1 |
| พิท | สูงสุด 2 ครั้ง เปลี่ยน compound ได้ เสียเวลาราว 18 วินาที |
| Pit wall | ระหว่างแข่งสั่งเข้าพิทตอนจบรอบนี้พร้อมเลือกยาง คำสั่งนี้แทนพิทครั้งถัดไปที่วางไว้ |
| สภาพอากาศ | มีพยากรณ์ฝนล่วงหน้า ของจริงสุ่มจาก seed หลังซีลเซ็ต |
| ความล้า | ในเรซ: นักแข่งช้าลงช่วงท้าย (consistency สูงล้าน้อย); ข้ามเรซ: condition 0–100 ลดทุกเรซ ฟื้นเมื่อพักเรซ |
| AI | แต่ละคันมีสไตล์กลยุทธ์ของตัวเอง |
| Determinism | seed เดียวกัน + คำสั่งพิทเดียวกัน = ผลเหมือนเดิมทุกครั้ง (RNG แยกต่อคัน) |

### 5.3 สนาม (หมุนเวียนทีละรอบ)

| สนาม | เน้น | น้ำหนัก Speed / Corner / Brake | ยางสึก | โอกาสฝน |
|---|---|---|---|---|
| Straight GP | Speed | 0.6 / 0.2 / 0.2 | 0.75× | 20% |
| Twisty GP | Corner | 0.2 / 0.6 / 0.2 | 1.35× | 35% |
| Stop-and-Go GP | Brake | 0.2 / 0.2 / 0.6 | 1.05× | 25% |

### 5.4 ยาง

| ยาง | Grip | สึกต่อรอบ | อายุ | โทษตอนฝน | ราคาต่อชุด |
|---|---|---|---|---|---|
| Soft | สูงสุด | เร็ว | สั้น | ไม่มี | 30 coin |
| Medium | กลาง | กลาง | กลาง | เล็กน้อย | 25 coin |
| Hard | ต่ำ | ช้า | ยาว | มาก | 20 coin |

- ยางเป็นของใช้แล้วหมด: เริ่มเรซใช้ 1 ชุด และพิทครั้งละ 1 ชุด เริ่มเกมมี 4 ชุด

### 5.5 ชิ้นส่วนและนักแข่ง

- **Car fit:** ค่าชิ้นส่วนที่ตรงกับน้ำหนักของสนามทำให้รถเร็วขึ้น
- **Perk:** นักแข่งและชิ้นส่วนมี perk ที่ทำงานเฉพาะสถานการณ์ (start, finish, rain, tires, pit, steady, dry)
- **ความทน:** ชิ้นส่วนที่ใส่อยู่เสีย 12% ต่อเรซ (ฝนเพิ่ม 4%) ประสิทธิภาพลดลงจนกว่าจะซ่อม
- **ค่าซ่อม:** 50% ของราคาชิ้นส่วนต่อ 100% ที่ซ่อมคืน
- **Balance:** ไม่มีนักแข่ง ชิ้นส่วน หรือแผนยางที่ชนะทุกสนาม (Vitest ตรวจ)

### 5.6 เศรษฐกิจในเกม (coin)

| รายการ | ค่า |
|---|---|
| เหรียญเริ่มต้น (ต่อกระเป๋าแล้ว) | 200 coin จาก starter pack ที่เหลือแลกจาก ETH ด้วยปุ่ม + |
| อัตราแลก | 1 coin = 0.00001 ETH (1,000 coin = 0.01 ETH) แลกกลับไม่ได้ |
| ยาง | 20–30 coin ต่อชุด |
| ซ่อม | ตามความเสียหาย |
| Practice | 20 coin ต่อครั้ง |
| ฤดูกาลในเครื่อง (ไม่ได้ต่อ chain) | 6 เรซ, กอง 1,000 + 30% ของ coin ที่ใช้, top 3 ได้ 50/30/20% + ถ้วยรางวัล |

### 5.7 ปฏิทิน

| วัน | เปิด |
|---|---|
| อาทิตย์ / พฤหัส | Market |
| จันทร์ / ศุกร์ | Practice |
| อังคาร / เสาร์ | Race |
| พุธ | พัก |

- **Demo mode** (เปิดเป็นค่าเริ่มต้น): เปิดทุกหน้าได้ทุกวัน ไม่เสีย coin และกด Skip ระหว่างแข่งได้

---

## 6. ความโปร่งใสและการตรวจสอบ

| กลไก | ทำอะไร |
|---|---|
| Commit hash (keccak256) | ล็อกเซ็ตก่อนรู้ seed และสภาพอากาศ |
| Seed สุ่มครั้งเดียวตอน reveal | reload แล้วได้เรซเดิม |
| Verify race | คำนวณ hash, แผน + คำสั่งพิท, สภาพอากาศ และเรซทั้งเรซซ้ำ แล้วเทียบผล |
| recordHash บน chain | ผลที่ส่งผูกกับบันทึกเรซตัวเต็ม แก้ทีหลังไม่ได้ |
| Steward | void ผลที่ตรวจไม่ผ่านก่อนปิดฤดูกาล |
| Hardhat 11 ข้อ / Vitest 9 ข้อ | ตรวจ contract และ simulator อัตโนมัติ |

---

## 7. สถาปัตยกรรมโค้ด

| ส่วน | ไฟล์ | หน้าที่ |
|---|---|---|
| Contract | `contracts/contracts/PitWallNFT.sol` | NFT + ร้าน + ฤดูกาล |
| Contract tests | `contracts/test/PitWallNFT.test.js` | 11 เทสต์ |
| Deploy / metadata | `contracts/scripts/deploy.js`, `build-metadata.js` | |
| ABI | `webapp/src/chain/abi.ts` | ฟังก์ชันที่เกมเรียก |
| Config | `webapp/src/chain/config.ts` | address contract, chain, ค่า COIN |
| Wallet | `webapp/src/chain/wallet.ts` | connect, reconnect, สลับ network |
| NFT | `webapp/src/chain/chainInventory.ts` | อ่านกระเป๋า, ซื้อ, starter |
| Season | `webapp/src/chain/season.ts` | อ่านฤดูกาล, ส่งผล, เคลม |
| Service | `webapp/src/services/gameService.ts` | interface เดียวที่หน้าเว็บเรียก |
| Simulator | `webapp/src/sim/*` | จำลองเรซ, อธิบายผล, verify |
| Seal | `webapp/src/shared/seal.ts` | commit hash |

- หน้าเว็บเรียกแค่ `GameService` ไม่แตะ chain ตรง ๆ จึงเปลี่ยนชั้นข้อมูลได้โดยไม่ต้องแก้หน้าเว็บหรือ simulator

---

## 8. ข้อจำกัดที่ควรรู้

- **Optimistic:** เรซคำนวณในเบราว์เซอร์ คะแนนที่ส่งถือว่าถูกจนกว่า steward จะตรวจ และ steward ต้องได้บันทึกเรซเต็มจากผู้เล่น
- **Steward รวมศูนย์:** owner เป็นคนปิดฤดูกาลและ void ผล ต้องเชื่อใจ owner
- **Sybil:** สร้างหลายกระเป๋าเพื่อรับ starter pack ฟรีได้
- **แต้มเสมอ:** ใครส่งก่อนชนะ
- **ที่มาของรางวัล:** คู่แข่งเป็น AI เงินรางวัลจึงมาจาก ETH ที่ผู้เล่นแลกเป็นเหรียญและ sponsor ไม่ได้มาจากผู้เล่นที่แพ้
- **ข้อมูลนอก chain:** coin, ยาง, ความทน และความล้าอยู่ใน `localStorage` ของเบราว์เซอร์
- **Gas:** `endSeason` วนลูปผู้เล่นทุกคน ถ้าคนเยอะมาก gas สูง
- **Local chain:** ETH บน Hardhat node ไม่มีมูลค่าจริง และหายเมื่อปิด node (ต้อง deploy ใหม่)
