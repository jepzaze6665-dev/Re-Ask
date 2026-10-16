// =====================================================================
//  game/rpg.js — ข้อมูลตัวละคร: สเตตัส เลเวล กระเป๋า ช่องสวมใส่ เงิน เซฟ (offline)
//  ตัวเลขทั้งหมดมาจาก data/db/*.json · สูตรอยู่ใน shared/ro.js · เงิน/ของผ่าน shared/inventory.js (INV.apply) เท่านั้น
//  ตอนทำเซิร์ฟเวอร์: ฟังก์ชันที่แก้ inv/exp ในไฟล์นี้ย้ายไปฝั่ง server แล้ว client เหลือแค่ส่งคำขอ
// =====================================================================
const RPG=(()=>{
const SAVE_KEY='reask_save_v1';   // key เดิม · ข้างในมีเลขเวอร์ชัน (v) และย้ายข้อมูลเก่าให้อัตโนมัติ
const db={};
const strip=o=>{const r={};for(const k in o)if(k[0]!=='_')r[k]=o[k];return r;};
async function load(){
  const get=f=>fetch('data/db/'+f+'.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(f+'.json '+r.status);return r.json();});
  const [rules,jobs,skills,items,mobs,shadows,statuses,refine,codex,shops,quests,dungeons,rifts,map,town]=await Promise.all(['rules','jobs','skills','items','mobs','shadows','statuses','refine','codex','shops','quests','dungeons','rifts','maps/dark_root','maps/town'].map(get));
  Object.assign(db,{rules,jobs:strip(jobs),skills:strip(skills),items:strip(items),mobs:strip(mobs),shadows:strip(shadows),statuses:strip(statuses),refine,codex,shops,quests:strip(quests),dungeons:strip(dungeons),rifts,map,maps:{dark_root:map,town}});
  SHADOW.installItems(db);   // เงาอสูรเป็นไอเทม
  const errs=VALIDATE.validateDb(db);if(errs.length)console.warn('data/db มีปัญหา:\n'+errs.join('\n'));
  return db;}

// สุ่มของเกม (มี seed → ตรวจย้อนหลังได้) · ตอนออนไลน์เซิร์ฟเวอร์ถือ seed เอง
const seed=(crypto.getRandomValues(new Uint32Array(1))[0])>>>0;
const rng=RNG.make(seed);

// ---------- ตัวละคร ----------
let C=null;          // ตัวละคร (ฝากไว้บนตัว rig P ด้วย Object.assign)
const listeners=[];const changed=()=>listeners.forEach(f=>f());
const SAVE_FIELDS=['name','job','lv','jobLv','exp','jobExp','stats','statPoints','skillPoints','skills','inv','nonce','jobQuest','codex','storage','qs','hotbar'];
const nonce=()=>Math.random().toString(36).slice(2,10);
function newInv(s){const inv=INV.create();
  INV.apply(db,inv,{key:'start',reason:'start',zeny:s.zeny,add:[...s.bag.map(b=>({id:b.id,qty:b.qty})),...Object.values(s.equip).map(id=>({id,qty:1}))]});
  for(const [slot,id] of Object.entries(s.equip)){const it=inv.items.find(x=>x.id===id&&!x.eq);if(it)it.eq=slot;}
  return inv;}
function newChar(){const s=db.rules.start;
  return {name:s.name,job:s.job,lv:1,jobLv:1,exp:0,jobExp:0,stats:{...s.stats},statPoints:s.statPoints,skillPoints:0,skills:{...s.skills},inv:newInv(s),nonce:nonce()};}
// เซฟ v1 (bag [{id,qty}] + equip {slot:id}) → v2 (inv แบบ instance)
function migrate(saved){if(!saved)return null;if(saved.v===2)return saved.c;
  if(saved.v===1){const c=saved.c,inv=INV.create();
    INV.apply(db,inv,{key:'migrate-v1',reason:'migrate',zeny:c.zeny||0,add:[...c.bag.filter(b=>db.items[b.id]).map(b=>({id:b.id,qty:b.qty})),...Object.values(c.equip).filter(id=>id&&db.items[id]).map(id=>({id,qty:1}))]});
    for(const [slot,id] of Object.entries(c.equip)){const it=id&&inv.items.find(x=>x.id===id&&!x.eq);if(it)it.eq=slot;}
    delete c.bag;delete c.equip;delete c.zeny;c.inv=inv;c.nonce=nonce();
    c.lv=Math.min(c.lv,db.rules.baseLvMax);return c;}
  return null;}
function bind(P){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){}
  C=P;Object.assign(P,migrate(saved)||newChar());P.st=P.st||{};P.cds=P.cds||{};P.jobQuest=P.jobQuest||null;P.codex=P.codex||{};P.storage=P.storage||INV.create();P.qs=P.qs||{};
  recalc(true);return P;}
function save(){if(!C)return;try{const c={};for(const k of SAVE_FIELDS)c[k]=C[k];localStorage.setItem(SAVE_KEY,JSON.stringify({v:2,c}));}catch(e){}}
function wipe(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}location.reload();}
const equipIds=()=>INV.equipIds(C.inv);
function recalc(full){const hpR=C.hpMax?C.hp/C.hpMax:1,spR=C.spMax?C.sp/C.spMax:1;
  const eq=equipIds(),w=eq.weapon?db.items[eq.weapon].wtype:'fist';
  const extra=[...SKILLS.passiveBonuses(db,C,w),STATUS.mods(C.st||{},typeof SKG!=='undefined'?SKG.now():0),   // สกิลติดตัว + บัฟ
    ...SHADOW.sealBonuses(db,C.inv),...REFINE.bonuses(db,C.inv),...REFINE.codexBonuses(db,C.codex||{})];        // เงาที่ผนึก + ตีบวก + สมุดล่า
  C.d=RO.derive(db,{job:C.job,lv:C.lv,jobLv:C.jobLv,stats:C.stats,equip:eq,extra});C.hpMax=C.d.hpMax;C.spMax=C.d.spMax;
  C.hp=full?C.hpMax:Math.min(C.hpMax,Math.round(C.hpMax*hpR));C.sp=full?C.spMax:Math.min(C.spMax,Math.round(C.spMax*spR));
  changed();}
// โปรไฟล์ที่ใช้ใน RO.physical (ฝั่งโจมตี/ฝั่งรับ)
const attacker=()=>({...C.d,lv:C.lv});
const defender=()=>({def:C.d.def,flee:C.d.flee,pdodge:C.d.pdodge,luk:C.d.S.luk,element:'neutral',size:'medium',race:'demihuman'});

// ---------- EXP (ฟังก์ชันล้วน RO.applyExp) ----------
let killSeq=0;
const newKillId=()=>`${C.nonce}:${++killSeq}`;   // id ไม่ซ้ำต่อการฆ่า 1 ครั้ง → ใช้เป็น idempotency key ของรางวัล
const rewarded=new Set();
function gainExp(base,job,say,key){
  if(key){if(rewarded.has(key))return false;rewarded.add(key);}
  const r=RO.applyExp(db,C,base,job);
  Object.assign(C,{lv:r.lv,jobLv:r.jobLv,exp:r.exp,jobExp:r.jobExp});C.statPoints+=r.statPoints;C.skillPoints+=r.skillPoints;
  if(r.baseUp||r.jobUp){recalc(r.baseUp>0);save();say&&say(r.baseUp?`เลเวลอัป! Base Lv ${C.lv}`+(r.jobUp?` · Job Lv ${C.jobLv}`:''):`Job Lv ${C.jobLv}! ได้แต้มสกิล`);}
  else changed();
  return r.baseUp>0;}
function deathPenalty(){C.exp=Math.max(0,C.exp-Math.floor(RO.baseExpNeed(db,C.lv)*db.rules.deathExpLoss));save();changed();}

// ---------- แจกแต้ม ----------
function raiseStat(s,n=1){let ok=false;
  for(let i=0;i<n;i++){const v=C.stats[s],cost=RO.statCost(v);if(v>=db.rules.statMax||C.statPoints<cost)break;C.statPoints-=cost;C.stats[s]++;ok=true;}
  if(ok){recalc();save();}return ok;}
function raiseSkill(id){const r=SKILLS.learn(db,C,id);if(!r.ok)return r.err;recalc();save();return null;}
// รีเซ็ตสเตตัส: ลด stat กลับถึงค่าเริ่มต้นแล้วคืนแต้มตามราคาจริง
function resetStats(){const base=db.rules.start.stats;let n=0;
  for(const s of RO.STATS)while(C.stats[s]>base[s]){C.stats[s]--;n+=RO.statCost(C.stats[s]);}C.statPoints+=n;recalc();save();return n;}

// ---------- เงิน & ของ (ทุกอย่างผ่าน INV.apply) ----------
/** @returns {string|null} ข้อความผิดพลาด หรือ null เมื่อสำเร็จ (key ซ้ำ = สำเร็จแต่ไม่ทำซ้ำ) */
function tx(t){const r=INV.apply(db,C.inv,t,{weightMax:C.d.weightMax,now:Date.now()});if(!r.ok)return r.err;if(!r.dup){save();changed();}return null;}
const weight=()=>INV.weight(db,C.inv);
const bag=()=>C.inv.items.filter(x=>!x.eq);
const equippedItem=slot=>INV.equipped(C.inv,slot);
const item=uid=>C.inv.items.find(x=>x.uid===uid);
function equip(uid){const r=INV.equip(db,C.inv,uid,C.lv,SKILLS.weaponsFor(db,C.job));if(!r.ok)return r.err;recalc();save();return null;}
function unequip(slot){if(INV.unequip(C.inv,slot).ok){recalc();save();}}
let useSeq=0;
function use(uid){const s=item(uid),it=s&&db.items[s.id];if(!it)return null;
  if(it.type!=='use')return equip(uid);
  const r=([a,b])=>Math.round(a+rng()*(b-a)),out={};
  if(it.use.reset){const err=tx({key:`use:${C.nonce}:${++useSeq}`,reason:'reset:'+it.use.reset,remove:[{uid,qty:1}]});if(err)return err;
    const n=it.use.reset==='stats'?resetStats():(SKILLS.resetSkills(C),recalc(),save(),C.skillPoints);return {reset:it.use.reset,n};}
  if(it.use.hp&&C.hp>=C.hpMax&&!it.use.sp)return 'HP เต็มแล้ว';
  if(it.use.sp&&C.sp>=C.spMax&&!it.use.hp)return 'SP เต็มแล้ว';
  const err=tx({key:`use:${C.nonce}:${++useSeq}`,reason:'use',remove:[{uid,qty:1}]});if(err)return err;
  if(it.use.hp){out.hp=Math.min(C.hpMax-C.hp,r(it.use.hp));C.hp+=out.hp;}
  if(it.use.sp){out.sp=Math.min(C.spMax-C.sp,r(it.use.sp));C.sp+=out.sp;}
  changed();return out;}
const findUsable=kind=>bag().find(s=>{const u=db.items[s.id].use;return u&&u[kind];})||null;

// ---------- รางวัลจากการฆ่า ----------
// zeny เข้ากระเป๋าทันที · ไอเทมตกพื้น (แต่ละชิ้นมี key ของตัวเอง → เก็บซ้ำไม่ได้)
function killReward(mob,killId,say,mobId,shadowMult=1){
  const em=RO.expMult(db,C.lv,mob.lv);   // มอนเลเวลต่ำกว่ามาก = EXP น้อยลง
  gainExp(Math.round(mob.exp*em),Math.round(mob.jobExp*em),say,'exp:'+killId);
  const d=INV.rollDrops(db,mob,C.d.S.luk,rng);
  const sh=mobId&&SHADOW.roll(db,mobId,C.d.S.luk,rng,shadowMult);if(sh)d.items.push(sh);   // เงาอสูร (ลุ้นล้วน)
  if(mobId){const before=REFINE.tier(db,mobId,C.codex[mobId]||0);C.codex[mobId]=(C.codex[mobId]||0)+1;
    if(db.codex.mobs[mobId]&&REFINE.tier(db,mobId,C.codex[mobId])>before){recalc();say&&say(`สมุดล่า: ${mob.name} ขั้น ${before+1}!`);}}
  if(d.zeny)tx({key:'zeny:'+killId,reason:'kill:'+mob.name,zeny:d.zeny});
  return {zeny:d.zeny,items:d.items.map((it,i)=>({...it,key:`drop:${killId}:${i}`}))};}
// ---------- เปลี่ยนอาชีพ (กิลด์ในเมือง) ----------
const countItem=id=>bag().filter(x=>x.id===id).reduce((n,x)=>n+x.qty,0);
function startJobQuest(to){if(!db.jobs[to]||db.jobs[to].parent!==C.job)return 'รับเควสต์นี้ไม่ได้';
  if(C.jobQuest&&C.jobQuest.to===to)return null;C.jobQuest={to,kills:{}};save();changed();return null;}
function onKill(mobId){const q=C.jobQuest;if(!q)return;const need=(db.jobs[q.to].advance.kills||{})[mobId];if(!need)return;
  q.kills[mobId]=Math.min(need,(q.kills[mobId]||0)+1);changed();}
/** เปลี่ยนอาชีพ: ตรวจเงื่อนไข → ใช้ไอเทม + รับรางวัลในธุรกรรมเดียว (key ไม่ซ้ำต่ออาชีพ) → Job Lv 1 */
function advanceJob(to){const chk=SKILLS.checkAdvance(db,C,to,countItem);if(!chk.ok)return chk.missing.join(' · ');
  const a=db.jobs[to].advance,remove=[];
  for(const [id,n] of Object.entries(a.items||{})){let left=n;for(const s of bag().filter(x=>x.id===id)){const q=Math.min(left,s.qty);remove.push({uid:s.uid,qty:q});left-=q;if(!left)break;}}
  const err=INV.apply(db,C.inv,{key:`job:${C.nonce}:${to}`,reason:'job:'+to,remove,add:(a.reward||[]).map(r=>({id:r.id,qty:r.qty}))},{now:Date.now()});
  if(!err.ok)return err.err;
  C.job=to;C.jobLv=1;C.jobExp=0;C.jobQuest=null;recalc();save();return null;}
function pickup(g){return tx({key:g.key,reason:'pickup',add:[{id:g.id,qty:g.qty,sockets:g.sockets,attrs:g.attrs}]});}

// ---------- เงาอสูร & ตีบวก (shared/shadow.js, shared/refine.js) ----------
let opSeq=0;const opKey=op=>`${op}:${C.nonce}:${Date.now()}:${++opSeq}`;
const after=r=>{if(r.ok&&!r.dup){recalc();save();}return r;};
const sealShadow=(equipUid,idx,shadowUid)=>after(SHADOW.seal(db,C.inv,opKey('seal'),equipUid,idx,shadowUid));
const unsealShadow=(equipUid,idx)=>after(SHADOW.unseal(db,C.inv,opKey('unseal'),equipUid,idx,rng));
const fuseShadow=(a,b)=>after(SHADOW.fuse(db,C.inv,opKey('fuse'),a,b,rng));
const refineItem=uid=>after(REFINE.refine(db,C.inv,opKey('refine'),uid,rng));
// เรียกเงา: ไอเทมถูกทำเครื่องหมาย eq='summon' (ขาย/ผนึก/รวมไม่ได้ระหว่างเรียก) · ได้ทีละ 1 ตัว
const summoned=()=>INV.equipped(C.inv,'summon');
function summon(uid){if(!db.shadows.rules.summonEnabled)return 'ระบบเรียกเงายังไม่เปิด';const s=item(uid);if(!s||db.items[s.id].type!=='shadow')return 'เรียกไม่ได้';const cur=summoned();if(cur)cur.eq=null;s.eq='summon';save();changed();return null;}
// ---------- ร้าน / โรงแรม / คลัง (shared/shop.js) ----------
const buy=(shopId,id,qty)=>after(SHOP.buy(db,C.inv,opKey('buy'),shopId,id,qty,{weightMax:C.d.weightMax}));
const sell=(uid,qty)=>after(SHOP.sell(db,C.inv,opKey('sell'),uid,qty));
function rest(){const r=SHOP.rest(db,C.inv,opKey('rest'));if(r.ok){C.hp=C.hpMax;C.sp=C.spMax;save();changed();}return r;}
let storageOpen=false;   // จ่ายค่าเปิดคลังครั้งเดียวต่อการเปิดหน้าต่าง
function openStorage(){if(storageOpen)return {ok:true};const r=SHOP.storageFee(db,C.inv,opKey('storage'));if(r.ok){storageOpen=true;save();changed();}return r;}
const closeStorage=()=>{storageOpen=false;};
const deposit=(uid,qty)=>storageOpen?after(SHOP.transfer(db,C.inv,C.storage,opKey('dep'),uid,qty,{toSlots:db.shops.inn.storageSlots})):{ok:false,err:'เปิดคลังก่อน'};
const withdraw=(uid,qty)=>storageOpen?after(SHOP.transfer(db,C.storage,C.inv,opKey('wd'),uid,qty,{toWeightMax:C.d.weightMax})):{ok:false,err:'เปิดคลังก่อน'};
// ---------- เควสต์ (shared/quest.js) ----------
const questStatus=id=>QUEST.status(db,C.qs,C.inv,C.lv,id,Date.now());
function questAccept(id){const e=QUEST.accept(db,C.qs,C.inv,C.lv,id,Date.now());if(!e){save();changed();}return e;}
function questClaim(id,say){const r=QUEST.claim(db,C.qs,C.inv,id,Date.now(),{weightMax:C.d.weightMax});if(!r.ok)return r.err;
  if(!r.dup&&(r.exp||r.jobExp))gainExp(r.exp,r.jobExp,say,'questexp:'+id+':'+QUEST.dayOf(Date.now()));save();changed();return null;}
function questEvent(ev,say){const hit=QUEST.onEvent(db,C.qs,ev);if(!hit.length)return;save();changed();
  for(const id of hit)if(QUEST.isComplete(db,C.qs,C.inv,id))say&&say(`เควสต์ "${db.quests[id].name}" สำเร็จ! กลับไปส่งที่กระดาน`);}
// ---------- ดันเจี้ยน (shared/dungeon.js) ----------
/** รับรางวัลจบดัน (key ต่อรอบ) → null = สำเร็จ, ข้อความ = ผิดพลาด */
function dungeonClaim(runKey,rw,say){const r=DUNGEON.claim(db,C.inv,runKey,rw,{weightMax:C.d.weightMax});if(!r.ok)return r.err;
  if(!r.dup)gainExp(rw.exp,rw.jobExp,say,'dungeonexp:'+runKey);save();changed();return null;}
function unsummon(){const cur=summoned();if(cur){cur.eq=null;save();changed();}}

return {db,rng,load,bind,save,wipe,recalc,attacker,defender,newKillId,gainExp,killReward,pickup,deathPenalty,raiseStat,raiseSkill,resetStats,
  countItem,startJobQuest,onKill,advanceJob,sealShadow,unsealShadow,fuseShadow,refineItem,summon,unsummon,summoned,buy,sell,rest,dungeonClaim,questStatus,questAccept,questClaim,questEvent,openStorage,closeStorage,deposit,withdraw,
  tx,weight,bag,equippedItem,item,equip,unequip,use,findUsable,onChange:f=>listeners.push(f),get C(){return C;}};
})();
