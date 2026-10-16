const {test}=require('node:test'),assert=require('node:assert/strict');
const RO=require('../shared/ro.js'),RNG=require('../shared/rng.js'),{loadDb}=require('../tools/load_db.js');
const db=loadDb();
const startChar=()=>{const s=db.rules.start;return {job:s.job,lv:1,jobLv:1,exp:0,jobExp:0,stats:{...s.stats},equip:{...s.equip}};};
const NOB={race:{},size:{},ele:{}};

test('EXP_next(L) = floor(A + B·L^p) ตามค่าต้นแบบ A=100 B=20 p=1.8',()=>{
  assert.equal(RO.baseExpNeed(db,1),120);
  assert.equal(RO.baseExpNeed(db,10),Math.floor(100+20*Math.pow(10,1.8)));
  for(let l=1;l<100;l++)assert.ok(RO.baseExpNeed(db,l+1)>RO.baseExpNeed(db,l),'ต้องเพิ่มขึ้นเสมอ');});

test('applyExp: ขึ้นหลายเลเวลในครั้งเดียว + แต้มสเตตัสถูกต้อง',()=>{
  const c=startChar(),need=RO.baseExpNeed(db,1)+RO.baseExpNeed(db,2);
  const r=RO.applyExp(db,c,need+5,0);
  assert.equal(r.lv,3);assert.equal(r.exp,5);assert.equal(r.statPoints,RO.statPointsOnLevel(2)+RO.statPointsOnLevel(3));});

test('applyExp: ไม่เกินเพดาน Base Lv 100 และ EXP ค้าง 0',()=>{
  const c={...startChar(),lv:99};const r=RO.applyExp(db,c,1e12,0);
  assert.equal(r.lv,100);assert.equal(r.exp,0);
  const r2=RO.applyExp(db,{...c,lv:100},500,0);assert.equal(r2.lv,100);assert.equal(r2.statPoints,0);});

test('applyExp: EXP ติดลบ/ทศนิยมไม่ทำให้พัง',()=>{const r=RO.applyExp(db,startChar(),-50,3.9);assert.equal(r.exp,0);assert.equal(r.jobExp,3);});

test('statCost แบบขั้นบันได',()=>{assert.equal(RO.statCost(1),2);assert.equal(RO.statCost(10),2);assert.equal(RO.statCost(11),3);assert.equal(RO.statCost(98),11);});

test('hitChance: clamp(0.95 + 0.005·(HIT−FLEE), 0.5, 1)',()=>{
  assert.equal(RO.hitChance(db,10,10),0.95);
  assert.equal(RO.hitChance(db,100,0),1);
  assert.equal(RO.hitChance(db,0,500),0.5);
  assert.ok(Math.abs(RO.hitChance(db,20,40)-0.85)<1e-9);});

test('attackInterval: ลดตาม AGI/DEX แต่ไม่ต่ำกว่า minInterval และลดไม่เกิน maxReduction',()=>{
  const A=db.rules.attack;
  assert.equal(RO.attackInterval(db,1,0,0,0),1);
  assert.ok(Math.abs(RO.attackInterval(db,1,50,50,0)-(1-(50*A.agiReduce+50*A.dexReduce)))<1e-9);
  assert.equal(RO.attackInterval(db,1,999,999,0),Math.max(A.minInterval,1-A.maxReduction));
  assert.equal(RO.attackInterval(db,0.4,99,99,50),A.minInterval);});

test('physical: floor(ATK × 100/(100+DEF) × ธาตุ × ตัวคูณ) ตรงกับคำนวณมือ',()=>{
  const A={statusAtk:50,weaponAtk:100,hit:999,crit:0,wtype:'sword2h',weaponEle:'neutral',bonus:NOB};
  const D={def:25,flee:0,element:'earth',size:'large',race:'brute'};
  const rng=()=>0.5;   // variance กลาง = ATK อาวุธพอดี
  assert.equal(RO.physical(db,A,D,{rng,noCrit:true}).dmg,Math.floor(150*100/125));
  assert.equal(RO.physical(db,{...A,weaponEle:'fire'},D,{rng,noCrit:true}).dmg,Math.floor(150*100/125*1.5));
  assert.equal(RO.physical(db,A,{...D,size:'small'},{rng,noCrit:true}).dmg,Math.floor(150*100/125*0.75));});

test('physical: ธาตุภูมิคุ้มกัน = 0 · ดาเมจขั้นต่ำ = 1',()=>{
  const A={statusAtk:1,weaponAtk:0,hit:999,crit:0,wtype:'fist',bonus:NOB};
  assert.equal(RO.physical(db,{...A,weaponEle:'shadow'},{def:0,flee:0,element:'shadow'},{rng:()=>.5}).dmg,0);
  assert.equal(RO.physical(db,{...A,weaponEle:'neutral'},{def:5000,flee:0,element:'earth'},{rng:()=>.5}).dmg,1);});

test('physical: คริ ×1.4 ทะลุการหลบ',()=>{
  const A={statusAtk:100,weaponAtk:0,hit:0,crit:100,wtype:'fist',bonus:NOB};
  const r=RO.physical(db,A,{def:0,flee:9999,element:'neutral'},{rng:()=>0});
  assert.equal(r.crit,true);assert.equal(r.miss,false);assert.equal(r.dmg,140);});

test('physical: seed เดียวกันได้ผลเดียวกันทุกครั้ง',()=>{
  const d={...RO.derive(db,startChar()),lv:1},m=RO.mobProfile(db,db.mobs.shadow_root);
  const run=seed=>{const rng=RNG.make(seed);return Array.from({length:50},()=>RO.physical(db,d,m,{rng}).dmg);};
  assert.deepEqual(run(42),run(42));assert.notDeepEqual(run(42),run(43));});

test('physical: อัตราโดนจริงใกล้ hitChance (สุ่ม 20,000 ครั้ง)',()=>{
  const A={statusAtk:10,weaponAtk:0,hit:20,crit:0,wtype:'fist',bonus:NOB},rng=RNG.make(7),N=20000;let hits=0;
  for(let i=0;i<N;i++)if(!RO.physical(db,A,{def:0,flee:40,element:'neutral'},{rng}).miss)hits++;
  assert.ok(Math.abs(hits/N-0.85)<0.015,'ได้ '+hits/N);});

test('derive: แจก STR แล้ว ATK เพิ่ม · ใส่เกราะแล้ว DEF เพิ่ม',()=>{
  const c=startChar(),a=RO.derive(db,c);
  assert.ok(RO.derive(db,{...c,stats:{...c.stats,str:c.stats.str+10}}).atk>a.atk);
  assert.ok(RO.derive(db,{...c,equip:{...c.equip,armor:'root_mail'}}).def>a.def);});
