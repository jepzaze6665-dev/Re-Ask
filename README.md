# Re-Ask — MMORPG (เว็บก่อน · .exe ทีหลัง)

```
Re-Ask/
├─ index.html          เปิดเกม
├─ game/main.js        โค้ดเกม (แมพ, ผู้เล่น, มอนสเตอร์, คอมแบต, HUD, ของบนพื้น) — แก้ที่นี่
├─ game/rpg.js         ตัวละคร: สเตตัส เลเวล กระเป๋า ช่องสวมใส่ เซฟ (localStorage)
├─ game/ui.js          หน้าต่างสเตตัส (C) / กระเป๋า (I)
├─ shared/ro.js        สูตร RO (สเตตัสย่อย ดาเมจ ธาตุ ขนาด เผ่า คริ HIT/FLEE) ใช้ร่วม server ในอนาคต
├─ data/db/            ✎ ข้อมูลเกม (ของเกมเอง ไม่ถูก export ทับ): rules items mobs jobs skills maps/
├─ engine/             ⚠ มาจากสตูดิโอ (export ทับ) — อย่าแก้ที่นี่ ให้แก้ใน "สอน AI/engine" แล้ว export
│   ├─ rig.js          ตัวละครกระดูก + ท่า + เหตุการณ์คีย์
│   └─ vfx_runtime.js  สกิล VFX
└─ data/               ⚠ มาจากสตูดิโอ (export ทับ)
    ├─ characters/ gear/ vfx/
    └─ clips.json      (ถ้ามี) ท่าที่ส่งออกจาก Pose Studio
```

## อัปเดตของจากสตูดิโอ
```
cd "D:/JEFF/JeffCompany/สอน AI"
python tools/export_game.py
python tools/export_game.py --clips "C:/Users/User/Downloads/clips.json"   # พร้อมท่าจาก Pose Studio
```

## เล่น
เปิดผ่านเซิร์ฟเวอร์ (preview "game" ในสตูดิโอ หรือ `python -m http.server 8766` ในโฟลเดอร์นี้) แล้วเข้า http://localhost:8766

WASD / คลิก = เดิน · J = ฟัน (กดรัว = คอมโบ 3) · 1 = ฝูงอสูรเงา · Q/E = ยา HP/SP · C = สเตตัส · I = กระเป๋า · U = หน้ากาก · R = เกิดใหม่
เดินทับของที่ดรอป = เก็บ · ดับเบิลคลิกในกระเป๋า = ใช้/สวม · Shift+คลิก + = แจก 10 แต้ม
