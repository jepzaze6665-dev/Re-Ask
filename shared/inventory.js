// =====================================================================
//  shared/inventory.js — เงินและไอเทมแบบ instance + ธุรกรรม atomic + กันทำซ้ำ (idempotency) + log
//  ทุกการเพิ่ม/ลด zeny หรือไอเทมต้องผ่าน apply() เท่านั้น → ตอนออนไลน์ย้ายฟังก์ชันนี้ไปไว้บนเซิร์ฟเวอร์ได้ทันที
//  ไม่มี I/O ในไฟล์นี้ (ฟังก์ชันล้วน + แก้ state ที่ส่งเข้ามา) · สเปก: docs/FORMULAS.md §6
//  เบราว์เซอร์: window.INV · Node: require('./shared/inventory.js')
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.INV=m;})(typeof self!=='undefined'?self:globalThis,function(){

/**
 * @typedef {{uid:number,id:string,qty:number,eq?:string|null,sockets?:any[],refine?:number,star?:number,alt?:boolean,bound?:boolean}} ItemInstance
 *   uid = เลขประจำชิ้น (ไม่ซ้ำในตัวละคร) · id = ItemDefinition · eq = ช่องที่สวมอยู่ (null = ในกระเป๋า)
 * @typedef {{key:string,reason:string,zeny?:number,add?:{id:string,qty:number,sockets?:any[],attrs?:{star?:number,alt?:boolean,refine?:number}}[],remove?:{uid:number,qty:number}[]}} Tx
 *   attrs = คุณสมบัติประจำชิ้น (ดาวเงาอสูร, แปรธาตุ, ขั้นตีบวก) · sockets = ช่องผนึก (null = ว่าง หรือ {sid,star,alt})
 *   key = idempotency key (ซ้ำ = ไม่ทำซ้ำ) · zeny บวก = ได้ ลบ = จ่าย
 * @typedef {{zeny:number,items:ItemInstance[],nextUid:number,applied:string[],ledger:any[],stats?:{src:Object<string,number>,sink:Object<string,number>}}} Inventory
 *   stats = ยอดเงินเข้า (src) / ออก (sink) สะสมตามหมวด (ส่วนแรกของ reason ก่อน ':') — ใช้ดูเศรษฐกิจ
 * @typedef {{ok:boolean,dup?:boolean,err?:string,added?:number[]}} TxResult
 */

const LEDGER_KEEP=300, APPLIED_KEEP=1000, ZENY_MAX=2e9;
const isStack=it=>it.type==='use'||it.type==='etc';

/** @returns {Inventory} */
const create=()=>({zeny:0,items:[],nextUid:1,applied:[],ledger:[],stats:{src:{},sink:{}}});

/** น้ำหนักรวม (ทั้งในกระเป๋าและที่สวม) */
const weight=(db,inv)=>inv.items.reduce((w,s)=>w+(db.items[s.id].weight||0)*s.qty,0);

/**
 * ทำธุรกรรมแบบ all-or-nothing: ตรวจทั้งหมดก่อน ผ่านแล้วค่อยแก้ state
 * @param {any} db @param {Inventory} inv @param {Tx} tx @param {{weightMax?:number,now?:number}} [lim]
 * @returns {TxResult}
 */
function apply(db,inv,tx,lim={}){
  if(!tx||typeof tx.key!=='string'||!tx.key)return {ok:false,err:'ไม่มี idempotency key'};
  if(inv.applied.includes(tx.key))return {ok:true,dup:true};
  const z=tx.zeny||0,add=tx.add||[],rem=tx.remove||[];
  if(!Number.isInteger(z))return {ok:false,err:'zeny ต้องเป็นจำนวนเต็ม'};
  if(inv.zeny+z<0)return {ok:false,err:'เงินไม่พอ'};
  if(inv.zeny+z>ZENY_MAX)return {ok:false,err:'เงินเกินเพดาน'};
  let dw=0;
  for(const a of add){const it=db.items[a.id];if(!it)return {ok:false,err:'ไม่รู้จักไอเทม '+a.id};
    if(!Number.isInteger(a.qty)||a.qty<=0)return {ok:false,err:'จำนวนไม่ถูกต้อง'};dw+=(it.weight||0)*a.qty;}
  const need={};
  for(const r of rem){if(!Number.isInteger(r.qty)||r.qty<=0)return {ok:false,err:'จำนวนไม่ถูกต้อง'};need[r.uid]=(need[r.uid]||0)+r.qty;}
  for(const uid in need){const s=inv.items.find(x=>x.uid===+uid);
    if(!s)return {ok:false,err:'ไม่มีไอเทมชิ้นนี้'};if(s.eq)return {ok:false,err:'ถอดของก่อน'};
    if(s.qty<need[uid])return {ok:false,err:'จำนวนไม่พอ'};dw-=(db.items[s.id].weight||0)*need[uid];}
  if(lim.weightMax!=null&&dw>0&&weight(db,inv)+dw>lim.weightMax)return {ok:false,err:'น้ำหนักเกิน!'};
  // --- ผ่านการตรวจแล้ว: แก้ state ---
  for(const uid in need){const i=inv.items.findIndex(x=>x.uid===+uid);inv.items[i].qty-=need[uid];if(inv.items[i].qty<=0)inv.items.splice(i,1);}
  const added=[];
  for(const a of add){const it=db.items[a.id];
    if(isStack(it)){const s=inv.items.find(x=>x.id===a.id&&!x.eq);if(s){s.qty+=a.qty;added.push(s.uid);continue;}
      const n={uid:inv.nextUid++,id:a.id,qty:a.qty,eq:null};inv.items.push(n);added.push(n.uid);}
    else for(let k=0;k<a.qty;k++){const n={uid:inv.nextUid++,id:a.id,qty:1,eq:null,sockets:a.sockets?a.sockets.map(x=>x&&{...x}):[],...(a.attrs||{})};inv.items.push(n);added.push(n.uid);}}
  inv.zeny+=z;
  if(z){const st=inv.stats||(inv.stats={src:{},sink:{}}),cat=String(tx.reason).split(':')[0];if(z>0)st.src[cat]=(st.src[cat]||0)+z;else st.sink[cat]=(st.sink[cat]||0)-z;}
  inv.applied.push(tx.key);if(inv.applied.length>APPLIED_KEEP)inv.applied.splice(0,inv.applied.length-APPLIED_KEEP);
  inv.ledger.push({key:tx.key,reason:tx.reason,zeny:z,add,remove:rem,t:lim.now||0});if(inv.ledger.length>LEDGER_KEEP)inv.ledger.splice(0,inv.ledger.length-LEDGER_KEEP);
  return {ok:true,added};}

// ---------- สวม/ถอด (ย้ายที่ภายในเจ้าของเดิม — ไม่ใช่ธุรกรรมเงิน/ของ) ----------
const equipped=(inv,slot)=>inv.items.find(x=>x.eq===slot)||null;
/** slot → item id (สำหรับ RO.derive) */
function equipIds(inv){const o={};for(const s of inv.items)if(s.eq)o[s.eq]=s.id;return o;}
function slotFor(it,inv){if(it.type==='weapon')return 'weapon';if(it.slot==='acc')return equipped(inv,'acc1')&&!equipped(inv,'acc2')?'acc2':'acc1';return it.slot;}
/**
 * @param {any} db @param {Inventory} inv @param {number} uid @param {number} lv Base Lv ผู้สวม @param {string[]} [weapons] ชนิดอาวุธที่อาชีพใช้ได้
 * @returns {{ok:boolean,err?:string}}
 */
function equip(db,inv,uid,lv,weapons){const s=inv.items.find(x=>x.uid===uid),it=s&&db.items[s.id];
  if(!it||(it.type!=='weapon'&&it.type!=='armor'))return {ok:false,err:'สวมใส่ไม่ได้'};
  if(s.eq)return {ok:false,err:'สวมอยู่แล้ว'};
  if(it.lvReq&&lv<it.lvReq)return {ok:false,err:`ต้องการ Base Lv ${it.lvReq}`};
  if(it.type==='weapon'&&weapons&&!weapons.includes(it.wtype))return {ok:false,err:'อาชีพนี้ใช้อาวุธชนิดนี้ไม่ได้'};
  const two=db.rules.twoHanded,w=equipped(inv,'weapon');
  if(it.slot==='shield'&&w&&two.includes(db.items[w.id].wtype))return {ok:false,err:'ใช้โล่คู่กับอาวุธสองมือไม่ได้'};
  const slot=slotFor(it,inv),cur=equipped(inv,slot);if(cur)cur.eq=null;
  s.eq=slot;
  if(it.type==='weapon'&&two.includes(it.wtype)){const sh=equipped(inv,'shield');if(sh)sh.eq=null;}
  return {ok:true};}
function unequip(inv,slot){const s=equipped(inv,slot);if(!s)return {ok:false,err:'ช่องว่าง'};s.eq=null;return {ok:true};}

// ---------- ดรอป (ฟังก์ชันล้วน · rng บังคับ เพื่อให้ตรวจสอบย้อนหลังได้) ----------
/**
 * @param {any} db @param {any} mob MonsterDefinition @param {number} luk @param {() => number} rng
 * @returns {{zeny:number,items:{id:string,qty:number,sockets?:(string|null)[]}[]}}
 */
function rollDrops(db,mob,luk,rng){const m=1+luk*db.rules.dropLukBonus,items=[];
  for(const d of mob.drops||[])if(rng()*100<d.rate*m){const it=db.items[d.item];
    items.push(it.maxSockets?{id:d.item,qty:1,sockets:Array(rollSockets(db,it,rng)).fill(null)}:{id:d.item,qty:1});}
  const z=mob.zeny?Math.floor(mob.zeny[0]+rng()*(mob.zeny[1]-mob.zeny[0]+1)):0;
  return {zeny:z,items};}
function rollSockets(db,it,rng){const ch=db.shadows?db.shadows.rules.sockets.chance:[100];
  let r=rng()*100,n=0;for(;n<ch.length;n++){r-=ch[n];if(r<0)break;}return Math.min(n,it.maxSockets||0);}

/** หาไอเทมตาม uid */
const find=(inv,uid)=>inv.items.find(x=>x.uid===uid)||null;

return {create,find,weight,apply,equip,unequip,equipped,equipIds,rollDrops,isStack};
});
