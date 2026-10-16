// =====================================================================
//  Re-Ask — ต้นแบบ MMORPG (single-player vertical slice)
//  เมืองเริ่มต้น (จาก Map Lab) ↔ แมพรากต้นไม้มืด · F = คุย · เดิน (WASD / คลิก) · ฟัน (J คอมโบ 3) · สกิล (1 ฝูงอสูรเงา) · มอนสเตอร์ · HUD
// =====================================================================
const cv=document.getElementById('game'), ctx=cv.getContext('2d');
let W=0,H=0; function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;} resize(); addEventListener('resize',resize);
const rnd=(()=>{let s=23;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})();   // seed เดียว = แมพเดิมทุกครั้ง
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// ---------------- แมพ (วาดครั้งเดียวเก็บเป็นภาพ) ----------------
const MAP={w:2600,h:1700,id:'dark_root'};
const darkCv=document.createElement('canvas');darkCv.width=MAP.w;darkCv.height=MAP.h;let mapCv=darkCv; // ภาพพื้นของแมพปัจจุบัน
(function buildMap(){const g=darkCv.getContext('2d');
  g.fillStyle='#17121f';g.fillRect(0,0,MAP.w,MAP.h);
  for(let i=0;i<70;i++){const x=rnd()*MAP.w,y=rnd()*MAP.h,r=120+rnd()*260,gr=g.createRadialGradient(x,y,0,x,y,r);
    gr.addColorStop(0,rnd()<.5?'rgba(60,40,90,.35)':'rgba(30,22,48,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}
  // พื้นหกเหลี่ยม
  g.strokeStyle='rgba(150,110,230,.07)';g.lineWidth=2;const s=46;
  for(let y=0;y<MAP.h+s;y+=s*1.5)for(let x=0;x<MAP.w+s;x+=s*Math.sqrt(3)){const ox=((y/(s*1.5))%2)?s*Math.sqrt(3)/2:0;
    g.beginPath();for(let k=0;k<6;k++){const an=Math.PI/3*k+Math.PI/6;g.lineTo(x+ox+Math.cos(an)*s,y+Math.sin(an)*s*.62);}g.closePath();g.stroke();}
  // รากไม้ดำ
  for(let i=0;i<46;i++){let x=rnd()*MAP.w,y=rnd()*MAP.h,a=rnd()*6.28;g.strokeStyle='rgba(8,5,14,.85)';g.lineCap='round';
    for(let k=0;k<7;k++){const nx=x+Math.cos(a)*60,ny=y+Math.sin(a)*35;g.lineWidth=14-k*1.7;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo((x+nx)/2+20*(rnd()-.5),(y+ny)/2+20*(rnd()-.5),nx,ny);g.stroke();x=nx;y=ny;a+=(rnd()-.5)*1.2;}}
  // แอ่งน้ำดำเรืองม่วง
  for(let i=0;i<14;i++){const x=rnd()*MAP.w,y=rnd()*MAP.h,r=40+rnd()*70;g.save();g.translate(x,y);g.scale(1,.45);
    const gr=g.createRadialGradient(0,0,r*.2,0,0,r*1.25);gr.addColorStop(0,'rgba(10,5,20,.95)');gr.addColorStop(.8,'rgba(60,20,110,.55)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.beginPath();g.arc(0,0,r*1.25,0,7);g.fill();g.restore();}
  // ขอบแมพมืด
  const v=g.createRadialGradient(MAP.w/2,MAP.h/2,MAP.h*.4,MAP.w/2,MAP.h/2,MAP.w*.62);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.75)');g.fillStyle=v;g.fillRect(0,0,MAP.w,MAP.h);
})();
// ของประดับ (เรียงตามความลึก y ร่วมกับตัวละคร)
const props=[];
for(let i=0;i<60;i++){const x=80+rnd()*(MAP.w-160),y=80+rnd()*(MAP.h-160);if(Math.hypot(x-MAP.w/2,y-MAP.h/2)<240)continue;
  props.push({x,y,kind:rnd()<.62?'crystal':'stump',s:.6+rnd()*.9,seed:rnd()*99});}
function drawProp(p,t){ctx.save();ctx.translate(p.x,p.y);
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,0,26*p.s,8*p.s,0,0,7);ctx.fill();
  if(p.kind==='crystal'){const h=70*p.s,glow=.55+.45*Math.sin(t*1.6+p.seed);
    const shards=[[-14,.7,-.25],[0,1,0],[13,.6,.3]];
    for(const [dx,k,lean] of shards){ctx.save();ctx.translate(dx*p.s,0);ctx.rotate(lean);
      ctx.beginPath();ctx.moveTo(-9*p.s,0);ctx.lineTo(-6*p.s,-h*k*.75);ctx.lineTo(0,-h*k);ctx.lineTo(6*p.s,-h*k*.75);ctx.lineTo(9*p.s,0);ctx.closePath();
      ctx.fillStyle='#3a1f63';ctx.fill();ctx.strokeStyle='#120a1e';ctx.lineWidth=2.5;ctx.stroke();
      ctx.beginPath();ctx.moveTo(-1*p.s,-3);ctx.lineTo(0,-h*k*.95);ctx.lineTo(5*p.s,-h*k*.72);ctx.lineTo(4*p.s,-3);ctx.fillStyle='#8a5ad8';ctx.fill();ctx.restore();}
    ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(0,-h*.5,0,0,-h*.5,h*.9);gr.addColorStop(0,`rgba(170,100,255,${.35*glow})`);gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.fillRect(-h,-h*1.4,h*2,h*1.8);
  } else {const r=22*p.s;ctx.fillStyle='#2a1d33';ctx.strokeStyle='#0d0814';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,-6*p.s,r,r*.5,0,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle='#3d2a49';ctx.beginPath();ctx.ellipse(0,-12*p.s,r*.85,r*.38,0,0,7);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(180,120,255,.25)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,-12*p.s,r*.45,r*.18,0,0,7);ctx.stroke();}
  ctx.restore();}

// ---------------- เมืองเริ่มต้น (ส่งออกจาก Map Lab: พื้นอบ + layout + ชุดของ) ----------------
const TOWN={ground:new Image(),lay:null,kit:{}};
function loadTown(base){TOWN.ground.src=base+'ground.jpg';
  return fetch(base+'layout.json').then(r=>r.json()).then(L=>{TOWN.lay=L;
    for(const o of L.objects)if(!TOWN.kit[o.k]){const i=new Image();i.src=base+'kit/'+o.k+'.png';TOWN.kit[o.k]=i;}
    TOWN.crystal=new Image();TOWN.crystal.src=base+'kit/waystone_crystal.png';
    return new Promise(res=>{if(TOWN.ground.complete)res();else{TOWN.ground.onload=res;TOWN.ground.onerror=res;}});});}
const imgOk=i=>i&&i.complete&&i.naturalWidth>0;
function townBlocked(x,y){const L=TOWN.lay;if(x<20||y<120||x>L.W-20||y>L.H-50)return true;
  const k=L.lake;if(((x-k.x)/(k.rx+20))**2+((y-k.y)/(k.ry+20))**2<1)return true;
  for(const o of L.objects){const f=o.solid;if(f&&((x-o.x)/f.rx)**2+((y-o.y+f.ry*.3)/f.ry)**2<1)return true;}return false;}
function townBehind(o){return o.tags.includes('บัง')&&o.y>P.y&&Math.abs(P.x-o.x)<o.w*.5&&P.y>o.y-o.h*.95;}  // ผู้เล่นอยู่หลังของ -> ของจางลง
function drawTownObj(o,t){const im=TOWN.kit[o.k];if(!imgOk(im))return;const bd=o.h*o.base;
  ctx.save();ctx.translate(o.x,o.y-bd*.5-o.h*.02);ctx.scale(1,Math.max(.32,(bd*.6+8)/Math.max(1,o.w*.5)));   // เงาเต็มฐาน (ค่าเดียวกับ Map Lab)
  const gr=ctx.createRadialGradient(0,0,o.w*.1,0,0,o.w*.5);gr.addColorStop(0,'rgba(20,14,8,.55)');gr.addColorStop(1,'rgba(20,14,8,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,o.w*.5,0,7);ctx.fill();ctx.restore();
  ctx.save();if(townBehind(o))ctx.globalAlpha=.45;ctx.drawImage(im,o.x-o.w/2,o.y-o.h*.97,o.w,o.h);
  if(o.k==='waystone'&&imgOk(TOWN.crystal)){const c=TOWN.lay.crystal,ch=o.h*c.h,cw=TOWN.crystal.width*ch/TOWN.crystal.height;ctx.drawImage(TOWN.crystal,o.x-cw/2,o.y+o.h*c.dy+Math.sin(t*2)*5,cw,ch);}
  ctx.restore();}
let talkNear=null;
const warpsHere=()=>DB.map.warps||[];
function drawWarp(w,t){ctx.save();ctx.translate(w.x,w.y);ctx.scale(1,.45);const r=70+6*Math.sin(t*3),gr=ctx.createRadialGradient(0,0,8,0,0,r);
  gr.addColorStop(0,'rgba(170,225,255,.85)');gr.addColorStop(.6,'rgba(90,150,255,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,r,0,7);ctx.fill();ctx.restore();
  ctx.save();ctx.textAlign='center';ctx.font='800 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#000';ctx.strokeText('→ '+w.label,w.x,w.y-34);ctx.fillStyle='#bfe3ff';ctx.fillText('→ '+w.label,w.x,w.y-34);ctx.restore();}
// เปลี่ยนแมพ: ขนาด/ภาพพื้น, ล้างมอนกับของบนพื้น, วางผู้เล่น
function enterMap(id,at){DB.map=DB.maps[id];MAP.id=id;MOBG.clear();
  if(id==='town'){MAP.w=TOWN.lay.W;MAP.h=TOWN.lay.H;mapCv=TOWN.ground;at=at||TOWN.lay.spawn;}
  else if(id==='dungeon'){const g=DGG.mapInfo();MAP.w=g.W;MAP.h=g.H;mapCv=g.canvas;at=at||g.spawn;}   // ดันสุ่ม (game/dungeon_game.js)
  else{MAP.w=darkCv.width;MAP.h=darkCv.height;mapCv=darkCv;at=at||{x:MAP.w/2,y:MAP.h/2};}
  mobs.length=0;ground.length=0;P.x=at.x;P.y=at.y;P.moveTo=null;cam.x=P.x;cam.y=P.y;spawnAll();if(id==='dungeon')DGG.populate();say(DB.map.name);if(id!=='dungeon')DGG.onLeave();}

// ---------------- ผู้เล่น ----------------
// hero2: ขนาดชิ้น/ตำแหน่งกระดูกเฉพาะชุด (ค่าเดียวกับ SPEC_SET.hero2 / BODY.hero2 ใน rig_lab ของสตูดิโอ)
const HERO2={spec:{head:{h:57.9,px:0.55,py:0.9},torso:{h:62.9,px:0.5,py:0.78},arm_upper:{h:28.3,px:0.5,py:0.226},arm_lower:{h:35.2,px:0.5,py:0.109},leg_upper:{h:34.9,px:0.5,py:0.183},leg_lower:{h:40.5,px:0.5,py:0.115}},
  bones:{head:[2,-44],armF_u:[-13,-35],armB_u:[11,-34],armF_l:[0,19.2],armB_l:[0,19.2],weapon:[0,25.7],legF_u:[-8,-4],legB_u:[9,-4],legF_l:[0,25.1],legB_l:[0,25.1]},foot:57};
const outfit=RIG.loadOutfit('data/characters/hero2/',{parts:['head','torso'],boneParts:['armF_u','armF_l','armB_u','armB_l','legF_u','legF_l','legB_u','legB_l'],idleParts:{legF_l:'legF_l_front_toe'},hair:false,leg:null,...HERO2});
// ชุดเดิม: RIG.loadOutfit('data/characters/dark_knight/',{helmet:true,glows:['torso','shoulder','arm_lower','leg_upper']})
// สเตตัส/เลเวล/กระเป๋ามาจาก RPG.bind (data/db + เซฟ) ตอนเริ่มเกม
let P=null, DB=null;
function makePlayer(){P=RIG.makeChar({x:MAP.w/2,y:MAP.h/2,scale:.62,outfit,speed:190,combo:0,lastAtkEnd:-9,queued:false,moveTo:null,cd:{},dead:false});
  RPG.bind(P);P.onEvent=onPlayerEvent;}
RIG.loadClips('data/clips.json');   // ท่าที่ส่งออกจาก Pose Studio ทับค่าเริ่มต้น

// ---------------- มอนสเตอร์ ----------------
// ชนิด/จำนวน/เวลาเกิดใหม่มาจาก data/db/maps/dark_root.json · ค่าพลังมาจาก data/db/mobs.json
const mobs=[];
function spawnMob(id,respawn){const k=DB.mobs[id],safe=DB.map.safe||{x:-1e4,y:-1e4,r:0};let x,y;
  do{x=150+Math.random()*(MAP.w-300);y=150+Math.random()*(MAP.h-300);}while(Math.hypot(x-P.x,y-P.y)<420||Math.hypot(x-safe.x,y-safe.y)<safe.r);
  mobs.push({id,k,prof:RO.mobProfile(DB,k),respawn,look:k.look,x,y,hx:x,hy:y,hp:k.hp,hpMax:k.hp,name:k.name,lv:k.lv,
    state:'idle',tw:0,atkCd:0,hit:0,stun:0,dir:1,dead:0,seed:Math.random()*9,vx:0,vy:0,st:{},map:MAP.id});}
function spawnAll(){for(const sp of DB.map.spawns)for(let i=0;i<sp.count;i++)spawnMob(sp.mob,sp.respawn);}
function drawMob(m,t){const a=m.dead?Math.max(0,1-m.dead/.6):1;if(a<=0)return;
  ctx.save();ctx.translate(m.x,m.y);ctx.globalAlpha=a;
  const L=m.look;ctx.scale(L.scale,L.scale);
  ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,0,34,9,0,0,7);ctx.fill();
  const bob=Math.sin(t*3+m.seed)*4,sq=1+Math.sin(t*6+m.seed)*.04;ctx.translate(0,-38+bob);ctx.scale(m.dir/sq,sq);
  // ตัว: ก้อนเงาขอบหยัก
  ctx.beginPath();for(let i=0;i<=20;i++){const an=i/20*Math.PI*2,r=34+5*Math.sin(an*5+t*4+m.seed)+(an>Math.PI*.1&&an<Math.PI*.9?6:0);ctx.lineTo(Math.cos(an)*r,Math.sin(an)*r*.92);}
  ctx.closePath();ctx.fillStyle=m.hit>0?'#fff':L.body;ctx.fill();ctx.strokeStyle=L.edge;ctx.lineWidth=3;ctx.shadowColor=L.edge;ctx.shadowBlur=14;ctx.stroke();ctx.shadowBlur=0;
  // หนามบนหัว
  ctx.fillStyle=m.hit>0?'#fff':L.body;for(let i=0;i<L.spikes;i++){const f=L.spikes>1?i/(L.spikes-1)-.5:0,x=f*30,h=30-Math.abs(f)*18;ctx.beginPath();ctx.moveTo(x-6,-28);ctx.lineTo(x,-28-h);ctx.lineTo(x+6,-28);ctx.fill();}
  // ตา
  ctx.fillStyle=L.eye;ctx.shadowColor=L.eye;ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(6,-4,5,6,0,0,7);ctx.ellipse(20,-4,4,5,0,0,7);ctx.fill();
  ctx.restore();
  if(!m.dead){ctx.save();ctx.translate(m.x,m.y-38-60*L.scale);ctx.textAlign='center';ctx.font='700 12px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#000';
    const label=`${m.name} Lv ${m.lv}`;if(m.k.boss){ctx.fillStyle='#ffb347';ctx.fillText('★ BOSS',0,-24);}ctx.strokeText(label,0,-8);ctx.fillStyle='#e9ddff';ctx.fillText(label,0,-8);
    ctx.fillStyle='#000a';ctx.fillRect(-30,0,60,6);ctx.fillStyle='#ff4d6d';ctx.fillRect(-30,0,60*m.hp/m.hpMax,6);ctx.restore();}}

// ---------------- ตัวเลขดาเมจ ----------------
const nums=[];
function num(x,y,v,{col='#ffd34a',size=24,crit=false}={}){nums.push({x:x+(Math.random()-.5)*30,y,v,col,size:crit?size*1.4:size,t:0});}
function drawNums(dt){for(let i=nums.length-1;i>=0;i--){const n=nums[i];n.t+=dt;if(n.t>.9){nums.splice(i,1);continue;}
  const k=n.t/.9,pop=n.t<.1?.6+.7*(n.t/.1):1.3-.3*Math.min(1,(n.t-.1)/.15);
  ctx.save();ctx.translate(n.x,n.y-k*50);ctx.scale(pop,pop);ctx.globalAlpha=k>.7?(1-k)/.3:1;ctx.textAlign='center';ctx.font=`900 ${n.size}px system-ui`;
  ctx.lineJoin='round';ctx.lineWidth=n.size*.22;ctx.strokeStyle='#2a0a3a';ctx.strokeText(n.v,0,0);ctx.fillStyle=n.col;ctx.fillText(n.v,0,0);ctx.restore();}}

// ---------------- คอมแบต (สูตร RO ใน shared/ro.js) ----------------
let shake=0, toast={txt:'',t:0}, kills=0;
function say(t){toast={txt:t,t:1.6};}
// r = ผลจาก RO.physical {dmg, crit, miss}
function damageMob(m,r,{showNum=true,kb=0,stun=.25}={}){if(m.dead)return;
  if(r.miss){num(m.x,m.y-110,'MISS',{col:'#9fb3c8',size:18});return;}
  const d=r.dmg;m.hp-=d;m.hit=.08;m.stun=Math.max(m.stun,stun);MOBG.alert(m);
  if(kb){const a=Math.atan2(m.y-P.y,m.x-P.x);m.vx+=Math.cos(a)*kb;m.vy+=Math.sin(a)*kb*.5;}
  if(showNum)num(m.x,m.y-110,r.eleMod===0?'0':d,{crit:r.crit,col:r.crit?'#ff9a3a':r.eleMod>1?'#7fffd4':r.eleMod<1?'#9fb3c8':'#ffd34a'});
  if(m.hp<=0)killMob(m);}
function killMob(m){m.hp=0;m.dead=.001;kills++;
  if(P.target===m)P.target=null;RPG.onKill(m.id);SHG.onKill();
  const rw=RPG.killReward(m.k,RPG.newKillId(),say,m.id,m.shadowMult||1);   // EXP + zeny + ม้วนดรอป (key ไม่ซ้ำต่อการฆ่า → ไม่ได้รางวัลซ้ำ)
  num(m.x,m.y-140,`+${m.k.exp} EXP`+(rw.zeny?` · +${rw.zeny} z`:''),{col:'#ffd166',size:15});
  rw.items.forEach((it,i)=>dropItem(it,m.x,m.y,i));
  RPG.questEvent({type:'kill',mob:m.id},say);DGG.onKill(m);
  setTimeout(()=>{const i=mobs.indexOf(m);if(i>=0)mobs.splice(i,1);if(!m.minion&&!m.dungeon&&MAP.id===m.map)spawnMob(m.id,m.respawn);},m.minion?1500:m.respawn*1000);}
const ATK=()=>DB.skills.attack;
function onPlayerEvent(evt,clip,ch){
  // ตีอัตโนมัติ: ดาเมจลงเป้าที่ล็อกไว้ตอนเริ่มเหวี่ยงเท่านั้น (ต้องยังอยู่ในระยะ) — ตอนออนไลน์เซิร์ฟเวอร์ตัดสินตรงนี้
  if(evt==='hit'){const ci=Math.max(0,ATK().clips.indexOf(clip.name)),big=ci===2,m=P.swingTarget;P.swingTarget=null;
    if(m&&!m.dead&&dist(m,P)<=reachTo(m)+DB.rules.attack.rangeSlack){const r=RO.physical(DB,RPG.attacker(),m.prof,{pct:ATK().pct,rng:RPG.rng});
      damageMob(m,r,{kb:r.miss?0:ATK().knockback[ci]});if(!r.miss)SHG.onAutoHit(m);   // ผลพิเศษของเงาที่ผนึก
      if(!r.miss){P.hitstop=big?.1:.06;shake=Math.max(shake,big?9:4);P.flash=big?1.1:.6;}}}
  if(evt==='swarm')SKG.onSwarmEvent();   // สกิลทั้งหมดอยู่ใน game/skills_game.js
};
// ---- ตีอัตโนมัติ (คลิกมอน = ล็อกเป้า → เดินเข้าระยะ → ตีทุก attackInterval จนเป้าตาย/ยกเลิก) ----
const reachTo=m=>ATK().range+20*m.look.scale;
function setTarget(m){if(P.dead||!m||m.dead)return;P.target=m;P.moveTo=null;}
function targetNearest(){let best=null,bd=420;for(const m of mobs){if(m.dead)continue;const d=dist(m,P);if(d<bd){bd=d;best=m;}}
  if(best)setTarget(best);else say('ไม่มีเป้าหมายใกล้ๆ');}
function swing(m){const names=ATK().clips;P.dir=m.x<P.x?-1:1;P.swingTarget=m;P.atkTimer=P.d.attackInterval;
  RIG.play(P,names[P.combo]);P.combo=(P.combo+1)%names.length;}
function quaff(kind){if(P.dead)return;const s=RPG.findUsable(kind);if(!s)return say(kind==='hp'?'ไม่มียาฟื้น HP':'ไม่มียาฟื้น SP');
  const r=RPG.use(s.uid);if(typeof r==='string')return say(r);
  if(r.hp)num(P.x,P.y-130,'+'+r.hp,{col:'#7bd88f',size:20});if(r.sp)num(P.x,P.y-130,'+'+r.sp,{col:'#5aa8ff',size:20});}

// ---------------- ของบนพื้น (ดรอป) ----------------
const ground=[];
// it = {id, qty, sockets?, key} จาก RPG.killReward · key กันเก็บซ้ำ
function dropItem(it,x,y,i){const a=i*2.1+Math.random();ground.push({...it,x:x+Math.cos(a)*(20+i*14),y:y+Math.sin(a)*(10+i*8),t:0,life:60});}
function tryPickup(){for(let i=ground.length-1;i>=0;i--){const g=ground[i];if(g.t<.4||Math.hypot(g.x-P.x,g.y-P.y)>DB.rules.pickupRange)continue;
  const err=RPG.pickup(g);if(err){if(!g.warned){say(err);g.warned=1;}continue;}
  const it=DB.items[g.id];num(P.x,P.y-150,`+ ${it.name}`,{col:it.rarity==='legend'?'#ffb347':it.rarity==='rare'?'#5aa8ff':'#e9ddff',size:15});ground.splice(i,1);}}
function drawGround(g,t){const it=DB.items[g.id],pop=Math.min(1,g.t/.3),hop=g.t<.4?-Math.sin(g.t/.4*Math.PI)*40:Math.sin(t*3+g.x)*2;
  if(g.life-g.t<5&&Math.sin(t*20)>0)return;
  ctx.save();ctx.translate(g.x,g.y);ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,0,10,4,0,0,7);ctx.fill();
  ctx.translate(0,-10+hop);ctx.scale(pop,pop);
  if(it.rarity!=='common'){ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(0,0,0,0,0,26);gr.addColorStop(0,it.rarity==='legend'?'rgba(255,180,70,.7)':'rgba(90,168,255,.6)');gr.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gr;ctx.fillRect(-26,-26,52,52);ctx.globalCompositeOperation='source-over';}
  const gr=ctx.createRadialGradient(-3,-3,1,0,0,9);gr.addColorStop(0,'#fff');gr.addColorStop(.4,it.icon);gr.addColorStop(1,'#000');
  ctx.fillStyle=gr;ctx.strokeStyle='#0008';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-8,-8,16,16,4);ctx.fill();ctx.stroke();ctx.restore();
  if(Math.hypot(g.x-mouse.wx,g.y-mouse.wy)<20){ctx.save();ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#000';ctx.strokeText(it.name,g.x,g.y-28);ctx.fillStyle='#fff';ctx.fillText(it.name,g.x,g.y-28);ctx.restore();}}

// ---------------- อินพุต ----------------
const keys={};
addEventListener('keydown',e=>{if(e.target&&e.target.tagName==='INPUT')return;   // พิมพ์ในช่องกรอก ไม่ใช่สั่งเกม
  const k=e.key.toLowerCase();keys[k]=true;if(!P||e.repeat&&k!=='j')return;
  if(k==='j')targetNearest(); if(k>='1'&&k<='6')SKG.castSlot(+k); if(k==='u')P.visor=!P.visor; if(k==='q')quaff('hp'); if(k==='e')quaff('sp'); if(k==='f'&&DGG.tryEnterNear())return;   // ประตูมิติ
  if(k==='f'&&talkNear){const npc=talkNear.k;RPG.questEvent({type:'talk',npc},say);if(npc==='quest_board')UI.openQuests();else if(npc==='guild_hall')UI.openJob();else if(DB.shops.shops[npc])UI.openShop(npc);else if(npc===DB.shops.inn.npc)UI.openInn();else say(talkNear.talk);}});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let cam={x:MAP.w/2,y:MAP.h/2};const mouse={wx:0,wy:0};
// ล็อกกล้อง: จอสูงเห็นโลก 640 px เสมอ (ตามที่ผู้ใช้เลือก — จอ 962 px ≈ ซูม 1.5) ไม่ว่าหน้าต่างใหญ่เล็ก · ปิดปุ่ม +/-
const VIEW_H=640;let ZOOM=1.5;const fitZoom=()=>{ZOOM=H/VIEW_H;};fitZoom();addEventListener('resize',fitZoom);
cv.addEventListener('mousemove',e=>{mouse.wx=(e.clientX-W/2)/ZOOM+cam.x;mouse.wy=(e.clientY-H/2)/ZOOM+cam.y;});
cv.addEventListener('mousedown',e=>{if(!P)return;const wx=(e.clientX-W/2)/ZOOM+cam.x,wy=(e.clientY-H/2)/ZOOM+cam.y;
  for(const g of ground){if(Math.hypot(g.x-wx,g.y-10-wy)<22){P.moveTo={x:g.x,y:g.y};return;}}
  for(const m of mobs){if(!m.dead&&Math.hypot(m.x-wx,m.y-40-wy)<50*m.look.scale+10){setTarget(m);return;}}
  P.target=null;P.moveTo={x:wx,y:wy};});

// ---------------- อัปเดต ----------------
function update(dt,t){
  for(const k in P.cd)P.cd[k]=Math.max(0,P.cd[k]-dt);P.atkTimer=Math.max(0,(P.atkTimer||0)-dt);
  if(P.target&&(P.target.dead||!mobs.includes(P.target)||P.dead))P.target=null;
  SKG.update(dt);SHG.update(dt);DGG.update();
  if(!P.dead){P.sp=Math.min(P.spMax,P.sp+dt*P.d.spRegen*.3);P.hp=Math.min(P.hpMax,P.hp+dt*P.d.hpRegen*.3);}
  let mx=0,my=0;
  if(!P.act&&!P.dead&&!SKG.playerBusy()){mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    if(mx||my){P.moveTo=null;P.target=null;}
    else if(P.target){const m=P.target,d=dist(m,P);
      if(d>SKG.wantRange(m)){mx=(m.x-P.x)/d;my=(m.y-P.y)/d;}
      else if(!SKG.tryPending(m)&&P.atkTimer<=0&&d<=reachTo(m))swing(m);}
    else if(P.moveTo){const dx=P.moveTo.x-P.x,dy=P.moveTo.y-P.y,d=Math.hypot(dx,dy);
      if(d<8)P.moveTo=null;else{mx=dx/d;my=dy/d;}}}
  const moving=!!(mx||my);
  if(moving){const l=Math.hypot(mx,my),nx=clamp(P.x+mx/l*P.speed*dt,60,MAP.w-60),ny=clamp(P.y+my/l*P.speed*.8*dt,90,MAP.h-40);
    if(MAP.id==='town'){const bx=townBlocked(nx,P.y),by=townBlocked(P.x,ny);if(!bx)P.x=nx;if(!by)P.y=ny;if(bx&&by)P.moveTo=null;}  // แยกแกน = ไถลตามขอบ
    else if(MAP.id==='dungeon'){const bx=DGG.blocked(nx,P.y),by=DGG.blocked(P.x,ny);if(!bx)P.x=nx;if(!by)P.y=ny;if(bx&&by)P.moveTo=null;}
    else{P.x=nx;P.y=ny;}if(mx)P.dir=mx>0?1:-1;}
  // คุย (เมือง) + วาร์ป
  talkNear=null;if(MAP.id==='town'){let bd=1e9;for(const o of TOWN.lay.objects){if(!o.talk)continue;const d=Math.hypot(P.x-o.x,(P.y-o.y)*1.6)-o.w*.45;if(d<70&&d<bd){bd=d;talkNear=o;}}}
  for(const w of warpsHere())if(Math.hypot(P.x-w.x,(P.y-w.y)*1.6)<w.r){
    if(w.to){enterMap(w.to,w.arrive);break;}
    say(w.label+' — ยังไม่เปิด');const a=Math.atan2(P.y-w.y,P.x-w.x)||0;P.x=w.x+Math.cos(a)*(w.r+30);P.y=w.y+Math.sin(a)*(w.r+30)/1.6;P.moveTo=null;}
  // ท่าตีปกติเร่งให้จบภายในรอบตี (ท่าสกิลเล่นความเร็วเดิม)
  const ac=P.act&&ATK().clips.includes(P.act.clip.name)?P.act.clip:null,aspdMul=ac?Math.max(1,ac.len/(ac.speed||1)/P.d.attackInterval):1;
  const wasActing=!!P.act;RIG.update(P,dt*aspdMul,moving);
  for(const g of ground)g.t+=dt;for(let i=ground.length-1;i>=0;i--)if(ground[i].t>ground[i].life)ground.splice(i,1);
  if(!P.dead)tryPickup();
  if(wasActing&&!P.act)P.lastAtkEnd=P.t;
  // มอนสเตอร์ (AI อยู่ใน game/mob_game.js + shared/ai.js)
  for(const m of mobs){if(m.dead){m.dead+=dt;continue;}MOBG.update(m,dt);}MOBG.tick(dt);
  if(P.dead&&keys.r){P.target=null;P.pending=null;P.casting=null;P.st={};RPG.recalc();P.dead=false;P.hp=P.hpMax;P.sp=P.spMax;enterMap('town');}   // เกิดใหม่ที่เมือง
  if(toast.t>0)toast.t-=dt;
  VFX.tick(dt);if(VFX.shakeReq){shake=Math.max(shake,VFX.shakeReq);VFX.shakeReq=0;}
  cam.x+=(P.x-cam.x)*Math.min(1,dt*6);cam.y+=(P.y-60-cam.y)*Math.min(1,dt*6);
  const vw=W/ZOOM,vh=H/ZOOM;cam.x=clamp(cam.x,vw/2,MAP.w-vw/2);cam.y=clamp(cam.y,vh/2,MAP.h-vh/2);if(MAP.w<vw)cam.x=MAP.w/2;if(MAP.h<vh)cam.y=MAP.h/2;}

// ---------------- วาด ----------------
function render(dt,t){
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0b0912';ctx.fillRect(0,0,W,H);
  const sx=shake>.3?(Math.random()-.5)*shake:0,sy=shake>.3?(Math.random()-.5)*shake:0;shake*=.85;
  ctx.setTransform(ZOOM,0,0,ZOOM,Math.round(W/2-cam.x*ZOOM+sx),Math.round(H/2-cam.y*ZOOM+sy));
  ctx.drawImage(mapCv,0,0);
  if(P.moveTo){ctx.save();ctx.translate(P.moveTo.x,P.moveTo.y);ctx.scale(1,.4);ctx.strokeStyle='rgba(180,120,255,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,14+4*Math.sin(t*8),0,7);ctx.stroke();ctx.restore();}
  if(P.target){const m=P.target;ctx.save();ctx.translate(m.x,m.y);ctx.scale(1,.4);ctx.strokeStyle='rgba(255,77,109,.85)';ctx.lineWidth=3;ctx.setLineDash([10,7]);ctx.lineDashOffset=-t*30;
    ctx.beginPath();ctx.arc(0,0,40*m.look.scale+6,0,7);ctx.stroke();ctx.restore();}
  MOBG.drawGround(t);   // วงเตือนสกิลบอส
  VFX.draw(ctx,0,W,H);
  // เรียงความลึกตาม y
  for(const w of warpsHere())drawWarp(w,t);
  const deco=MAP.id==='town'?TOWN.lay.objects.map(o=>({y:o.y,f:()=>drawTownObj(o,t)})):[...(MAP.id==='dungeon'?[]:props.map(p=>({y:p.y,f:()=>drawProp(p,t)}))),...DGG.deco(t)];   // + ประตูมิติ/หินในดัน
  const list=[...deco,...ground.map(g=>({y:g.y-1,f:()=>drawGround(g,t)})),...mobs.map(m=>({y:m.y,f:()=>drawMob(m,t)})),...SHG.drawables(t),{y:P.y,f:()=>{if(!P.dead)RIG.draw(ctx,P);}}];
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  if(!P.dead){ctx.save();ctx.textAlign='center';ctx.font='800 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#000';const ny=P.y+22;
    ctx.strokeText(P.name,P.x,ny);ctx.fillStyle='#fff';ctx.fillText(P.name,P.x,ny);ctx.restore();}
  VFX.draw(ctx,1,W,H);
  SKG.drawWorld(t);MOBG.drawOver(t);
  drawNums(dt);
  VFX.draw(ctx,2,W,H);
  if(talkNear){const o=talkNear;ctx.save();ctx.textAlign='center';ctx.font='800 14px system-ui';const tx='[F] '+o.talk.split(':')[0],tw=ctx.measureText(tx).width+20,ty=o.y-o.h-10;
    ctx.fillStyle='rgba(20,16,32,.85)';ctx.fillRect(o.x-tw/2,ty-19,tw,27);ctx.fillStyle='#ffd166';ctx.fillText(tx,o.x,ty);ctx.restore();}
  // ฝุ่นประกายบรรยากาศ (เฉพาะแมพมืด)
  if(MAP.id!=='town'){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<40;i++){const h=((i*97.13)%1),px=((i*311.7)%MAP.w),py=(((i*173.3)+t*(12+h*20))%MAP.h);
    ctx.globalAlpha=.25+.35*Math.sin(t*2+i);ctx.fillStyle='#b48cff';ctx.beginPath();ctx.arc(px,MAP.h-py,1.2+h*1.5,0,7);ctx.fill();}ctx.restore();}
  ctx.setTransform(1,0,0,1,0,0);
  hud(t);}
function bar(x,y,w,h,v,col,label){ctx.fillStyle='#0008';ctx.beginPath();ctx.roundRect(x,y,w,h,h/2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,y,Math.max(h,w*v),h,h/2);ctx.fill();
  ctx.font='700 11px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(label,x+8,y+h-3);}
function hud(t){
  DGG.hud();   // แถบความคืบหน้าดัน
  // กรอบผู้เล่น
  ctx.fillStyle='rgba(20,14,32,.85)';ctx.strokeStyle='#3a2d55';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(14,14,280,74,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd166';ctx.font='900 15px system-ui';ctx.textAlign='left';ctx.fillText(`${P.name}  ·  ${DB.jobs[P.job].name}`,28,36);
  ctx.fillStyle='#cfc4ff';ctx.font='700 12px system-ui';ctx.textAlign='right';ctx.fillText(`Lv ${P.lv} / Job ${P.jobLv}`,280,36);
  bar(28,44,252,14,P.hp/P.hpMax,'#ff4d6d',`HP ${Math.round(P.hp)} / ${P.hpMax}`);
  bar(28,62,252,12,P.sp/P.spMax,'#5aa8ff',`SP ${Math.round(P.sp)} / ${P.spMax}`);
  const need=RO.baseExpNeed(DB,P.lv),jneed=RO.jobExpNeed(DB,P.jobLv);ctx.fillStyle='#0008';ctx.fillRect(0,H-9,W,9);ctx.fillStyle='#ffd166';ctx.fillRect(0,H-9,W*P.exp/need,5);ctx.fillStyle='#5aa8ff';ctx.fillRect(0,H-4,W*P.jobExp/jneed,4);
  // แถบสกิล
  const cnt=k=>{const s=RPG.findUsable(k);return s?s.qty:0;};
  const slots=[{k:'J',name:'ล็อกเป้า',col:'#cfd8e6',cd:0,max:1},...SKG.hudSlots(),
    {k:'Q',name:`ยา HP ×${cnt('hp')}`,col:'#ff4d6d',cd:0,max:1},{k:'E',name:`ยา SP ×${cnt('sp')}`,col:'#5aa8ff',cd:0,max:1}];
  const sw=64,gap=10,x0=W/2-(slots.length*(sw+gap)-gap)/2,y0=H-sw-26;
  slots.forEach((s,i)=>{const x=x0+i*(sw+gap);ctx.fillStyle='rgba(20,14,32,.9)';ctx.strokeStyle=s.col;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x,y0,sw,sw,12);ctx.fill();ctx.stroke();
    ctx.save();ctx.beginPath();ctx.roundRect(x,y0,sw,sw,12);ctx.clip();
    const g=ctx.createRadialGradient(x+sw/2,y0+sw/2,4,x+sw/2,y0+sw/2,sw*.6);g.addColorStop(0,s.col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=.45;ctx.fillStyle=g;ctx.fillRect(x,y0,sw,sw);ctx.globalAlpha=1;
    if(s.cd>0){ctx.fillStyle='rgba(0,0,0,.65)';ctx.beginPath();ctx.moveTo(x+sw/2,y0+sw/2);ctx.arc(x+sw/2,y0+sw/2,sw,-Math.PI/2,-Math.PI/2+Math.PI*2*(s.cd/s.max));ctx.fill();
      ctx.fillStyle='#fff';ctx.font='900 18px system-ui';ctx.textAlign='center';ctx.fillText(s.cd.toFixed(1),x+sw/2,y0+sw/2+6);}
    ctx.restore();
    ctx.fillStyle='#fff';ctx.font='900 12px system-ui';ctx.textAlign='left';ctx.fillText(s.k,x+6,y0+15);
    ctx.textAlign='center';ctx.font='700 10px system-ui';ctx.fillStyle='#ddd';ctx.fillText(s.name,x+sw/2,y0+sw+13);});
  // มินิแมพ
  const mw=190,mh=mw*MAP.h/MAP.w,mx=W-mw-16,my=16;ctx.fillStyle='rgba(20,14,32,.85)';ctx.strokeStyle='#3a2d55';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(mx-6,my-6,mw+12,mh+30,10);ctx.fill();ctx.stroke();
  ctx.drawImage(mapCv,mx,my,mw,mh);for(const m of mobs)if(!m.dead){ctx.fillStyle='#ff4d6d';ctx.fillRect(mx+m.x/MAP.w*mw-2,my+m.y/MAP.h*mh-2,4,4);}DGG.minimap(mx,my,mw,mh,t);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx+P.x/MAP.w*mw,my+P.y/MAP.h*mh,3.5,0,7);ctx.fill();
  ctx.fillStyle='#cfc4ff';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillText(`${DB.map.name} · กำจัดแล้ว ${kills}`,mx+mw/2,my+mh+16);
  // วิธีเล่น
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillText('WASD / คลิก = เดิน · F = คุย (กิลด์ = เปลี่ยนอาชีพ) · คลิกมอน = ตีอัตโนมัติ · J = ล็อกเป้าใกล้สุด · 1–6 = สกิล · K = สกิล · B = สมุดล่า · L = เควสต์ · F ที่ร้าน/โรงแรม = ซื้อขาย/คลัง · Q/E = ยา · C = สเตตัส · I = กระเป๋า · เดินทับของ = เก็บ',16,H-16);
  if(toast.t>0){ctx.globalAlpha=Math.min(1,toast.t*2);ctx.font='900 22px system-ui';ctx.textAlign='center';ctx.lineWidth=6;ctx.strokeStyle='#120a1c';ctx.strokeText(toast.txt,W/2,H*.3);ctx.fillStyle='#fff';ctx.fillText(toast.txt,W/2,H*.3);ctx.globalAlpha=1;}}

let last=performance.now();
function loop(ms){const dt=Math.min(.05,(ms-last)/1000);last=ms;const t=ms/1000;update(dt,t);render(dt,t);requestAnimationFrame(loop);}
RPG.load().then(db=>{DB=db;return loadTown(DB.maps.town.layout);}).then(()=>{makePlayer();enterMap('town');UI.init(DB,P,say);
  if(P.statPoints>0)say(`มีแต้มสเตตัส ${P.statPoints} — กด C เพื่อแจก`);requestAnimationFrame(loop);
  setInterval(()=>RPG.save(),10000);})
 .catch(e=>{ctx.fillStyle='#fff';ctx.font='16px system-ui';ctx.fillText('โหลดข้อมูลเกมไม่สำเร็จ: '+e.message+' (ต้องเปิดผ่าน http server)',20,40);console.error(e);});
