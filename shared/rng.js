// =====================================================================
//  shared/rng.js — สุ่มแบบมี seed (mulberry32) ทำซ้ำได้ ใช้ในเทสต์และเซิร์ฟเวอร์
//  เบราว์เซอร์: window.RNG · Node: require('./shared/rng.js')
// =====================================================================
(function(root,factory){const m=factory();if(typeof module==='object'&&module.exports)module.exports=m;else root.RNG=m;})(typeof self!=='undefined'?self:globalThis,function(){

/**
 * @typedef {(() => number) & {state: () => number}} Rng  ฟังก์ชันคืนค่า [0,1) + อ่าน state เพื่อเซฟ/ต่อได้
 */

/** @param {number} seed จำนวนเต็ม 32 บิต @returns {Rng} */
function make(seed){let s=seed>>>0;
  const f=/** @type {Rng} */(()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;});
  f.state=()=>s;return f;}

/** สุ่มเปอร์เซ็นต์: true เมื่อสุ่มได้ต่ำกว่า pct (0..100) @param {() => number} rng @param {number} pct */
const roll=(rng,pct)=>rng()*100<pct;

/** เลือก index ตามน้ำหนัก @param {() => number} rng @param {number[]} weights */
function pickWeighted(rng,weights){const sum=weights.reduce((a,b)=>a+b,0);let r=rng()*sum;
  for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}return weights.length-1;}

return {make,roll,pickWeighted};
});
