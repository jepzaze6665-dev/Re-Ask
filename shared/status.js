// =====================================================================
//  shared/status.js — บัฟ/ดีบัฟ/CC (ข้อมูลใน data/db/statuses.json)
//  st = {statusId: {until, mods, nextTick}} ฝากไว้บนตัวผู้เล่น/มอน · เวลาเป็นวินาทีของเกม (now)
//  เบราว์เซอร์: window.STATUS · Node: require('./shared/status.js')
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.STATUS=m;})(typeof self!=='undefined'?self:globalThis,function(){

/**
 * @typedef {{until:number,mods?:Object<string,number>,nextTick?:number}} StatusInst
 * @typedef {Object<string,StatusInst>} StatusMap
 */

/**
 * ติดสถานะ · ซ้ำ (refresh) = ต่อเวลาเป็นค่าที่ยาวกว่า และใช้ mods ใหม่
 * @param {any} db @param {StatusMap} st @param {string} id @param {{now:number,dur:number,mods?:Object<string,number>}} o
 * @returns {boolean} ติดสำเร็จ
 */
function apply(db,st,id,o){const def=db.statuses[id];if(!def||!(o.dur>0))return false;
  const cur=st[id];
  if(cur&&cur.until>o.now){cur.until=Math.max(cur.until,o.now+o.dur);if(o.mods)cur.mods=o.mods;return true;}
  st[id]={until:o.now+o.dur,mods:o.mods,nextTick:def.dot?o.now+def.dot.tick:undefined};return true;}

const remove=(st,id)=>{delete st[id];};
/** ลบสถานะที่หมดเวลา @param {StatusMap} st @param {number} now */
function prune(st,now){for(const k in st)if(st[k].until<=now)delete st[k];}
const has=(st,id,now)=>!!st[id]&&st[id].until>now;

/** รวม flags ของสถานะที่ยังไม่หมด (cantMove cantAct cantCast noFlinch) */
function flags(db,st,now){const f={cantMove:false,cantAct:false,cantCast:false,noFlinch:false,aggro:false};
  for(const k in st){if(st[k].until<=now)continue;const d=db.statuses[k];for(const x of d.flags||[])f[x]=true;if(d.aggro)f.aggro=true;}
  return f;}

/** รวม mods ทั้งหมด (บวกกัน) */
function mods(st,now){const m={};for(const k in st){const s=st[k];if(s.until<=now||!s.mods)continue;for(const kk in s.mods)m[kk]=(m[kk]||0)+s.mods[kk];}return m;}

/**
 * เดินเวลา DoT: คืนดาเมจรวมที่ต้องหัก (ทำได้หลาย tick ถ้า now กระโดด)
 * @param {any} db @param {StatusMap} st @param {number} now @param {number} maxHp
 * @returns {{dmg:number,by:string[]}}
 */
function tick(db,st,now,maxHp){let dmg=0;const by=[];
  for(const k in st){const s=st[k],d=db.statuses[k].dot;if(!d||s.nextTick==null)continue;
    while(s.nextTick<=now&&s.nextTick<=s.until){dmg+=Math.max(d.min||1,Math.floor(maxHp*d.pctMaxHp/100));s.nextTick+=d.tick;if(!by.includes(k))by.push(k);}}
  return {dmg,by};}

return {apply,remove,prune,has,flags,mods,tick};
});
