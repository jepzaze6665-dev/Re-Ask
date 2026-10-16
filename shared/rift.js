// =====================================================================
//  shared/rift.js — ประตูมิติสุ่มเกิด: สุ่มสี/ตำแหน่ง/เวลา · ปรับความโหดของดันตามสี · รางวัลตามสี
//  ข้อมูล data/db/rifts.json (+ template ใน dungeons.json) · ฟังก์ชันล้วน (rng บังคับ)
//  เบราว์เซอร์: window.RIFT · Node: require('./shared/rift.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./rng.js'),require('./dungeon.js'),require('./ro.js')):factory(root.RNG,root.DUNGEON,root.RO);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.RIFT=m;
})(typeof self!=='undefined'?self:globalThis,function(RNG,DUNGEON,RO){

const tier=(db,id)=>db.rifts.tiers.find(t=>t.id===id);
/** สุ่มสีประตูตาม weight */
const rollTier=(db,rng)=>db.rifts.tiers[RNG.pickWeighted(rng,db.rifts.tiers.map(t=>t.weight))];
/** เวลารอก่อนประตูถัดไป (วินาที) */
const nextDelay=(db,mapId,rng)=>{const M=db.rifts.maps[mapId];return M.interval[0]+rng()*(M.interval[1]-M.interval[0]);};

/**
 * หาตำแหน่งเกิดประตูในแมพ: ไม่อยู่ในเขตปลอดภัย · ไม่ใกล้ผู้เล่น · ไม่ใกล้ประตูอื่น
 * @param {any} db @param {{W:number,H:number,safe?:{x:number,y:number,r:number}}} map @param {{x:number,y:number}} player @param {{x:number,y:number}[]} others @param {()=>number} rng
 * @returns {{x:number,y:number}|null}
 */
function place(db,map,player,others,rng){const M=150,far=db.rifts.safeFromPlayer;
  for(let i=0;i<80;i++){const x=M+rng()*(map.W-2*M),y=M+rng()*(map.H-2*M);
    if(map.safe&&Math.hypot(x-map.safe.x,y-map.safe.y)<map.safe.r)continue;
    if(Math.hypot(x-player.x,y-player.y)<far)continue;
    if(others.some(o=>Math.hypot(o.x-x,o.y-y)<400))continue;
    return {x:Math.round(x),y:Math.round(y)};}
  return null;}

/** แผนดันของประตู: template + มอนดุร้ายตามสี */
function plan(db,tierId,seed){const T=tier(db,tierId);return DUNGEON.generate(db,T.template,seed,{eliteChance:T.eliteChance});}

/** ค่ามอนในดันตามสี (เกมนำไปใช้ตอนวางมอน) */
function mobScale(db,tierId){const T=tier(db,tierId);return {hpMult:T.hpMult,atkPct:T.atkPct,expMult:T.expMult,bossHpMult:T.bossHpMult,shadowMult:T.shadowMult};}

/** รางวัลจบดันตามสี = รางวัล template × rewardMult (EXP/zeny) + ของเพิ่มของสี · EXP ลดตามส่วนต่างเลเวล (ผู้เล่น vs บอส+lvBonus) ถ้าให้ playerLv */
function reward(db,tierId,rng,playerLv){const T=tier(db,tierId),base=DUNGEON.rollReward(db,T.template,rng);
  const em=playerLv==null?1:RO.expMult(db,playerLv,db.mobs[db.dungeons[T.template].boss.mob].lv+(T.lvBonus||0));
  const extra=T.extraItems.filter(x=>rng()*100<x.rate).map(x=>({id:x.id,qty:x.qty}));
  return {exp:Math.round(base.exp*T.rewardMult*em),jobExp:Math.round(base.jobExp*T.rewardMult*em),zeny:Math.round(base.zeny*T.rewardMult),items:[...base.items,...extra]};}

return {tier,rollTier,nextDelay,place,plan,mobScale,reward};
});
