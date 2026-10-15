// =====================================================================
//  game/ui.js — หน้าต่าง DOM: สเตตัส (C) · กระเป๋า+ช่องสวมใส่ (I) · ทูลทิป
// =====================================================================
const UI=(()=>{
const css=`
.rw{position:fixed;background:rgba(20,14,32,.94);border:2px solid #3a2d55;border-radius:12px;color:#e9ddff;font:13px system-ui,"Segoe UI",Tahoma,sans-serif;
  box-shadow:0 10px 40px #000a;user-select:none;z-index:10;display:none}
.rw.open{display:block}
.rw h3{margin:0;padding:8px 12px;font-size:14px;color:#ffd166;border-bottom:1px solid #3a2d55;cursor:move;display:flex;justify-content:space-between}
.rw h3 b{cursor:pointer;color:#cfc4ff;font-weight:900}
.rw .bd{padding:10px 12px}
.row{display:flex;align-items:center;gap:6px;height:24px}
.row .k{width:40px;font-weight:800;color:#cfc4ff}.row .v{width:62px}.row .v i{color:#7bd88f;font-style:normal}
.row .c{width:46px;color:#998bc0;font-size:11px}
.pb{width:22px;height:20px;border-radius:6px;border:1px solid #6b55a8;background:#2b1f45;color:#fff;font-weight:900;cursor:pointer;padding:0}
.pb:disabled{opacity:.3;cursor:default}
.grid2{display:grid;grid-template-columns:auto auto;gap:2px 16px;font-size:12px}.grid2 span:nth-child(odd){color:#998bc0}
.sep{border-top:1px solid #3a2d55;margin:8px 0}
.xb{height:6px;background:#0008;border-radius:3px;overflow:hidden;margin:2px 0 6px}.xb div{height:100%;background:#ffd166}
.eq{display:grid;grid-template-columns:repeat(2,150px);gap:4px}
.slot{height:34px;border:1px solid #3a2d55;border-radius:8px;display:flex;align-items:center;gap:6px;padding:0 6px;font-size:11px;background:#0004;cursor:pointer;overflow:hidden;white-space:nowrap}
.slot em{color:#6d6290;font-style:normal}
.ic{width:24px;height:24px;border-radius:6px;flex:none;box-shadow:inset 0 0 0 2px #0006;position:relative}
.bag{display:grid;grid-template-columns:repeat(7,42px);gap:4px;max-height:220px;overflow:auto;margin-top:6px}
.cell{width:42px;height:42px;border:1px solid #3a2d55;border-radius:8px;background:#0004;display:flex;align-items:center;justify-content:center;position:relative;cursor:pointer}
.cell .ic{width:28px;height:28px}.cell span{position:absolute;right:3px;bottom:1px;font-size:10px;font-weight:900;text-shadow:0 0 3px #000}
.r-rare{border-color:#5aa8ff!important;box-shadow:0 0 6px #5aa8ff66}.r-legend{border-color:#ffb347!important;box-shadow:0 0 8px #ffb347aa}
.tabs{display:flex;gap:4px}.tabs button{flex:1;background:#2b1f45;border:1px solid #3a2d55;color:#cfc4ff;border-radius:6px;padding:3px;cursor:pointer;font:inherit;font-size:11px}
.tabs button.on{background:#5a3fa0;color:#fff}
#tip{position:fixed;z-index:20;pointer-events:none;background:rgba(10,7,18,.97);border:1px solid #6b55a8;border-radius:8px;padding:8px 10px;color:#e9ddff;font:12px system-ui;max-width:240px;display:none}
#tip b{color:#fff;font-size:13px}#tip .g{color:#7bd88f}#tip .m{color:#998bc0}
#hudbtn{position:fixed;right:16px;bottom:30px;display:flex;gap:6px;z-index:5}
#hudbtn button{background:rgba(20,14,32,.9);border:2px solid #3a2d55;color:#e9ddff;border-radius:10px;padding:6px 10px;font:700 12px system-ui;cursor:pointer;position:relative}
#hudbtn button i{position:absolute;top:-6px;right:-6px;background:#ff4d6d;color:#fff;border-radius:9px;font-size:10px;padding:1px 5px;font-style:normal;display:none}
.btn{background:#2b1f45;border:1px solid #6b55a8;color:#fff;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const el=(h)=>{const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild;};
const tip=el('<div id="tip"></div>');document.body.appendChild(tip);
let db,C,toast=()=>{};

function win(id,title,x,y){const w=el(`<div class="rw" id="${id}" style="left:${x}px;top:${y}px"><h3><span>${title}</span><b>✕</b></h3><div class="bd"></div></div>`);
  document.body.appendChild(w);w.querySelector('b').onclick=()=>toggle(w,false);
  const h=w.querySelector('h3');h.onmousedown=e=>{const ox=e.clientX-w.offsetLeft,oy=e.clientY-w.offsetTop;
    const mv=e=>{w.style.left=e.clientX-ox+'px';w.style.top=e.clientY-oy+'px';},up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up);};
    addEventListener('mousemove',mv);addEventListener('mouseup',up);};
  w.addEventListener('mousedown',e=>e.stopPropagation());return w;}
function toggle(w,on){w.classList.toggle('open',on==null?!w.classList.contains('open'):on);tip.style.display='none';render();}

// ---------- ทูลทิปไอเทม ----------
const SLOT_NAMES={head_top:'หมวก (บน)',head_mid:'หมวก (กลาง)',head_low:'หมวก (ล่าง)',armor:'เกราะ',weapon:'อาวุธ',shield:'โล่',garment:'ผ้าคลุม',shoes:'รองเท้า',acc1:'เครื่องประดับ 1',acc2:'เครื่องประดับ 2',acc:'เครื่องประดับ'};
const RAR={common:'ธรรมดา',rare:'หายาก',legend:'ตำนาน'},BN={str:'STR',agi:'AGI',vit:'VIT',int:'INT',dex:'DEX',luk:'LUK',atk:'ATK',matk:'MATK',def:'DEF',mdef:'MDEF',hit:'HIT',flee:'FLEE',crit:'CRIT',hp:'MaxHP',sp:'MaxSP',aspd:'ASPD %'};
function itemTip(id){const it=db.items[id],R=db.rules;let h=`<b>${it.name}</b> <span class="m">${RAR[it.rarity]||''}</span><br>`;
  if(it.type==='weapon')h+=`${R.weaponTypeNames[it.wtype]} · ATK ${it.atk} · ธาตุ${R.elementNames[it.ele||'neutral']}<br>`;
  if(it.type==='armor')h+=`${SLOT_NAMES[it.slot]} · DEF ${it.def||0}${it.mdef?' · MDEF '+it.mdef:''}<br>`;
  const b=it.bonus||{};for(const k in b){if(typeof b[k]==='object'){for(const kk in b[k])h+=`<span class="g">+${b[k][kk]}% ดาเมจต่อ ${R.races[kk]||R.sizeNames[kk]||R.elementNames[kk]||kk}</span><br>`;}
    else h+=`<span class="g">${BN[k]||k} +${b[k]}</span><br>`;}
  if(it.lvReq)h+=`<span class="${C.lv>=it.lvReq?'m':''}" style="${C.lv>=it.lvReq?'':'color:#ff4d6d'}">ต้องการ Base Lv ${it.lvReq}</span><br>`;
  h+=`<span class="m">${it.desc||''}<br>น้ำหนัก ${it.weight||0}</span>`;return h;}
function hover(node,fn){node.onmouseenter=e=>{tip.innerHTML=fn();tip.style.display='block';};node.onmousemove=e=>{tip.style.left=Math.min(innerWidth-250,e.clientX+14)+'px';tip.style.top=Math.min(innerHeight-tip.offsetHeight-8,e.clientY+14)+'px';};
  node.onmouseleave=()=>tip.style.display='none';}
const icon=(id)=>{const it=db.items[id];return `<div class="ic" style="background:radial-gradient(circle at 35% 30%,#fff8,${it.icon} 45%,#0008)"></div>`;};

// ---------- หน้าต่างสเตตัส ----------
let wS,wI,tab='all',btns;
function renderStatus(){const b=wS.querySelector('.bd'),d=C.d,R=db.rules,job=db.jobs[C.job];
  const bn=RO.baseExpNeed(db,C.lv),jn=RO.jobExpNeed(db,C.jobLv);
  let h=`<div style="display:flex;justify-content:space-between"><b>${C.name}</b><span>${job.name}</span></div>
  <div style="font-size:11px">Base Lv ${C.lv} · ${C.exp}/${bn}</div><div class="xb"><div style="width:${100*C.exp/bn}%"></div></div>
  <div style="font-size:11px">Job Lv ${C.jobLv} · ${C.jobExp}/${jn}</div><div class="xb"><div style="width:${100*C.jobExp/jn}%;background:#5aa8ff"></div></div>
  <div style="display:flex;gap:16px"><div>`;
  for(const s of RO.STATS){const v=C.stats[s],bo=d.S[s]-v,cost=RO.statCost(v);
    h+=`<div class="row"><span class="k">${s.toUpperCase()}</span><span class="v">${v}${bo?` <i>+${bo}</i>`:''}</span>
      <button class="pb" data-s="${s}" ${C.statPoints<cost||v>=R.statMax?'disabled':''} title="Shift+คลิก = +10">+</button><span class="c">ใช้ ${cost}</span></div>`;}
  h+=`<div style="margin-top:6px;color:#ffd166;font-weight:800">แต้มคงเหลือ ${C.statPoints}</div></div>
  <div class="grid2" style="align-content:start">
   <span>ATK</span><span>${d.statusAtk} + ${d.weaponAtk}</span><span>MATK</span><span>${d.matkMin}~${d.matkMax}</span>
   <span>DEF</span><span>${d.def} + ${d.softDef}</span><span>MDEF</span><span>${d.mdef} + ${d.softMdef}</span>
   <span>HIT</span><span>${d.hit}</span><span>FLEE</span><span>${d.flee} + ${d.pdodge}</span>
   <span>CRIT</span><span>${d.crit}</span><span>ASPD</span><span>${Math.round(d.aspd)}</span>
   <span>MaxHP</span><span>${d.hpMax}</span><span>MaxSP</span><span>${d.spMax}</span>
   <span>อาวุธ</span><span>${R.weaponTypeNames[d.wtype]} · ${R.elementNames[d.weaponEle]}</span>
   <span>น้ำหนัก</span><span>${RPG.weight()}/${d.weightMax}</span>
  </div></div><div class="sep"></div>
  <div style="display:flex;justify-content:space-between"><b>สกิล</b><span style="color:#ffd166">แต้มสกิล ${C.skillPoints}</span></div>`;
  for(const id in db.skills){const sk=db.skills[id];if(sk.type==='basic'||sk.job!==C.job)continue;const lv=C.skills[id]||0;
    h+=`<div class="row" title="${sk.desc||''}"><span style="flex:1">${sk.name}</span><span>Lv ${lv}/${sk.maxLv}</span><button class="pb" data-k="${id}" ${C.skillPoints<1||lv>=sk.maxLv?'disabled':''}>+</button></div>`;}
  h+=`<div class="sep"></div><button class="btn" id="wipe">เริ่มตัวละครใหม่ (ลบเซฟ)</button>`;
  b.innerHTML=h;
  b.querySelectorAll('[data-s]').forEach(x=>x.onclick=e=>RPG.raiseStat(x.dataset.s,e.shiftKey?10:1));
  b.querySelectorAll('[data-k]').forEach(x=>x.onclick=()=>RPG.raiseSkill(x.dataset.k));
  b.querySelector('#wipe').onclick=()=>{if(confirm('ลบเซฟและเริ่มใหม่?'))RPG.wipe();};}

// ---------- หน้าต่างกระเป๋า + ช่องสวมใส่ ----------
function renderInv(){const b=wI.querySelector('.bd');
  let h='<div class="eq">';for(const s of RO.SLOTS){const id=C.equip[s],it=id&&db.items[id];
    h+=`<div class="slot ${it?'r-'+it.rarity:''}" data-eq="${s}">${it?icon(id)+it.name:`<em>${SLOT_NAMES[s]}</em>`}</div>`;}
  h+=`</div><div class="sep"></div><div class="tabs">${[['all','ทั้งหมด'],['use','ใช้'],['equip','สวมใส่'],['etc','อื่นๆ']].map(([k,n])=>`<button data-t="${k}" class="${tab===k?'on':''}">${n}</button>`).join('')}</div><div class="bag">`;
  C.bag.forEach((s,i)=>{const it=db.items[s.id],kind=it.type==='use'?'use':it.type==='etc'?'etc':'equip';if(tab!=='all'&&tab!==kind)return;
    h+=`<div class="cell r-${it.rarity}" data-i="${i}">${icon(s.id)}${s.qty>1?`<span>${s.qty}</span>`:''}</div>`;});
  h+=`</div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#998bc0"><span>ดับเบิลคลิก = ใช้/สวม · คลิกช่องสวมใส่ = ถอด</span><span>${RPG.weight()}/${C.d.weightMax}</span></div>`;
  b.innerHTML=h;
  b.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{tab=x.dataset.t;renderInv();});
  b.querySelectorAll('[data-eq]').forEach(x=>{const id=C.equip[x.dataset.eq];if(id)hover(x,()=>itemTip(id));x.onclick=()=>{tip.style.display='none';RPG.unequip(x.dataset.eq);};});
  b.querySelectorAll('[data-i]').forEach(x=>{const i=+x.dataset.i;hover(x,()=>itemTip(C.bag[i].id));
    x.ondblclick=()=>{tip.style.display='none';const r=RPG.use(i);if(typeof r==='string')toast(r);};});}

function render(){if(!C)return;if(wS.classList.contains('open'))renderStatus();if(wI.classList.contains('open'))renderInv();
  const a=btns.querySelector('[data-w=s] i'),n=C.statPoints+C.skillPoints;a.textContent=n;a.style.display=n?'block':'none';}
function init(_db,_C,_toast){db=_db;C=_C;toast=_toast;
  wS=win('wStat','สเตตัส (C)',16,100);wI=win('wInv','กระเป๋า & อุปกรณ์ (I)',innerWidth-370,240);
  btns=el('<div id="hudbtn"><button data-w="s">สเตตัส C<i></i></button><button data-w="i">กระเป๋า I</button></div>');document.body.appendChild(btns);
  btns.querySelector('[data-w=s]').onclick=()=>toggle(wS);btns.querySelector('[data-w=i]').onclick=()=>toggle(wI);
  btns.addEventListener('mousedown',e=>e.stopPropagation());
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k==='c')toggle(wS);if(k==='i')toggle(wI);if(k==='escape'){toggle(wS,false);toggle(wI,false);}});
  RPG.onChange(render);render();}
return {init,render};
})();
