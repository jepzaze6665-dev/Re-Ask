// =====================================================================
//  shared/ai.js — AI มอนแบบ state machine + เฟส/สกิลบอส (ฟังก์ชันล้วน · เกม/เซิร์ฟเวอร์เป็นคนขยับตัวจริง)
//  สถานะ: idle → chase → windup → (ตี) → chase … · return (กลับจุดเกิด) · flee (หนีตอนเลือดน้อย)
//  ค่าเริ่มต้นใน rules.ai · มอนแต่ละตัวทับได้ใน mobs.json ai
//  เบราว์เซอร์: window.AI · Node: require('./shared/ai.js')
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.AI=m;})(typeof self!=='undefined'?self:globalThis,function(){

/** ค่า AI ที่ใช้จริงของมอนชนิดนี้ */
const cfg=(db,def)=>({...db.rules.ai,...(def.ai||{})});

/**
 * @typedef {{state:string,wt?:number}} MobAI  ส่วนสถานะ AI ที่ฝากบนตัวมอน
 * @typedef {{dt:number,dTarget:number,dHome:number,reach:number,atkReady:boolean,hpPct:number,alerted:boolean}} AICtx
 *   dTarget = ระยะถึงเป้า (Infinity = ไม่มีเป้า/เป้าตาย) · alerted = โดนตี/โดนยั่ว/พวกเรียก
 * @typedef {{move:null|'target'|'home'|'away'|'wander',attack:boolean,windupStart:boolean,arrivedHome:boolean}} AIAct
 */

/**
 * เดิน state machine 1 ก้าว (แก้ m.state/m.wt) แล้วคืนสิ่งที่เกมต้องทำ
 * @param {any} db @param {any} def MonsterDefinition @param {MobAI} m @param {AICtx} c @returns {AIAct}
 */
function step(db,def,m,c){const A=cfg(db,def),out={move:null,attack:false,windupStart:false,arrivedHome:false};
  const noTarget=!isFinite(c.dTarget);
  switch(m.state){
    case 'idle':
      out.move='wander';
      if(!noTarget&&(c.alerted||(A.aggressive&&c.dTarget<A.detect)))m.state='chase';
      break;
    case 'chase':
      if(noTarget||c.dTarget>A.chase||c.dHome>A.leash){m.state='return';out.move='home';break;}
      if(A.flee&&c.hpPct<A.flee.hpPct){m.state='flee';out.move='away';break;}
      if(c.dTarget>c.reach){out.move='target';break;}
      if(c.atkReady){m.state='windup';m.wt=A.windup;out.windupStart=true;}
      break;
    case 'windup':
      m.wt=(m.wt||0)-c.dt;
      if(m.wt<=0){m.state='chase';out.attack=true;}   // เกมเช็กว่าเป้ายังอยู่ในระยะ × dodgeSlack ไหม (หลบได้)
      break;
    case 'return':
      out.move='home';
      if(c.dHome<20){m.state='idle';out.arrivedHome=true;}
      break;
    case 'flee':
      out.move='away';
      if(noTarget||c.dTarget>A.detect*1.5){m.state='return';}
      break;
    default:m.state='idle';}
  return out;}

// ---------- บอส ----------
/** เฟสปัจจุบัน (index) ตาม %HP — เฟสที่ hpPct ต่ำสุดที่ยังไม่ต่ำกว่า HP ปัจจุบัน */
function phaseOf(def,hpPct){const ph=def.phases||[];let idx=0;for(let i=0;i<ph.length;i++)if(hpPct<=ph[i].hpPct)idx=i;return idx;}
/**
 * เลือกสกิลบอสที่พร้อม (เรียงตามรายการในเฟส · ตัวแรกที่คูลดาวน์หมด)
 * @param {any} def @param {number} phase @param {Object<string,number>} cds เวลาที่ใช้ได้อีกครั้ง @param {number} now
 * @returns {string|null}
 */
function pickSkill(def,phase,cds,now){const ph=def.phases&&def.phases[phase];if(!ph)return null;
  for(const id of ph.skills||[])if((cds[id]||0)<=now)return id;return null;}
/** ผู้เล่นอยู่ในวงเตือนไหม (วงรีแบบพื้นเอียง y×1.4) */
const inCircle=(cx,cy,r,x,y)=>Math.hypot(x-cx,(y-cy)*1.4)<=r;

return {cfg,step,phaseOf,pickSkill,inCircle};
});
