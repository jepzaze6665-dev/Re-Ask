// =====================================================================
//  shared/shop.js — ร้าน NPC (ซื้อ/ขาย), โรงแรม (พัก), คลังฝากของ (ย้ายของระหว่างกระเป๋า ↔ คลัง)
//  ข้อมูล data/db/shops.json · ทุกการเปลี่ยนเงิน/ของผ่าน INV.apply (atomic + key กันทำซ้ำ)
//  เบราว์เซอร์: window.SHOP · Node: require('./shared/shop.js')
// =====================================================================
(function(root,factory){
  const m=typeof module==='object'&&module.exports?factory(require('./inventory.js')):factory(root.INV);
  if(typeof module==='object'&&module.exports)module.exports=m;else root.SHOP=m;
})(typeof self!=='undefined'?self:globalThis,function(INV){

const buyPrice=(db,id)=>db.items[id].price||0;
const sellPrice=(db,id)=>Math.floor((db.items[id].price||0)*db.shops.sellRate);
const attrsOf=s=>{const a={};for(const k of ['star','alt','refine'])if(s[k]!=null)a[k]=s[k];return a;};

/**
 * ซื้อจากร้าน (ร้านต้องขายไอเทมนั้นจริง)
 * @param {any} db @param {any} inv @param {string} key @param {string} shopId @param {string} id @param {number} qty @param {{weightMax?:number}} [lim]
 */
function buy(db,inv,key,shopId,id,qty,lim={}){const shop=db.shops.shops[shopId];
  if(!shop||!shop.items.includes(id))return {ok:false,err:'ร้านนี้ไม่ขายของชิ้นนี้'};
  if(!Number.isInteger(qty)||qty<=0||qty>999)return {ok:false,err:'จำนวนไม่ถูกต้อง'};
  return INV.apply(db,inv,{key,reason:'shop:buy',zeny:-buyPrice(db,id)*qty,add:[{id,qty}]},lim);}

/** ขายให้ร้าน (ของที่สวม/เรียกอยู่ขายไม่ได้ · ราคา 0 ขายไม่ได้) */
function sell(db,inv,key,uid,qty){const s=INV.find(inv,uid);if(!s)return {ok:false,err:'ไม่พบไอเทม'};
  const p=sellPrice(db,s.id);if(p<=0)return {ok:false,err:'ร้านไม่รับซื้อของชิ้นนี้'};
  if(s.sockets&&s.sockets.some(Boolean))return {ok:false,err:'ถอดเงาอสูรออกก่อนขาย'};
  return INV.apply(db,inv,{key,reason:'shop:sell',zeny:p*qty,remove:[{uid,qty}]});}

/** พักที่โรงแรม: จ่ายเงิน → เกมฟื้น HP/SP เต็ม */
const rest=(db,inv,key)=>INV.apply(db,inv,{key,reason:'inn:rest',zeny:-db.shops.inn.restCost});
/** ค่าเปิดคลัง (เก็บครั้งเดียวต่อการเปิด) */
const storageFee=(db,inv,key)=>INV.apply(db,inv,{key,reason:'inn:storage',zeny:-db.shops.inn.storageFee});

/**
 * ย้ายของระหว่าง 2 กระเป๋า (กระเป๋า → คลัง หรือกลับ) — ตรวจทั้งสองฝั่งก่อน แล้วค่อยทำ
 * key ถูกบันทึกทั้งสองฝั่ง · คุณสมบัติประจำชิ้น (ดาว แปรธาตุ ตีบวก ช่องผนึก) ติดไปด้วย
 * @param {any} db @param {any} from @param {any} to @param {string} key @param {number} uid @param {number} qty
 * @param {{toSlots?:number,toWeightMax?:number}} [lim] toSlots = จำนวนช่องสูงสุดของฝั่งปลายทาง
 */
function transfer(db,from,to,key,uid,qty,lim={}){
  if(from.applied.includes(key)||to.applied.includes(key))return {ok:true,dup:true};
  const s=INV.find(from,uid);if(!s)return {ok:false,err:'ไม่พบไอเทม'};if(s.eq)return {ok:false,err:'ถอดของก่อน'};
  if(!Number.isInteger(qty)||qty<=0||qty>s.qty)return {ok:false,err:'จำนวนไม่ถูกต้อง'};
  const stackable=INV.isStack(db.items[s.id]),merges=stackable&&to.items.some(x=>x.id===s.id&&!x.eq);
  if(lim.toSlots!=null&&!merges&&to.items.length>=lim.toSlots)return {ok:false,err:'ช่องเต็ม'};
  if(lim.toWeightMax!=null&&INV.weight(db,to)+(db.items[s.id].weight||0)*qty>lim.toWeightMax)return {ok:false,err:'น้ำหนักเกิน!'};
  const add={id:s.id,qty,sockets:s.sockets,attrs:attrsOf(s)};
  const r1=INV.apply(db,from,{key,reason:'storage:out',remove:[{uid,qty}]});if(!r1.ok)return r1;
  const r2=INV.apply(db,to,{key,reason:'storage:in',add:[add]});
  if(!r2.ok){   // ไม่ควรเกิด (ตรวจไว้แล้ว) — คืนของให้ฝั่งต้นทางเพื่อไม่ให้ของหาย
    INV.apply(db,from,{key:key+':rollback',reason:'storage:rollback',add:[add]});return r2;}
  return {ok:true};}

return {buyPrice,sellPrice,buy,sell,rest,storageFee,transfer};
});
