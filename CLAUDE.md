# Re-Ask — โค้ดเกม (อ่านก่อนเริ่มทุกแชท)

MMORPG 2D ของผู้ใช้ (เว็บก่อน .exe ทีหลัง) · ระบบแบบ Ragnarok Online + ความรู้สึกต่อสู้/VFX แบบ Night Camp · คุยภาษาไทย
ภาพ/ท่าทาง/แมพ ทำที่สตูดิโอ `../สอน AI` (อ่าน `../สอน AI/CLAUDE.md` + `knowledge/PRINCIPLES.md` ถ้างานเกี่ยวกับภาพ, game feel, สกิล, แมพ)

## แบ่งไฟล์
- แก้ได้ที่นี่: `game/` (main.js เกม, rpg.js ตัวละคร/เซฟ, ui.js) · `shared/ro.js` (สูตร RO) · `data/db/` (rules items mobs jobs skills maps/)
- **ห้ามแก้**: `engine/`, `data/characters`, `data/maps`, `data/vfx`, `data/gear` — มาจากสตูดิโอ export ทับ (`python tools/export_game.py` ในสอน AI)
- แผนระบบ: `docs/GAME_PLAN.md` · วิธีเล่น/คีย์: `README.md`

## สถานะ
- เริ่มที่เมือง (data/maps/town จาก Map Lab: ชน/บังจาง/F คุย/วาร์ป) ↔ ป่ารากมืด (มอน 4 ชนิด) · ผู้เล่น hero2 scale .62 · กล้องซูม 1.9 (+/-)
- ตัวเลขดาเมจ/ฮิตสต็อป/คอมโบ 3 ท่า/สกิลฝูงอสูรเงา/ดรอป/กระเป๋า/สเตตัส มีแล้ว
- ทดสอบ: preview "game" (พอร์ต 8766) · pane ซ่อน = rAF หยุด → เรียก `update(dt,t)` + `render(dt,t)` เองแล้วจับภาพ canvas
- ถัดไปที่คุยไว้: NPC/ร้าน/เควส, เปลี่ยนชุด/คลาส, HUD แบบเกมอ้างอิง, แมพทุ่งหญ้า+สไลม์
