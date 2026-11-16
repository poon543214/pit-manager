# Pit Manager — Art & Mock Data Brief&#32;

## สไตล์ภาพ (ใช้ซ้ำทุก prompt)

เกมเป็น pixel art สีแดง ขาว ดำ ตัวละครเป็นนักแข่ง F1 ตัวอ้วนกลม หัวโต แบบ chibi สวมชุดแข่งและไม่ใส่หมวก (ตามภาพอ้างอิง แต่เปลี่ยนเป็นชุดแข่ง) ฉากแข่งมองจากด้านบนลงล่าง (top-down) และเลื่อนฉากตามรถ

| หัวข้อ | ค่าที่ใช้ |
| --- | --- |
| สีหลัก | แดง `#E10600`, ขาว `#FFFFFF`, ดำ `#111111` |
| สีเสริม (ใช้น้อย) | เทา `#8A8A8A`, โทนผิว `#F2C6A0` |
| เส้นขอบ | ดำหนา 1 พิกเซล ทุกชิ้น |
| เงา | เงาแบนใต้ตัวละคร สีดำโปร่ง |
| พื้นหลังตอนเจน | สีเรียบสีเดียว (เทาอ่อน) เพื่อตัดพื้นหลังง่าย |
| ขนาดต้นฉบับ | ตัวละคร 64×64, ไอคอน 32×32, รถ top-down 32×64 พิกเซล |
| ห้ามมี | ตัวหนังสือ, โลโก้ทีมหรือยี่ห้อจริง, ตัวการ์ตูนที่มีอยู่แล้ว |

## นักแข่ง 5 คน (mock)

แต่ละคนมี 3 ค่า (1–10) ตามสป็กเกม คะแนนรวมเท่ากันคนละ 20 เพื่อให้ไม่มีคนไหนแข็งทุกสนาม สัตว์และชื่อเป็นของฝั่งเราเอง แก้ได้

| # | ชื่อ | สีชุด | pace | consistency | wet skill |
| --- | --- | --- | --- | --- | --- |
| 1 | Rusty | ชุดแดง ขาว | 9 | 5 | 6 |
| 2 | Dash | ชุดขาว แดง | 8 | 5 | 7 |
| 3 | Taurus | ชุดดำ ขาว | 7 | 8 | 5 |
| 4 | Bruno | ชุดดำ แดง | 6 | 9 | 5 |
| 5 | Wade | ชุดดำขาวแดง | 5 | 6 | 9 |

## อะไหล่รถ 4 ช่อง × 3 ชิ้น = 12 ชิ้น (mock)

ช่องตามสป็กเกมคือ engine, aero, gearbox, suspension แต่ละช่องมี 3 แบบที่เน้นคนละสนาม: แบบ **Speed** ได้ +3 ความเร็วสูงสุด +1 โค้ง +1 เบรค, แบบ **Corner** ได้ +1/+3/+1 และแบบ **Brake** ได้ +1/+1/+3 (เรียงตาม ความเร็ว/โค้ง/เบรค)

| ช่อง | Speed | Corner | Brake |
| --- | --- | --- | --- |
| Engine | Sprint V6 | Torque V6 | Safe-map V6 |
| Aero | Low-drag wing | Downforce wing | Airbrake wing |
| Gearbox | Long-ratio box | Short-ratio box | Engine-brake box |
| Suspension | Stiff-low | Soft-flex | Dive-control |

ยางมี 3 ชนิด (Soft แถบแดง, Medium แถบขาว, Hard แถบดำ) และสนาม 3 แบบที่ต้องการ Speed, Corner และ Brake อย่างละสนาม ชื่อสนามให้ตั้งเอง เช่น Straight GP, Twisty GP, Stop-and-Go GP

## รายการภาพและ prompt สำหรับเจน

ภาพที่ต้องเจนมี 5 กลุ่ม: นักแข่ง 5 คน, ไอคอนอะไหล่ 12 ชิ้น, ไอคอนยาง 3 ชิ้น, รถมุมมองบน (top-down) 1 คัน และสนาม 3 แบบ

สไตล์กลาง (แปะต่อท้ายทุก prompt):

```text
Pixel art, limited palette: red #E10600, white, near-black #111111, with small amounts of grey and skin tone. 1px black outline on every shape, flat shading, no gradients, no anti-aliasing, crisp pixels, cute chibi style. Plain light-grey background. No text, no logos, no real brand names.
```

นักแข่ง (เปลี่ยนสัตว์และสีตามตารางนักแข่ง):

```text
[style block]. Full-body front view, 64x64 sprite, a chubby chibi F1 racing driver with a big head wearing a race suit and helmet styled as a [animal, e.g. fox] (ears and tail on the helmet and suit), [suit colours from the table], a small heart badge on the chest, visor down, standing pose, soft shadow under feet.
```

ไอคอนอะไหล่และยาง:

```text
[style block]. 32x32 game icon of a [part, e.g. downforce rear wing] for an F1 car, centered, one object only. Red accent for Speed, white for Corner, black for Brake variants.
```

รถและสนาม:

```text
[style block]. Top-down bird's-eye view of a small F1 race car, nose pointing up, 32x64 sprite, red body with white stripe and black wheels.

[style block]. Top-down seamless track tileset: straight, curve, kerb, grass, pit lane. Black asphalt, red and white kerbs, grass in dark grey. Tile size 32x32.
```

## Tech stack

รอบแรกทำเป็น webapp ล้วน ไม่มีหลังบ้านและไม่มี blockchain ส่วนที่เหลือเป็นของที่เพิ่มทีหลัง

| ส่วน | เครื่องมือง | เหตุผล |
| --- | --- | --- |
| เว็บแอป | Vite + React + TypeScript | รันไว ตั้งค่าน้อย ตรงกับ React + Ethers.js ที่วิชาใช้ใน Week 10 |
| หน้าจอ | React Router + CSS ธรรมดา | ห้าหน้า (Market, Garage, Practice, Race, Results) ไม่ต้องใช้ UI library |
| ฉากแข่ง | HTML Canvas 2D | วาด sprite และเลื่อนกล้องเอง ไม่ต้องใช้เกมเอนจิน ปิด `imageSmoothingEnabled` ให้พิกเซลคม |
| state | React state / Context | เก็บทีมของผู้เล่นใน `mockStore` (เก็บใน localStorage ได้ถ้าอยากให้รีเฟรชแล้วไม่หาย) |
| ทดสอบ simulator | Vitest | เทสต์ว่า seed เดิมได้ผลเดิม โดยไม่ต้องเปิดเบราว์เซอร์ |
| ภาพ | เจนเอง แล้ววางใน `public/assets/` | แทนรูปชั่วคราวได้ด้วยสีเหลี่ยมในระหว่างรอภาพ |
| เพิ่มทีหลัง (NFT) | Solidity + OpenZeppelin ERC721, Hardhat, Ethers.js, MetaMask | ตามแผน Phase 1–5 ในสรุปเกม เชื่อมผ่าน `chainGameService.ts` |

## โครงสร้างไฟล์

ภาพที่เจนไว้ใน `public/assets/` ตามชื่อด้านล่าง ชื่อไฟล์ตรงกับ `id` ในไฟล์ข้อมูล เกมจะผูกภาพกับข้อมูลได้โดยไม่ต้องแก้โค้ด

```text
webapp/
├─ public/assets/
│   ├─ drivers/      rusty.png dash.png taurus.png bruno.png wade.png   (64x64)
│   ├─ parts/        engine_speed.png engine_corner.png engine_brake.png
│   │                 aero_*.png gearbox_*.png suspension_*.png        (32x32, รวม 12)
│   ├─ tires/        soft.png medium.png hard.png                       (32x32)
│   ├─ car/          car_topdown.png                                    (32x64)
│   └─ tracks/       tiles_straight.png tiles_twisty.png tiles_stopgo.png
└─ src/
    ├─ shared/       types.ts, constants.ts, rng.ts, fitScore.ts
    ├─ data/         drivers.json, parts.json, tracks.json              (ข้อมูล mock 5 คน / 12 ชิ้น / 3 สนาม)
    ├─ sim/          simulateRace.ts, practice.ts
    ├─ mock/         mockStore.ts, mockMarket.ts, mockClock.ts, mockPrize.ts
    ├─ services/     gameService.ts (interface), mockGameService.ts
    ├─ game/         RaceCanvas.tsx, camera.ts, trackRenderer.ts, carSprite.ts, playback.ts
    ├─ pages/        Market, Garage, Practice, Race, Results
    ├─ components/   การ์ดนักแข่ง, แถบสเตตัส, ปุ่ม
    └─ main.tsx, App.tsx
```

หน้า (pages) เรียกผ่าน `services/gameService.ts` เท่านั้น เมื่อทำ NFT ค่อยเพิ่ม `chainGameService.ts` แทน `mock/` โดยไม่ต้องแก้หน้าหรือ simulator
