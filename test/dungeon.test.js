const {test}=require('node:test'),assert=require('node:assert/strict');
const DG=require('../shared/dungeon.js'),INV=require('../shared/inventory.js'),RNG=require('../shared/rng.js'),{loadDb}=require('../tools/load_db.js');
const db=loadDb();

test('สร้างดัน: seed เดียวกัน = แผนที่เดียวกัน · seed ต่าง = ต่าง',()=>{
  assert.deepEqual(DG.generate(db,'shadow_hollow',42),DG.generate(db,'shadow_hollow',42));
  assert.notDeepEqual(DG.generate(db,'shadow_hollow',42),DG.generate(db,'shadow_hollow',43));});

test('สร้างดัน 300 แบบ: ขนาดในช่วง · มอนพอเล่น · ไม่เกิดใกล้จุดเกิด · ไม่ทับหิน · บอสอยู่ไกลจุดเกิด · มีมอนดุร้ายบ้าง',()=>{
  for(const id of Object.keys(db.dungeons)){const D=db.dungeons[id];let elites=0,total=0;
    for(let s=1;s<=300;s++){const p=DG.generate(db,id,s);
      assert.ok(p.W>=D.size.w[0]&&p.W<=D.size.w[1]&&p.H>=D.size.h[0]&&p.H<=D.size.h[1]);
      assert.ok(p.mobs.length>=D.packs[0]*D.packSize[0]*0.5,`${id} seed ${s} มอนน้อยเกิน ${p.mobs.length}`);
      assert.ok(Math.hypot(p.boss.x-p.spawn.x,p.boss.y-p.spawn.y)>p.W*0.5,'บอสต้องอยู่ไกล');
      for(const m of p.mobs){assert.ok(Math.hypot(m.x-p.spawn.x,m.y-p.spawn.y)>300,'มอนใกล้จุดเกิด');
        assert.ok(m.x>0&&m.y>0&&m.x<p.W&&m.y<p.H);assert.ok(D.pool.some(x=>x.mob===m.mob));
        for(const o of p.obstacles)assert.ok(Math.hypot(o.x-m.x,(o.y-m.y)*1.3)>=o.r,'มอนทับหิน');if(m.elite)elites++;total++;}
      for(const o of p.obstacles){assert.ok(Math.hypot(o.x-p.spawn.x,o.y-p.spawn.y)>o.r,'หินทับจุดเกิด');assert.ok(Math.hypot(o.x-p.boss.x,o.y-p.boss.y)>o.r,'หินทับบอส');}}
    const rate=elites/total*100;assert.ok(Math.abs(rate-D.elite.chance)<3,`${id} อัตรามอนดุร้าย ${rate}`);}});

test('ประตูบอสเปิดเมื่อฆ่าครบ bossUnlockPct %',()=>{const p=DG.generate(db,'shadow_hollow',7),n=p.mobs.length,need=Math.ceil(n*0.7);
  assert.equal(DG.progress(db,p,need-1).bossOpen,false);assert.equal(DG.progress(db,p,need).bossOpen,true);assert.equal(DG.progress(db,p,n).pct,100);});

test('รางวัลจบดัน: ได้ครั้งเดียวต่อรอบ · seed เดียวกันรางวัลเดียวกัน',()=>{
  const inv=INV.create(),rw=DG.rollReward(db,'shadow_hollow',RNG.make(5));
  assert.deepEqual(rw,DG.rollReward(db,'shadow_hollow',RNG.make(5)));
  assert.ok(rw.zeny>=800&&rw.zeny<=1500);assert.ok(rw.items.some(x=>x.id==='refine_ore'),'หินตีบวก 100%');
  assert.equal(DG.claim(db,inv,'run1',rw).ok,true);const z=inv.zeny;
  assert.equal(DG.claim(db,inv,'run1',rw).dup,true);assert.equal(inv.zeny,z);
  assert.equal(DG.claim(db,inv,'run2',rw).ok,true);assert.equal(inv.zeny,z*2);});
