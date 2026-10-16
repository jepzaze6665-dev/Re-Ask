// =====================================================================
//  shared/ro.js — สูตรเกม (ออกแบบเอง ได้แรงบันดาลใจจาก RO) ใช้ร่วม client / server
//  ไม่มีตัวเลขปรับสมดุลในไฟล์นี้ — ทุกค่ามาจาก data/db/*.json (ส่งเข้ามาเป็น db)
//  สเปก ลำดับการคำนวณ หน่วย และการปัดเศษ: docs/FORMULAS.md
//  เบราว์เซอร์: window.RO · Node: require('./shared/ro.js')
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.RO=m;})(typeof self!=='undefined'?self:globalThis,function(){
const STATS=['str','agi','vit','int','dex','luk'];
const SLOTS=['head_top','head_mid','head_low','armor','weapon','shield','garment','shoes','acc1','acc2'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/**
 * @typedef {{str:number,agi:number,vit:number,int:number,dex:number,luk:number}} Stats
 * @typedef {{job:string,lv:number,jobLv:number,stats:Stats,equip:Object<string,string|null>,extra?:object[]}} CharInput  equip = slot → item id · extra = โบนัสเพิ่ม (passive/บัฟ)
 * @typedef {{race:Object<string,number>,size:Object<string,number>,ele:Object<string,number>}} DmgBonus
 * @typedef {{def:number,flee:number,pdodge?:number,luk?:number,element?:string,size?:string,race?:string}} Defender
 * @typedef {{dmg:number,miss:boolean,crit:boolean,lucky?:boolean,eleMod?:number}} HitResult
 */

// ---------- เลเวล & แต้ม ----------
/** EXP_next(L) = floor(A + B × L^p) @param {{A:number,B:number,p:number}} c @param {number} lv */
const expNeed=(c,lv)=>Math.floor(c.A+c.B*Math.pow(lv,c.p));
const baseExpNeed=(db,lv)=>expNeed(db.rules.baseExp,lv);
/** Job EXP: อาชีพกำหนดเส้นโค้งเองได้ (jobs[job].jobExp) ไม่งั้นใช้ rules.jobExp */
const jobExpNeed=(db,lv,job)=>expNeed((job&&db.jobs[job]&&db.jobs[job].jobExp)||db.rules.jobExp,lv);
/** ตัวคูณ EXP ตามส่วนต่างเลเวล (มอน − ผู้เล่น) จาก rules.expLevelDiff — ฟาร์มมอนเลเวลต่ำกว่ามากได้ EXP น้อยลง */
function expMult(db,playerLv,mobLv){const d=mobLv-playerLv;for(const r of db.rules.expLevelDiff)if(d>=r.min)return r.pct/100;return 0;}
/** แต้มที่ต้องใช้เพื่อเพิ่ม stat จาก v → v+1 */
const statCost=v=>Math.floor((v-1)/10)+2;
/** แต้มสเตตัสที่ได้ตอนขึ้นถึง lv */
const statPointsOnLevel=lv=>Math.floor(lv/5)+3;

/**
 * ให้ EXP แบบฟังก์ชันล้วน: คืนสถานะใหม่ + จำนวนเลเวลที่ขึ้น (เกินเพดาน = EXP ค้างที่ 0)
 * @param {any} db @param {{lv:number,jobLv:number,exp:number,jobExp:number,job:string}} c @param {number} base @param {number} job
 */
function applyExp(db,c,base,job){
  let {lv,jobLv,exp,jobExp}=c,stat=0,skill=0;const R=db.rules,jmax=db.jobs[c.job].jobLvMax;
  exp+=Math.max(0,Math.floor(base));jobExp+=Math.max(0,Math.floor(job));
  while(lv<R.baseLvMax&&exp>=baseExpNeed(db,lv)){exp-=baseExpNeed(db,lv);lv++;stat+=statPointsOnLevel(lv);}
  if(lv>=R.baseLvMax)exp=0;
  while(jobLv<jmax&&jobExp>=jobExpNeed(db,jobLv,c.job)){jobExp-=jobExpNeed(db,jobLv,c.job);jobLv++;skill++;}
  if(jobLv>=jmax)jobExp=0;
  return {lv,jobLv,exp,jobExp,statPoints:stat,skillPoints:skill,baseUp:lv-c.lv,jobUp:jobLv-c.jobLv};}

// ---------- รวมโบนัสจากของสวมใส่ + Job bonus ----------
function sumBonus(db,c){
  const b={atk:0,matk:0,def:0,mdef:0,hit:0,flee:0,crit:0,hp:0,sp:0,aspd:0,atkPct:0,defPct:0,hpPct:0,hpRegenPct:0,race:{},size:{},ele:{}};
  for(const s of STATS)b[s]=0;
  const add=(src)=>{if(!src)return;for(const k in src){const v=src[k];
    if(typeof v==='object'){for(const kk in v)b[k][kk]=(b[k][kk]||0)+v[kk];}else b[k]=(b[k]||0)+v;}};
  for(const slot of SLOTS){const id=c.equip&&c.equip[slot];if(!id)continue;const it=db.items[id];if(!it)continue;
    if(it.type==='armor'){b.def+=it.def||0;b.mdef+=it.mdef||0;}
    add(it.bonus);}
  const jb=(db.jobs[c.job]||{}).jobBonus||{};
  for(const lv in jb)if(c.jobLv>=+lv)add(jb[lv]);
  for(const x of c.extra||[])add(x);   // โบนัสจากสกิลติดตัว / บัฟ (shared/skills.js, shared/status.js)
  return b;}

/**
 * รอบตี (วินาที) = max(minInterval, base × (1 − ลดรอบตี)) · ลดรอบตี = min(maxReduction, AGI×agiReduce + DEX×dexReduce + aspd%/100)
 * @param {any} db @param {number} base @param {number} agi @param {number} dex @param {number} aspdPct
 */
function attackInterval(db,base,agi,dex,aspdPct){const A=db.rules.attack;
  const red=Math.min(A.maxReduction,agi*A.agiReduce+dex*A.dexReduce+aspdPct/100);
  return Math.max(A.minInterval,base*(1-red));}

/** โอกาสโดน (0..1) = clamp(base + perPoint × (HIT − FLEE), min, max) */
function hitChance(db,hit,flee){const H=db.rules.hit;return clamp(H.base+H.perPoint*(hit-flee),H.min,H.max);}

// ---------- สเตตัสย่อย ----------
/** @param {any} db @param {CharInput} c */
function derive(db,c){
  const job=db.jobs[c.job],b=sumBonus(db,c),S=/** @type {Stats} */({});
  for(const s of STATS)S[s]=c.stats[s]+b[s];
  const w=c.equip&&c.equip.weapon?db.items[c.equip.weapon]:null,wtype=w?w.wtype:'fist';
  const ap=1+b.atkPct/100;
  const statusAtk=Math.floor((S.str+Math.pow(Math.floor(S.str/10),2)+Math.floor(S.dex/5)+Math.floor(S.luk/5))*ap);
  const weaponAtk=Math.floor(((w?w.atk:0)+b.atk)*ap);
  const interval=attackInterval(db,(job.attackInterval&&job.attackInterval[wtype])||1,S.agi,S.dex,b.aspd);
  const hpMax=Math.floor((job.hp.base+c.lv*job.hp.perLv+c.lv*c.lv*job.hp.curve)*(1+S.vit/100)*(1+b.hpPct/100))+b.hp;
  const spMax=Math.floor((job.sp.base+c.lv*job.sp.perLv)*(1+S.int/100))+b.sp;
  const def=Math.max(0,Math.floor((b.def+Math.floor(S.vit*db.rules.damage.vitToDef))*(1+b.defPct/100)));
  return {S,bonus:b,wtype,weaponEle:w&&w.ele||'neutral',
    statusAtk,weaponAtk,atk:statusAtk+weaponAtk,
    matkMin:S.int+Math.pow(Math.floor(S.int/7),2)+b.matk, matkMax:S.int+Math.pow(Math.floor(S.int/5),2)+b.matk,
    def, equipDef:b.def, mdef:b.mdef+Math.floor(S.int/2),
    hit:c.lv+S.dex+b.hit, flee:c.lv+S.agi+b.flee, pdodge:1+Math.floor(S.luk/10),
    crit:1+Math.floor(S.luk*.3)+b.crit, attackInterval:interval, attacksPerSec:1/interval,
    hpMax, spMax, hpRegen:(1+hpMax*.004+S.vit*.1)*(1+b.hpRegenPct/100), spRegen:.5+spMax*.01+S.int*.1,
    weightMax:db.rules.weightBase+S.str*db.rules.weightPerStr};}

/** โปรไฟล์โจมตี/รับของมอนสเตอร์ (mobs.json) */
function mobProfile(db,m){return {lv:m.lv,atkMin:m.atk[0],atkMax:m.atk[1],def:m.def+Math.floor((m.vit||0)*db.rules.damage.vitToDef),
  flee:m.lv+(m.agi||0),hit:m.lv+(m.dex||0),crit:0,luk:m.luk||0,pdodge:0,element:m.element,size:m.size,race:m.race,wtype:'mob'};}

/** ใส่ผลของสถานะ (mods จาก shared/status.js) ลงโปรไฟล์มอน — คืนสำเนาใหม่ */
function withMods(prof,m){if(!m)return prof;const ap=1+(m.atkPct||0)/100;
  return {...prof,atkMin:prof.atkMin*ap,atkMax:prof.atkMax*ap,def:Math.max(0,Math.floor((prof.def+(m.def||0))*(1+(m.defPct||0)/100))),
    flee:prof.flee+(m.flee||0),hit:prof.hit+(m.hit||0)};}

// ---------- ดาเมจกายภาพ (ลำดับตาม docs/FORMULAS.md §3) ----------
/**
 * @param {any} db
 * @param {any} A ผู้โจมตี: ผล derive (+lv) หรือ mobProfile
 * @param {Defender} D ผู้รับ
 * @param {{pct?:number,element?:string,ignoreFlee?:boolean,noCrit?:boolean,rng:() => number}} o pct = % ของสกิล (100 = ตีปกติ) · rng บังคับ (ทำซ้ำได้)
 * @returns {HitResult}
 */
function physical(db,A,D,o){
  const R=db.rules,K=R.damage,rng=o.rng,pct=o.pct==null?100:o.pct;
  // 1) คริ (ทะลุการหลบ)  2) หลบสมบูรณ์  3) โอกาสโดน
  const crit=!o.noCrit&&rng()*100<Math.max(0,(A.crit||0)-(D.luk||0)*K.critLukShield);
  if(!crit&&!o.ignoreFlee){
    if(D.pdodge&&rng()*100<D.pdodge)return {dmg:0,miss:true,crit:false,lucky:true};
    if(rng()>=hitChance(db,A.hit,D.flee))return {dmg:0,miss:true,crit:false};}
  // 4) ATK ดิบ (มอน: สุ่มในช่วง · ผู้เล่น: ATK สเตตัส + ATK อาวุธ ±variance · คริ = ค่าสูงสุด)
  let atk;
  if(A.wtype==='mob')atk=crit?A.atkMax:A.atkMin+rng()*(A.atkMax-A.atkMin);
  else atk=A.statusAtk+A.weaponAtk*(crit?1+K.variance:1-K.variance+rng()*2*K.variance);
  // 5) ตัวคูณ
  const ele=o.element||A.weaponEle||'neutral',bon=A.bonus||{race:{},size:{},ele:{}};
  const eleMod=(R.elementTable[ele]||R.elementTable.neutral)[R.elements.indexOf(D.element||'neutral')]/100;
  const sizeMod=(R.sizeTable[A.wtype]||R.sizeTable.fist)[R.sizes.indexOf(D.size||'medium')]/100;
  const finalMul=sizeMod*(1+(bon.size[D.size]||0)/100)*(1+(bon.race[D.race]||0)/100)*(1+(bon.ele[D.element]||0)/100)*(crit?K.critMultiplier:1);
  // 6) Final = max(1, floor(ATK × skill% × defScale/(defScale+DEF) × ธาตุ × ตัวคูณรวม)) · ธาตุ 0 = ภูมิคุ้มกัน (0)
  const raw=atk*pct/100*K.defScale/(K.defScale+Math.max(0,D.def||0))*eleMod*finalMul;
  const dmg=eleMod<=0?0:Math.max(1,Math.floor(raw));
  return {dmg,crit,miss:false,eleMod};}

return {STATS,SLOTS,expNeed,baseExpNeed,jobExpNeed,expMult,statCost,statPointsOnLevel,applyExp,sumBonus,withMods,attackInterval,hitChance,derive,mobProfile,physical};
});
