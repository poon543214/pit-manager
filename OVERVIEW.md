# Pit Manager: ภาพรวมระบบทั้งหมด

เกมบริหารทีม F1 แบบ pixel art ที่ผู้เล่นซื้อนักแข่งและชิ้นส่วนรถ (เป็น NFT) จัดรถให้เข้ากับสนาม วางแผนยางและพิท แล้วดูเรซ 20 รอบ 10 คัน

- **ส่วนที่ 1** ระบบเกม: เล่นยังไง, การแข่ง, นักแข่ง, ชิ้นส่วน, ยาง, เศรษฐกิจ
- **ส่วนที่ 2** Blockchain และ NFT: อะไรอยู่บน chain, contract, flow, play to earn, ความปลอดภัย

---

# ส่วนที่ 1: ระบบเกม

## 1.1 Game loop

| หน้า | ทำอะไร |
|---|---|
| **Home** | ต่อกระเป๋า, ดูเหรียญ + ปุ่มเติมเหรียญ, ปฏิทินสัปดาห์, เปิด/ปิด demo mode |
| **Market** | ซื้อนักแข่ง, ชิ้นส่วน และยางด้วยเหรียญ |
| **Garage** | เลือกนักแข่ง, ใส่ชิ้นส่วน 4 ช่อง, ดูกราฟ Build 6 เหลี่ยม, เลือกยางเริ่ม, วางแผนพิท, ซ่อมชิ้นส่วน, ซีลเซ็ต |
| **Practice** | วิ่ง 3 รอบเทียบเซ็ต (20 เหรียญ/ครั้ง, 3 ครั้งต่อนักแข่งต่อสนาม) |
| **Race** | ดูเรซมุมบน กล้องตามรถเรา, pit wall สั่งเข้าพิทระหว่างแข่ง, Skip ได้เฉพาะ demo mode |
| **Results** | อันดับ, เวลาต่อรอบ, "Why you finished P_", คำแนะนำหลังเรซ, Verify race, ฤดูกาล + ส่งผล/เคลมรางวัล |

- **หลักการออกแบบ:** ก่อนแข่งเกมแค่ "อธิบาย" ว่าแต่ละตัวเลือกทำอะไร (ปุ่ม ?) ไม่บอกว่าควรเลือกอะไร คำแนะนำทั้งหมดอยู่หลังเรซ ให้เกมแข่งขันได้จริง
- **ปฏิทิน:** Market อา./พฤ., Practice จ./ศ., Race อ./ส., พุธพัก
- **Demo mode** (เปิดเป็นค่าเริ่มต้น): เปิดทุกหน้าทุกวัน ยาง/ซ่อม/practice ฟรี กด Skip เรซได้ (การซื้อ NFT ยังหักเหรียญจริง)

## 1.2 การแข่ง

| ระบบ | รายละเอียด |
|---|---|
| ระยะ | 20 รอบ, 10 คัน (ผู้เล่น + AI 9 คัน) |
| ค่าเข้า | ฟรี |
| แต้ม | แบบ F1: 25-18-15-12-10-8-6-4-2-1 |
| พิท | สูงสุด 2 ครั้ง เปลี่ยน compound ได้ เสียเวลาราว 18 วินาที |
| Pit wall | ระหว่างแข่งสั่งเข้าพิทตอนจบรอบนี้พร้อมเลือกยาง คำสั่งนี้แทนพิทครั้งถัดไปที่วางไว้ |
| สภาพอากาศ | ประกาศโอกาสฝนล่วงหน้า สภาพจริงสุ่มจาก seed หลังซีลเซ็ตแล้ว |
| ความแน่นอน | seed เดียวกัน + คำสั่งพิทเดียวกัน = ผลเหมือนเดิมทุกครั้ง (RNG แยกต่อคัน) |
| AI | แต่ละทีมมีสไตล์: aggressive (ชอบพิท/ยางนิ่ม), saver (พิทน้อย/ยางแข็ง), gambler (เดาฝนสวน), balanced |

**เวลาต่อรอบมาจากอะไร**

| ปัจจัย | ผลต่อเวลา |
|---|---|
| รถเข้ากับสนาม (Car fit) | รถที่ตรงสนามที่สุดเร็วกว่ารถไม่เข้า สูงสุด ~6 วิ/รอบ |
| Pace นักแข่ง | สูงสุด ~3 วิ/รอบ (ตอนฝน wet skill มีน้ำหนัก 70%) |
| ฝน | นักแข่ง wet ต่ำช้าลงสูงสุด 2.5 วิ/รอบ, Wet grip ของชิ้นส่วนช่วยลด |
| ยาง | ยางใหม่เร็วกว่า สึกทุกรอบ เลยอายุแล้ว "ตกหน้าผา" ช้าลงสูงสุด 6 วิ/รอบ |
| ความล้าในเรซ | ช้าลงช่วงท้าย สูงสุด 1.6 วิ/รอบ (consistency สูงล้าน้อย) |
| ความผิดพลาด | ครั้งละ 6 วิ เกิดบ่อยขึ้นเมื่อ consistency ต่ำ, สนามโค้ง/เบรกเยอะ, ฝน, ล้า |
| Perk | วิ/รอบ หรือตัวคูณ ตามสถานการณ์ (ดู 1.5) |

## 1.3 สนาม (หมุนเวียนทีละรอบ)

| สนาม | เน้น | น้ำหนัก SPD / CRN / BRK | ยางสึก | โอกาสฝน |
|---|---|---|---|---|
| Straight GP | Speed | 0.6 / 0.2 / 0.2 | 0.75× | 20% |
| Twisty GP | Corner | 0.2 / 0.6 / 0.2 | 1.35× (กินยางสุด) | 35% |
| Stop-and-Go GP | Brake | 0.2 / 0.2 / 0.6 | 1.05× | 25% |

- ฝนทำให้ค่า Speed มีค่าแค่ครึ่งเดียว ส่วนที่หายไปย้ายไป Corner และ Brake

## 1.4 นักแข่ง

ทุกคนมีค่ารวม 20 แต้ม (Pace + Consistency + Wet) จึงไม่มีใครดีที่สุดทุกสนาม ชื่อล้อนักแข่ง F1 จริง ชุดใช้สีทีมจริง

| นักแข่ง | Pace | Cons | Wet | ราคา | Perk | จุดเด่น |
|---|---|---|---|---|---|---|
| Charles Lekirk | 9 | 5 | 6 | 300 | Launch Control: รอบแรกเร็วขึ้น 4 วิ | เร็วสุด ออกตัวดี แต่พลาดบ่อย |
| Kimino Tonelli | 8 | 5 | 7 | 280 | Tyre Whisperer: ยางสึกช้าลง 6% | เร็ว ถนอมยาง |
| Lando Norrish | 8 | 6 | 6 | 260 | Undercut: รอบหลังพิทเร็วขึ้น 2 วิ + ยางใหม่ 0.15 วิ | เล่นกลยุทธ์พิทเร็ว |
| Max Verstappood | 7 | 8 | 5 | 260 | Pit Lane Pro: พิทเร็วขึ้น 2.5 วิ | นิ่ง พิทเร็ว |
| Lewis Hamiltoon | 7 | 6 | 7 | 270 | Late Braker: สนาม Brake เร็วขึ้น 0.25 วิ/รอบ | เจ้าสนามเบรก ฝนพอใช้ |
| George Rustle | 7 | 7 | 6 | 250 | Iron Man: ล้าน้อยลง 50%, เสีย condition น้อยลง 40% | ลงแข่งติดกันได้หลายเรซ |
| Oscar Pasta | 6 | 9 | 5 | 240 | Closer: 2 รอบสุดท้ายเร็วขึ้นรอบละ 2 วิ | นิ่งที่สุด จบแรง |
| Fernando Aloson | 5 | 6 | 9 | 220 | Rain Dancer: ฝนเร็วขึ้น + ฝนไม่ทำให้แกว่ง | ราชาฝน |

- **Condition (ความล้าข้ามเรซ):** แข่ง 1 เรซเสีย 18–36 แต้ม (consistency ต่ำเสียมาก) พักเรซได้คืน 25 แต้ม นักแข่งที่เหนื่อยช้าตั้งแต่ต้นเรซ การมีนักแข่งหลายคนหมุนเวียนจึงสำคัญ

## 1.5 ชิ้นส่วน

**4 ช่อง × 3 type** (Speed / Corner / Brake) และบาง type มีเวอร์ชันพิเศษ รวม 18 ชิ้น

| type | ค่า SPD/CRN/BRK | ราคา |
|---|---|---|
| Speed | 3 / 1 / 1 | 120 |
| Corner | 1 / 3 / 1 | 120 |
| Brake | 1 / 1 / 3 | 120 |

**เวอร์ชันพิเศษ** (ราคา 130) แลกค่าหลักบางส่วนกับ trait

| ชิ้นส่วน | ช่อง | type | เวอร์ชัน | ค่า | Trait | Perk |
|---|---|---|---|---|---|---|
| Endurance V6 | Engine | Speed | Endurance | 2/1/1 | Tire care 3, Reliability 2 | Long Life: ชิ้นส่วนสึกช้าลง 40% |
| Durable wing | Aero | Corner | Endurance | 1/2/1 | Tire care 3, Reliability 2 | Long Run: ยางอายุ 6 รอบขึ้นไปเร็วขึ้น 0.2 วิ |
| Kerb-proof | Suspension | Corner | Endurance | 1/2/1 | Tire care 3, Reliability 2 | Kerb Proof: ชิ้นส่วนสึกช้าลง 30% + แกว่งน้อยลง |
| Rain-map V6 | Engine | Corner | Rain | 1/2/1 | Wet grip 3, Reliability 1 | Spray Proof: ฝนเร็วขึ้น + ไม่แกว่ง |
| Rain wing | Aero | Corner | Rain | 1/2/1 | Wet grip 3, Reliability 1 | Rain Wing: ฝนเร็วขึ้น 0.2 วิ/รอบ |
| Smooth-shift box | Gearbox | Brake | Rain | 1/1/2 | Wet grip 3, Reliability 1 | Soft Shift: ฝนไม่ทำให้แกว่ง |

**Trait ทำอะไร**

| Trait | ผลต่อแต้ม |
|---|---|
| Tire care | ยางสึกช้าลง 5% (สูงสุด 40%) |
| Wet grip | เร็วขึ้น 0.12 วิ/รอบ เฉพาะตอนฝน |
| Reliability | พลาดและแกว่งน้อยลง 5% (สูงสุด 60%) และชิ้นส่วนสึกช้าลง 6% |

**ชิ้นส่วนปกติ: perk ประจำชิ้น**

| ช่อง | Speed | Corner | Brake |
|---|---|---|---|
| Engine | Sprint V6 · Overboost (รอบแรก −2 วิ) | Torque V6 · Smooth Torque (ฝน −0.15 วิ) | Safe-map V6 · Safe Map (แกว่งน้อยลง 30%) |
| Aero | Low-drag wing · Slipstream (แห้ง −0.15 วิ) | Downforce wing · Tyre Saver (ยางสึก −5%) | Airbrake wing · Stable Rear (หน้าผายางนุ่มลง 20%) |
| Gearbox | Long-ratio box · Push Mode (2 รอบท้าย −1.2 วิ) | Short-ratio box · Out-lap Launch (รอบหลังพิท −1.2 วิ) | Engine-brake box · Wet Brake (ฝน −0.12 วิ) |
| Suspension | Stiff-low · Fresh Rubber (ยางใหม่ −0.3 วิ) | Soft-flex · Compliant (ยางสึก −3%) | Dive-control · Quick Jack (พิท −1.5 วิ) |

- **ความทน:** ชิ้นส่วนที่ใส่อยู่เสีย 12% ต่อเรซ (+4% ตอนฝน) ลดได้ด้วย Reliability และ perk ชิ้นส่วนที่สึกให้ค่าน้อยลง ต่ำสุดเหลือครึ่งเดียว
- **ค่าซ่อม:** 50% ของราคาชิ้นส่วน ต่อความทน 100% ที่ซ่อมคืน

## 1.6 กราฟ Build 6 เหลี่ยม (Garage)

รวมนักแข่ง + ชิ้นส่วน + perk เป็นความสามารถในเรซ แต่ละแกน 0–10 คำนวณจากค่าเดียวกับที่ตัวจำลองเรซใช้

| แกน | ความหมาย | มาจาก |
|---|---|---|
| TOP | สปีดปลาย | ค่า Speed ของรถ + pace + perk วันแห้ง |
| LAUNCH | สปีดต้น: ออกตัว, รอบหลังพิท, ยางใหม่ | pace + perk ออกตัว / out-lap / ยางใหม่ |
| CRN | เข้าโค้ง | ค่า Corner + pace |
| BRK | เบรก | ค่า Brake + pace + perk สนามเบรก |
| LONG | สปีดระยะยาว: รักษาความเร็วทั้ง stint | consistency, Tire care, ความล้า, perk ยางเก่า/ช่วงท้าย |
| WET | ฝน | wet skill + Wet grip + perk ฝน |

## 1.7 ยาง

| ยาง | Grip ตอนใหม่ | สึกต่อรอบ | อายุก่อนตกหน้าผา (Straight / Twisty / Stop-and-Go) | ตอนฝน | ราคา |
|---|---|---|---|---|---|
| Soft | −1.8 วิ/รอบ | 0.30 วิ | ~4 / ~2 / ~3 รอบ | ดีที่สุด | 30 |
| Medium | −0.9 วิ/รอบ | 0.16 วิ | ~7 / ~4 / ~5 รอบ | ช้าลง 0.6 วิ | 25 |
| Hard | 0 | 0.07 วิ | ~13 / ~7 / ~9 รอบ | ช้าลง 1.6 วิ | 20 |

- ฝนทำให้ยางสึกช้าลง 25%
- ยางเป็นของใช้แล้วหมด: เริ่มเรซใช้ 1 ชุด, พิทครั้งละ 1 ชุด

## 1.8 กลยุทธ์ที่ผู้เล่นต้องคิด

| การตัดสินใจ | ทางเลือกที่แลกกัน |
|---|---|
| ชิ้นส่วน | ใส่ type ตรงสนาม (เร็วสุดวันแห้ง) vs เวอร์ชัน Endurance (สนามกินยาง, พิทน้อยลง) vs Rain (เดิมพันกับพยากรณ์ฝน) |
| นักแข่ง | pace สูงแต่พลาดบ่อย vs นิ่ง, ส่งคนเดิมลงซ้ำ (ล้า) vs หมุนเวียน |
| ยาง + พิท | 0, 1 หรือ 2 สต็อป, compound แต่ละช่วง, รอบที่เข้า |
| ระหว่างแข่ง | สั่งพิทเร็วกว่าแผน (เช่น ยางหมดก่อน) หรือเปลี่ยน compound |
| เศรษฐกิจ | ซื้อยาง/ซ่อมเมื่อไร, practice กี่ครั้ง |

- **สมดุล (มีเทสต์ตรวจ):** ไม่มีแผนยางไหนดีที่สุดทุกสนามและทุกสภาพอากาศ และชิ้นส่วนทั้ง 3 แบบ (ปกติ, Endurance, Rain) ต่างมีสนาม/สภาพอากาศที่ตัวเองชนะ

## 1.9 หลังเรซ (Results)

- **Why you finished P_:** แยกเวลาที่แพ้/ชนะผู้นำเป็นปัจจัย: รถ, นักแข่ง, ความล้า, กลยุทธ์ยาง, ความผิดพลาด, perk, ดวง ตัวเลขรวมกันได้เท่าช่องว่างจริง
- **คำแนะนำ:** มีเฉพาะหลังเรซ
- **Verify race:** คำนวณเรซซ้ำจาก seed และบันทึกพิท แล้วเทียบว่าผลตรงกัน

---

# ส่วนที่ 2: Blockchain และ NFT

## 2.1 ภาพรวม

| หัวข้อ | ค่า |
|---|---|
| Chain | **Sepolia testnet** (chainId 11155111) เป็นค่าเริ่มต้น deploy ผ่าน Remix และตรวจได้บน Etherscan / Hardhat local (chainId 31337) ใช้ตอนพัฒนาด้วย `VITE_CHAIN=local` (branch `local-hardhat`) |
| Contract | `PitWallNFT` ตัวเดียว (ERC-721 Enumerable, OpenZeppelin 5.0.2, Solidity 0.8.24) |
| กระเป๋า | MetaMask ผ่าน Ethers.js v6 |
| เงิน | เหรียญ (coin) สกุลเดียว เก็บบน chain แลกจาก ETH: 1 coin = 0.00001 ETH |
| Metadata | JSON + PNG 26 ไฟล์สำหรับ IPFS (`tokenURI = baseURI + key + ".json"`) |
| ทดสอบ | Hardhat 12 ข้อ (contract), Vitest 15 ข้อ (เกม + ข้อความ error ของธุรกรรม), gas report |

## 2.2 อะไรอยู่บน chain และอะไรอยู่ในเบราว์เซอร์

| ข้อมูล | อยู่ที่ |
|---|---|
| ความเป็นเจ้าของนักแข่ง/ชิ้นส่วน (NFT) | **Chain** |
| ค่า Pace/Cons/Wet และ SPD/CRN/BRK | **Chain** (เกมใช้ค่าจาก chain ทับ JSON) |
| ราคา (เหรียญ) | **Chain** |
| ยอดเหรียญ | **Chain** |
| กองรางวัล, คะแนนฤดูกาล, เงินรอเคลม, hash บันทึกเรซ | **Chain** |
| Perk, Trait (Tire care / Wet grip / Reliability), หน้าตา | JSON ในเกม + metadata (ผูกด้วย key) |
| ยางในสต็อก, ความทนชิ้นส่วน, condition นักแข่ง | เบราว์เซอร์ (`localStorage`) |
| การจำลองเรซ | เบราว์เซอร์ (deterministic ตรวจซ้ำได้) |

## 2.3 Catalog บน chain

- นักแข่ง 8 แบบ (ราคา 220–300 เหรียญ = 0.0022–0.003 ETH)
- ชิ้นส่วน 18 แบบ (120 หรือ 130 เหรียญ = 0.0012–0.0013 ETH)
- ซื้อได้ไม่จำกัดจำนวน token ต่อแบบ แต่กระเป๋าหนึ่งถือแบบเดียวกันซ้ำไม่ได้
- ไม่มี starter pack: กระเป๋าใหม่เริ่มที่ 0 ต้องแลกเหรียญก่อน

## 2.4 ฟังก์ชันของ contract

| ฟังก์ชัน | ใครเรียก | จ่าย | ทำอะไร |
|---|---|---|---|
| `buyCoins()` | ผู้เล่น | ETH (จำนวนเต็มเหรียญ) | แลก ETH เป็นเหรียญ: 30% → กองรางวัล, 70% → owner |
| `buyDriver(key)` / `buyPart(key)` | ผู้เล่น | เหรียญ | mint NFT ห้ามซื้อซ้ำแบบที่ถืออยู่ |
| `spendCoins(amount, item)` | ผู้เล่น | เหรียญ | ซื้อยาง/ซ่อม/practice (เหรียญถูกเผา) |
| `submitRace(round, points, record)` | ผู้เล่น | gas | ส่งแต้มเรซ + hash บันทึกเรซ |
| `claim()` | ผู้ชนะ | gas | ถอนรางวัลเป็น ETH |
| `sponsor()` | ใครก็ได้ | ETH | เติมกองรางวัล |
| `voidRace(player, round)` | owner (steward) | – | ยกเลิกแต้มเรซที่ตรวจไม่ผ่าน |
| `endSeason()` | owner (steward) | – | ปิดฤดูกาล แจกสิทธิ์เคลมให้ top 3 |
| `withdraw()` | owner | – | ถอนได้เฉพาะส่วน 70% (`ownerFunds`) |
| `setBaseURI(uri)` | owner | – | ตั้งที่อยู่ metadata บน IPFS |
| `inventoryOf(addr)` | เกม (อ่าน) | ฟรี | NFT ทั้งหมดของกระเป๋าพร้อมค่า ในคำสั่งเดียว |
| `coins(addr)`, `priceOf(key)`, `seasonInfo(addr)`, `topThree(s)`, `tokenInfo(id)`, `tokenURI(id)` | อ่าน | ฟรี | ยอดเหรียญ, ราคา, ข้อมูลฤดูกาล, อันดับ, ข้อมูล token, metadata |

**Events:** `Transfer`, `CoinsBought`, `CoinsSpent`, `RaceSubmitted`, `RaceVoided`, `SeasonEnded`, `Claimed`

## 2.5 Flow

**ต่อกระเป๋า**
- Home → Connect wallet → MetaMask ขออนุญาต → เพิ่ม/สลับ network Hardhat Local ให้อัตโนมัติ
- เกมอ่านพร้อมกัน: `inventoryOf` + `coins` + ยอด ETH + `seasonInfo`
- ยังไม่ต่อกระเป๋า: เปิดได้แค่ Home หน้าอื่นจะขึ้น popup ให้ต่อก่อน
- เปิดเว็บครั้งถัดไปต่อเองแบบไม่มี popup, สลับบัญชีใน MetaMask แล้วเกมโหลดใหม่ตาม

**ได้เหรียญและ NFT**

| ขั้น | ผู้เล่นทำ | บน chain |
|---|---|---|
| 1 | มี Sepolia ETH ในกระเป๋า (faucet) / บน local กด **+** → **+10 test ETH** | – |
| 2 | กด **+** → เลือกจำนวนเหรียญ → Exchange | `buyCoins()` |
| 3 | ซื้อนักแข่ง/ชิ้นส่วนใน Market | `buyDriver` / `buyPart` |
| 4 | ซื้อยาง/ซ่อม/practice (นอก demo) | `spendCoins` |
| 5 | เกมอ่านใหม่ | `inventoryOf` + `coins` → Garage และมุมขวาบนอัปเดต |

- ยอด ETH แสดงเฉพาะในหน้าต่างเติมเหรียญ มุมขวาบนมีแค่เหรียญและปุ่ม +

**ซีลเซ็ตและแข่ง (commit–reveal)**
- กดซีลใน Garage: `keccak256(abi.encode(round, driver, engine, aero, gearbox, suspension, tire, stopLaps[], stopTires[], salt))`
- Reveal: ตรวจว่าเซ็ตตรงกับ hash แล้วสุ่ม seed ครั้งเดียว จึงเปลี่ยนเซ็ตตามสภาพอากาศจริงไม่ได้
- คำสั่งพิทระหว่างแข่งถูกบันทึก รีโหลดแล้วได้เรซเดิม
- **ข้อจำกัด:** commit hash ของการซีลเก็บในเบราว์เซอร์ ยังไม่ได้ส่งขึ้น chain สิ่งที่ขึ้น chain คือ `recordHash` ตอน `submitRace` (ดู SECURITY.md ข้อ 7)

**Play to earn (ฤดูกาลบน chain)**

| ขั้น | ใคร | ที่ไหน | ฟังก์ชัน |
|---|---|---|---|
| เติมกอง | ทุกคนที่แลกเหรียญ (30% อัตโนมัติ) / sponsor | ปุ่ม + / steward | `buyCoins` / `sponsor` |
| ส่งผล | ผู้เล่น | Results → Post result | `submitRace` |
| ดูอันดับ | ทุกคน | Results → On-chain season | `seasonInfo` |
| ตรวจ | steward | Verify race + Remix (local: `npm run steward`) | `voidRace` |
| ปิดฤดูกาล | steward | Remix (local: `STEWARD=end npm run steward`) | `endSeason` |
| รับเงิน | top 3 (50 / 30 / 20%) | Results → Claim | `claim` |

- `recordHash = keccak256(commitHash, seed, callLaps[], callTires[], position, points)` เป็นลายนิ้วมือของเรซทั้งเรซ
- ผู้เล่นไม่ถึง 3 คน ส่วนที่ไม่มีคนได้ยกไปฤดูกาลหน้า แต้มเท่ากันคนส่งก่อนชนะ

## 2.6 กฎกันโกงที่ contract บังคับ

- ต้องถือ NFT นักแข่งถึงจะส่งผลได้
- แต้มต่อเรซไม่เกิน 25, ไม่เกิน 6 เรซต่อฤดูกาล (เรซที่โดน void ยังนับโควตา)
- เลข round ต้องเพิ่มขึ้นเสมอ ส่งซ้ำไม่ได้
- ซื้อ NFT ต้องมีเหรียญพอ แลกเหรียญต้องส่ง ETH เป็นจำนวนเต็มเหรียญ เหรียญแลกกลับเป็น ETH ไม่ได้
- owner ถอนได้แค่ 70% แตะกองรางวัลและเงินรอเคลมของผู้เล่นไม่ได้

## 2.7 Metadata (IPFS)

| ขั้น | ทำอะไร |
|---|---|
| รูป | `contracts/nft-metadata/images/*.png` 26 รูป (512px, pixel art เดียวกับในเกม) |
| สร้าง JSON | `IMAGE_CID=<CID> node scripts/build-metadata.js` (มี attribute ค่า, Version, Tire care, Wet grip, Reliability, Skill) |
| ผูกกับ contract | อัปโหลดโฟลเดอร์ json แล้วเรียก `setBaseURI("ipfs://<CID>/")` |

## 2.8 วิธีรัน

| ขั้น | Sepolia (ส่งงาน) | Local (พัฒนา) |
|---|---|---|
| 1 | Deploy `contracts/remix/PitWallNFT.sol` บน Remix (0.8.24, optimization 200) | `cd contracts && npm run chain` |
| 2 | ใส่ address ใน `webapp/src/chain/sepolia-deployment.json` + `sponsor()` 0.01 ETH | `cd contracts && npm run deploy:local` |
| 3 | `cd webapp && npm run dev` | `cd webapp && VITE_CHAIN=local npm run dev` |

- ความปลอดภัยและการเปรียบเทียบ L1/L2 อยู่ใน `SECURITY.md`

## 2.9 ข้อจำกัดและความเสี่ยง

| เรื่อง | รายละเอียด |
|---|---|
| Optimistic | เรซคำนวณในเบราว์เซอร์ แต้มที่ส่งถือว่าถูกจนกว่า steward จะตรวจ |
| Steward รวมศูนย์ | owner เป็นคนตรวจและปิดฤดูกาล ผู้เล่นต้องเชื่อใจ |
| Sybil | สร้างหลายกระเป๋าได้ถ้ายอมจ่าย ETH (ไม่มีของฟรีแล้ว) |
| ที่มาของรางวัล | คู่แข่งเป็น AI รางวัลจึงมาจาก ETH ที่ผู้เล่นแลกเหรียญ + sponsor กองโตได้ต่อเมื่อมีคนแลกเพิ่ม |
| ข้อมูลนอก chain | ยาง, ความทน, condition อยู่ใน `localStorage` |
| Gas | `endSeason` วนผู้เล่นทุกคน ถ้าคนเยอะมาก gas สูง |
| Testnet / local | ETH ไม่มีมูลค่าจริง, chain local หายเมื่อปิด node |

## 2.10 ไฟล์สำคัญ

| ส่วน | ไฟล์ |
|---|---|
| Contract | `contracts/contracts/PitWallNFT.sol` |
| เทสต์ contract | `contracts/test/PitWallNFT.test.js` |
| สคริปต์ | `contracts/scripts/deploy.js`, `steward.js`, `build-metadata.js` |
| เชื่อม chain | `webapp/src/chain/` (`config.ts`, `wallet.ts`, `chainInventory.ts`, `season.ts`, `abi.ts`) |
| Service (หน้าเว็บเรียกที่นี่ที่เดียว) | `webapp/src/services/gameService.ts` |
| ตัวจำลองเรซ | `webapp/src/sim/` |
| ข้อมูลเกม | `webapp/src/data/*.json` |
