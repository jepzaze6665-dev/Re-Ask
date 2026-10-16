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
.cell.on,.slot.on{outline:2px solid #ffd166}
#tip{position:fixed;z-index:20;pointer-events:none;background:rgba(10,7,18,.97);border:1px solid #6b55a8;border-radius:8px;padding:8px 10px;color:#e9ddff;font:12px system-ui;max-width:240px;display:none}
.rw .m{color:#998bc0}
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
const RAR={common:'ธรรมดา',rare:'หายาก',legend:'ตำนาน'},BN={str:'STR',agi:'AGI',vit:'VIT',int:'INT',dex:'DEX',luk:'LUK',atk:'ATK',matk:'MATK',def:'DEF',mdef:'MDEF',hit:'HIT',flee:'FLEE',crit:'CRIT',hp:'MaxHP',sp:'MaxSP',aspd:'ASPD %',hpPct:'MaxHP %',atkPct:'ATK %',defPct:'DEF %',hpRegenPct:'ฟื้น HP %'};
const ROLE={healer:'พยาบาล — ฮีลเจ้านาย',tank:'แทงค์ — ยั่วให้มอนตีมันแทน',hunter:'นักล่า — ตีเป้าของเจ้านาย',slam:'ทุบพื้น — ดาเมจรอบตัว + สตัน'};
const stars=n=>'★'.repeat(n||1)+'☆'.repeat(5-(n||1));
const nameOf=inst=>{const it=db.items[inst.id];return (inst.refine?`+${inst.refine} `:'')+it.name+(it.type==='shadow'?` ${'★'.repeat(inst.star||1)}${inst.alt?' (แปรธาตุ)':''}`:'');};
function bonusLines(b){const R=db.rules;let h='';for(const k in b){if(typeof b[k]==='object'){for(const kk in b[k])h+=`<span class="g">+${b[k][kk]}% ดาเมจต่อ ${R.races[kk]||R.sizeNames[kk]||R.elementNames[kk]||kk}</span><br>`;}
  else h+=`<span class="g">${BN[k]||k} +${b[k]}</span><br>`;}return h;}
function shadowTip(inst){const it=db.items[inst.id],sid=it.shadow,d=db.shadows[sid],R=db.rules;
  let h=`<b>${it.name}</b> <span style="color:#ffd166">${stars(inst.star)}</span>${inst.alt?` <span style="color:#7fffd4">แปรธาตุ${R.elementNames[d.alt.element]}</span>`:''}<br><span class="m">ผนึกลง: ${SLOT_NAMES[d.slot]||'หมวก'}</span><br>`;
  h+=bonusLines(SHADOW.sealBonus(db,sid,inst.star||1));
  const P_=SHADOW.procs(db,{items:[{eq:'x',sockets:[{sid,star:inst.star||1,alt:!!inst.alt}]}]});
  for(const o of P_.onHit)h+=`<span class="g">ตีมีโอกาส ${o.chance}% ให้${db.statuses[o.status].name} ${o.dur} วิ</span><br>`;
  if(P_.reflectMeleePct)h+=`<span class="g">สะท้อนดาเมจประชิด ${P_.reflectMeleePct}%${P_.reflectElement!=='neutral'?' (ธาตุ'+R.elementNames[P_.reflectElement]+')':''}</span><br>`;
  if(P_.onKillHealPct)h+=`<span class="g">ฆ่ามอนแล้วฟื้น HP ${P_.onKillHealPct}%</span><br>`;
  if(db.shadows.rules.summonEnabled){const si=SHADOW.summonInfo(db,sid,inst.star||1,!!inst.alt);h+=`<span class="m">เรียกออกมา: ${ROLE[si.role]}</span>`;}return h;}
function itemTip(id,inst){const it=db.items[id],R=db.rules;if(it.type==='shadow'&&inst)return shadowTip(inst);
  let h=`<b>${inst?nameOf(inst):it.name}</b>${inst&&inst.sockets&&inst.sockets.length?` [${inst.sockets.map(x=>x?'◆':'◇').join('')}]`:''} <span class="m">${RAR[it.rarity]||''}</span><br>`;
  if(inst&&inst.refine){const rb=db.refine.bonus[it.type];if(rb)h+=`<span style="color:#ffd166">ตีบวก: ${Object.entries(rb).map(([k,v])=>`${BN[k]||k} +${v*inst.refine}`).join(', ')}</span><br>`;}
  if(inst&&inst.sockets)for(const x of inst.sockets)if(x)h+=`<span style="color:#c9a6ff">◆ ${db.shadows[x.sid].name} ${'★'.repeat(x.star)}</span><br>`;
  if(it.type==='weapon')h+=`${R.weaponTypeNames[it.wtype]} · ATK ${it.atk} · ธาตุ${R.elementNames[it.ele||'neutral']}<br>`;
  if(it.type==='armor')h+=`${SLOT_NAMES[it.slot]} · DEF ${it.def||0}${it.mdef?' · MDEF '+it.mdef:''}<br>`;
  h+=bonusLines(it.bonus||{});
  if(it.lvReq)h+=`<span class="${C.lv>=it.lvReq?'m':''}" style="${C.lv>=it.lvReq?'':'color:#ff4d6d'}">ต้องการ Base Lv ${it.lvReq}</span><br>`;
  h+=`<span class="m">${it.desc||''}<br>น้ำหนัก ${it.weight||0}</span>`;return h;}
function hover(node,fn){node.onmouseenter=e=>{tip.innerHTML=fn();tip.style.display='block';};node.onmousemove=e=>{tip.style.left=Math.min(innerWidth-250,e.clientX+14)+'px';tip.style.top=Math.min(innerHeight-tip.offsetHeight-8,e.clientY+14)+'px';};
  node.onmouseleave=()=>tip.style.display='none';}
const icon=(id)=>{const it=db.items[id];return `<div class="ic" style="background:radial-gradient(circle at 35% 30%,#fff8,${it.icon} 45%,#0008)"></div>`;};

// ---------- หน้าต่างสเตตัส ----------
let wS,wI,wK,wJ,wR,wB,wShop,wInn,wQ,tab='all',btns,sel=null,shopId=null,shopTab='buy',innView='menu';   // sel = uid ไอเทมที่เลือกในกระเป๋า
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
   <span>DEF</span><span>${d.equipDef} + ${d.def-d.equipDef}</span><span>MDEF</span><span>${d.mdef}</span>
   <span>HIT</span><span>${d.hit}</span><span>FLEE</span><span>${d.flee} + ${d.pdodge}</span>
   <span>CRIT</span><span>${d.crit}</span><span>รอบตี</span><span>${d.attackInterval.toFixed(2)} วิ</span>
   <span>MaxHP</span><span>${d.hpMax}</span><span>MaxSP</span><span>${d.spMax}</span>
   <span>อาวุธ</span><span>${R.weaponTypeNames[d.wtype]} · ${R.elementNames[d.weaponEle]}</span>
   <span>น้ำหนัก</span><span>${RPG.weight()}/${d.weightMax}</span>
  </div></div><div class="sep"></div>
  <div>แต้มสกิล <b style="color:#ffd166">${C.skillPoints}</b> — กด K เพื่อเรียนสกิล</div>`;
  h+=`<div class="sep"></div><button class="btn" id="wipe">เริ่มตัวละครใหม่ (ลบเซฟ)</button>`;
  b.innerHTML=h;
  b.querySelectorAll('[data-s]').forEach(x=>x.onclick=e=>RPG.raiseStat(x.dataset.s,e.shiftKey?10:1));
  b.querySelector('#wipe').onclick=()=>{if(confirm('ลบเซฟและเริ่มใหม่?'))RPG.wipe();};}

// ---------- หน้าต่างกระเป๋า + ช่องสวมใส่ ----------
function renderInv(){const b=wI.querySelector('.bd');
  let h='<div class="eq">';for(const s of RO.SLOTS){const e=RPG.equippedItem(s),id=e&&e.id,it=id&&db.items[id];
    h+=`<div class="slot ${it?'r-'+it.rarity:''}${e&&sel===e.uid?' on':''}" data-eq="${s}">${it?icon(id)+nameOf(e):`<em>${SLOT_NAMES[s]}</em>`}</div>`;}
  h+=`</div><div class="sep"></div><div class="tabs">${[['all','ทั้งหมด'],['use','ใช้'],['equip','สวมใส่'],['shadow','เงา'],['etc','อื่นๆ']].map(([k,n])=>`<button data-t="${k}" class="${tab===k?'on':''}">${n}</button>`).join('')}</div><div class="bag">`;
  RPG.bag().forEach(s=>{const it=db.items[s.id],kind=it.type==='use'?'use':it.type==='etc'?'etc':it.type==='shadow'?'shadow':'equip';if(tab!=='all'&&tab!==kind)return;
    h+=`<div class="cell r-${it.rarity}${sel===s.uid?' on':''}" data-i="${s.uid}">${icon(s.id)}${s.qty>1?`<span>${s.qty}</span>`:''}${it.type==='shadow'?`<span style="left:3px;right:auto;color:#ffd166">${s.star||1}★</span>`:''}${s.refine?`<span style="left:3px;right:auto;top:1px;bottom:auto;color:#ffd166">+${s.refine}</span>`:''}</div>`;});
  h+=`</div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:#998bc0"><span>คลิก = เลือก · ดับเบิลคลิก = ใช้/สวม</span><span>💰 ${C.inv.zeny.toLocaleString()} z · ${RPG.weight()}/${C.d.weightMax}</span></div>`;
  h+=actionPanel();
  b.innerHTML=h;
  b.querySelectorAll('[data-t]').forEach(x=>x.onclick=()=>{tab=x.dataset.t;renderInv();});
  b.querySelectorAll('[data-eq]').forEach(x=>{const e=RPG.equippedItem(x.dataset.eq);if(e)hover(x,()=>itemTip(e.id,e));
    x.onclick=()=>{if(e){sel=sel===e.uid?null:e.uid;renderInv();}};x.ondblclick=()=>{tip.style.display='none';sel=null;RPG.unequip(x.dataset.eq);};});
  b.querySelectorAll('[data-act]').forEach(x=>x.onclick=()=>doAct(x.dataset.act,x.dataset));
  b.querySelectorAll('[data-i]').forEach(x=>{const i=+x.dataset.i;hover(x,()=>{const s=RPG.item(i);return s?itemTip(s.id,s):'';});
    x.onclick=()=>{sel=sel===i?null:i;renderInv();};
    x.ondblclick=()=>{tip.style.display='none';const r=RPG.use(i);if(typeof r==='string')toast(r);else if(r&&r.reset)toast(r.reset==='stats'?`คืนแต้มสเตตัส ${r.n} แต้ม`:'คืนแต้มสกิลแล้ว');};});}

// ---------- แผงคำสั่งของไอเทมที่เลือก (ผนึก / ถอดเงา / เรียก / รวม / ถอดอุปกรณ์) ----------
function actionPanel(){let h='';const sm=RPG.summoned();
  if(sm)h+=`<div class="sep"></div><div class="row"><span style="flex:1">เรียกอยู่: <b style="color:#c9a6ff">${nameOf(sm)}</b></span><button class="btn" data-act="unsummon">เก็บ</button></div>`;
  const s=sel&&RPG.item(sel);if(!s)return h;const it=db.items[s.id];
  h+=`<div class="sep"></div><div style="font-weight:800;margin-bottom:4px">${nameOf(s)}</div>`;
  if(it.type==='shadow'&&s.eq!=='summon'){const d=db.shadows[it.shadow];let any=false;
    for(const slot of RO.SLOTS){const e=RPG.equippedItem(slot);if(!e||!SHADOW.slotMatches(d.slot,slot))continue;
      (e.sockets||[]).forEach((x,i)=>{if(!x){any=true;h+=`<button class="btn" data-act="seal" data-e="${e.uid}" data-n="${i}" style="margin:2px">ผนึกลง ${nameOf(e)} ช่อง ${i+1}</button>`;}});}
    if(!any)h+=`<div class="m" style="font-size:11px">ไม่มีอุปกรณ์ที่สวมอยู่ซึ่งมีช่องว่างรับเงานี้ (ช่อง${SLOT_NAMES[d.slot]||'หมวก'})</div>`;
    if(db.shadows.rules.summonEnabled)h+=`<button class="btn" data-act="summon" style="margin:2px">เรียกออกมาสู้</button>`;
    const twin=RPG.bag().find(x=>x.uid!==s.uid&&x.id===s.id&&(x.star||1)===(s.star||1));const F=db.shadows.rules.fuse;
    if(twin&&(s.star||1)<5)h+=`<button class="btn" data-act="fuse" data-b="${twin.uid}" style="margin:2px">รวมกับอีกชิ้น → ${(s.star||1)+1}★ (โอกาส ${F.successByStar[(s.star||1)-1]}%)</button>`;}
  if((it.type==='weapon'||it.type==='armor')){
    if(s.sockets&&s.sockets.length){s.sockets.forEach((x,i)=>{h+=x?`<div class="row"><span style="flex:1;color:#c9a6ff">◆ ${db.shadows[x.sid].name} ${'★'.repeat(x.star)}</span><button class="btn" data-act="unseal" data-e="${s.uid}" data-n="${i}">ถอด ${SHADOW.unsealCost(db,x).toLocaleString()} z</button></div>`
      :`<div class="row m">◇ ช่องว่าง</div>`;});
      h+=`<div class="m" style="font-size:11px">ถอดเงามีโอกาสแตก ${db.shadows.rules.unseal.breakChance}%</div>`;}
    else h+=`<div class="m" style="font-size:11px">ไม่มีช่องผนึก</div>`;
    if(s.eq)h+=`<button class="btn" data-act="unequip" data-s="${s.eq}" style="margin-top:4px">ถอดอุปกรณ์</button>`;}
  return h;}
function doAct(a,d){let r;
  if(a==='seal')r=RPG.sealShadow(+d.e,+d.n,sel);
  if(a==='unseal'){if(!confirm('ถอดเงา? มีโอกาสแตก'))return;r=RPG.unsealShadow(+d.e,+d.n);if(r.ok)toast(r.broke?'เงาแตกสลาย...':'ถอดเงาสำเร็จ');}
  if(a==='fuse'){r=RPG.fuseShadow(sel,+d.b);if(r.ok)toast(r.success?`รวมสำเร็จ! ${r.star}★`:'รวมล้มเหลว เหลือ 1 ชิ้น');}
  if(a==='summon'){const e=RPG.summon(sel);if(e)toast(e);}
  if(a==='unsummon')RPG.unsummon();
  if(a==='unequip')RPG.unequip(d.s);
  if(r&&!r.ok)toast(r.err);
  if(a!=='summon'&&a!=='unequip')sel=null;renderInv();}

// ---------- ร้านอาวุธ: ตีบวก ----------
function renderRefine(){const b=wR.querySelector('.bd'),F=db.refine,mat=RPG.countItem(F.material);
  let h=`<div style="font-size:12px">${db.items[F.material].name} ×${mat} · 💰 ${C.inv.zeny.toLocaleString()} z</div><div class="m" style="font-size:11px">+1~+4 ไม่มีวันพลาด · +5~+7 พลาดลดขั้น · +8 ขึ้นไปพลาด = <b style="color:#ff4d6d">แตกหาย</b></div>`;
  const list=[...RO.SLOTS.map(sl=>RPG.equippedItem(sl)).filter(Boolean),...RPG.bag()].filter(x=>REFINE.canRefine(db.items[x.id]));
  for(const x of list){const n=REFINE.nextInfo(db,x);
    h+=`<div class="sep"></div><div class="row" style="height:auto"><span style="flex:1">${icon(x.id)}</span><span style="flex:6">${nameOf(x)}${x.eq?' <span class="m">(สวม)</span>':''}</span></div>`;
    h+=n?`<div class="row"><span style="flex:1;font-size:11px">→ +${n.to} · โอกาส <b>${n.success}%</b> · ${n.zeny.toLocaleString()} z${n.fail==='break'?' · <b style="color:#ff4d6d">พลาด = แตก</b>':n.fail==='down'?' · พลาด = ลดขั้น':''}</span><button class="btn" data-rf="${x.uid}" ${mat&&C.inv.zeny>=n.zeny?'':'disabled'}>ตีบวก</button></div>`:`<div class="m" style="font-size:11px">ตีบวกสูงสุดแล้ว</div>`;}
  if(!list.length)h+=`<div class="sep"></div><div class="m">ไม่มีอุปกรณ์ที่ตีบวกได้</div>`;
  b.innerHTML=h;
  b.querySelectorAll('[data-rf]').forEach(x=>x.onclick=()=>{const it=RPG.item(+x.dataset.rf),n=it&&REFINE.nextInfo(db,it);
    if(n&&n.fail==='break'&&!confirm(`โอกาสสำเร็จ ${n.success}% — ถ้าพลาด ${nameOf(it)} จะแตกหาย ตีต่อไหม?`))return;
    const r=RPG.refineItem(+x.dataset.rf);if(!r.ok)return toast(r.err);
    toast(r.result==='success'?`สำเร็จ! +${r.refine}`:r.result==='down'?`ล้มเหลว... ลดเหลือ +${r.refine}`:r.result==='break'?'อุปกรณ์แตกสลาย!':'ล้มเหลว');renderRefine();});}

// ---------- ร้าน NPC ----------
function renderShop(){const b=wShop.querySelector('.bd'),sh=db.shops.shops[shopId];wShop.querySelector('h3 span').textContent=sh.name;
  let h=`<div class="tabs"><button data-st="buy" class="${shopTab==='buy'?'on':''}">ซื้อ</button><button data-st="sell" class="${shopTab==='sell'?'on':''}">ขาย</button>${shopId==='weapon_shop'?'<button data-st="refine">ตีบวก</button>':''}</div>
  <div style="font-size:12px;margin:6px 0">💰 ${C.inv.zeny.toLocaleString()} z · น้ำหนัก ${RPG.weight()}/${C.d.weightMax}</div>`;
  if(shopTab==='buy')for(const id of sh.items){const p=SHOP.buyPrice(db,id);
    h+=`<div class="row" data-tip="${id}" style="height:30px">${icon(id)}<span style="flex:1">${db.items[id].name}</span><span style="width:70px;text-align:right">${p.toLocaleString()} z</span>
      <input type="number" min="1" max="999" value="1" data-q="${id}" style="width:46px;background:#0006;color:#fff;border:1px solid #3a2d55;border-radius:4px">
      <button class="btn" data-buy="${id}" ${C.inv.zeny>=p?'':'disabled'}>ซื้อ</button></div>`;}
  else{const list=RPG.bag().filter(s=>SHOP.sellPrice(db,s.id)>0);
    if(!list.length)h+=`<div class="m">ไม่มีของที่ขายได้</div>`;
    for(const s of list){const p=SHOP.sellPrice(db,s.id);
      h+=`<div class="row" data-tipi="${s.uid}" style="height:30px">${icon(s.id)}<span style="flex:1">${nameOf(s)}${s.qty>1?' ×'+s.qty:''}</span><span style="width:70px;text-align:right">${p.toLocaleString()} z</span>
        ${s.qty>1?`<button class="btn" data-sell="${s.uid}" data-n="${s.qty}">ทั้งหมด</button>`:''}<button class="btn" data-sell="${s.uid}" data-n="1">ขาย</button></div>`;}}
  b.innerHTML=h;
  b.querySelectorAll('[data-st]').forEach(x=>x.onclick=()=>{if(x.dataset.st==='refine'){toggle(wR,true);return;}shopTab=x.dataset.st;renderShop();});
  b.querySelectorAll('[data-tip]').forEach(x=>hover(x,()=>itemTip(x.dataset.tip)));
  b.querySelectorAll('[data-tipi]').forEach(x=>hover(x,()=>{const s=RPG.item(+x.dataset.tipi);return s?itemTip(s.id,s):'';}));
  b.querySelectorAll('[data-buy]').forEach(x=>x.onclick=()=>{const id=x.dataset.buy,q=Math.floor(+b.querySelector(`[data-q="${id}"]`).value||1);
    const r=RPG.buy(shopId,id,q);toast(r.ok?`ซื้อ ${db.items[id].name} ×${q}`:r.err);});
  b.querySelectorAll('[data-sell]').forEach(x=>x.onclick=()=>{const s=RPG.item(+x.dataset.sell);if(!s)return;const it=db.items[s.id];
    if(it.rarity!=='common'&&!confirm(`ขาย ${nameOf(s)}?`))return;const r=RPG.sell(+x.dataset.sell,+x.dataset.n);if(!r.ok)toast(r.err);});}

// ---------- โรงแรม: พัก + คลังฝากของ ----------
function renderInn(){const b=wInn.querySelector('.bd'),I=db.shops.inn;let h=`<div style="font-size:12px;margin-bottom:6px">💰 ${C.inv.zeny.toLocaleString()} z</div>`;
  if(innView==='menu'){h+=`<button class="btn" data-inn="rest">พักผ่อน — ฟื้น HP/SP เต็ม (${I.restCost} z)</button><div style="height:6px"></div>
    <button class="btn" data-inn="box">เปิดคลังฝากของ (${I.storageFee} z)</button>`;}
  else{const box=C.storage.items;
    h+=`<div style="display:flex;gap:10px"><div style="flex:1"><div class="m" style="font-size:11px">กระเป๋า (คลิก = ฝาก)</div><div class="bag" style="grid-template-columns:repeat(5,42px)">`;
    for(const s of RPG.bag())h+=`<div class="cell r-${db.items[s.id].rarity}" data-dep="${s.uid}">${icon(s.id)}${s.qty>1?`<span>${s.qty}</span>`:''}</div>`;
    h+=`</div></div><div style="flex:1"><div class="m" style="font-size:11px">คลัง ${box.length}/${I.storageSlots} (คลิก = ถอน)</div><div class="bag" style="grid-template-columns:repeat(5,42px)">`;
    for(const s of box)h+=`<div class="cell r-${db.items[s.id].rarity}" data-wd="${s.uid}">${icon(s.id)}${s.qty>1?`<span>${s.qty}</span>`:''}</div>`;
    h+=`</div></div></div><div class="m" style="font-size:11px;margin-top:4px">Shift+คลิก = ย้ายทั้งกอง</div>`;}
  b.innerHTML=h;
  b.querySelectorAll('[data-inn]').forEach(x=>x.onclick=()=>{let r;
    if(x.dataset.inn==='rest'){r=RPG.rest();if(r.ok)toast('พักผ่อนเต็มที่ HP/SP เต็ม');}
    else{r=RPG.openStorage();if(r.ok){innView='box';renderInn();}}
    if(!r.ok)toast(r.err);});
  const mv=(fn,list,attr)=>b.querySelectorAll(`[data-${attr}]`).forEach(x=>{const uid=+x.dataset[attr];
    hover(x,()=>{const s=list().find(i=>i.uid===uid);return s?itemTip(s.id,s):'';});
    x.onclick=e=>{const s=list().find(i=>i.uid===uid);if(!s)return;tip.style.display='none';const r=fn(uid,e.shiftKey?s.qty:1);if(!r.ok)toast(r.err);else renderInn();};});
  mv(RPG.deposit,RPG.bag,'dep');mv(RPG.withdraw,()=>C.storage.items,'wd');}

// ---------- กระดานเควสต์ (F ที่กระดาน หรือกด L) ----------
const QST={locked:'ล็อก',available:'รับได้',active:'กำลังทำ',ready:'ส่งได้!',done:'เสร็จแล้ว'};
function renderQuests(){const b=wQ.querySelector('.bd'),now=Date.now();let h='';
  for(const [id,q] of Object.entries(db.quests)){const st=RPG.questStatus(id),pr=QUEST.progress(db,C.qs,C.inv,id),R=q.reward||{};
    h+=`<div class="row" style="height:auto;margin-top:4px"><b style="flex:1;color:${st==='ready'?'#7bd88f':st==='locked'||st==='done'?'#6d6290':'#ffd166'}">${q.name}</b><span style="font-size:11px">${q.repeat==='daily'?'รายวัน · ':''}Lv ${q.lv} · ${QST[st]}</span></div>
      <div style="font-size:11px">${q.desc}</div><div style="font-size:11px">`;
    q.objectives.forEach((o,i)=>{const p=pr[i],label=o.type==='kill'?`กำจัด ${db.mobs[o.mob].name}`:o.type==='collect'?`${db.items[o.item].name}${o.consume?' (ส่งมอบ)':''}`:`คุยกับ ${o.npc==='fountain'?'น้ำพุกลางเมือง':o.npc}`;
      h+=`<div style="color:${st==='active'||st==='ready'?(p.have>=p.need?'#7bd88f':'#e9ddff'):'#998bc0'}">• ${label} ${st==='active'||st==='ready'?p.have+'/'+p.need:''}</div>`;});
    h+=`<div class="m">รางวัล: ${[R.exp?R.exp+' EXP':'',R.jobExp?R.jobExp+' Job EXP':'',R.zeny?R.zeny+' z':'',...(R.items||[]).map(x=>db.items[x.id].name+' ×'+x.qty)].filter(Boolean).join(' · ')}</div></div>`;
    if(st==='available')h+=`<button class="btn" data-qa="${id}">รับเควสต์</button>`;if(st==='ready')h+=`<button class="btn" data-qc="${id}">ส่งเควสต์</button>`;
    h+='<div class="sep"></div>';}
  b.innerHTML=h;
  b.querySelectorAll('[data-qa]').forEach(x=>x.onclick=()=>{const e=RPG.questAccept(x.dataset.qa);toast(e||'รับเควสต์แล้ว');});
  b.querySelectorAll('[data-qc]').forEach(x=>x.onclick=()=>{const e=RPG.questClaim(x.dataset.qc,toast);if(e)toast(e);else toast('ส่งเควสต์สำเร็จ!');});}

// ---------- สมุดล่า (B) ----------
function renderCodex(){const b=wB.querySelector('.bd');let h='';
  for(const [mob,c] of Object.entries(db.codex.mobs)){const k=C.codex[mob]||0,t=REFINE.tiersOf(db,mob),n=REFINE.tier(db,mob,k),next=t[n];
    h+=`<div class="row" style="height:auto;margin:4px 0"><b style="flex:1">${db.mobs[mob].name}</b><span>ฆ่า ${k}${next?' / '+next:' ✓'}</span></div>`;
    h+=`<div class="xb"><div style="width:${next?100*k/next:100}%;background:#c9a6ff"></div></div><div style="font-size:11px">`;
    c.bonus.forEach((bn,i)=>{h+=`<div style="color:${i<n?'#7bd88f':'#6d6290'}">${i<n?'✓':'○'} ขั้น ${i+1} (${t[i]}): ${bonusLines(bn).replace(/<[^>]+>/g,' ').trim()}</div>`;});h+='</div><div class="sep"></div>';}
  b.innerHTML=h;}

// ---------- หน้าต่างสกิล (K) ----------
const TGT={enemy:'เป้าเดียว',self:'ตัวเอง',aoe_self:'รอบตัว',aoe_enemy:'รอบเป้า'};
function skillTip(id){const sk=db.skills[id],lv=Math.max(1,C.skills[id]||0);let h=`<b>${sk.name}</b> <span class="m">${sk.type==='passive'?'ติดตัว':TGT[sk.target]}</span><br>${sk.desc||''}<br>`;
  if(sk.type==='active'){const i=SKILLS.castInfo(db,id,lv);h+=`<span class="m">SP ${i.sp} · คูลดาวน์ ${i.cd} วิ${i.cast?` · ร่าย ${i.cast} วิ${i.interruptible?' (โดนขัดได้)':''}`:''}${i.range?` · ระยะ ${i.range}`:''}</span><br>`;}
  if(sk.weapon)h+=`<span class="m">ต้องถือ ${sk.weapon.map(w=>db.rules.weaponTypeNames[w]).join('/')}</span><br>`;
  for(const [r,n] of Object.entries(sk.requires||{}))h+=`<span style="color:${(C.skills[r]||0)>=n?'#7bd88f':'#ff4d6d'}">ต้องมี ${db.skills[r].name} Lv ${n}</span><br>`;
  return h;}
function renderSkills(){const b=wK.querySelector('.bd');let h=`<div style="display:flex;justify-content:space-between"><b>${db.jobs[C.job].name}</b><span>แต้มสกิล <b style="color:#ffd166">${C.skillPoints}</b></span></div>`;
  for(const job of SKILLS.lineage(db,C.job)){h+=`<div class="sep"></div><div style="color:#998bc0;font-size:11px">${db.jobs[job].name}</div>`;
    for(const id of Object.keys(db.skills).filter(k=>db.skills[k].job===job)){const sk=db.skills[id],lv=C.skills[id]||0,ok=SKILLS.canLearn(db,C,id).ok;
      h+=`<div class="row" data-tip="${id}"><span style="flex:1;${lv?'':'color:#6d6290'}">${sk.type==='passive'?'◇ ':'◆ '}${sk.name}</span><span>Lv ${lv}/${sk.maxLv}</span><button class="pb" data-k="${id}" ${ok?'':'disabled'}>+</button></div>`;}}
  const hb=SKG.hotbar();h+=`<div class="sep"></div><div style="font-size:11px;color:#998bc0">ปุ่มลัด: ${hb.length?hb.map((id,i)=>`${i+1}=${db.skills[id].name}`).join(' · '):'ยังไม่มี (เรียนสกิล ◆ ก่อน)'}</div>`;
  b.innerHTML=h;
  b.querySelectorAll('[data-k]').forEach(x=>x.onclick=()=>{const e=RPG.raiseSkill(x.dataset.k);if(e)toast(e);});
  b.querySelectorAll('[data-tip]').forEach(x=>hover(x,()=>skillTip(x.dataset.tip)));}

// ---------- หน้าต่างกิลด์: เปลี่ยนอาชีพ ----------
function renderJob(){const b=wJ.querySelector('.bd'),nx=SKILLS.nextJobs(db,C.job);
  let h=`<div>อาชีพปัจจุบัน: <b>${db.jobs[C.job].name}</b> · Job Lv ${C.jobLv}</div>`;
  if(!nx.length)h+=`<div class="sep"></div><div class="m">ยังไม่มีอาชีพขั้นถัดไปในเวอร์ชันนี้</div>`;
  for(const to of nx){const j=db.jobs[to],a=j.advance,q=C.jobQuest&&C.jobQuest.to===to,chk=SKILLS.checkAdvance(db,C,to,RPG.countItem);
    h+=`<div class="sep"></div><b style="color:#ffd166">${j.name}</b><div style="font-size:12px;margin:4px 0">${a.text}</div><div style="font-size:11px">`;
    h+=`<div style="color:${C.jobLv>=a.jobLv?'#7bd88f':'#ff4d6d'}">Job Lv ${C.jobLv}/${a.jobLv}</div>`;
    for(const [m,n] of Object.entries(a.kills||{})){const have=q?C.jobQuest.kills[m]||0:0;h+=`<div style="color:${have>=n?'#7bd88f':'#ff4d6d'}">กำจัด ${db.mobs[m].name} ${have}/${n}</div>`;}
    for(const [i,n] of Object.entries(a.items||{})){const have=RPG.countItem(i);h+=`<div style="color:${have>=n?'#7bd88f':'#ff4d6d'}">${db.items[i].name} ${have}/${n} (จะถูกใช้)</div>`;}
    h+=`<div class="m">รางวัล: ${(a.reward||[]).map(r=>db.items[r.id].name+(r.qty>1?' ×'+r.qty:'')).join(', ')||'-'}</div></div>`;
    h+=q?`<button class="btn" data-adv="${to}" ${chk.ok?'':'disabled'} style="margin-top:6px">เปลี่ยนเป็น${j.name}</button>`:`<button class="btn" data-q="${to}" style="margin-top:6px">รับบททดสอบ</button>`;}
  b.innerHTML=h;
  b.querySelectorAll('[data-q]').forEach(x=>x.onclick=()=>{const e=RPG.startJobQuest(x.dataset.q);toast(e||'รับบททดสอบแล้ว — นับเฉพาะที่กำจัดหลังจากนี้');renderJob();});
  b.querySelectorAll('[data-adv]').forEach(x=>x.onclick=()=>{const to=x.dataset.adv,e=RPG.advanceJob(to);toast(e||`ยินดีด้วย! คุณเป็น${db.jobs[to].name}แล้ว`);renderJob();});}

function render(){if(!C)return;if(wS.classList.contains('open'))renderStatus();if(wI.classList.contains('open'))renderInv();
  if(wK.classList.contains('open'))renderSkills();if(wJ.classList.contains('open'))renderJob();
  if(wR.classList.contains('open'))renderRefine();if(wB.classList.contains('open'))renderCodex();
  if(wShop.classList.contains('open'))renderShop();if(wQ.classList.contains('open'))renderQuests();if(wInn.classList.contains('open'))renderInn();
  const kb=btns.querySelector('[data-w=k] i');kb.textContent=C.skillPoints;kb.style.display=C.skillPoints?'block':'none';
  const a=btns.querySelector('[data-w=s] i'),n=C.statPoints;a.textContent=n;a.style.display=n?'block':'none';}
function init(_db,_C,_toast){db=_db;C=_C;toast=_toast;
  wS=win('wStat','สเตตัส (C)',16,100);wI=win('wInv','กระเป๋า & อุปกรณ์ (I)',innerWidth-370,240);
  wK=win('wSkill','สกิล (K)',340,100);wJ=win('wJob','กิลด์นักผจญภัย — เปลี่ยนอาชีพ',Math.max(16,innerWidth/2-170),120);wJ.style.width='340px';
  wR=win('wRefine','ร้านอาวุธ — ตีบวก',Math.max(16,innerWidth/2-180),110);wR.style.width='360px';wB=win('wCodex','สมุดล่า (B)',340,100);wB.style.width='300px';
  wShop=win('wShop','ร้าน',Math.max(16,innerWidth/2-200),100);wShop.style.width='400px';wInn=win('wInn','โรงแรม',Math.max(16,innerWidth/2-260),100);wQ=win('wQuest','กระดานเควสต์ (L)',Math.max(16,innerWidth/2-190),90);wQ.style.width='380px';wQ.querySelector('.bd').style.maxHeight='70vh';wQ.querySelector('.bd').style.overflow='auto';
  wInn.querySelector('h3 b').addEventListener('click',()=>{RPG.closeStorage();innView='menu';});
  btns=el('<div id="hudbtn"><button data-w="s">สเตตัส C<i></i></button><button data-w="i">กระเป๋า I</button><button data-w="k">สกิล K<i></i></button><button data-w="b">สมุดล่า B</button><button data-w="l">เควสต์ L</button></div>');document.body.appendChild(btns);
  btns.querySelector('[data-w=s]').onclick=()=>toggle(wS);btns.querySelector('[data-w=i]').onclick=()=>toggle(wI);btns.querySelector('[data-w=k]').onclick=()=>toggle(wK);btns.querySelector('[data-w=b]').onclick=()=>toggle(wB);btns.querySelector('[data-w=l]').onclick=()=>toggle(wQ);
  btns.addEventListener('mousedown',e=>e.stopPropagation());
  addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();if(k==='c')toggle(wS);if(k==='i')toggle(wI);if(k==='k')toggle(wK);if(k==='b')toggle(wB);if(k==='l')toggle(wQ);if(k==='escape'){for(const w of [wS,wI,wK,wJ,wR,wB,wShop,wInn,wQ])toggle(w,false);RPG.closeStorage();innView='menu';}});
  RPG.onChange(render);render();}
return {init,render,openJob:()=>toggle(wJ,true),openRefine:()=>toggle(wR,true),openQuests:()=>toggle(wQ,true),openShop:id=>{shopId=id;shopTab='buy';toggle(wShop,true);},openInn:()=>{RPG.closeStorage();innView='menu';toggle(wInn,true);}};
})();
