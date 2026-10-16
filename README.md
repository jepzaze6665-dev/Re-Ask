# Re-Ask — MMORPG (เว็บก่อน · .exe ทีหลัง)

```
Re-Ask/
├─ index.html          เปิดเกม
├─ game/main.js        โค้ดเกม (แมพ, ผู้เล่น, มอนสเตอร์, คอมแบต, HUD, ของบนพื้น) — แก้ที่นี่
├─ game/rpg.js         ตัวละคร: สเตตัส เลเวล กระเป๋า ช่องสวมใส่ เซฟ (localStorage)
├─ game/ui.js          หน้าต่างสเตตัส (C) / กระเป๋า (I) / สกิล (K) / กิลด์
├─ game/skills_game.js ต่อสกิล/สถานะเข้าเกม (ร่าย ปุ่มลัด แถบร่าย)
├─ game/shadow_game.js เงาอสูรที่เรียกออกมา (ปิดอยู่) + ผลพิเศษของเงาที่ผนึก
├─ game/mob_game.js    มอนในสนาม: AI ง้าง/หลบ วงเตือนบอส
├─ game/dungeon_game.js ประตูมิติในโลก + ดันข้างใน: เข้า/ออก ประตูบอส รางวัล
├─ shared/            ฟังก์ชันล้วน ใช้ร่วม server ในอนาคต (สเปก: docs/FORMULAS.md)
│   ├─ ro.js           สูตร: EXP สเตตัสย่อย ดาเมจ โอกาสโดน รอบตี
│   ├─ inventory.js    เงิน/ไอเทมแบบ instance + ธุรกรรม atomic กันทำซ้ำ + log + ดรอป
│   ├─ skills.js       สกิล อาชีพ เปลี่ยนอาชีพ
│   ├─ status.js       บัฟ/ดีบัฟ/CC
│   ├─ shadow.js       เงาอสูร: ดรอป ผนึก ถอด รวม เรียก
│   ├─ refine.js       ตีบวก + สมุดล่า
│   ├─ shop.js         ร้าน NPC โรงแรม คลังฝากของ
│   ├─ ai.js           AI มอน (state machine) + เฟส/สกิลบอส
│   ├─ quest.js        เควสต์
│   ├─ dungeon.js      ดันเจี้ยนสุ่ม (สร้างแผนที่จาก seed)
│   ├─ rift.js         ประตูมิติ: สี/ความโหด/ตำแหน่ง/รางวัล
│   ├─ rng.js          สุ่มแบบ seed
│   └─ validate.js     ตรวจ data/db
├─ test/               เทสต์อัตโนมัติ (node:test)
├─ tools/              load_db.js, validate_db.js
├─ data/db/            ✎ ข้อมูลเกม (ของเกมเอง ไม่ถูก export ทับ): rules items mobs jobs skills maps/
├─ engine/             ⚠ มาจากสตูดิโอ (export ทับ) — อย่าแก้ที่นี่ ให้แก้ใน "สอน AI/engine" แล้ว export
│   ├─ rig.js          ตัวละครกระดูก + ท่า + เหตุการณ์คีย์
│   └─ vfx_runtime.js  สกิล VFX
└─ data/               ⚠ มาจากสตูดิโอ (export ทับ)
    ├─ characters/ gear/ vfx/
    └─ clips.json      (ถ้ามี) ท่าที่ส่งออกจาก Pose Studio
```

## อัปเดตของจากสตูดิโอ
แมพเมือง: เปิด Map Lab → ปุ่ม "ส่งออกเข้าเกม" → วาง `town_layout.json` + `town_ground.jpg` ไว้ที่ `สอน AI/assets/maps/town/export/` แล้วรันคำสั่งด้านล่าง
```
cd "D:/JEFF/JeffCompany/สอน AI"
python tools/export_game.py
python tools/export_game.py --clips "C:/Users/User/Downloads/clips.json"   # พร้อมท่าจาก Pose Studio
```

## เล่น
เปิดผ่านเซิร์ฟเวอร์ (preview "game" ในสตูดิโอ หรือ `python -m http.server 8766` ในโฟลเดอร์นี้) แล้วเข้า http://localhost:8766

เริ่มที่เมือง (ปลอดภัย) · วาร์ปใต้ = ป่ารากมืด · WASD / คลิก = เดิน · F = คุยกับร้าน/บอร์ด · J = ฟัน (กดรัว = คอมโบ 3) · 1 = ฝูงอสูรเงา · Q/E = ยา HP/SP · C = สเตตัส · I = กระเป๋า · U = หน้ากาก · R = เกิดใหม่
เดินทับของที่ดรอป = เก็บ · ดับเบิลคลิกในกระเป๋า = ใช้/สวม · Shift+คลิก + = แจก 10 แต้ม

## เทสต์ (ต้องมี Node.js)
```
npm install        # ครั้งแรก (typescript สำหรับตรวจ type)
npm run check      # ตรวจ data/db + ตรวจ type + เทสต์ทั้งหมด
```
