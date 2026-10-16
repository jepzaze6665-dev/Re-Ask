// =====================================================================
//  shared/skills.js — ตัวรันสกิล & อาชีพ (ข้อมูลใน data/db/skills.json, jobs.json)
//  ฟังก์ชันล้วน: ตรวจเงื่อนไข → คืน "ผลลัพธ์" ให้เกม (หรือเซิร์ฟเวอร์) เอาไปใช้ · ไม่แตะภาพ/เสียง
//  เบราว์เซอร์: window.SKILLS · Node: require('./shared/skills.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./ro.js'),require('./status.js')):factory(root.RO,root.STATUS);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.SKILLS=m;
})(typeof self!=='undefined'?self:globalThis,function(RO,STATUS){

/**
 * ค่าตามเลเวล: ตัวเลข | array (index = Lv−1, เกินใช้ตัวสุดท้าย) | {base, perLv}
 * @param {any} v @param {number} lv
 */
function val(v,lv){if(v==null)return 0;if(typeof v==='number')return v;if(Array.isArray(v))return v[Math.min(v.length,Math.max(1,lv))-1];
  return (v.base||0)+(v.perLv||0)*(lv-1);}
const valObj=(o,lv)=>{if(!o)return undefined;const r={};for(const k in o)r[k]=val(o[k],lv);return r;};

// ---------- อาชีพ ----------
/** สายอาชีพจากต้นถึงอาชีพปัจจุบัน เช่น ['novice','swordman','knight'] */
function lineage(db,job){const out=[];let j=job;while(j&&db.jobs[j]&&!out.includes(j)){out.unshift(j);j=db.jobs[j].parent;}return out;}
/** สกิลที่อาชีพนี้เรียนได้ (รวมของอาชีพก่อนหน้า) */
const skillsFor=(db,job)=>{const L=lineage(db,job);return Object.keys(db.skills).filter(id=>db.skills[id].job&&L.includes(db.skills[id].job));};
const nextJobs=(db,job)=>Object.keys(db.jobs).filter(id=>db.jobs[id].parent===job);
const weaponsFor=(db,job)=>Object.keys(db.jobs[job].attackInterval||{});

/**
 * เงื่อนไขเปลี่ยนอาชีพ
 * @param {any} db @param {{job:string,jobLv:number,jobQuest?:{to:string,kills:Object<string,number>}}} c
 * @param {string} to @param {(id:string)=>number} countItem จำนวนไอเทมในกระเป๋า
 * @returns {{ok:boolean,missing:string[]}}
 */
function checkAdvance(db,c,to,countItem){const j=db.jobs[to],a=j&&j.advance,miss=[];
  if(!j||j.parent!==c.job)return {ok:false,missing:['เปลี่ยนเป็นอาชีพนี้จากอาชีพปัจจุบันไม่ได้']};
  if(c.jobLv<a.jobLv)miss.push(`Job Lv ${c.jobLv}/${a.jobLv}`);
  const q=c.jobQuest&&c.jobQuest.to===to?c.jobQuest:null;
  for(const [mob,n] of Object.entries(a.kills||{})){const have=q?q.kills[mob]||0:0;if(have<n)miss.push(`${db.mobs[mob].name} ${have}/${n}`+(q?'':' (ยังไม่รับเควสต์)'));}
  for(const [id,n] of Object.entries(a.items||{})){const have=countItem(id);if(have<n)miss.push(`${db.items[id].name} ${have}/${n}`);}
  return {ok:miss.length===0,missing:miss};}

// ---------- เรียนสกิล ----------
/** @returns {{ok:boolean,err?:string}} */
function canLearn(db,c,id){const sk=db.skills[id];if(!sk||sk.type==='basic')return {ok:false,err:'ไม่มีสกิลนี้'};
  if(!lineage(db,c.job).includes(sk.job))return {ok:false,err:'อาชีพนี้เรียนไม่ได้'};
  const lv=c.skills[id]||0;if(lv>=sk.maxLv)return {ok:false,err:'เลเวลสูงสุดแล้ว'};
  if(c.skillPoints<1)return {ok:false,err:'แต้มสกิลไม่พอ'};
  for(const [req,n] of Object.entries(sk.requires||{}))if((c.skills[req]||0)<n)return {ok:false,err:`ต้องมี ${db.skills[req].name} Lv ${n}`};
  return {ok:true};}
function learn(db,c,id){const r=canLearn(db,c,id);if(!r.ok)return r;c.skills[id]=(c.skills[id]||0)+1;c.skillPoints--;return {ok:true};}
/** คืนแต้มสกิลทั้งหมด */
function resetSkills(c){let n=0;for(const k in c.skills)n+=c.skills[k];c.skills={};c.skillPoints+=n;return n;}

/** โบนัสจากสกิลติดตัว (passive) สำหรับ RO.derive extra @returns {object[]} */
function passiveBonuses(db,c,wtype){const out=[];
  for(const [id,lv] of Object.entries(c.skills||{})){const sk=db.skills[id];if(!sk||sk.type!=='passive'||lv<1)continue;
    for(const e of sk.effects)if(e.type==='passive'&&(!e.weapon||e.weapon.includes(wtype)))out.push(valObj(e.bonus,lv));}
  return out;}

// ---------- ร่าย ----------
function castInfo(db,id,lv){const sk=db.skills[id];
  return {sp:val(sk.sp,lv),cd:val(sk.cd,lv),cast:val(sk.cast,lv),range:sk.range||0,target:sk.target,interruptible:!!sk.interruptible};}
/**
 * ตรวจก่อนร่าย (ไม่เช็กเป้า/ระยะ — เกมเช็กเพราะรู้ตำแหน่ง)
 * @param {any} db @param {{skills:Object<string,number>,sp:number,cds:Object<string,number>,wtype:string,flags?:any}} c @param {string} id @param {number} now
 * @returns {string|null}
 */
function checkCast(db,c,id,now){const sk=db.skills[id];if(!sk||sk.type!=='active')return 'ใช้สกิลนี้ไม่ได้';
  const lv=c.skills[id]||0;if(lv<1)return 'ยังไม่ได้เรียนสกิลนี้';
  if(c.flags&&(c.flags.cantCast||c.flags.cantAct))return 'ร่ายไม่ได้ขณะติดสถานะ';
  if((c.cds[id]||0)>now)return 'สกิลยังไม่พร้อม';
  if(sk.weapon&&!sk.weapon.includes(c.wtype))return 'ต้องถือ '+sk.weapon.join('/');
  if(c.sp<val(sk.sp,lv))return 'SP ไม่พอ';
  return null;}

/**
 * คำนวณผลของสกิล (หลังร่ายเสร็จ) — ฟังก์ชันล้วน
 * @param {any} db @param {string} id @param {number} lv
 * @param {{caster:any, self:{x:number,y:number}, primary?:{ref:any,prof:any,x:number,y:number}, others:{ref:any,prof:any,x:number,y:number}[], rng:()=>number}} ctx
 *   caster = โปรไฟล์โจมตี (RO.derive + lv) · primary = เป้าหลัก · others = ศัตรูทั้งหมดที่อยู่ใกล้ (ใช้กับ AoE)
 * @returns {any[]} ผลลัพธ์: {kind:'damage',ref,r} | {kind:'heal',ref:'self',amount} | {kind:'status',ref,status,dur,mods} | {kind:'knockback',ref,power,from} | {kind:'damage_seq',ref,hits,element,ignoreFlee}
 */
function resolve(db,id,lv,ctx){const sk=db.skills[id],out=[];let lastHit=[];
  const inR=(c,p,r)=>Math.hypot(p.x-c.x,(p.y-c.y)*1.4)<=r;
  for(const e of sk.effects){
    if(e.type==='damage'){
      const center=sk.target==='aoe_self'?ctx.self:ctx.primary;if(!center)continue;
      const tg=e.radius?ctx.others.filter(o=>inR(center,o,e.radius)):[ctx.primary];
      const A={...ctx.caster,hit:ctx.caster.hit+val(e.hitBonus,lv)};lastHit=[];
      for(const t of tg){const r=RO.physical(db,A,t.prof,{pct:val(e.pct,lv),element:e.element,ignoreFlee:e.ignoreFlee,rng:ctx.rng});
        out.push({kind:'damage',ref:t.ref,r});if(!r.miss&&r.dmg>0)lastHit.push(t.ref);}}
    else if(e.type==='damage_seq'){if(!ctx.primary)continue;
      out.push({kind:'damage_seq',ref:ctx.primary.ref,element:e.element,ignoreFlee:!!e.ignoreFlee,hits:e.hits.map(h=>({t:h.t,pct:h.pct+(h.perLv||0)*(lv-1)}))});}
    else if(e.type==='heal')out.push({kind:'heal',ref:'self',amount:Math.floor(val(e.amount,lv))});
    else if(e.type==='status'){const ref=e.to==='self'?'self':ctx.primary&&ctx.primary.ref;if(!ref)continue;
      const ch=e.chance==null?100:val(e.chance,lv);if(ch<=0||ctx.rng()*100>=ch)continue;
      out.push({kind:'status',ref,status:e.status,dur:val(e.dur,lv),mods:valObj(e.mods,lv)});}
    else if(e.type==='knockback')for(const ref of lastHit)out.push({kind:'knockback',ref,power:e.power,from:sk.target==='aoe_self'?ctx.self:ctx.self});}
  return out;}

return {val,lineage,skillsFor,nextJobs,weaponsFor,checkAdvance,canLearn,learn,resetSkills,passiveBonuses,castInfo,checkCast,resolve};
});
