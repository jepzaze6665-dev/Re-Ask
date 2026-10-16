// =====================================================================
//  tools/balance_sim.js — จำลองบอทฟาร์มแบบไม่มีจอ ใช้สูตรจริงจาก shared/ (ไม่มีตัวเลขของตัวเองนอกจาก "พฤติกรรมบอท")
//  ดู: เวลาถึงแต่ละเลเวล · เปลี่ยนอาชีพ · เงินเข้า/ออก · ตาย · ความยากประตูมิติแต่ละสี
//  ใช้: node tools/balance_sim.js [ชั่วโมง=30] [seed=1]
// =====================================================================
const RO=require('../shared/ro.js'),RNG=require('../shared/rng.js'),INV=require('../shared/inventory.js'),SK=require('../shared/skills.js'),RIFT=require('../shared/rift.js');
const {loadDb}=require('./load_db.js');
const db=loadDb();
// โหมด: node tools/balance_sim.js [ชั่วโมง] [seed]  ·  node tools/balance_sim.js rifts  (ใช้ตัวละครที่เซฟจากรอบฟาร์มล่าสุด ทดสอบประตูเร็วๆ)
const MODE=process.argv[2]==='rifts'?'rifts':'farm',HOURS=MODE==='farm'?+(process.argv[2]||30):0,rng=RNG.make(+(process.argv[3]||1));
const SNAP_FILE=require('path').join(__dirname,'.balance_snapshots.json');

// ---------- พฤติกรรมบอท (สมมติฐานของการจำลอง ไม่ใช่ค่าเกม) ----------
/** @type {any} */
const BOT={
  travelSec:5,            // เดินหาเป้าต่อมอน 1 ตัว
  restUntil:.8,           // พักฟื้นจนเลือดถึง 80% (ใช้ regen จริง ×3 ตามที่เกมใช้ ×0.3 ต่อวินาที... ดู regenScale)
  regenScale:.3,          // เกมฟื้น hpRegen × 0.3 ต่อวินาที (main.js)
  potAt:.35,              // กินยาเมื่อเลือดต่ำกว่า 35%
  potStock:10,            // ซื้อยาแดงให้มี 10 ขวดเสมอเมื่อมีเงิน (กลับเมืองทุก 30 นาที)
  shopEverySec:1800,
  statOrder:[['str',3],['dex',2],['vit',2],['agi',1]],  // แจกแต้มวนตามสัดส่วน
  skillOrder:['first_aid','toughness','toughness','toughness','toughness','toughness','bash','bash','bash','bash','bash','blade_mastery','blade_mastery','blade_mastery','bash','bash','bash','bash','bash','blade_mastery','blade_mastery','blade_mastery','blade_mastery','blade_mastery','blade_mastery','blade_mastery','hp_recovery','two_hand_quicken','swarm','swarm','swarm','swarm','swarm','swarm','swarm','swarm','swarm'],
  dodgeRate:.0,           // บอทไม่หลบท่าง้าง (ผู้เล่นจริงหลบได้ = ง่ายกว่านี้)
  riftEverySec:240,       // ประตูเกิดเฉลี่ยทุก 4 นาที (rifts.json) — บอทเข้าทุกครั้งที่เลเวลถึงที่แนะนำ
  riftRetreatPct:.25,     // เลือดต่ำกว่านี้ระหว่างดันแล้วไม่มียา = ออกก่อน
};

// ---------- ตัวละคร ----------
const s0=db.rules.start;
const C={job:s0.job,lv:1,jobLv:1,exp:0,jobExp:0,stats:{...s0.stats},statPoints:s0.statPoints,skillPoints:0,skills:{},inv:INV.create(),equip:{...s0.equip},codex:{}};
INV.apply(db,C.inv,{key:'start',reason:'start',zeny:s0.zeny,add:s0.bag});
let t=0,deaths=0,kills=0,potsUsed=0,lastShop=0,skillIdx=0;const log=[],kpm={},milestones=[];
const derive=()=>RO.derive(db,{...C,extra:SK.passiveBonuses(db,C,(db.items[C.equip.weapon]||{}).wtype||'fist')});
function spend(){let guard=0;while(C.statPoints>0&&guard++<500){let did=false;
    for(const [s,n] of BOT.statOrder)for(let i=0;i<n;i++){const c=RO.statCost(C.stats[s]);if(C.statPoints>=c&&C.stats[s]<99){C.statPoints-=c;C.stats[s]++;did=true;}}
    if(!did)break;}
  while(C.skillPoints>0&&skillIdx<BOT.skillOrder.length){const id=BOT.skillOrder[skillIdx];if(SK.canLearn(db,C,id).ok){SK.learn(db,C,id);}else if(!SK.skillsFor(db,C.job).includes(id))break;skillIdx++;}}
function gain(e,j){const r=RO.applyExp(db,C,e,j);const up=r.baseUp;Object.assign(C,{lv:r.lv,jobLv:r.jobLv,exp:r.exp,jobExp:r.jobExp});C.statPoints+=r.statPoints;C.skillPoints+=r.skillPoints;
  if(up)milestones.push({t,ev:`Base Lv ${C.lv}`});}
const pots=()=>C.inv.items.filter(x=>x.id==='red_potion').reduce((n,x)=>n+x.qty,0);
// เปลี่ยนอาชีพเมื่อครบ (เควสต์ฆ่า: ถือว่าระหว่างฟาร์มได้ครบเอง + เดินไปกลับ 3 นาที)
function tryAdvance(){for(const to of SK.nextJobs(db,C.job)){const a=db.jobs[to].advance;if(C.jobLv<a.jobLv)continue;
  const need=Object.entries(a.items||{});if(need.some(([id,n])=>C.inv.items.filter(x=>x.id===id).reduce((s,x)=>s+x.qty,0)<n))continue;
  for(const [id,n] of need){const s=C.inv.items.find(x=>x.id===id);INV.apply(db,C.inv,{key:'job'+to,reason:'job',remove:[{uid:s.uid,qty:n}]});}
  C.job=to;C.jobLv=1;C.jobExp=0;t+=180;
  if(a.reward)for(const r of a.reward){const it=db.items[r.id];if(it.type==='weapon')C.equip.weapon=r.id;}
  milestones.push({t,ev:`เปลี่ยนเป็น ${db.jobs[to].name} (Base Lv ${C.lv})`});}}

// ---------- ต่อสู้ 1 ตัว (ใช้ RO.physical จริง) ----------
function fight(mobId,over){const k=over||db.mobs[mobId],mp=RO.mobProfile(db,k),d={...derive(),lv:C.lv};let hp=d.hpMax*(C.hpFrac??1),sp=d.spMax,mhp=k.hp,ft=0,pa=0,ma=1+(k.ai&&k.ai.windup||db.rules.ai.windup),bashCd=0;
  const D={def:d.def,flee:d.flee,pdodge:d.pdodge,luk:d.S.luk,element:'neutral',size:'medium',race:'demihuman'};
  while(mhp>0&&ft<600){const dt=.05;ft+=dt;pa-=dt;ma-=dt;bashCd-=dt;
    if(pa<=0){const bl=C.skills.bash||0,cost=bl?SK.val(db.skills.bash.sp,bl):999;
      let r;if(bl&&sp>=cost&&bashCd<=0){sp-=cost;bashCd=db.skills.bash.cd;r=RO.physical(db,{...d,hit:d.hit+SK.val(db.skills.bash.effects[0].hitBonus,bl)},mp,{pct:SK.val(db.skills.bash.effects[0].pct,bl),rng});}
      else r=RO.physical(db,d,mp,{pct:100,rng});
      mhp-=r.dmg;pa=d.attackInterval;}
    if(mhp<=0)break;
    if(ma<=0){ma=k.aspd;if(rng()>=BOT.dodgeRate){const r=RO.physical(db,mp,D,{rng});hp-=r.dmg;}}
    if(hp<d.hpMax*BOT.potAt&&pots()>0){const s=C.inv.items.find(x=>x.id==='red_potion');INV.apply(db,C.inv,{key:'p'+t+ft,reason:'use',remove:[{uid:s.uid,qty:1}]});hp=Math.min(d.hpMax,hp+55);potsUsed++;}
    if(hp<=0)return {dead:true,time:ft};}
  C.hpFrac=hp/d.hpMax;return {dead:false,time:ft};}

// เลือกมอน: ตัวที่ได้ EXP/วินาทีดีสุดจากการลองสู้ 20 ครั้ง (ไม่นับที่ตายเกิน 10%)
function pickMob(){let best=null,bv=-1;const save={hpFrac:C.hpFrac,inv:JSON.stringify(C.inv)};
  for(const id of Object.keys(db.mobs)){if(db.mobs[id].phases)continue;let tt=0,dead=0;
    for(let i=0;i<20;i++){C.hpFrac=1;const r=fight(id);tt+=r.time+BOT.travelSec;if(r.dead)dead++;}
    C.inv=JSON.parse(save.inv);const v=db.mobs[id].exp*RO.expMult(db,C.lv,db.mobs[id].lv)/(tt/20);if(dead<=2&&v>bv){bv=v;best=id;}}
  C.hpFrac=save.hpFrac;return best||'shadow_sprout';}

// ---------- ประตูมิติ (ใช้แผนดันจริง + สูตรจริง) ----------
let lastRift=0;const riftStat={};const snapshots={};
function riftMob(T,m){const k=db.mobs[m.mob],E=db.dungeons[T.template].elite,el=m.elite;const hp=Math.round(k.hp*T.hpMult*(el?E.hpMult:1)),ap=1+(T.atkPct+(el?E.atkPct:0))/100;
  return {...k,hp,atk:[k.atk[0]*ap,k.atk[1]*ap],lv:k.lv+T.lvBonus,exp:Math.round(k.exp*T.expMult*(el?E.expMult:1)),jobExp:Math.round(k.jobExp*T.expMult*(el?E.expMult:1))};}
function bossMob(T){const B=db.dungeons[T.template].boss,k=db.mobs[B.mob],ap=1+T.atkPct/100;
  return {...k,hp:Math.round(k.hp*B.hpMult*T.bossHpMult*T.hpMult),atk:[k.atk[0]*ap,k.atk[1]*ap],lv:k.lv+T.lvBonus,exp:Math.round(k.exp*T.expMult),jobExp:Math.round(k.jobExp*T.expMult)};}
/** วิ่งดัน 1 รอบ: คืน {cleared, died, time} · simulate=false = นับผลจริง (EXP/เงิน/ตาย) */
function runRift(T,seed,apply){const plan=RIFT.plan(db,T.id,seed);let time=0;C.hpFrac=1;const need=Math.ceil(plan.mobs.length*db.dungeons[T.template].bossUnlockPct/100);let n=0;
  const rest=()=>{const d=derive();if(C.hpFrac<.6){time+=(.85-C.hpFrac)*d.hpMax/(d.hpRegen*BOT.regenScale);C.hpFrac=.85;}};
  for(const m of plan.mobs){if(n>=need)break;const k=riftMob(T,m),r=fight(m.mob,k);time+=r.time+3;if(r.dead)return {died:true,time};
    n++;if(apply){const em=RO.expMult(db,C.lv,k.lv);gain(Math.round(k.exp*em),Math.round(k.jobExp*em));}rest();}
  const b=bossMob(T),r=fight(b.id||'root_lord',b);time+=r.time;if(r.dead)return {died:true,time};
  if(apply){const em=RO.expMult(db,C.lv,b.lv);gain(Math.round(b.exp*em),Math.round(b.jobExp*em));const rw=RIFT.reward(db,T.id,rng,C.lv);gain(rw.exp,rw.jobExp);
    INV.apply(db,C.inv,{key:'rift'+t,reason:'dungeon',zeny:rw.zeny,add:rw.items});}
  return {cleared:true,time};}
function riftRun(){const T=RIFT.rollTier(db,rng);if(C.lv<T.recLv)return;const sv=JSON.stringify(C.inv);
  const r=runRift(T,Math.floor(rng()*1e9),true);t+=r.time;const s=riftStat[T.id]||(riftStat[T.id]={runs:0,clear:0,died:0,time:0});s.runs++;s.time+=r.time;
  if(r.cleared)s.clear++;else{s.died++;deaths++;C.inv=JSON.parse(sv);C.exp=Math.max(0,C.exp-Math.floor(RO.baseExpNeed(db,C.lv)*db.rules.deathExpLoss));t+=60;}C.hpFrac=1;spend();tryAdvance();}

let target=pickMob(),lastPick=0;
while(t<HOURS*3600){
  if(t-lastPick>600){target=pickMob();lastPick=t;}
  if(t-lastShop>BOT.shopEverySec){lastShop=t;const need=BOT.potStock-pots(),p=db.items.red_potion.price;const n=Math.min(need,Math.floor(C.inv.zeny/p));
    if(n>0)INV.apply(db,C.inv,{key:'shop'+t,reason:'shop:buy',zeny:-n*p,add:[{id:'red_potion',qty:n}]});
    const junk=C.inv.items.filter(x=>db.items[x.id].type==='etc'&&x.id!=='shadow_jelly'&&x.id!=='refine_ore');
    for(const j of junk)INV.apply(db,C.inv,{key:'sell'+t+j.uid,reason:'shop:sell',zeny:Math.floor(db.items[j.id].price*db.shops.sellRate)*j.qty,remove:[{uid:j.uid,qty:j.qty}]});t+=120;}
  const d=derive();
  if((C.hpFrac??1)<BOT.restUntil){const need=(BOT.restUntil-(C.hpFrac??1))*d.hpMax;t+=need/(d.hpRegen*BOT.regenScale);C.hpFrac=BOT.restUntil;}
  const r=fight(target);t+=r.time+BOT.travelSec;
  if(r.dead){deaths++;C.exp=Math.max(0,C.exp-Math.floor(RO.baseExpNeed(db,C.lv)*db.rules.deathExpLoss));C.hpFrac=1;t+=60;continue;}
  kills++;kpm[target]=(kpm[target]||0)+1;const k=db.mobs[target],em=RO.expMult(db,C.lv,k.lv);gain(Math.round(k.exp*em),Math.round(k.jobExp*em));
  if(t-lastRift>BOT.riftEverySec){lastRift=t;riftRun();}
  const dr=INV.rollDrops(db,k,derive().S.luk,rng);INV.apply(db,C.inv,{key:'k'+kills,reason:'zeny:kill',zeny:dr.zeny,add:dr.items.filter(x=>db.items[x.id].type!=='weapon'&&db.items[x.id].type!=='armor').map(x=>({id:x.id,qty:x.qty}))});
  spend();tryAdvance();
  if(!snapshots['lv'+C.lv])snapshots['lv'+C.lv]=JSON.stringify(C);
  if(kills%400===0)log.push({h:(t/3600).toFixed(1),lv:C.lv,job:db.jobs[C.job].name+' '+C.jobLv,target:db.mobs[target].name,zeny:C.inv.zeny,deaths});}

// ---------- รายงาน ----------
const fmt=s=>{const h=Math.floor(s/3600),m=Math.round(s%3600/60);return h?`${h}ชม ${m}น`:`${m} นาที`;};
if(MODE==='farm'){
console.log(`\n=== จำลองฟาร์ม ${HOURS} ชั่วโมง (บอทไม่หลบท่าง้าง, ไม่ใช้สกิลนอกจากฟาดสุดแรง, ไม่ใส่ของดรอป) ===`);
for(const m of milestones)if(/อาชีพ|Lv (5|10|15|20|25|30|35|40|45|50)$/.test(m.ev)||m.ev.includes('เปลี่ยน'))console.log(` ${fmt(m.t).padStart(10)}  ${m.ev}`);
console.log(`\nจบที่ Base Lv ${C.lv} · ${db.jobs[C.job].name} Job ${C.jobLv} · ฆ่า ${kills} ตัว · ตาย ${deaths} · ยาใช้ ${potsUsed}`);
console.log('ฆ่าแยกชนิด:',Object.entries(kpm).map(([k,v])=>`${db.mobs[k].name} ${v}`).join(' · '));
console.log(`เงินคงเหลือ ${C.inv.zeny} z · เข้า`,C.inv.stats.src,'· ออก',C.inv.stats.sink);
console.log('สเตตัส',C.stats,'· ATK',derive().atk,'· HP',derive().hpMax,'· รอบตี',derive().attackInterval.toFixed(2));

console.log('\n=== ประตูมิติที่บอทเข้าระหว่างฟาร์ม ===');
for(const T of db.rifts.tiers){const s=riftStat[T.id];console.log(` สี${T.name}: ${s?`เข้า ${s.runs} · จบ ${s.clear} · ตาย ${s.died} · เฉลี่ย ${fmt(s.time/s.runs)}`:'ไม่ได้เข้า'}`);}
require('fs').writeFileSync(SNAP_FILE,JSON.stringify(snapshots));}
else Object.assign(snapshots,JSON.parse(require('fs').readFileSync(SNAP_FILE,'utf8')));

// ---------- ประตูมิติ: ตายกี่ % ที่เลเวลแนะนำ และ +5 (30 รอบต่อจุด) ----------
console.log('\n=== ประตูมิติ: บอท (ไม่หลบท่า) ที่ Lv แนะนำ / +5 ===');
for(const T of db.rifts.tiers){const row=[];
  for(const lv of (process.env.LVS?process.env.LVS.split(",").map(Number):[T.recLv,T.recLv+5])){const sn=snapshots['lv'+lv];if(!sn){row.push(`Lv ${lv}: -`);continue;}let died=0,tt=0;const N=30;
    for(let i=0;i<N;i++){Object.assign(C,JSON.parse(sn));const r=runRift(T,5000+i,false);if(r.died)died++;tt+=r.time;}
    row.push(`Lv ${lv} ${db.jobs[JSON.parse(sn).job].name}: ตาย ${Math.round(died/N*100)}% ${fmt(tt/N)}`);}
  console.log(` สี${T.name} (${T.rank}) · ${row.join(' | ')}`);}
