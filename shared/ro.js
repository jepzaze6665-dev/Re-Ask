// =====================================================================
//  shared/ro.js — สูตรแบบ Ragnarok Online ใช้ร่วม client (แสดงผล) / server (ตัดสินจริง)
//  ไม่มีตัวเลขปรับสมดุลในไฟล์นี้ — ทุกค่ามาจาก data/db/*.json (ส่งเข้ามาเป็น db)
//  เบราว์เซอร์: window.RO · Node: require('./shared/ro.js')
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.RO=m;})(this,function(){
const STATS=['str','agi','vit','int','dex','luk'];
const SLOTS=['head_top','head_mid','head_low','armor','weapon','shield','garment','shoes','acc1','acc2'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------- เลเวล & แต้ม ----------
const expNeed=(c,lv)=>Math.round(c.a*Math.pow(lv,c.p)+c.b);
const baseExpNeed=(db,lv)=>expNeed(db.rules.baseExp,lv);
const jobExpNeed=(db,lv)=>expNeed(db.rules.jobExp,lv);
const statCost=v=>Math.floor((v-1)/10)+2;                 // ค่าแต้มเพื่อเพิ่ม stat จาก v → v+1
const statPointsOnLevel=lv=>Math.floor(lv/5)+3;            // แต้มที่ได้ตอนขึ้นถึง lv

// ---------- รวมโบนัสจากของสวมใส่ + Job bonus ----------
function sumBonus(db,c){
  const b={atk:0,matk:0,def:0,mdef:0,hit:0,flee:0,crit:0,hp:0,sp:0,aspd:0,race:{},size:{},ele:{}};
  for(const s of STATS)b[s]=0;
  const add=(src)=>{if(!src)return;for(const k in src){const v=src[k];
    if(typeof v==='object'){for(const kk in v)b[k][kk]=(b[k][kk]||0)+v[kk];}else b[k]=(b[k]||0)+v;}};
  for(const slot of SLOTS){const id=c.equip&&c.equip[slot];if(!id)continue;const it=db.items[id];if(!it)continue;
    if(it.type==='armor'){b.def+=it.def||0;b.mdef+=it.mdef||0;}
    add(it.bonus);}
  const jb=(db.jobs[c.job]||{}).jobBonus||{};
  for(const lv in jb)if(c.jobLv>=+lv)add(jb[lv]);
  return b;}

// ---------- สเตตัสย่อย (ATK, DEF, HIT, FLEE, CRIT, ASPD, MaxHP/SP ...) ----------
function derive(db,c){
  const job=db.jobs[c.job],b=sumBonus(db,c),S={};
  for(const s of STATS)S[s]=c.stats[s]+b[s];
  const w=c.equip&&c.equip.weapon?db.items[c.equip.weapon]:null,wtype=w?w.wtype:'fist';
  const statusAtk=S.str+Math.pow(Math.floor(S.str/10),2)+Math.floor(S.dex/5)+Math.floor(S.luk/5);
  const weaponAtk=(w?w.atk:0)+b.atk;
  const aspdBase=(job.aspdBase&&job.aspdBase[wtype])||60;
  const aspd=clamp(200-aspdBase*(1-(4*S.agi+S.dex)/1000)*(1-b.aspd/100),100,190);
  const hpMax=Math.floor((job.hp.base+c.lv*job.hp.perLv+c.lv*c.lv*job.hp.curve)*(1+S.vit/100))+b.hp;
  const spMax=Math.floor((job.sp.base+c.lv*job.sp.perLv)*(1+S.int/100))+b.sp;
  return {S,bonus:b,wtype,weaponEle:w&&w.ele||'neutral',
    statusAtk,weaponAtk,atk:statusAtk+weaponAtk,
    matkMin:S.int+Math.pow(Math.floor(S.int/7),2)+b.matk, matkMax:S.int+Math.pow(Math.floor(S.int/5),2)+b.matk,
    def:Math.min(99,b.def), softDef:S.vit, mdef:b.mdef, softMdef:S.int,
    hit:c.lv+S.dex+b.hit, flee:c.lv+S.agi+b.flee, pdodge:1+Math.floor(S.luk/10),
    crit:1+Math.floor(S.luk*.3)+b.crit, aspd, attacksPerSec:50/(200-aspd),
    hpMax, spMax, hpRegen:1+hpMax*.004+S.vit*.1, spRegen:.5+spMax*.01+S.int*.1,
    weightMax:db.rules.weightBase+S.str*db.rules.weightPerStr};}

// โปรไฟล์ฝั่งรับ/โจมตีของมอนสเตอร์ (มาจาก mobs.json)
function mobProfile(m){return {lv:m.lv,atkMin:m.atk[0],atkMax:m.atk[1],def:m.def,softDef:m.vit,flee:m.lv+(m.agi||0),
  hit:m.lv+(m.dex||0),crit:0,luk:m.luk||0,pdodge:0,element:m.element,size:m.size,race:m.race,wtype:'mob'};}

// ---------- ดาเมจกายภาพ ----------
// A (ผู้โจมตี): ผู้เล่น = ผล derive + {lv}; มอนสเตอร์ = mobProfile
// D (ผู้รับ):   {def, softDef, flee, pdodge, luk, element, size, race}
// o: {pct=100, element, ignoreFlee, noCrit, rng}
function physical(db,A,D,o={}){
  const R=db.rules,rng=o.rng||Math.random,pct=o.pct==null?100:o.pct;
  const critRate=o.noCrit?0:Math.max(0,(A.crit||0)-(D.luk||0)*.2);
  const crit=rng()*100<critRate;
  if(!crit&&!o.ignoreFlee){
    if(D.pdodge&&rng()*100<D.pdodge)return {dmg:0,miss:true,lucky:true};
    const hitRate=clamp(R.hitBase+A.hit-D.flee,5,100);
    if(rng()*100>=hitRate)return {dmg:0,miss:true};}
  let base;
  if(A.wtype==='mob')base=crit?A.atkMax:A.atkMin+rng()*(A.atkMax-A.atkMin);
  else base=A.statusAtk+A.weaponAtk*(crit?1+R.variance:1-R.variance+rng()*2*R.variance);
  const ele=o.element||A.weaponEle||'neutral',bon=A.bonus||{race:{},size:{},ele:{}};
  const eleMod=(R.elementTable[ele]||R.elementTable.neutral)[R.elements.indexOf(D.element||'neutral')]/100;
  const sizeMod=(R.sizeTable[A.wtype]||R.sizeTable.fist)[R.sizes.indexOf(D.size||'medium')]/100;
  let d=base*pct/100*sizeMod*(1+(bon.size[D.size]||0)/100)*(1+(bon.race[D.race]||0)/100)*eleMod*(1+(bon.ele[D.element]||0)/100);
  if(crit)d*=R.critMultiplier;                                 // คริเจาะ DEF
  else d=d*(100-Math.min(99,D.def||0))/100-(D.softDef||0);
  d=eleMod<=0?0:Math.max(1,Math.round(d));
  return {dmg:d,crit,miss:false,eleMod};}

return {STATS,SLOTS,baseExpNeed,jobExpNeed,statCost,statPointsOnLevel,sumBonus,derive,mobProfile,physical};
});
