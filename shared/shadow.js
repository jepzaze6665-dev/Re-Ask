// =====================================================================
//  shared/shadow.js — เงาอสูร (แทนการ์ด RO): ดรอป · ผนึก · ถอด · รวม · โบนัส · ค่าเรียก
//  ข้อมูล data/db/shadows.json · ทุกการเปลี่ยนเงิน/ของผ่าน INV.apply (key กันทำซ้ำ)
//  เบราว์เซอร์: window.SHADOW · Node: require('./shared/shadow.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./inventory.js'),require('./rng.js')):factory(root.INV,root.RNG);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.SHADOW=m;
})(typeof self!=='undefined'?self:globalThis,function(INV,RNG){

const itemId=sid=>'shadow:'+sid;
const list=db=>Object.keys(db.shadows).filter(k=>k!=='rules');
/** สร้าง ItemDefinition ของเงาแต่ละตัวลง db.items (เรียกครั้งเดียวหลังโหลด) */
function installItems(db){for(const sid of list(db)){const s=db.shadows[sid],mob=db.mobs[s.mob];
  db.items[itemId(sid)]={name:s.name,type:'shadow',shadow:sid,slot:s.slot,weight:1,rarity:s.boss?'legend':'rare',icon:mob&&mob.look?mob.look.edge:'#b48cff',
    price:0,desc:'เงาอสูร — ผนึกลงช่องอุปกรณ์ หรือเรียกออกมาสู้'};}
  return db;}

/** ช่องอุปกรณ์ที่เงาชนิดนี้ผนึกได้ */
function slotMatches(shadowSlot,equipSlot){if(shadowSlot==='head')return equipSlot.startsWith('head_');if(shadowSlot==='acc')return equipSlot==='acc1'||equipSlot==='acc2';return shadowSlot===equipSlot;}

/**
 * สุ่มดรอปเงาของมอน 1 ตัว (ลุ้นล้วน ไม่มี pity)
 * @param {any} db @param {string} mobId @param {number} luk @param {()=>number} rng @param {number} [mult] ตัวคูณโอกาส (ประตูมิติสีสูง)
 * @returns {{id:string,qty:number,attrs:{star:number,alt:boolean}}|null}
 */
function roll(db,mobId,luk,rng,mult=1){const R=db.shadows.rules;
  for(const sid of list(db)){const s=db.shadows[sid];if(s.mob!==mobId)continue;
    if(rng()*100>=s.rate*mult*(1+luk*R.lukBonus))return null;
    const star=RNG.pickWeighted(rng,R.stars.chance)+1,alt=!!s.alt&&rng()*100<R.altChance;
    return {id:itemId(sid),qty:1,attrs:{star,alt}};}
  return null;}

// ---------- โบนัส ----------
const PROC_KEYS=['onHit','reflectMeleePct','reflectElement','onKillHealPct'];   // ผลพิเศษ (procs) ไม่ใช่สเตตัส
const scale=(v,m)=>typeof v==='number'?Math.round(v*m*100)/100:v;
/** โบนัสตัวเลข (เข้า RO.derive) ของเงา 1 ชิ้น */
function sealBonus(db,sid,star){const s=db.shadows[sid],m=db.shadows.rules.stars.mult[star-1]||1,out={};
  for(const [k,v] of Object.entries(s.seal||{})){if(PROC_KEYS.includes(k))continue;if(typeof v==='number')out[k]=scale(v,m);
    else if(k==='size'||k==='race'||k==='ele'){out[k]={};for(const kk in v)out[k][kk]=scale(v[kk],m);}}
  return out;}
/** เงาทั้งหมดที่ผนึกอยู่ในอุปกรณ์ที่สวม */
function sealed(inv){const out=[];for(const it of inv.items)if(it.eq)for(const s of it.sockets||[])if(s)out.push(s);return out;}
const sealBonuses=(db,inv)=>sealed(inv).map(s=>sealBonus(db,s.sid,s.star));
/**
 * ผลพิเศษขณะต่อสู้ (เกมเป็นคนใช้): ตีติดสถานะ · สะท้อนดาเมจ · ฆ่าแล้วฟื้น HP
 * @returns {{onHit:{status:string,chance:number,dur:number}[],reflectMeleePct:number,reflectElement:string,onKillHealPct:number}}
 */
function procs(db,inv){const P={onHit:[],reflectMeleePct:0,reflectElement:'neutral',onKillHealPct:0};
  for(const s of sealed(inv)){const d=db.shadows[s.sid],m=db.shadows.rules.stars.mult[s.star-1]||1,seal={...d.seal,...(s.alt&&d.alt&&d.alt.seal||{})};
    if(seal.onHit)P.onHit.push({status:seal.onHit.status,chance:seal.onHit.chance*m,dur:seal.onHit.duration});
    if(seal.reflectMeleePct)P.reflectMeleePct+=seal.reflectMeleePct*m;
    if(seal.reflectElement)P.reflectElement=seal.reflectElement;
    if(seal.onKillHealPct)P.onKillHealPct+=seal.onKillHealPct*m;}
  return P;}
/** ค่าของตัวที่ถูกเรียกออกมา (รวมผลแปรธาตุ) */
function summonInfo(db,sid,star,alt){const d=db.shadows[sid],m=db.shadows.rules.stars.mult[star-1]||1;
  return {...d.summon,...(alt&&d.alt&&d.alt.summon||{}),element:alt&&d.alt?d.alt.element:(d.summon.element||'neutral'),mult:m,mob:d.mob,name:d.name};}

// ---------- ผนึก / ถอด / รวม ----------
/**
 * ผนึกเงาลงช่องว่างของอุปกรณ์ (เงาออกจากกระเป๋า → อยู่ในช่อง) · atomic + idempotent
 * @param {any} db @param {any} inv @param {string} key @param {number} equipUid @param {number} idx @param {number} shadowUid
 */
function seal(db,inv,key,equipUid,idx,shadowUid){if(inv.applied.includes(key))return {ok:true,dup:true};
  const eq=INV.find(inv,equipUid),sh=INV.find(inv,shadowUid);
  if(!eq||!sh)return {ok:false,err:'ไม่พบไอเทม'};const sd=db.items[sh.id];
  if(sd.type!=='shadow')return {ok:false,err:'ไม่ใช่เงาอสูร'};
  if(sh.eq)return {ok:false,err:'เงานี้ถูกเรียกออกมาอยู่'};
  const slot=eq.eq||slotOfItem(db.items[eq.id]);if(!slot||!slotMatches(sd.slot,slot))return {ok:false,err:'เงานี้ผนึกลงช่องนี้ไม่ได้'};
  if(!eq.sockets||idx<0||idx>=eq.sockets.length)return {ok:false,err:'ไม่มีช่องผนึก'};if(eq.sockets[idx])return {ok:false,err:'ช่องนี้มีเงาอยู่แล้ว'};
  const rec={sid:sd.shadow,star:sh.star||1,alt:!!sh.alt};
  const r=INV.apply(db,inv,{key,reason:'seal',remove:[{uid:shadowUid,qty:1}]});if(!r.ok)return r;
  eq.sockets[idx]=rec;return {ok:true};}
const slotOfItem=it=>it.type==='weapon'?'weapon':it.slot==='acc'?'acc1':it.slot;
/** ราคาถอดเงา */
function unsealCost(db,rec){const U=db.shadows.rules.unseal;return U.zenyByStar[rec.star-1]*(db.shadows[rec.sid].boss?U.zenyBossMult:1);}
/**
 * ถอดเงา: จ่าย zeny · มีโอกาสเงาแตก · ไม่แตก = เงากลับเข้ากระเป๋า
 * @returns {{ok:boolean,err?:string,dup?:boolean,broke?:boolean}}
 */
function unseal(db,inv,key,equipUid,idx,rng){if(inv.applied.includes(key))return {ok:true,dup:true};
  const eq=INV.find(inv,equipUid),rec=eq&&eq.sockets&&eq.sockets[idx];if(!rec)return {ok:false,err:'ช่องนี้ไม่มีเงา'};
  const broke=rng()*100<db.shadows.rules.unseal.breakChance;
  const r=INV.apply(db,inv,{key,reason:broke?'unseal:broke':'unseal',zeny:-unsealCost(db,rec),add:broke?[]:[{id:itemId(rec.sid),qty:1,attrs:{star:rec.star,alt:rec.alt}}]});
  if(!r.ok)return r;eq.sockets[idx]=null;return {ok:true,broke};}
/**
 * รวมเงา: เงาชนิดเดียวกัน ดาวเท่ากัน 2 ชิ้น → ลุ้นอัปดาว · ล้มเหลว = เหลือ 1 ชิ้น (failKeepsOne)
 * @returns {{ok:boolean,err?:string,dup?:boolean,success?:boolean,star?:number}}
 */
function fuse(db,inv,key,uidA,uidB,rng){if(inv.applied.includes(key))return {ok:true,dup:true};
  const F=db.shadows.rules.fuse,a=INV.find(inv,uidA),b=INV.find(inv,uidB);
  if(!a||!b||uidA===uidB)return {ok:false,err:'ต้องเลือกเงา 2 ชิ้น'};
  if(a.id!==b.id||db.items[a.id].type!=='shadow')return {ok:false,err:'ต้องเป็นเงาชนิดเดียวกัน'};
  if((a.star||1)!==(b.star||1))return {ok:false,err:'ดาวต้องเท่ากัน'};if(a.eq||b.eq)return {ok:false,err:'เงาถูกเรียกออกมาอยู่'};
  const star=a.star||1;if(star>=db.shadows.rules.stars.mult.length)return {ok:false,err:'ดาวสูงสุดแล้ว'};
  const success=rng()*100<F.successByStar[star-1],alt=!!(a.alt||b.alt);
  const add=success?[{id:a.id,qty:1,attrs:{star:star+1,alt}}]:(F.failKeepsOne?[{id:a.id,qty:1,attrs:{star,alt}}]:[]);
  const r=INV.apply(db,inv,{key,reason:success?'fuse:up':'fuse:fail',remove:[{uid:uidA,qty:1},{uid:uidB,qty:1}],add});
  if(!r.ok)return r;return {ok:true,success,star:success?star+1:star};}

return {itemId,list,installItems,slotMatches,roll,sealBonus,sealBonuses,sealed,procs,summonInfo,seal,unseal,unsealCost,fuse};
});
