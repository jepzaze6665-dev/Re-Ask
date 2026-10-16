// =====================================================================
//  shared/refine.js — ตีบวก (+1~+10) และสมุดล่า (Codex)
//  ข้อมูล data/db/refine.json, data/db/codex.json · เงิน/วัตถุดิบผ่าน INV.apply (key กันทำซ้ำ)
//  เบราว์เซอร์: window.REFINE · Node: require('./shared/refine.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./inventory.js')):factory(root.INV);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.REFINE=m;
})(typeof self!=='undefined'?self:globalThis,function(INV){

const canRefine=it=>it&&(it.type==='weapon'||it.type==='armor');
/** ข้อมูลการตีขั้นถัดไปของไอเทมชิ้นนี้ (null = ตีต่อไม่ได้) */
function nextInfo(db,inst){const R=db.refine,lv=inst.refine||0;if(!canRefine(db.items[inst.id])||lv>=R.max)return null;return {...R.levels[lv],from:lv,to:lv+1,material:R.material};}

/**
 * ตีบวก 1 ครั้ง: ใช้ zeny + วัตถุดิบ 1 ชิ้น (ทุกกรณี) → สำเร็จ +1 / ล้มเหลวตาม fail (none/down/break)
 * แตก = อุปกรณ์หายไป (ถอดออกจากตัวก่อนลบ) · ทั้งหมดอยู่ในธุรกรรมเดียว
 * @param {any} db @param {any} inv @param {string} key @param {number} uid @param {()=>number} rng
 * @returns {{ok:boolean,err?:string,dup?:boolean,result?:'success'|'none'|'down'|'break',refine?:number}}
 */
function refine(db,inv,key,uid,rng){if(inv.applied.includes(key))return {ok:true,dup:true};
  const it=INV.find(inv,uid);if(!it)return {ok:false,err:'ไม่พบไอเทม'};
  const info=nextInfo(db,it);if(!info)return {ok:false,err:'ตีบวกต่อไม่ได้'};
  const mat=inv.items.find(x=>x.id===info.material&&!x.eq);if(!mat)return {ok:false,err:`ต้องมี ${db.items[info.material].name}`};
  if(inv.zeny<info.zeny)return {ok:false,err:'เงินไม่พอ'};
  const success=rng()*100<info.success,result=success?'success':info.fail;
  const wasEq=it.eq;if(result==='break')it.eq=null;   // ของที่สวมอยู่ต้องถอดก่อนลบได้
  const r=INV.apply(db,inv,{key,reason:'refine:'+result,zeny:-info.zeny,remove:[{uid:mat.uid,qty:1},...(result==='break'?[{uid,qty:1}]:[])]});
  if(!r.ok){it.eq=wasEq;return r;}
  if(result==='success')it.refine=info.to;else if(result==='down')it.refine=Math.max(0,info.from-1);
  return {ok:true,result,refine:result==='break'?0:it.refine||0};}

/** โบนัสจากขั้นตีบวกของของที่สวม (เข้า RO.derive extra) */
function bonuses(db,inv){const B=db.refine.bonus,out=[];
  for(const it of inv.items){if(!it.eq||!it.refine)continue;const t=db.items[it.id].type,b=B[t];if(!b)continue;const o={};for(const k in b)o[k]=b[k]*it.refine;out.push(o);}
  return out;}

// ---------- สมุดล่า ----------
const tiersOf=(db,mob)=>(db.codex.mobs[mob]&&db.codex.mobs[mob].tiers)||db.codex.defaultTiers;
/** ขั้นที่ผ่านแล้วของมอนชนิดนี้ (0..จำนวนขั้น) */
const tier=(db,mob,kills)=>tiersOf(db,mob).filter(t=>kills>=t).length;
/** โบนัสถาวรรวมจากสมุดล่า @param {Object<string,number>} kills */
function codexBonuses(db,kills){const out=[];
  for(const [mob,c] of Object.entries(db.codex.mobs)){const n=tier(db,mob,kills[mob]||0);for(let i=0;i<n;i++)if(c.bonus[i])out.push(c.bonus[i]);}
  return out;}

return {canRefine,nextInfo,refine,bonuses,tiersOf,tier,codexBonuses};
});
