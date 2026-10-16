const {test}=require('node:test'),assert=require('node:assert/strict');
const SH=require('../shared/shadow.js'),RF=require('../shared/refine.js'),INV=require('../shared/inventory.js'),RNG=require('../shared/rng.js'),RO=require('../shared/ro.js');
const {loadDb}=require('../tools/load_db.js');
const db=loadDb();
const give=(inv,add,key='g'+Math.random())=>INV.apply(db,inv,{key,reason:'t',add}).added;

test('เงาเป็นไอเทมใน db.items (สร้างจาก shadows.json)',()=>{const it=db.items[SH.itemId('root_lord')];assert.equal(it.type,'shadow');assert.equal(it.rarity,'legend');});

test('roll: อัตราดรอปใกล้ค่าที่ตั้ง · ดาวกระจายตามตาราง · seed เดียวกันผลเดียวกัน',()=>{
  const rng=RNG.make(11),N=200000;let got=0;const stars=[0,0,0,0,0];
  for(let i=0;i<N;i++){const r=SH.roll(db,'shadow_sprout',0,rng);if(r){got++;stars[r.attrs.star-1]++;}}
  assert.ok(Math.abs(got/N-0.003)<0.0006,'อัตรา '+got/N);assert.ok(stars[0]>stars[1]&&stars[1]>stars[2]);
  const a=RNG.make(4),b=RNG.make(4);for(let i=0;i<1000;i++)assert.deepEqual(SH.roll(db,'shadow_root',50,a),SH.roll(db,'shadow_root',50,b));
  assert.equal(SH.roll(db,'no_mob',0,()=>0),null);});

test('slotMatches: head ลงหมวกได้ทุกชั้น · acc ลงได้ทั้ง 2 ช่อง',()=>{
  assert.ok(SH.slotMatches('head','head_mid'));assert.ok(SH.slotMatches('acc','acc2'));assert.ok(!SH.slotMatches('weapon','armor'));});

function setup(){const inv=INV.create();inv.zeny=100000;
  const [armor]=give(inv,[{id:'dusk_plate',qty:1,sockets:[null,null]}]);
  const [s1,s2,s3]=give(inv,[{id:SH.itemId('root_lord'),qty:1,attrs:{star:1,alt:false}},{id:SH.itemId('root_lord'),qty:1,attrs:{star:1,alt:false}},{id:SH.itemId('shadow_root'),qty:1,attrs:{star:1}}]);
  INV.find(inv,armor).eq='armor';return {inv,armor,s1,s2,s3};}

test('ผนึก: เงาออกจากกระเป๋าไปอยู่ในช่อง · ช่องผิดชนิด/ช่องเต็ม = ปฏิเสธ · key ซ้ำไม่ทำซ้ำ',()=>{
  const {inv,armor,s1,s2,s3}=setup();
  assert.equal(SH.seal(db,inv,'k1',armor,0,s3).ok,false,'เงาอาวุธลงเกราะไม่ได้');
  assert.equal(SH.seal(db,inv,'k2',armor,0,s1).ok,true);
  assert.equal(INV.find(inv,s1),null);assert.deepEqual(INV.find(inv,armor).sockets[0],{sid:'root_lord',star:1,alt:false});
  assert.equal(SH.seal(db,inv,'k2',armor,1,s2).dup,true,'key ซ้ำ');assert.ok(INV.find(inv,s2));
  assert.equal(SH.seal(db,inv,'k3',armor,0,s2).ok,false,'ช่องเต็ม');});

test('โบนัสผนึกเข้า derive และคูณตามดาว',()=>{
  const {inv,armor,s1}=setup();SH.seal(db,inv,'k',armor,0,s1);
  assert.deepEqual(SH.sealBonuses(db,inv),[{size:{large:15}}]);
  assert.equal(SH.sealBonus(db,'root_lord',5).size.large,30);
  assert.equal(SH.procs(db,inv).onKillHealPct,2);
  const sh={job:'knight',lv:10,jobLv:1,stats:{str:10,agi:1,vit:1,int:1,dex:1,luk:1},equip:{armor:'dusk_plate'}};
  const d=RO.derive(db,{...sh,extra:SH.sealBonuses(db,inv)});assert.equal(d.bonus.size.large,15);});

test('ถอด: จ่ายเงินตามดาว (บอส ×5) · แตก = เงาหาย · ไม่แตก = เงากลับกระเป๋า · เงินไม่พอ = ไม่เปลี่ยนอะไร',()=>{
  let {inv,armor,s1}=setup();SH.seal(db,inv,'k',armor,0,s1);
  const cost=SH.unsealCost(db,{sid:'root_lord',star:1});assert.equal(cost,25000);
  const z=inv.zeny,r=SH.unseal(db,inv,'u1',armor,0,()=>0.99);
  assert.equal(r.broke,false);assert.equal(inv.zeny,z-cost);assert.equal(INV.find(inv,armor).sockets[0],null);
  assert.ok(inv.items.some(x=>x.id===SH.itemId('root_lord')&&x.star===1));
  ({inv,armor,s1}=setup());SH.seal(db,inv,'k',armor,0,s1);
  assert.equal(SH.unseal(db,inv,'u2',armor,0,()=>0).broke,true);assert.equal(inv.items.filter(x=>x.id===SH.itemId('root_lord')).length,1,'เหลือแค่ s2');
  ({inv,armor,s1}=setup());SH.seal(db,inv,'k',armor,0,s1);inv.zeny=10;const snap=JSON.stringify(inv);
  assert.equal(SH.unseal(db,inv,'u3',armor,0,()=>.99).ok,false);assert.equal(JSON.stringify(inv),snap);});

test('รวมเงา: สำเร็จ = ดาว+1 เหลือชิ้นเดียว · ล้มเหลว = เหลือ 1 ชิ้นดาวเดิม · ต่างชนิด/ต่างดาว = ปฏิเสธ',()=>{
  let {inv,s1,s2,s3}=setup();
  assert.equal(SH.fuse(db,inv,'f0',s1,s3).ok,false);
  const r=SH.fuse(db,inv,'f1',s1,s2,()=>0);assert.equal(r.success,true);assert.equal(r.star,2);
  const lords=inv.items.filter(x=>x.id===SH.itemId('root_lord'));assert.equal(lords.length,1);assert.equal(lords[0].star,2);
  ({inv,s1,s2}=setup());const f=SH.fuse(db,inv,'f2',s1,s2,()=>.999);assert.equal(f.success,false);
  assert.equal(inv.items.filter(x=>x.id===SH.itemId('root_lord')).length,1);
  assert.equal(SH.fuse(db,inv,'f2',s1,s2,()=>0).dup,true);});

test('ตีบวก: +1~+4 สำเร็จแน่นอน · ใช้หินและเงินทุกครั้ง · ATK เพิ่มตามขั้น',()=>{
  const inv=INV.create();inv.zeny=100000;const [w]=give(inv,[{id:'dark_blade',qty:1},{id:'refine_ore',qty:10}]);INV.find(inv,w).eq='weapon';
  for(let i=0;i<4;i++)assert.equal(RF.refine(db,inv,'r'+i,w,()=>.999).result,'success');
  assert.equal(INV.find(inv,w).refine,4);assert.equal(inv.zeny,100000-1000);assert.equal(inv.items.find(x=>x.id==='refine_ore').qty,6);
  assert.deepEqual(RF.bonuses(db,inv),[{atk:24}]);
  assert.equal(RF.refine(db,inv,'r0',w,()=>0).dup,true);});

test('ตีบวก: +5~+7 ล้มเหลวลดขั้น · +8 ขึ้นไปล้มเหลวแตก (หายจากกระเป๋าแม้สวมอยู่)',()=>{
  const inv=INV.create();inv.zeny=1e6;const [w]=give(inv,[{id:'dark_blade',qty:1},{id:'refine_ore',qty:10}]);const it=INV.find(inv,w);it.eq='weapon';
  it.refine=5;assert.equal(RF.refine(db,inv,'a',w,()=>.999).result,'down');assert.equal(it.refine,4);
  it.refine=8;const r=RF.refine(db,inv,'b',w,()=>.999);assert.equal(r.result,'break');assert.equal(INV.find(inv,w),null);});

test('ตีบวก: ไม่มีหิน/เงินไม่พอ = ไม่เปลี่ยนอะไร · +10 ตีต่อไม่ได้ · ยาตีไม่ได้',()=>{
  const inv=INV.create();const [w,p]=give(inv,[{id:'dark_blade',qty:1},{id:'red_potion',qty:1}]);
  assert.equal(RF.refine(db,inv,'x',w,()=>0).ok,false);give(inv,[{id:'refine_ore',qty:1}]);
  const snap=JSON.stringify(inv);assert.equal(RF.refine(db,inv,'y',w,()=>0).err,'เงินไม่พอ');assert.equal(JSON.stringify(inv),snap);
  INV.find(inv,w).refine=10;assert.equal(RF.nextInfo(db,INV.find(inv,w)),null);assert.equal(RF.nextInfo(db,INV.find(inv,p)),null);});

test('สมุดล่า: ผ่านขั้นตามจำนวนที่ฆ่า · โบนัสสะสม · บอสใช้ขั้นเฉพาะ',()=>{
  assert.equal(RF.tier(db,'shadow_root',29),0);assert.equal(RF.tier(db,'shadow_root',150),2);assert.equal(RF.tier(db,'root_lord',5),2);
  assert.deepEqual(RF.codexBonuses(db,{shadow_root:150,root_lord:1}),[{atk:2},{atk:4},{str:1}]);});
