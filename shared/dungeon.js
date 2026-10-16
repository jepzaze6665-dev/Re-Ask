// =====================================================================
//  shared/dungeon.js — ดันเจี้ยนสุ่ม: สร้างแผนที่จาก seed (เหมือนเดิมทุกครั้งเมื่อ seed เดิม) · ความคืบหน้า · รางวัลจบดัน
//  ข้อมูล data/db/dungeons.json · รางวัลผ่าน INV.apply ด้วย key ต่อรอบ (ได้ครั้งเดียว)
//  เบราว์เซอร์: window.DUNGEON · Node: require('./shared/dungeon.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./rng.js'),require('./inventory.js')):factory(root.RNG,root.INV);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.DUNGEON=m;
})(typeof self!=='undefined'?self:globalThis,function(RNG,INV){

const between=(rng,[a,b])=>a+Math.floor(rng()*(b-a+1));
const MARGIN=110,SAFE_R=420,BOSS_R=260;

/**
 * @typedef {{mob:string,x:number,y:number,elite:boolean}} DMob
 * @typedef {{id:string,seed:number,W:number,H:number,spawn:{x:number,y:number},boss:{x:number,y:number,mob:string},obstacles:{x:number,y:number,r:number,kind:string}[],mobs:DMob[]}} DPlan
 */

/**
 * สร้างแผนที่ดัน (ฟังก์ชันล้วน — seed เดียวกันได้ผลเดียวกัน)
 * จุดเกิดฝั่งซ้าย · บอสฝั่งขวาสุด · หินกีดขวางไม่ทับจุดเกิด/ห้องบอส · มอนไม่เกิดใกล้จุดเกิด ไม่ทับหิน
 * @param {any} db @param {string} id @param {number} seed @param {{eliteChance?:number}} [opts] ทับค่าใน template (ประตูมิติแต่ละสี)
 * @returns {DPlan}
 */
function generate(db,id,seed,opts={}){const D=db.dungeons[id],rng=RNG.make(seed),eliteChance=opts.eliteChance!=null?opts.eliteChance:D.elite.chance;
  const W=between(rng,D.size.w),H=between(rng,D.size.h);
  const spawn={x:MARGIN+60,y:Math.round(H*(.3+rng()*.4))},boss={x:W-MARGIN-120,y:Math.round(H*(.3+rng()*.4)),mob:D.boss.mob};
  const obstacles=[],free=(x,y,r)=>Math.hypot(x-spawn.x,y-spawn.y)>SAFE_R*.6+r&&Math.hypot(x-boss.x,y-boss.y)>BOSS_R+r&&obstacles.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r+40);
  const nObs=between(rng,D.obstacles);
  for(let tries=0;obstacles.length<nObs&&tries<nObs*40;tries++){const r=30+rng()*50,x=MARGIN+rng()*(W-2*MARGIN),y=MARGIN+rng()*(H-2*MARGIN);
    if(free(x,y,r))obstacles.push({x:Math.round(x),y:Math.round(y),r:Math.round(r),kind:rng()<.6?'crystal':'rock'});}
  const blocked=(x,y,pad=0)=>obstacles.some(o=>Math.hypot(o.x-x,(o.y-y)*1.3)<o.r+pad);
  const mobs=[],weights=D.pool.map(p=>p.w),nPacks=between(rng,D.packs);
  for(let p=0;p<nPacks;p++){let cx=0,cy=0,ok=false;
    for(let t=0;t<60&&!ok;t++){cx=MARGIN+rng()*(W-2*MARGIN);cy=MARGIN+rng()*(H-2*MARGIN);
      ok=Math.hypot(cx-spawn.x,cy-spawn.y)>SAFE_R&&Math.hypot(cx-boss.x,cy-boss.y)>BOSS_R&&!blocked(cx,cy,40);}
    if(!ok)continue;const kind=D.pool[RNG.pickWeighted(rng,weights)].mob,n=between(rng,D.packSize);
    for(let i=0;i<n;i++){const a=rng()*6.28,d=30+rng()*80,x=Math.round(cx+Math.cos(a)*d),y=Math.round(cy+Math.sin(a)*d*.6);
      if(x<MARGIN||y<MARGIN||x>W-MARGIN||y>H-MARGIN||blocked(x,y,20))continue;
      mobs.push({mob:kind,x,y,elite:rng()*100<eliteChance});}}
  return {id,seed,W,H,spawn,boss,obstacles,mobs};}

/** ความคืบหน้า: ประตูบอสเปิดเมื่อฆ่ามอนธรรมดาครบ bossUnlockPct % */
function progress(db,plan,killed){const total=plan.mobs.length,pct=total?Math.floor(killed*100/total):100;
  return {killed,total,pct,bossOpen:pct>=db.dungeons[plan.id].bossUnlockPct};}

/** สุ่มรางวัลจบดัน */
function rollReward(db,id,rng){const R=db.dungeons[id].reward;
  return {exp:R.exp,jobExp:R.jobExp,zeny:between(rng,R.zeny),items:R.items.filter(x=>rng()*100<x.rate).map(x=>({id:x.id,qty:x.qty}))};}

/**
 * รับรางวัลจบดัน (key ต่อรอบ → ได้ครั้งเดียวแม้กดซ้ำ/โหลดใหม่) · EXP ให้เกมใส่ผ่านระบบ EXP ปกติ
 * @returns {{ok:boolean,err?:string,dup?:boolean,reward?:any}}
 */
function claim(db,inv,runKey,reward,lim={}){
  const r=INV.apply(db,inv,{key:'dungeon:'+runKey,reason:'dungeon',zeny:reward.zeny,add:reward.items},lim);
  if(!r.ok)return r;return r.dup?{ok:true,dup:true}:{ok:true,reward};}

return {generate,progress,rollReward,claim};
});
