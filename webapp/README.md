# Pit Manager

เกมจัดการทีม F1 แบบ pixel art — ซื้อนักแข่งและอะไหล่ จัดรถให้เข้ากับสนาม เลือกยางและแผนเข้าพิท แล้วดูการแข่งมุมมองบน (top-down) ที่กล้องตามรถเรา

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## เล่นยังไง

1. **Market** — ซื้อนักแข่ง 1 คนและอะไหล่ (เริ่มต้นมี 1,000 เหรียญ)
2. **Garage** — ใส่อะไหล่ 4 ช่องให้ตรงกับสิ่งที่สนามต้องการ (Speed / Corner / Brake) ดูค่า FIT, เลือกยาง, เลือกรอบเข้าพิท
3. **Practice** — วิ่ง 3 รอบเพื่อเทียบเซ็ต (20 เหรียญ/ครั้ง)
4. **Race** — ค่าลงแข่ง 50 เหรียญ รางวัล P1–P4
5. **Results** — ตารางเวลาและประวัติ

สนามหมุนเวียนทีละรอบ: Straight GP → Twisty GP → Stop-and-Go GP สภาพอากาศกำหนดจาก seed ของแต่ละรอบ (ฝนทำให้ wet skill สำคัญขึ้น)

## ภาพ

ตอนนี้ภาพทุกชิ้นเป็น placeholder ที่วาดด้วยโค้ด (`src/game/pixelArt.ts`) ตามพาเลตใน brief
เมื่อเจนภาพจริงแล้ววางไว้ที่ `public/assets/<group>/<id>.png` ตามชื่อใน brief — เกมจะใช้ PNG แทนให้อัตโนมัติ ไม่ต้องแก้โค้ด

## โครงสร้าง

- `src/shared` — types, ค่าคงที่, RNG แบบ seed, `fitScore`
- `src/data` — ข้อมูล mock (นักแข่ง 5 / อะไหล่ 12 / สนาม 3)
- `src/sim` — `simulateRace` (deterministic จาก seed) และ `practice`
- `src/mock` — store (localStorage), market, calendar, prize
- `src/services` — `GameService` interface + `mockGameService` · หน้าเรียกผ่าน service เท่านั้น ทำ `chainGameService` แทนได้ทีหลัง
- `src/game` — canvas แข่ง, กล้อง, วาดสนาม, sprite รถ, playback
- `src/pages`, `src/components` — UI
