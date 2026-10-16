const {test}=require('node:test'),assert=require('node:assert/strict');
const SK=require('../shared/skills.js'),ST=require('../shared/status.js'),RO=require('../shared/ro.js'),INV=require('../shared/inventory.js'),RNG=require('../shared/rng.js');
const {loadDb}=require('../tools/load_db.js');
const db=loadDb();
const ch=(o={})=>({job:'swordman',jobLv:1,lv:10,skills:{},skillPoints:20,stats:{str:10,agi:5,vit:5,int:1,dex:10,luk:1},equip:{weapon:'training_sword'},...o});
const mob=(id,x=0,y=0)=>({ref:{id},prof:RO.mobProfile(db,db.mobs[id]),x,y});

test('val: ตัวเลข / array / {base,perLv}',()=>{
  assert.equal(SK.val(5,3),5);assert.equal(SK.val([1,2,3],2),2);assert.equal(SK.val([1,2,3],9),3);assert.equal(SK.val({base:10,perLv:5},3),20);});

test('lineage & สกิลสืบทอด',()=>{
  assert.deepEqual(SK.lineage(db,'knight'),['novice','swordman','knight']);
  const k=SK.skillsFor(db,'knight');assert.ok(k.includes('first_aid')&&k.includes('bash')&&k.includes('swarm'));
  assert.ok(!SK.skillsFor(db,'novice').includes('bash'));});

test('เรียนสกิล: ต้องมีแต้ม · ไม่เกิน maxLv · ต้องผ่าน requires · อาชีพต้องตรง',()=>{
  const c=ch();
  assert.equal(SK.canLearn(db,c,'magnum_break').ok,false,'ต้องมี bash 5');
  for(let i=0;i<5;i++)assert.equal(SK.learn(db,c,'bash').ok,true);
  assert.equal(SK.learn(db,c,'magnum_break').ok,true);
  assert.equal(SK.canLearn(db,c,'swarm').ok,false,'นักดาบเรียนสกิลอัศวินไม่ได้');
  assert.equal(SK.canLearn(db,ch({skillPoints:0}),'bash').err,'แต้มสกิลไม่พอ');
  const f=ch({skills:{bash:10}});assert.equal(SK.canLearn(db,f,'bash').ok,false);
  assert.equal(c.skillPoints,14);});

test('รีเซ็ตสกิลคืนแต้มครบ',()=>{const c=ch({skills:{bash:5,provoke:3},skillPoints:2});assert.equal(SK.resetSkills(c),8);assert.equal(c.skillPoints,10);assert.deepEqual(c.skills,{});});

test('passive: ชำนาญดาบเพิ่ม ATK เฉพาะตอนถือดาบ · ความอึดเพิ่ม MaxHP',()=>{
  const c=ch({skills:{blade_mastery:5}});
  const withSword=RO.derive(db,{...c,extra:SK.passiveBonuses(db,c,'sword1h')}),without=RO.derive(db,c);
  assert.equal(withSword.weaponAtk-without.weaponAtk,20);
  assert.deepEqual(SK.passiveBonuses(db,c,'axe'),[]);
  const n={...ch({job:'novice'}),skills:{toughness:5}};
  assert.ok(RO.derive(db,{...n,extra:SK.passiveBonuses(db,n,'dagger')}).hpMax>RO.derive(db,n).hpMax);});

test('checkCast: ยังไม่เรียน / คูลดาวน์ / SP / อาวุธ / ติดสตัน',()=>{
  const base={skills:{bash:1,two_hand_quicken:1},sp:100,cds:{},wtype:'sword1h'};
  assert.equal(SK.checkCast(db,{...base,skills:{}},'bash',0),'ยังไม่ได้เรียนสกิลนี้');
  assert.equal(SK.checkCast(db,base,'bash',0),null);
  assert.equal(SK.checkCast(db,{...base,cds:{bash:5}},'bash',4),'สกิลยังไม่พร้อม');
  assert.equal(SK.checkCast(db,{...base,cds:{bash:5}},'bash',5),null,'ครบเวลาพอดี = พร้อม');
  assert.equal(SK.checkCast(db,{...base,sp:1},'bash',0),'SP ไม่พอ');
  assert.match(SK.checkCast(db,base,'two_hand_quicken',0),/ต้องถือ/);
  assert.match(SK.checkCast(db,{...base,flags:{cantCast:true}},'bash',0),/ติดสถานะ/);});

test('resolve: bash แรงกว่าตีปกติตาม % · seed เดียวกันผลเดียวกัน',()=>{
  const c=ch(),A={...RO.derive(db,c),lv:10},t=mob('shadow_root');t.prof.flee=-999;
  const r=SK.resolve(db,'bash',10,{caster:A,self:{x:0,y:0},primary:t,others:[t],rng:()=>.5})[0].r;
  const n=RO.physical(db,A,t.prof,{rng:()=>.5,noCrit:true});
  assert.ok(Math.abs(r.dmg-Math.floor(n.dmg*4.0))<=4,'Lv10 = 400% ได้ '+r.dmg+' vs '+n.dmg);
  const run=()=>SK.resolve(db,'bash',10,{caster:A,self:{x:0,y:0},primary:t,others:[t],rng:RNG.make(3)});
  assert.deepEqual(run(),run());});

test('resolve: magnum break โดนเฉพาะในรัศมีรอบตัว · ธาตุไฟ · กระเด็น',()=>{
  const A={...RO.derive(db,ch({skills:{bash:5,magnum_break:1}})),lv:10,hit:999};
  const near=mob('shadow_root',100,0),far=mob('shadow_root',500,0);
  const out=SK.resolve(db,'magnum_break',1,{caster:A,self:{x:0,y:0},others:[near,far],rng:RNG.make(1)});
  const dm=out.filter(o=>o.kind==='damage');assert.equal(dm.length,1);assert.equal(dm[0].ref,near.ref);assert.equal(dm[0].r.eleMod,1.5,'ไฟ vs ดิน');
  assert.ok(out.some(o=>o.kind==='knockback'&&o.ref===near.ref));});

test('resolve: provoke ติดสถานะพร้อม mods ตามเลเวล',()=>{
  const t=mob('shadow_root');const out=SK.resolve(db,'provoke',10,{caster:{hit:99},self:{x:0,y:0},primary:t,others:[t],rng:()=>0});
  assert.deepEqual(out[0],{kind:'status',ref:t.ref,status:'provoke',dur:30,mods:{defPct:-55,atkPct:32}});});

test('สถานะ: refresh ต่อเวลา ไม่ซ้อน · flags · mods · DoT',()=>{
  const st=/** @type {any} */({});ST.apply(db,st,'stun',{now:0,dur:2});ST.apply(db,st,'stun',{now:1,dur:2});
  assert.equal(st.stun.until,3);assert.equal(ST.flags(db,st,2.9).cantMove,true);assert.equal(ST.flags(db,st,3).cantMove,false);
  ST.apply(db,st,'quicken',{now:0,dur:10,mods:{aspd:30}});assert.deepEqual(ST.mods(st,5),{aspd:30});
  ST.apply(db,st,'burn',{now:0,dur:3});const d=ST.tick(db,st,5,1000);assert.equal(d.dmg,3*20,'tick ที่ 1,2,3 วิ = 2% ของ 1000 ×3');
  ST.prune(st,5);assert.deepEqual(Object.keys(st),['quicken']);});

test('withMods: provoke ลด DEF มอน',()=>{const p=RO.mobProfile(db,db.mobs.root_lord);assert.ok(RO.withMods(p,{defPct:-50}).def<p.def);});

test('บัฟ aspd ทำให้รอบตีเร็วขึ้น',()=>{const c={...ch(),job:'knight',equip:{weapon:'dark_blade'}};
  assert.ok(RO.derive(db,{...c,extra:[{aspd:30}]}).attackInterval<RO.derive(db,c).attackInterval);});

test('เปลี่ยนอาชีพ: ต้องครบ Job Lv + เควสต์ฆ่า + ไอเทม',()=>{
  const n={job:'novice',jobLv:10,jobQuest:{to:'swordman',kills:{shadow_sprout:4}}};
  assert.equal(SK.checkAdvance(db,n,'swordman',()=>0).ok,false);
  n.jobQuest.kills.shadow_sprout=5;assert.equal(SK.checkAdvance(db,n,'swordman',()=>0).ok,true);
  assert.equal(SK.checkAdvance(db,{...n,jobLv:9},'swordman',()=>0).ok,false);
  assert.equal(SK.checkAdvance(db,n,'knight',()=>0).ok,false,'ข้ามขั้นไม่ได้');
  const s={job:'swordman',jobLv:40,jobQuest:{to:'knight',kills:{thorn_wraith:10}}};
  assert.equal(SK.checkAdvance(db,s,'knight',()=>9).ok,false);assert.equal(SK.checkAdvance(db,s,'knight',()=>10).ok,true);});

test('อาวุธตามอาชีพ: โนวิซใส่ดาบสองมือไม่ได้',()=>{
  const inv=INV.create();INV.apply(db,inv,{key:'a',reason:'t',add:[{id:'dark_blade',qty:1}]});
  assert.equal(INV.equip(db,inv,inv.items[0].uid,99,SK.weaponsFor(db,'novice')).ok,false);
  assert.equal(INV.equip(db,inv,inv.items[0].uid,99,SK.weaponsFor(db,'knight')).ok,true);});
