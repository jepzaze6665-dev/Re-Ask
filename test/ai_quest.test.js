const {test}=require('node:test'),assert=require('node:assert/strict');
const AI=require('../shared/ai.js'),Q=require('../shared/quest.js'),INV=require('../shared/inventory.js'),{loadDb}=require('../tools/load_db.js');
const db=loadDb();
const ctx=o=>({dt:.1,dTarget:Infinity,dHome:0,reach:60,atkReady:true,hpPct:100,alerted:false,...o});

test('AI: มอนก้าวร้าวเห็นผู้เล่นในระยะ → ไล่ · มอนเฉยไม่ไล่จนกว่าโดนตี',()=>{
  const root={state:'idle'};AI.step(db,db.mobs.shadow_root,root,ctx({dTarget:200}));assert.equal(root.state,'chase');
  const sp={state:'idle'};AI.step(db,db.mobs.shadow_sprout,sp,ctx({dTarget:50}));assert.equal(sp.state,'idle');
  AI.step(db,db.mobs.shadow_sprout,sp,ctx({dTarget:50,alerted:true}));assert.equal(sp.state,'chase');});

test('AI: ในระยะ → ง้าง (windup) ตามเวลาของมอน → ตี · ไม่พร้อมตี = ไม่ง้าง',()=>{
  const m={state:'chase'};let a=AI.step(db,db.mobs.root_lord,m,ctx({dTarget:40,atkReady:false}));assert.equal(m.state,'chase');assert.equal(a.attack,false);
  a=AI.step(db,db.mobs.root_lord,m,ctx({dTarget:40}));assert.equal(a.windupStart,true);assert.equal(m.state,'windup');
  let t=0;while(!a.attack&&t<5){a=AI.step(db,db.mobs.root_lord,m,ctx({dTarget:40,dt:.1}));t+=.1;}
  assert.ok(Math.abs(t-0.6)<0.11,'บอสง้าง 0.6 วิ ได้ '+t);});

test('AI: ไกลจากจุดเกิดเกิน leash หรือเป้าหนีไกล → กลับบ้าน → ถึงบ้านแล้ว idle',()=>{
  const m={state:'chase'};AI.step(db,db.mobs.shadow_root,m,ctx({dTarget:100,dHome:800}));assert.equal(m.state,'return');
  const a=AI.step(db,db.mobs.shadow_root,m,ctx({dHome:10}));assert.equal(m.state,'idle');assert.equal(a.arrivedHome,true);
  const n={state:'chase'};AI.step(db,db.mobs.shadow_root,n,ctx({dTarget:9999}));assert.equal(n.state,'return');});

test('AI: ต้นอ่อนเงาเลือดต่ำกว่า 30% หนี',()=>{const m={state:'chase'};const a=AI.step(db,db.mobs.shadow_sprout,m,ctx({dTarget:40,hpPct:20}));
  assert.equal(m.state,'flee');assert.equal(a.move,'away');});

test('บอส: เฟสตาม %HP · สกิลตามเฟส · คูลดาวน์',()=>{const L=db.mobs.root_lord;
  assert.equal(AI.phaseOf(L,100),0);assert.equal(AI.phaseOf(L,60),1);assert.equal(AI.phaseOf(L,45),1);assert.equal(AI.phaseOf(L,10),2);
  assert.equal(AI.pickSkill(L,0,{},0),'slam');assert.equal(AI.pickSkill(L,0,{slam:5},1),null);
  assert.equal(AI.pickSkill(L,2,{slam:5,summon:9},1),'quake');});

test('วงเตือน: พื้นเอียง (y × 1.4)',()=>{assert.ok(AI.inCircle(0,0,100,99,0));assert.ok(!AI.inCircle(0,0,100,0,80));});

const now=new Date(2026,9,16,12).getTime(),tomorrow=new Date(2026,9,17,1).getTime();
test('เควสต์ฆ่า: รับ → นับ → ส่ง → ได้รางวัล · ส่งซ้ำไม่ได้ · รายวันรับใหม่ได้พรุ่งนี้',()=>{
  const qs={},inv=INV.create();
  assert.equal(Q.status(db,qs,inv,1,'q_sprout_cull',now),'available');assert.equal(Q.accept(db,qs,inv,1,'q_sprout_cull',now),null);
  for(let i=0;i<9;i++)Q.onEvent(db,qs,{type:'kill',mob:'shadow_sprout'});Q.onEvent(db,qs,{type:'kill',mob:'shadow_root'});
  assert.equal(Q.status(db,qs,inv,1,'q_sprout_cull',now),'active');assert.equal(Q.claim(db,qs,inv,'q_sprout_cull',now).ok,false);
  Q.onEvent(db,qs,{type:'kill',mob:'shadow_sprout'});Q.onEvent(db,qs,{type:'kill',mob:'shadow_sprout'});
  assert.deepEqual(Q.progress(db,qs,inv,'q_sprout_cull'),[{have:10,need:10}]);
  const r=Q.claim(db,qs,inv,'q_sprout_cull',now);assert.equal(r.ok,true);assert.equal(r.exp,300);assert.equal(inv.zeny,200);
  assert.equal(Q.claim(db,qs,inv,'q_sprout_cull',now).ok,false,'ส่งแล้วส่งซ้ำไม่ได้');
  assert.equal(Q.status(db,qs,inv,1,'q_sprout_cull',now),'done');assert.equal(Q.status(db,qs,inv,1,'q_sprout_cull',tomorrow),'available');
  Q.accept(db,qs,inv,1,'q_sprout_cull',tomorrow);for(let i=0;i<10;i++)Q.onEvent(db,qs,{type:'kill',mob:'shadow_sprout'});
  assert.equal(Q.claim(db,qs,inv,'q_sprout_cull',tomorrow).exp,300);assert.equal(inv.zeny,400);});

test('เควสต์เก็บของ: นับจากกระเป๋า · หักของตอนส่งในธุรกรรมเดียว · ของไม่พอส่งไม่ได้',()=>{
  const qs={},inv=INV.create();INV.apply(db,inv,{key:'g',reason:'t',add:[{id:'root_fiber',qty:7}]});
  Q.accept(db,qs,inv,5,'q_fiber',now);assert.deepEqual(Q.progress(db,qs,inv,'q_fiber'),[{have:7,need:10}]);
  assert.equal(Q.claim(db,qs,inv,'q_fiber',now).ok,false);
  INV.apply(db,inv,{key:'g2',reason:'t',add:[{id:'root_fiber',qty:5}]});
  assert.equal(Q.claim(db,qs,inv,'q_fiber',now).ok,true);assert.equal(inv.items.find(x=>x.id==='root_fiber').qty,2);
  assert.equal(inv.items.find(x=>x.id==='orange_potion').qty,3);});

test('เควสต์คุย + เลเวลไม่ถึงรับไม่ได้ + ทำครั้งเดียว',()=>{const qs={},inv=INV.create();
  assert.match(Q.accept(db,qs,inv,1,'q_root_lord',now),/Lv 10/);
  Q.accept(db,qs,inv,1,'q_intro',now);Q.onEvent(db,qs,{type:'talk',npc:'well'});assert.equal(Q.isComplete(db,qs,inv,'q_intro'),false);
  Q.onEvent(db,qs,{type:'talk',npc:'fountain'});assert.equal(Q.claim(db,qs,inv,'q_intro',now).ok,true);
  assert.equal(Q.status(db,qs,inv,1,'q_intro',tomorrow),'done','ไม่ใช่รายวัน');});
