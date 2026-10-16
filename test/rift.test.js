const {test}=require('node:test'),assert=require('node:assert/strict');
const RIFT=require('../shared/rift.js'),DG=require('../shared/dungeon.js'),SH=require('../shared/shadow.js'),RNG=require('../shared/rng.js'),{loadDb}=require('../tools/load_db.js');
const db=loadDb();

test('สีประตูเริ่มที่น้ำเงิน · สุ่มตามน้ำหนัก · แดงหายากสุด',()=>{
  assert.deepEqual(db.rifts.tiers.map(t=>t.id),['blue','purple','gold','red']);
  const rng=RNG.make(1),n={blue:0,purple:0,gold:0,red:0},N=40000;for(let i=0;i<N;i++)n[RIFT.rollTier(db,rng).id]++;
  const sum=db.rifts.tiers.reduce((a,t)=>a+t.weight,0);
  for(const t of db.rifts.tiers)assert.ok(Math.abs(n[t.id]/N-t.weight/sum)<0.01,t.id+' '+n[t.id]/N);
  assert.ok(n.red<n.gold&&n.gold<n.purple&&n.purple<n.blue);});

test('สีสูง = โหดขึ้นและรางวัลมากขึ้นทุกด้าน',()=>{const T=db.rifts.tiers;
  for(let i=1;i<T.length;i++)for(const k of ['hpMult','atkPct','eliteChance','rewardMult','shadowMult','recLv'])assert.ok(T[i][k]>T[i-1][k],`${T[i].id}.${k}`);});

test('ตำแหน่งประตู: ไม่อยู่ในเขตปลอดภัย · ไม่ใกล้ผู้เล่น · ไม่ใกล้ประตูอื่น',()=>{
  const map={W:2600,H:1700,safe:{x:1300,y:850,r:420}},rng=RNG.make(3);
  for(let i=0;i<300;i++){const others=[{x:600,y:400}],pl={x:1000+rng()*500,y:800},p=RIFT.place(db,map,pl,others,rng);if(!p)continue;
    assert.ok(Math.hypot(p.x-1300,p.y-850)>=420);assert.ok(Math.hypot(p.x-pl.x,p.y-pl.y)>=db.rifts.safeFromPlayer);assert.ok(Math.hypot(p.x-600,p.y-400)>=400);}});

test('แผนดันของประตูใช้ template ตามสี และอัตรามอนดุร้ายตามสี',()=>{
  let e=0,t=0;for(let s=1;s<=200;s++){const p=RIFT.plan(db,'red',s);assert.equal(p.id,'deep_roots');for(const m of p.mobs){t++;if(m.elite)e++;}}
  assert.ok(Math.abs(e/t*100-50)<4,'แดง ~50% ได้ '+e/t*100);
  assert.deepEqual(RIFT.plan(db,'blue',9),DG.generate(db,'shadow_hollow',9,{eliteChance:15}));});

test('รางวัลประตู = template × rewardMult + ของเพิ่ม',()=>{
  const b=DG.rollReward(db,'shadow_hollow',RNG.make(4)),r=RIFT.reward(db,'purple',RNG.make(4));
  assert.equal(r.zeny,Math.round(b.zeny*4));assert.equal(r.exp,Math.round(b.exp*4));assert.ok(r.items.filter(x=>x.id==='refine_ore').length>=2);});

test('โอกาสดรอปเงาอสูรคูณตามสี',()=>{let a=0,b=0;const r1=RNG.make(8),r2=RNG.make(8),N=100000;
  for(let i=0;i<N;i++){if(SH.roll(db,'shadow_root',0,r1))a++;if(SH.roll(db,'shadow_root',0,r2,8))b++;}
  assert.ok(b/a>6&&b/a<10,'อัตราส่วน '+b/a);});
