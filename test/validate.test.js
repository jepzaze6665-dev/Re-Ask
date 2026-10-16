const {test}=require('node:test'),assert=require('node:assert/strict');
const {validateDb}=require('../shared/validate.js'),{loadDb}=require('../tools/load_db.js');

test('data/db จริงผ่านการตรวจ',()=>assert.deepEqual(validateDb(loadDb()),[]));

test('จับข้อมูลเสียได้: ดรอปไอเทมที่ไม่มี / ธาตุผิด / rate เกิน 100',()=>{
  const db=loadDb();db.mobs.shadow_root.drops.push({item:'nope',rate:150});db.mobs.shadow_sprout.element='lava';
  const e=validateDb(db).join('\n');assert.match(e,/nope/);assert.match(e,/rate/);assert.match(e,/element/);});
