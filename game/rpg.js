// =====================================================================
//  game/rpg.js — ข้อมูลตัวละคร: สเตตัส เลเวล กระเป๋า ช่องสวมใส่ เซฟ (offline)
//  ตัวเลขทั้งหมดมาจาก data/db/*.json · สูตรอยู่ใน shared/ro.js
// =====================================================================
const RPG=(()=>{
const SAVE_KEY='reask_save_v1';
const db={};
const strip=o=>{const r={};for(const k in o)if(k[0]!=='_')r[k]=o[k];return r;};
async function load(){
  const get=f=>fetch('data/db/'+f+'.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(f+'.json '+r.status);return r.json();});
  const [rules,jobs,skills,items,mobs,map]=await Promise.all(['rules','jobs','skills','items','mobs','maps/dark_root'].map(get));
  Object.assign(db,{rules,jobs,skills:strip(skills),items:strip(items),mobs:strip(mobs),map});
  return db;}

// ---------- ตัวละคร ----------
let C=null;          // ตัวละคร (ฝากไว้บนตัว rig P ด้วย Object.assign)
const listeners=[];const changed=()=>listeners.forEach(f=>f());
function newChar(){const s=db.rules.start;
  return {name:s.name,job:s.job,lv:1,jobLv:1,exp:0,jobExp:0,stats:{...s.stats},statPoints:s.statPoints,skillPoints:0,
    skills:{...s.skills},zeny:s.zeny,bag:s.bag.map(x=>({...x})),equip:{...s.equip}};}
function bind(P){
  let saved=null;try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(e){}
  C=P;Object.assign(P,saved&&saved.v===1?saved.c:newChar());
  recalc(true);return P;}
function save(){if(!C)return;try{const c={};for(const k of ['name','job','lv','jobLv','exp','jobExp','stats','statPoints','skillPoints','skills','zeny','bag','equip'])c[k]=C[k];
  localStorage.setItem(SAVE_KEY,JSON.stringify({v:1,c}));}catch(e){}}
function wipe(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}location.reload();}
function recalc(full){const hpR=C.hpMax?C.hp/C.hpMax:1,spR=C.spMax?C.sp/C.spMax:1;
  C.d=RO.derive(db,C);C.hpMax=C.d.hpMax;C.spMax=C.d.spMax;
  C.hp=full?C.hpMax:Math.min(C.hpMax,Math.round(C.hpMax*hpR));C.sp=full?C.spMax:Math.min(C.spMax,Math.round(C.spMax*spR));
  changed();}
// โปรไฟล์ที่ใช้ใน RO.physical (ฝั่งโจมตี/ฝั่งรับ)
const attacker=()=>({...C.d,lv:C.lv});
const defender=()=>({def:C.d.def,softDef:C.d.softDef,flee:C.d.flee,pdodge:C.d.pdodge,luk:C.d.S.luk,element:'neutral',size:'medium',race:'demihuman'});

// ---------- EXP ----------
function gainExp(base,job,say){
  C.exp+=base;C.jobExp+=job;let up=false,jup=false;
  while(C.lv<db.rules.baseLvMax&&C.exp>=RO.baseExpNeed(db,C.lv)){C.exp-=RO.baseExpNeed(db,C.lv);C.lv++;C.statPoints+=RO.statPointsOnLevel(C.lv);up=true;}
  const jmax=db.jobs[C.job].jobLvMax;
  while(C.jobLv<jmax&&C.jobExp>=RO.jobExpNeed(db,C.jobLv)){C.jobExp-=RO.jobExpNeed(db,C.jobLv);C.jobLv++;C.skillPoints++;jup=true;}
  if(C.jobLv>=jmax)C.jobExp=0;
  if(up||jup){recalc(up);save();say&&say(up?`เลเวลอัป! Base Lv ${C.lv}`+(jup?` · Job Lv ${C.jobLv}`:''):`Job Lv ${C.jobLv}! ได้แต้มสกิล`);}
  else changed();
  return up;}
function deathPenalty(){C.exp=Math.max(0,C.exp-Math.floor(RO.baseExpNeed(db,C.lv)*db.rules.deathExpLoss));save();changed();}

// ---------- แจกแต้ม ----------
function raiseStat(s,n=1){let ok=false;
  for(let i=0;i<n;i++){const v=C.stats[s],cost=RO.statCost(v);if(v>=db.rules.statMax||C.statPoints<cost)break;C.statPoints-=cost;C.stats[s]++;ok=true;}
  if(ok){recalc();save();}return ok;}
function raiseSkill(id){const sk=db.skills[id],lv=C.skills[id]||0;if(!sk||C.skillPoints<1||lv>=sk.maxLv)return false;
  C.skills[id]=lv+1;C.skillPoints--;save();changed();return true;}

// ---------- กระเป๋า ----------
const weight=()=>C.bag.reduce((w,s)=>w+(db.items[s.id].weight||0)*s.qty,0)+Object.values(C.equip).reduce((w,id)=>w+(id?db.items[id].weight||0:0),0);
function addItem(id,qty=1){const it=db.items[id];if(!it)return 'ไม่รู้จักไอเทม';
  if(weight()+(it.weight||0)*qty>C.d.weightMax)return 'น้ำหนักเกิน!';
  const stack=it.type==='use'||it.type==='etc';const s=stack&&C.bag.find(x=>x.id===id);
  if(s)s.qty+=qty;else if(stack)C.bag.push({id,qty});else for(let i=0;i<qty;i++)C.bag.push({id,qty:1});
  save();changed();return null;}
function takeFromBag(i,qty=1){const s=C.bag[i];s.qty-=qty;if(s.qty<=0)C.bag.splice(i,1);}
function slotFor(it){if(it.type==='weapon')return 'weapon';if(it.slot==='acc')return C.equip.acc1&&!C.equip.acc2?'acc2':'acc1';return it.slot;}
function equip(i){const s=C.bag[i],it=s&&db.items[s.id];if(!it||(it.type!=='weapon'&&it.type!=='armor'))return 'สวมใส่ไม่ได้';
  if(it.lvReq&&C.lv<it.lvReq)return `ต้องการ Base Lv ${it.lvReq}`;
  const two=db.rules.twoHanded;
  if(it.slot==='shield'&&C.equip.weapon&&two.includes(db.items[C.equip.weapon].wtype))return 'ใช้โล่คู่กับอาวุธสองมือไม่ได้';
  const slot=slotFor(it);takeFromBag(i);
  if(C.equip[slot])C.bag.push({id:C.equip[slot],qty:1});
  C.equip[slot]=s.id;
  if(it.type==='weapon'&&two.includes(it.wtype)&&C.equip.shield){C.bag.push({id:C.equip.shield,qty:1});C.equip.shield=null;}
  recalc();save();return null;}
function unequip(slot){if(!C.equip[slot])return;C.bag.push({id:C.equip[slot],qty:1});C.equip[slot]=null;recalc();save();}
function use(i){const s=C.bag[i],it=s&&db.items[s.id];if(!it)return null;
  if(it.type!=='use')return equip(i);
  const r=([a,b])=>Math.round(a+Math.random()*(b-a));let out={};
  if(it.use.hp){if(C.hp>=C.hpMax)return 'HP เต็มแล้ว';out.hp=Math.min(C.hpMax-C.hp,r(it.use.hp));C.hp+=out.hp;}
  if(it.use.sp){if(C.sp>=C.spMax&&!it.use.hp)return 'SP เต็มแล้ว';out.sp=Math.min(C.spMax-C.sp,r(it.use.sp));C.sp+=out.sp;}
  takeFromBag(i);save();changed();return out;}
const findUsable=kind=>C.bag.findIndex(s=>{const u=db.items[s.id].use;return u&&u[kind];});

// ---------- ดรอป ----------
function rollDrops(mob){const out=[],m=1+C.d.S.luk*db.rules.dropLukBonus;
  for(const d of mob.drops||[])if(Math.random()*100<d.rate*m)out.push(d.item);return out;}

return {db,load,bind,save,wipe,recalc,attacker,defender,gainExp,deathPenalty,raiseStat,raiseSkill,weight,addItem,equip,unequip,use,findUsable,rollDrops,
  onChange:f=>listeners.push(f),get C(){return C;}};
})();
