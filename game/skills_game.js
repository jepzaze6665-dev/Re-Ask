// =====================================================================
//  game/skills_game.js — ต่อสกิล/สถานะ/อาชีพ (shared/skills.js, shared/status.js) เข้ากับเกม
//  โหลดหลัง main.js · ใช้ตัวแปรของ main.js (P, mobs, DB, num, damageMob, say, ...) ตอนถูกเรียก
//  ปุ่ม 1–6 = สกิล active ที่เรียนแล้วเรียงตามสายอาชีพ
// =====================================================================
const SKG=(()=>{
let NOW=0;                       // เวลาเกม (วินาที) ใช้กับคูลดาวน์และสถานะ
const now=()=>NOW;
const lvOf=id=>P.skills[id]||0;
const pFlags=()=>STATUS.flags(DB,P.st,NOW);
const mobFlags=m=>STATUS.flags(DB,m.st,NOW);
const wtype=()=>P.d.wtype;

// ---------- แถบปุ่มลัด ----------
const usable=id=>id&&DB.skills[id]&&DB.skills[id].type==='active'&&lvOf(id)>0;
/** ปุ่มลัด 6 ช่อง: ผู้เล่นจัดเอง (P.hotbar) — ยังไม่เคยจัด = เรียงอัตโนมัติตามสายอาชีพ · ช่องว่าง = null */
function hotbar(){if(P.hotbar)return P.hotbar.map(id=>usable(id)?id:null);
  const auto=SKILLS.skillsFor(DB,P.job).filter(usable).slice(0,6);while(auto.length<6)auto.push(null);return auto;}
/** ใส่สกิลลงช่อง i (0–5) · id=null = ล้างช่อง · สกิลเดิมที่อยู่ช่องอื่นย้ายมา */
function setSlot(i,id){const hb=hotbar();if(id){const j=hb.indexOf(id);if(j>=0)hb[j]=null;}hb[i]=id;P.hotbar=hb;RPG.save();}
function castSlot(n){const id=hotbar()[n-1];if(!id)return say('ยังไม่มีสกิลในช่อง '+n+' (กด K เพื่อเรียนสกิล)');castSkill(id);}

// ---------- ร่าย ----------
function castSkill(id){if(P.dead)return;const sk=DB.skills[id],lv=lvOf(id);
  const err=SKILLS.checkCast(DB,{skills:P.skills,sp:P.sp,cds:P.cds,wtype:wtype(),flags:pFlags()},id,NOW);if(err)return say(err);
  if(P.casting)return say('กำลังร่ายอยู่');
  if(sk.target==='enemy'||sk.target==='aoe_enemy'){
    let m=P.target&&!P.target.dead?P.target:null;
    if(!m){let bd=Math.max(420,sk.range);for(const o of mobs){if(o.dead)continue;const d=dist(o,P);if(d<bd){bd=d;m=o;}}}
    if(!m)return say('ไม่มีเป้าหมาย');
    P.target=m;P.moveTo=null;P.pending=id;return;}       // เดินเข้าระยะแล้วค่อยร่าย (ดู tryPending)
  begin(id,null);}
const rangeOf=(id,m)=>(DB.skills[id].range||0)+20*m.look.scale;
/** ระยะที่ต้องเข้าไปถึงเป้า: ถ้ามีสกิลรอ = ระยะสกิล ไม่งั้น = ระยะตีปกติ */
const wantRange=m=>P.pending?rangeOf(P.pending,m):reachTo(m);
/** อยู่ในระยะแล้ว: ร่ายสกิลที่รอ (คืน true ถ้าร่าย) */
function tryPending(m){if(!P.pending)return false;const id=P.pending;P.pending=null;
  if(P.act)return false;
  const err=SKILLS.checkCast(DB,{skills:P.skills,sp:P.sp,cds:P.cds,wtype:wtype(),flags:pFlags()},id,NOW);if(err){say(err);return false;}
  begin(id,m);return true;}
function begin(id,m){const info=SKILLS.castInfo(DB,id,lvOf(id));
  if(m)P.dir=m.x<P.x?-1:1;
  if(info.cast>0){P.casting={id,m,t:0,total:info.cast,interruptible:info.interruptible};return;}
  execute(id,m);}
function interrupt(why){if(!P.casting)return;P.casting=null;say('ร่ายถูกขัด! ('+why+')');}
function onPlayerHit(){if(P.casting&&P.casting.interruptible&&!pFlags().noFlinch)interrupt('โดนโจมตี');}

// ---------- ผลของสกิล ----------
const near=(cx,cy,r)=>mobs.filter(o=>!o.dead&&Math.hypot(o.x-cx,o.y-cy)<r+300);
const asTarget=o=>({ref:o,prof:RO.withMods(o.prof,STATUS.mods(o.st,NOW)),x:o.x,y:o.y});
function execute(id,m){const sk=DB.skills[id],lv=lvOf(id),info=SKILLS.castInfo(DB,id,lv);
  if(m&&m.dead)return say('เป้าหมายหายไปแล้ว');
  P.sp-=info.sp;P.cds[id]=NOW+info.cd;P.atkTimer=Math.max(P.atkTimer||0,.35);
  if(sk.clip)RIG.play(P,sk.clip);
  const out=SKILLS.resolve(DB,id,lv,{caster:RPG.attacker(),self:{x:P.x,y:P.y},primary:m?asTarget(m):undefined,others:near(P.x,P.y,400).map(asTarget),rng:RPG.rng});
  let hitAny=false;
  for(const o of out){
    if(o.kind==='damage'){damageMob(o.ref,o.r,{kb:0});if(!o.r.miss)hitAny=true;}
    else if(o.kind==='knockback'){const a=Math.atan2(o.ref.y-o.from.y,o.ref.x-o.from.x);o.ref.vx+=Math.cos(a)*o.power;o.ref.vy+=Math.sin(a)*o.power*.5;}
    else if(o.kind==='heal'){const h=Math.min(P.hpMax-P.hp,o.amount);P.hp+=h;num(P.x,P.y-130,'+'+h,{col:'#7bd88f',size:20});}
    else if(o.kind==='status'){const tg=o.ref==='self'?P:o.ref;
      if(STATUS.apply(DB,tg.st,o.status,{now:NOW,dur:o.dur,mods:o.mods})){const d=DB.statuses[o.status];
        num(tg.x,tg.y-(tg===P?150:130),d.name,{col:d.color,size:15});if(tg===P)RPG.recalc();}}
    else if(o.kind==='damage_seq')P.seq={m:o.ref,o};}           // รอ event 'swarm' ของท่า
  if(sk.target==='aoe_self'||sk.target==='aoe_enemy'){const e=sk.effects.find(x=>x.radius);if(e)rings.push({x:sk.target==='aoe_self'?P.x:m.x,y:sk.target==='aoe_self'?P.y:m.y,r:e.radius,t:0,col:e.element==='fire'?'255,122,58':'207,216,230'});}
  if(hitAny){P.hitstop=.08;shake=Math.max(shake,8);P.flash=1;}
  if(sk.type==='active'&&!sk.clip)P.flash=.8;
  RPG.save();}
// event จากท่า 'สกิล: ฝูงอสูรเงา' → VFX + ดาเมจตามจังหวะงับ (ตัวเลขจากระบบเกม · งับสุดท้ายแสดงใหญ่ · TOTAL)
function onSwarmEvent(){const s=P.seq;P.seq=null;if(!s)return;const m=s.m,o=s.o;
  VFX.play('swarm',{x:P.x,y:P.y,tx:m.x,ty:m.y-50});
  let total=0;const last=o.hits.length-1;
  o.hits.forEach((h,i)=>setTimeout(()=>{if(m.dead)return;
    const r=RO.physical(DB,RPG.attacker(),asTarget(m).prof,{pct:h.pct,element:o.element,ignoreFlee:o.ignoreFlee,rng:RPG.rng});
    if(i===last)r.crit=true;total+=r.dmg||0;damageMob(m,r,{stun:0});
    if(i===last&&total>0)setTimeout(()=>{num(m.x,m.y-170,'TOTAL '+total,{col:'#ffb347',size:30,crit:true});shake=Math.max(shake,6);},350);},h.t*1000));}

// ---------- เดินเวลา: ร่าย สถานะ DoT ----------
const rings=[];
let lastBuffSig='';
function update(dt){NOW+=dt;
  // ร่าย
  if(P.casting){const c=P.casting,moved=keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright;
    if(moved&&c.interruptible&&!pFlags().noFlinch)interrupt('เดิน');
    else if(c.m&&c.m.dead){P.casting=null;}
    else if(pFlags().cantCast)interrupt('ติดสถานะ');
    else{c.t+=dt;if(c.t>=c.total){P.casting=null;execute(c.id,c.m);}}}
  // สถานะผู้เล่น (บัฟหมด → คำนวณสเตตัสใหม่)
  const pd=STATUS.tick(DB,P.st,NOW,P.hpMax);if(pd.dmg&&!P.dead){P.hp=Math.max(1,P.hp-pd.dmg);num(P.x,P.y-130,pd.dmg,{col:'#ff9a3a',size:16});}
  STATUS.prune(P.st,NOW);const sig=Object.keys(P.st).join(',');if(sig!==lastBuffSig){lastBuffSig=sig;RPG.recalc();}
  for(const m of mobs){if(m.dead)continue;const d=STATUS.tick(DB,m.st,NOW,m.hpMax);
    if(d.dmg)damageMob(m,{dmg:d.dmg,miss:false,crit:false,eleMod:1},{stun:0});STATUS.prune(m.st,NOW);}
  for(let i=rings.length-1;i>=0;i--){rings[i].t+=dt;if(rings[i].t>.45)rings.splice(i,1);}}
/** ผู้เล่นขยับ/ตีไม่ได้ (ร่าย หรือ ติดสถานะ) */
const playerBusy=()=>{const f=pFlags();return !!P.casting||f.cantMove||f.cantAct;};

// ---------- วาด (รูปทรงเรียบง่าย — VFX จริงมาจากสตูดิโอภายหลัง) ----------
function drawWorld(t){
  for(const r of rings){const k=r.t/.45;ctx.save();ctx.translate(r.x,r.y);ctx.scale(1,.45);ctx.strokeStyle=`rgba(${r.col},${1-k})`;ctx.lineWidth=8*(1-k)+2;
    ctx.beginPath();ctx.arc(0,0,r.r*(.4+.6*k),0,7);ctx.stroke();ctx.restore();}
  const label=(e,y)=>{const ids=Object.keys(e.st).filter(k=>e.st[k].until>NOW);if(!ids.length)return;
    ctx.save();ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#000';
    ids.forEach((k,i)=>{const d=DB.statuses[k],tx=d.name,x=e.x+(i-(ids.length-1)/2)*48;ctx.strokeText(tx,x,y);ctx.fillStyle=d.color;ctx.fillText(tx,x,y);});ctx.restore();};
  for(const m of mobs)if(!m.dead)label(m,m.y-52-60*m.look.scale);
  if(!P.dead)label(P,P.y-118);
  if(P.casting){const c=P.casting,w=70,x=P.x-w/2,y=P.y+30;ctx.save();ctx.fillStyle='#000a';ctx.fillRect(x-1,y-1,w+2,9);ctx.fillStyle='#7fd0ff';ctx.fillRect(x,y,w*c.t/c.total,7);
    ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(DB.skills[c.id].name,P.x,y+20);ctx.restore();}}
/** ช่องในแถบ HUD (main.js วาด) */
function hudSlots(){return hotbar().map((id,i)=>{if(!id)return {k:String(i+1),name:'',col:'#3a2d55',cd:0,max:1};const sk=DB.skills[id],info=SKILLS.castInfo(DB,id,lvOf(id));
  return {k:String(i+1),name:`${sk.name} ${lvOf(id)}`,col:sk.element==='fire'?'#ff7a3a':sk.job==='knight'?'#b45cff':sk.job==='novice'?'#7bd88f':'#cfd8e6',cd:Math.max(0,(P.cds[id]||0)-NOW),max:Math.max(.01,info.cd)};});}

// ---------- มอน ----------
function mobProfileNow(m){const s=STATUS.mods(m.st,NOW);if(m.phaseMods)for(const k in m.phaseMods)s[k]=(s[k]||0)+m.phaseMods[k];return RO.withMods(m.prof,s);}   // + เฟสบอส

return {now,setSlot,castSlot,castSkill,wantRange,tryPending,onPlayerHit,onSwarmEvent,update,playerBusy,drawWorld,hudSlots,mobFlags,mobProfileNow,hotbar};
})();
