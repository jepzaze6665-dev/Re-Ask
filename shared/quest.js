// =====================================================================
//  shared/quest.js — เควสต์: รับ · นับความคืบหน้า · ส่ง (รางวัลผ่าน INV.apply ด้วย key ไม่ซ้ำ) · รีเซ็ตรายวัน
//  state ของผู้เล่น: qs = {questId: {status:'active'|'done', prog:[…], day?:string, claimedDay?:string}}
//  เบราว์เซอร์: window.QUEST · Node: require('./shared/quest.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./inventory.js')):factory(root.INV);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.QUEST=m;
})(typeof self!=='undefined'?self:globalThis,function(INV){

/** วันที่แบบ YYYY-MM-DD (ใช้รีเซ็ตเควสต์รายวัน) */
const dayOf=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const countItem=(db,inv,id)=>inv.items.filter(x=>x.id===id&&!x.eq).reduce((n,x)=>n+x.qty,0);

/**
 * สถานะเควสต์สำหรับแสดงผล
 * @returns {'locked'|'available'|'active'|'ready'|'done'}
 */
function status(db,qs,inv,lv,id,now){const q=db.quests[id],s=qs[id];
  if(lv<q.lv)return 'locked';
  if(!s)return 'available';
  if(s.status==='done'){if(q.repeat==='daily'&&s.claimedDay!==dayOf(now))return 'available';return 'done';}
  return isComplete(db,qs,inv,id)?'ready':'active';}

/** ความคืบหน้าแต่ละเป้าหมาย [{have, need}] */
function progress(db,qs,inv,id){const q=db.quests[id],s=qs[id];
  return q.objectives.map((o,i)=>{const need=o.type==='talk'?1:o.n;
    const have=o.type==='collect'?countItem(db,inv,o.item):(s&&s.status==='active'?s.prog[i]||0:0);return {have:Math.min(have,need),need};});}
const isComplete=(db,qs,inv,id)=>progress(db,qs,inv,id).every(p=>p.have>=p.need);

/** รับเควสต์ @returns {string|null} ข้อผิดพลาด */
function accept(db,qs,inv,lv,id,now){const st=status(db,qs,inv,lv,id,now);
  if(st==='locked')return `ต้องการ Base Lv ${db.quests[id].lv}`;if(st!=='available')return 'รับเควสต์นี้อยู่แล้วหรือทำไปแล้ว';
  qs[id]={status:'active',prog:db.quests[id].objectives.map(()=>0),day:dayOf(now)};return null;}

/**
 * แจ้งเหตุการณ์ (ฆ่ามอน / คุยกับ NPC) ให้ทุกเควสต์ที่กำลังทำ
 * @param {{type:'kill'|'talk',mob?:string,npc?:string}} ev @returns {string[]} id เควสต์ที่คืบหน้า
 */
function onEvent(db,qs,ev){const hit=[];
  for(const [id,s] of Object.entries(qs)){if(s.status!=='active')continue;const q=db.quests[id];
    q.objectives.forEach((o,i)=>{if(o.type!==ev.type)return;
      if((o.type==='kill'&&o.mob===ev.mob)||(o.type==='talk'&&o.npc===ev.npc)){const need=o.type==='talk'?1:o.n;
        if((s.prog[i]||0)<need){s.prog[i]=(s.prog[i]||0)+1;if(!hit.includes(id))hit.push(id);}}});}
  return hit;}

/**
 * ส่งเควสต์: ตรวจครบ → หักไอเทม (collect.consume) + ให้ zeny/ไอเทม ในธุรกรรมเดียว (key ต่อรอบ → กดซ้ำไม่ได้รางวัลซ้ำ)
 * EXP คืนให้เกมไปใส่ (ใช้ระบบ EXP เดียวกับการฆ่า)
 * @returns {{ok:boolean,err?:string,dup?:boolean,exp?:number,jobExp?:number}}
 */
function claim(db,qs,inv,id,now,lim={}){const q=db.quests[id],s=qs[id];
  if(!s||s.status!=='active')return {ok:false,err:'ยังไม่ได้รับเควสต์นี้'};
  if(!isComplete(db,qs,inv,id))return {ok:false,err:'ยังทำไม่ครบ'};
  const remove=[];
  for(const o of q.objectives)if(o.type==='collect'&&o.consume){let left=o.n;
    for(const x of inv.items.filter(i=>i.id===o.item&&!i.eq)){const t=Math.min(left,x.qty);remove.push({uid:x.uid,qty:t});left-=t;if(!left)break;}}
  const R=q.reward||{},key=`quest:${id}:${q.repeat==='daily'?dayOf(now):'once'}`;
  const r=INV.apply(db,inv,{key,reason:'quest:'+id,zeny:R.zeny||0,remove,add:(R.items||[]).map(x=>({id:x.id,qty:x.qty}))},lim);
  if(!r.ok)return r;
  qs[id]={status:'done',prog:[],claimedDay:dayOf(now)};
  return r.dup?{ok:true,dup:true}:{ok:true,exp:R.exp||0,jobExp:R.jobExp||0};}

return {dayOf,status,progress,isComplete,accept,onEvent,claim};
});
