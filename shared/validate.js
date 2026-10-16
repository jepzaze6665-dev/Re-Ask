// =====================================================================
//  shared/validate.js — ตรวจความถูกต้องของ data/db ก่อนใช้ (อ้างอิงข้ามไฟล์ ช่วงค่า ชนิด)
//  คืน array ของข้อความผิดพลาด (ว่าง = ผ่าน) · ใช้ทั้ง tools/validate_db.js, เทสต์ และตอนเกมโหลด
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.VALIDATE=m;})(typeof self!=='undefined'?self:globalThis,function(){
const ARMOR_SLOTS=['head_top','head_mid','head_low','armor','shield','garment','shoes','acc'];
const SHADOW_SLOTS=['head','weapon','armor','garment','shoes','shield','acc'];
const num=(v,a=-Infinity,b=Infinity)=>typeof v==='number'&&isFinite(v)&&v>=a&&v<=b;

/** @param {any} db @returns {string[]} */
function validateDb(db){const E=[],R=db.rules,err=(w,m)=>E.push(w+': '+m);
  const els=R.elements,sizes=R.sizes;
  for(const e of els){const row=R.elementTable[e];if(!row||row.length!==els.length)err('rules.elementTable',e+' ต้องมี '+els.length+' ค่า');}
  for(const k of ['A','B','p'])for(const t of ['baseExp','jobExp'])if(!num(R[t][k],0))err('rules.'+t,k+' ต้องเป็นตัวเลข ≥ 0');
  if(!num(R.hit.min,0,1)||!num(R.hit.max,R.hit.min,1))err('rules.hit','min/max ต้องอยู่ใน 0..1');
  if(!num(R.attack.minInterval,0.05))err('rules.attack','minInterval ต้อง ≥ 0.05 วินาที');
  if(!num(R.attack.maxReduction,0,0.95))err('rules.attack','maxReduction ต้องอยู่ใน 0..0.95');
  for(const [id,it] of Object.entries(db.items)){const w='items.'+id;
    if(!it.name)err(w,'ไม่มีชื่อ');if(!['weapon','armor','use','etc','shadow'].includes(it.type))err(w,'type ไม่ถูกต้อง');
    if(!num(it.weight||0,0))err(w,'weight ติดลบ');
    if(it.type==='weapon'){if(!R.sizeTable[it.wtype])err(w,'wtype ไม่รู้จัก '+it.wtype);if(!num(it.atk,0))err(w,'atk');if(it.ele&&!els.includes(it.ele))err(w,'ele ไม่รู้จัก');}
    if(it.type==='armor'&&!ARMOR_SLOTS.includes(it.slot))err(w,'slot ไม่รู้จัก '+it.slot);
    if(it.type==='use'&&!it.use)err(w,'ไอเทมใช้ได้ต้องมี use');
    if(it.maxSockets!=null&&!num(it.maxSockets,0,4))err(w,'maxSockets ต้องอยู่ใน 0..4');}
  for(const [id,m] of Object.entries(db.mobs)){const w='mobs.'+id;
    if(!num(m.lv,1)||!num(m.hp,1))err(w,'lv/hp');if(!Array.isArray(m.atk)||m.atk[0]>m.atk[1])err(w,'atk ต้องเป็น [min,max]');
    if(!els.includes(m.element))err(w,'element ไม่รู้จัก');if(!sizes.includes(m.size))err(w,'size ไม่รู้จัก');if(!R.races[m.race])err(w,'race ไม่รู้จัก');
    if(m.zeny&&(m.zeny[0]>m.zeny[1]||m.zeny[0]<0))err(w,'zeny ต้องเป็น [min,max] ≥ 0');
    for(const d of m.drops||[]){if(!db.items[d.item])err(w,'ดรอปไอเทมที่ไม่มี '+d.item);if(!num(d.rate,0,100))err(w,'rate ต้องอยู่ใน 0..100');}}
  for(const [id,j] of Object.entries(db.jobs)){const w='jobs.'+id;if(!num(j.jobLvMax,1))err(w,'jobLvMax');
    for(const [t,v] of Object.entries(j.attackInterval||{})){if(!R.sizeTable[t])err(w,'attackInterval wtype '+t);if(!num(v,0.05))err(w,'attackInterval '+t);}}
  const TARGETS=['enemy','self','aoe_self','aoe_enemy'],EFX=['damage','damage_seq','heal','status','knockback','passive'];
  for(const [id,s] of Object.entries(db.skills)){const w='skills.'+id;if(s.type==='basic')continue;
    if(!['active','passive'].includes(s.type))err(w,'type ต้องเป็น active/passive');
    if(!db.jobs[s.job])err(w,'job ไม่รู้จัก');if(!num(s.maxLv,1,20))err(w,'maxLv');
    if(s.type==='active'){if(!TARGETS.includes(s.target))err(w,'target ไม่รู้จัก');if(s.sp==null)err(w,'ต้องมี sp');
      if(Array.isArray(s.sp)&&s.sp.length!==1&&s.sp.length!==s.maxLv)err(w,'sp array ต้องมี 1 หรือ maxLv ค่า');}
    for(const [r,n] of Object.entries(s.requires||{})){const rs=db.skills[r];if(!rs)err(w,'requires สกิลที่ไม่มี '+r);else if(n>rs.maxLv)err(w,'requires เกิน maxLv ของ '+r);}
    for(const e of s.effects||[]){if(!EFX.includes(e.type))err(w,'effect ไม่รู้จัก '+e.type);
      if(e.element&&!els.includes(e.element))err(w,'element');
      if(e.type==='status'&&!(db.statuses&&db.statuses[e.status]))err(w,'status ไม่รู้จัก '+e.status);}}
  for(const [id,j] of Object.entries(db.jobs)){const w='jobs.'+id;
    if(j.parent&&!db.jobs[j.parent])err(w,'parent ไม่รู้จัก');if(j.advance&&!j.parent)err(w,'advance ต้องมี parent');
    if(j.advance){for(const m in j.advance.kills||{})if(!db.mobs[m])err(w,'advance.kills มอนที่ไม่มี '+m);
      for(const i in j.advance.items||{})if(!db.items[i])err(w,'advance.items ไอเทมที่ไม่มี '+i);
      for(const r of j.advance.reward||[])if(!db.items[r.id])err(w,'advance.reward ไอเทมที่ไม่มี '+r.id);}}
  for(const [id,s] of Object.entries(db.skills))if(s.job&&db.jobs[s.job]==null)err('skills.'+id,'job');
  const st=R.start;if(!db.jobs[st.job])err('rules.start','job ไม่รู้จัก');
  for(const b of st.bag)if(!db.items[b.id])err('rules.start','ไอเทมที่ไม่มี '+b.id);
  for(const [sl,id] of Object.entries(st.equip)){const it=db.items[id];if(it&&it.type==='weapon'&&db.jobs[st.job]&&!db.jobs[st.job].attackInterval[it.wtype])err('rules.start','อาชีพเริ่มต้นใช้อาวุธ '+id+' ไม่ได้');}
  for(const id of Object.values(st.equip))if(!db.items[id])err('rules.start','ไอเทมที่ไม่มี '+id);
  if(db.shadows){const S=db.shadows.rules;
    if(S.stars.chance.length!==S.stars.mult.length)err('shadows.rules','stars.chance/mult ยาวไม่เท่ากัน');
    for(const [id,s] of Object.entries(db.shadows)){if(id==='rules')continue;const w='shadows.'+id;
      if(!db.mobs[s.mob])err(w,'mob ไม่รู้จัก '+s.mob);if(!SHADOW_SLOTS.includes(s.slot))err(w,'slot ไม่รู้จัก');if(!num(s.rate,0,100))err(w,'rate');
      if(s.alt&&s.alt.element&&!els.includes(s.alt.element))err(w,'alt.element');}}
  if(db.refine){const F=db.refine;if(F.levels.length!==F.max)err('refine','levels ต้องมี max ค่า');if(!db.items[F.material])err('refine','material ไม่มี');
    F.levels.forEach((l,i)=>{if(!num(l.success,0,100))err('refine.levels['+i+']','success');if(!['none','down','break'].includes(l.fail))err('refine.levels['+i+']','fail');});}
  if(db.codex)for(const [m,c] of Object.entries(db.codex.mobs)){if(!db.mobs[m])err('codex','มอนที่ไม่มี '+m);
    const t=c.tiers||db.codex.defaultTiers;if(c.bonus.length!==t.length)err('codex.'+m,'bonus ต้องมีเท่าจำนวน tiers');}
  if(db.shops){if(!num(db.shops.sellRate,0,1))err('shops','sellRate ต้องอยู่ใน 0..1');
    for(const [id,sh] of Object.entries(db.shops.shops))for(const i of sh.items){if(!db.items[i])err('shops.'+id,'ไอเทมที่ไม่มี '+i);else if(!(db.items[i].price>0))err('shops.'+id,i+' ไม่มีราคา');}
    const sp=db.shops.shops,inn=db.shops.inn;for(const k of ['restCost','storageFee','storageSlots'])if(!num(inn[k],0))err('shops.inn',k);
    for(const id of Object.keys(sp))for(const i of sp[id].items)if(Math.floor(db.items[i].price*db.shops.sellRate)>db.items[i].price)err('shops','ราคาขายมากกว่าซื้อ '+i);}
  for(const [id,m] of Object.entries(db.mobs)){const w='mobs.'+id;
    for(const [k,v] of Object.entries(m.ai||{}))if(typeof v==='number'&&!num(v,0))err(w,'ai.'+k+' ติดลบ');
    if(m.phases){let last=101;for(const ph of m.phases){if(!num(ph.hpPct,0,100)||ph.hpPct>=last)err(w,'phases.hpPct ต้องเรียงจากมากไปน้อย');last=ph.hpPct;
      for(const s of ph.skills||[])if(!(m.skills&&m.skills[s]))err(w,'phase ใช้สกิลที่ไม่มี '+s);}}
    for(const [sid,s] of Object.entries(m.skills||{})){if(!num(s.cd,0.1))err(w,'skills.'+sid+'.cd');if(s.mob&&!db.mobs[s.mob])err(w,'skills.'+sid+' เรียกมอนที่ไม่มี');}}
  if(db.quests)for(const [id,q] of Object.entries(db.quests)){const w='quests.'+id;
    if(!['none','daily'].includes(q.repeat))err(w,'repeat');if(!q.objectives||!q.objectives.length)err(w,'ไม่มีเป้าหมาย');
    for(const o of q.objectives||[]){if(o.type==='kill'&&!db.mobs[o.mob])err(w,'kill มอนที่ไม่มี '+o.mob);
      else if(o.type==='collect'&&!db.items[o.item])err(w,'collect ไอเทมที่ไม่มี '+o.item);
      else if(!['kill','collect','talk'].includes(o.type))err(w,'objective ไม่รู้จัก '+o.type);
      if(o.type!=='talk'&&!num(o.n,1))err(w,'n ต้อง ≥ 1');}
    for(const r of (q.reward&&q.reward.items)||[])if(!db.items[r.id])err(w,'รางวัลไอเทมที่ไม่มี '+r.id);}
  if(db.dungeons)for(const [id,d] of Object.entries(db.dungeons)){const w='dungeons.'+id,rng=(r)=>Array.isArray(r)&&r.length===2&&num(r[0],0)&&r[1]>=r[0];
    for(const k of ['obstacles','packs','packSize'])if(!rng(d[k]))err(w,k+' ต้องเป็น [min,max]');if(!rng(d.size.w)||!rng(d.size.h))err(w,'size');
    if(d.size.w[0]<1200||d.size.h[0]<900)err(w,'แผนที่เล็กเกินไป (กว้าง ≥ 1200, สูง ≥ 900)');
    for(const p of d.pool)if(!db.mobs[p.mob])err(w,'pool มอนที่ไม่มี '+p.mob);if(!db.mobs[d.boss.mob])err(w,'boss มอนที่ไม่มี');
    if(!num(d.bossUnlockPct,0,100))err(w,'bossUnlockPct');if(!rng(d.reward.zeny))err(w,'reward.zeny');
    for(const x of d.reward.items)if(!db.items[x.id])err(w,'reward ไอเทมที่ไม่มี '+x.id);}
  if(db.rifts){for(const t of db.rifts.tiers){const w='rifts.'+t.id;if(!db.dungeons[t.template])err(w,'template ไม่มี '+t.template);
      for(const k of ['weight','hpMult','eliteChance','bossHpMult','expMult','rewardMult','shadowMult','recLv'])if(!num(t[k],0))err(w,k);
      for(const x of t.extraItems)if(!db.items[x.id])err(w,'extraItems ไอเทมที่ไม่มี '+x.id);}
    for(const [m,M] of Object.entries(db.rifts.maps)){if(db.maps&&!db.maps[m])err('rifts.maps','แมพที่ไม่มี '+m);if(!(M.interval[0]<=M.interval[1]))err('rifts.maps.'+m,'interval');}}
  if(db.maps)for(const [id,m] of Object.entries(db.maps))for(const sp of m.spawns||[])if(!db.mobs[sp.mob])err('maps.'+id,'มอนที่ไม่มี '+sp.mob);
  return E;}
return {validateDb};
});
