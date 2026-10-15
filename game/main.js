// =====================================================================
//  Re-Ask — ต้นแบบ MMORPG (single-player vertical slice)
//  แมพรากต้นไม้มืด · เดิน (WASD / คลิก) · ฟัน (J คอมโบ 3) · สกิล (1 ฝูงอสูรเงา) · มอนสเตอร์ · HUD
// =====================================================================
const cv=document.getElementById('game'), ctx=cv.getContext('2d');
let W=0,H=0; function resize(){W=cv.width=innerWidth;H=cv.height=innerHeight;} resize(); addEventListener('resize',resize);
const rnd=(()=>{let s=23;return()=>{s=(s*16807)%2147483647;return s/2147483647;};})();   // seed เดียว = แมพเดิมทุกครั้ง
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

// ---------------- แมพ (วาดครั้งเดียวเก็บเป็นภาพ) ----------------
const MAP={w:2600,h:1700};
const mapCv=document.createElement('canvas');mapCv.width=MAP.w;mapCv.height=MAP.h;
(function buildMap(){const g=mapCv.getContext('2d');
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

// ---------------- ผู้เล่น ----------------
const outfit=RIG.loadOutfit('data/characters/dark_knight/',{helmet:true,glows:['torso','shoulder','arm_lower','leg_upper']});
// สเตตัส/เลเวล/กระเป๋ามาจาก RPG.bind (data/db + เซฟ) ตอนเริ่มเกม
let P=null, DB=null;
function makePlayer(){P=RIG.makeChar({x:MAP.w/2,y:MAP.h/2,scale:.95,outfit,speed:190,combo:0,lastAtkEnd:-9,queued:false,moveTo:null,cd:{},dead:false});
  RPG.bind(P);P.onEvent=onPlayerEvent;}
RIG.loadClips('data/clips.json');   // ท่าที่ส่งออกจาก Pose Studio ทับค่าเริ่มต้น

// ---------------- มอนสเตอร์ ----------------
// ชนิด/จำนวน/เวลาเกิดใหม่มาจาก data/db/maps/dark_root.json · ค่าพลังมาจาก data/db/mobs.json
const mobs=[];
function spawnMob(id,respawn){const k=DB.mobs[id],safe=DB.map.safe;let x,y;
  do{x=150+Math.random()*(MAP.w-300);y=150+Math.random()*(MAP.h-300);}while(Math.hypot(x-P.x,y-P.y)<420||Math.hypot(x-safe.x,y-safe.y)<safe.r);
  mobs.push({id,k,prof:RO.mobProfile(k),respawn,look:k.look,x,y,hx:x,hy:y,hp:k.hp,hpMax:k.hp,name:k.name,lv:k.lv,
    state:'idle',tw:0,atkCd:0,hit:0,stun:0,dir:1,dead:0,seed:Math.random()*9,vx:0,vy:0});}
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
  const d=r.dmg;m.hp-=d;m.hit=.08;m.stun=Math.max(m.stun,stun);m.state='chase';
  if(kb){const a=Math.atan2(m.y-P.y,m.x-P.x);m.vx+=Math.cos(a)*kb;m.vy+=Math.sin(a)*kb*.5;}
  if(showNum)num(m.x,m.y-110,r.eleMod===0?'0':d,{crit:r.crit,col:r.crit?'#ff9a3a':r.eleMod>1?'#7fffd4':r.eleMod<1?'#9fb3c8':'#ffd34a'});
  if(m.hp<=0)killMob(m);}
function killMob(m){m.hp=0;m.dead=.001;kills++;
  RPG.gainExp(m.k.exp,m.k.jobExp,say);
  num(m.x,m.y-140,`+${m.k.exp} EXP`,{col:'#ffd166',size:15});
  RPG.rollDrops(m.k).forEach((id,i)=>dropItem(id,m.x,m.y,i));
  setTimeout(()=>{mobs.splice(mobs.indexOf(m),1);spawnMob(m.id,m.respawn);},m.respawn*1000);}
const ATK=()=>DB.skills.attack;
function onPlayerEvent(evt,clip,ch){
  if(evt==='hit'){const ci=Math.max(0,ATK().clips.indexOf(clip.name)),big=ci===2;let any=false;
    for(const m of mobs){if(m.dead)continue;const dx=(m.x-P.x)*P.dir,dy=Math.abs(m.y-P.y);
      if(dx>-25&&dx<ATK().range&&dy<70+20*m.look.scale){any=true;const r=RO.physical(DB,RPG.attacker(),m.prof,{pct:ATK().comboPct[ci]});
        damageMob(m,r,{kb:r.miss?0:ATK().knockback[ci]});}}
    if(any){P.hitstop=big?.12:.07;shake=Math.max(shake,big?12:5);P.flash=big?1.2:.7;}}
  if(evt==='swarm'&&P.skillTarget){const m=P.skillTarget,sk=DB.skills.swarm,lv=P.skills.swarm||1;m.stun=sk.stun;
    VFX.play('swarm',{x:P.x,y:P.y,tx:m.x,ty:m.y-50});
    // ดาเมจตามจังหวะที่อสูรแต่ละตัวงับ (ตัวเลขจริงจากสูตร — ตัวเลขใน VFX เป็นภาพประกอบ)
    // ตัวเลขทั้งหมดมาจากระบบดาเมจของเกม (VFX เป็นภาพล้วน) · งับสุดท้ายแสดงใหญ่ · จบแล้วโชว์ TOTAL
    let total=0;const last=sk.hits.length-1;
    sk.hits.forEach((h,i)=>setTimeout(()=>{const r=RO.physical(DB,RPG.attacker(),m.prof,{pct:h.pct+h.perLv*(lv-1),element:sk.element,ignoreFlee:sk.ignoreFlee});
      if(i===last)r.crit=true;total+=r.dmg||0;damageMob(m,r,{stun:0});
      if(i===last&&total>0)setTimeout(()=>{num(m.x,m.y-170,'TOTAL '+total,{col:'#ffb347',size:30,crit:true});shake=Math.max(shake,6);},350);},h.t*1000));}
};
function attack(){if(P.dead)return;if(P.act){P.queued=true;return;}
  if(P.t-P.lastAtkEnd>.6)P.combo=0;const names=ATK().clips;
  // หันหาศัตรูที่ใกล้ที่สุดในระยะ
  let best=null,bd=170;for(const m of mobs){if(m.dead)continue;const d=dist(m,P);if(d<bd){bd=d;best=m;}}if(best)P.dir=best.x<P.x?-1:1;
  RIG.play(P,names[P.combo]);P.combo=(P.combo+1)%3;P.moveTo=null;}
function castSwarm(){const sk=DB.skills.swarm,lv=P.skills.swarm||0,spc=sk.sp[Math.max(0,lv-1)];
  if(P.dead||P.act)return;if(!lv)return say('ยังไม่ได้เรียนสกิลนี้');if((P.cd.swarm||0)>0)return say('สกิลยังไม่พร้อม');if(P.sp<spc)return say('SP ไม่พอ');
  let best=null,bd=sk.range;for(const m of mobs){if(m.dead)continue;const d=dist(m,P);if(d<bd){bd=d;best=m;}}
  if(!best)return say('ไม่มีเป้าหมายในระยะ');
  P.skillTarget=best;P.dir=best.x<P.x?-1:1;P.sp-=spc;P.cd.swarm=sk.cd;P.moveTo=null;RIG.play(P,sk.clip);}
function quaff(kind){if(P.dead)return;const i=RPG.findUsable(kind);if(i<0)return say(kind==='hp'?'ไม่มียาฟื้น HP':'ไม่มียาฟื้น SP');
  const r=RPG.use(i);if(typeof r==='string')return say(r);
  if(r.hp)num(P.x,P.y-130,'+'+r.hp,{col:'#7bd88f',size:20});if(r.sp)num(P.x,P.y-130,'+'+r.sp,{col:'#5aa8ff',size:20});}

// ---------------- ของบนพื้น (ดรอป) ----------------
const ground=[];
function dropItem(id,x,y,i){const a=i*2.1+Math.random();ground.push({id,x:x+Math.cos(a)*(20+i*14),y:y+Math.sin(a)*(10+i*8),t:0,life:60});}
function tryPickup(){for(let i=ground.length-1;i>=0;i--){const g=ground[i];if(g.t<.4||Math.hypot(g.x-P.x,g.y-P.y)>DB.rules.pickupRange)continue;
  const err=RPG.addItem(g.id);if(err){if(!g.warned){say(err);g.warned=1;}continue;}
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
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;if(!P||e.repeat&&k!=='j')return;
  if(k==='j')attack(); if(k==='1')castSwarm(); if(k==='u')P.visor=!P.visor; if(k==='q')quaff('hp'); if(k==='e')quaff('sp');});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let cam={x:MAP.w/2,y:MAP.h/2};const mouse={wx:0,wy:0};
cv.addEventListener('mousemove',e=>{mouse.wx=e.clientX-W/2+cam.x;mouse.wy=e.clientY-H/2+cam.y;});
cv.addEventListener('mousedown',e=>{if(!P)return;const wx=e.clientX-W/2+cam.x,wy=e.clientY-H/2+cam.y;
  for(const g of ground){if(Math.hypot(g.x-wx,g.y-10-wy)<22){P.moveTo={x:g.x,y:g.y};return;}}
  for(const m of mobs){if(!m.dead&&Math.hypot(m.x-wx,m.y-40-wy)<50){P.moveTo={x:m.x-P.dir*80,y:m.y,atk:m};return;}}
  P.moveTo={x:wx,y:wy};});

// ---------------- อัปเดต ----------------
function update(dt,t){
  for(const k in P.cd)P.cd[k]=Math.max(0,P.cd[k]-dt);
  if(!P.dead){P.sp=Math.min(P.spMax,P.sp+dt*P.d.spRegen*.3);P.hp=Math.min(P.hpMax,P.hp+dt*P.d.hpRegen*.3);}
  let mx=0,my=0;
  if(!P.act&&!P.dead){mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    if(mx||my)P.moveTo=null;
    else if(P.moveTo){const dx=P.moveTo.x-P.x,dy=P.moveTo.y-P.y,d=Math.hypot(dx,dy);
      if(d<8){if(P.moveTo.atk&&!P.moveTo.atk.dead)attack();P.moveTo=null;}else{mx=dx/d;my=dy/d;}}}
  const moving=!!(mx||my);
  if(moving){const l=Math.hypot(mx,my);P.x=clamp(P.x+mx/l*P.speed*dt,60,MAP.w-60);P.y=clamp(P.y+my/l*P.speed*.8*dt,90,MAP.h-40);if(mx)P.dir=mx>0?1:-1;}
  // ASPD เร่งท่าโจมตีปกติ (ท่าสกิลเล่นความเร็วเดิม)
  const aspdMul=P.act&&ATK().clips.includes(P.act.clip.name)?Math.min(2.5,P.d.attacksPerSec):1;
  const wasActing=!!P.act;RIG.update(P,dt*aspdMul,moving);
  for(const g of ground)g.t+=dt;for(let i=ground.length-1;i>=0;i--)if(ground[i].t>ground[i].life)ground.splice(i,1);
  if(!P.dead)tryPickup();
  if(wasActing&&!P.act){P.lastAtkEnd=P.t;if(P.queued){P.queued=false;attack();}}
  // มอนสเตอร์
  for(const m of mobs){
    if(m.dead){m.dead+=dt;continue;}
    m.hit=Math.max(0,m.hit-dt);m.atkCd=Math.max(0,m.atkCd-dt);
    m.x+=m.vx*dt;m.y+=m.vy*dt;m.vx*=.86;m.vy*=.86;
    if(m.stun>0){m.stun-=dt;continue;}
    const d=dist(m,P);
    if(m.state==='idle'){m.tw-=dt;if(m.tw<=0){m.tw=2+Math.random()*3;m.tx=m.hx+(Math.random()-.5)*240;m.ty=m.hy+(Math.random()-.5)*160;}
      const dx=m.tx-m.x,dy=m.ty-m.y,l=Math.hypot(dx,dy);if(l>4){m.x+=dx/l*45*dt;m.y+=dy/l*45*dt;m.dir=dx>0?1:-1;}
      if(m.k.aggressive&&d<260&&!P.dead)m.state='chase';}
    else{ if(d>520||P.dead){m.state='idle';continue;}
      const reach=50+20*m.look.scale;
      if(d>reach){const dx=P.x-m.x,dy=P.y-m.y;m.x+=dx/d*m.k.speed*dt;m.y+=dy/d*m.k.speed*dt;m.dir=dx>0?1:-1;}
      else if(m.atkCd<=0){m.atkCd=m.k.aspd;const r=RO.physical(DB,m.prof,RPG.defender());
        if(r.miss)num(P.x,P.y-130,r.lucky?'LUCKY':'MISS',{col:'#9fb3c8',size:16});
        else{P.hp-=r.dmg;num(P.x,P.y-130,r.dmg,{col:'#ff5a6a',size:20});shake=Math.max(shake,3);}
        if(P.hp<=0){P.hp=0;P.dead=true;P.act=null;RPG.deathPenalty();say('คุณถูกเงากลืนกิน... กด R เพื่อเกิดใหม่');}}}}
  if(P.dead&&keys.r){P.dead=false;P.hp=P.hpMax;P.sp=P.spMax;P.x=MAP.w/2;P.y=MAP.h/2;for(const m of mobs)m.state='idle';}
  if(toast.t>0)toast.t-=dt;
  VFX.tick(dt);if(VFX.shakeReq){shake=Math.max(shake,VFX.shakeReq);VFX.shakeReq=0;}
  cam.x+=(P.x-cam.x)*Math.min(1,dt*6);cam.y+=(P.y-60-cam.y)*Math.min(1,dt*6);
  cam.x=clamp(cam.x,W/2,MAP.w-W/2);cam.y=clamp(cam.y,H/2,MAP.h-H/2);if(MAP.w<W)cam.x=MAP.w/2;if(MAP.h<H)cam.y=MAP.h/2;}

// ---------------- วาด ----------------
function render(dt,t){
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0b0912';ctx.fillRect(0,0,W,H);
  const sx=shake>.3?(Math.random()-.5)*shake:0,sy=shake>.3?(Math.random()-.5)*shake:0;shake*=.85;
  ctx.setTransform(1,0,0,1,Math.round(W/2-cam.x+sx),Math.round(H/2-cam.y+sy));
  ctx.drawImage(mapCv,0,0);
  if(P.moveTo){ctx.save();ctx.translate(P.moveTo.x,P.moveTo.y);ctx.scale(1,.4);ctx.strokeStyle='rgba(180,120,255,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,14+4*Math.sin(t*8),0,7);ctx.stroke();ctx.restore();}
  VFX.draw(ctx,0,W,H);
  // เรียงความลึกตาม y
  const list=[...props.map(p=>({y:p.y,f:()=>drawProp(p,t)})),...ground.map(g=>({y:g.y-1,f:()=>drawGround(g,t)})),...mobs.map(m=>({y:m.y,f:()=>drawMob(m,t)})),{y:P.y,f:()=>{if(!P.dead)RIG.draw(ctx,P);}}];
  list.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
  if(!P.dead){ctx.save();ctx.textAlign='center';ctx.font='800 13px system-ui';ctx.lineWidth=3;ctx.strokeStyle='#000';const ny=P.y+22;
    ctx.strokeText(P.name,P.x,ny);ctx.fillStyle='#fff';ctx.fillText(P.name,P.x,ny);ctx.restore();}
  VFX.draw(ctx,1,W,H);
  drawNums(dt);
  VFX.draw(ctx,2,W,H);
  // ฝุ่นประกายบรรยากาศ
  ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<40;i++){const h=((i*97.13)%1),px=((i*311.7)%MAP.w),py=(((i*173.3)+t*(12+h*20))%MAP.h);
    ctx.globalAlpha=.25+.35*Math.sin(t*2+i);ctx.fillStyle='#b48cff';ctx.beginPath();ctx.arc(px,MAP.h-py,1.2+h*1.5,0,7);ctx.fill();}ctx.restore();
  ctx.setTransform(1,0,0,1,0,0);
  hud(t);}
function bar(x,y,w,h,v,col,label){ctx.fillStyle='#0008';ctx.beginPath();ctx.roundRect(x,y,w,h,h/2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.roundRect(x,y,Math.max(h,w*v),h,h/2);ctx.fill();
  ctx.font='700 11px system-ui';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(label,x+8,y+h-3);}
function hud(t){
  // กรอบผู้เล่น
  ctx.fillStyle='rgba(20,14,32,.85)';ctx.strokeStyle='#3a2d55';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(14,14,280,74,12);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffd166';ctx.font='900 15px system-ui';ctx.textAlign='left';ctx.fillText(`${P.name}  ·  ${DB.jobs[P.job].name}`,28,36);
  ctx.fillStyle='#cfc4ff';ctx.font='700 12px system-ui';ctx.textAlign='right';ctx.fillText(`Lv ${P.lv} / Job ${P.jobLv}`,280,36);
  bar(28,44,252,14,P.hp/P.hpMax,'#ff4d6d',`HP ${Math.round(P.hp)} / ${P.hpMax}`);
  bar(28,62,252,12,P.sp/P.spMax,'#5aa8ff',`SP ${Math.round(P.sp)} / ${P.spMax}`);
  const need=RO.baseExpNeed(DB,P.lv),jneed=RO.jobExpNeed(DB,P.jobLv);ctx.fillStyle='#0008';ctx.fillRect(0,H-9,W,9);ctx.fillStyle='#ffd166';ctx.fillRect(0,H-9,W*P.exp/need,5);ctx.fillStyle='#5aa8ff';ctx.fillRect(0,H-4,W*P.jobExp/jneed,4);
  // แถบสกิล
  const cnt=k=>{const i=RPG.findUsable(k);return i<0?0:P.bag[i].qty;},sw_=DB.skills.swarm;
  const slots=[{k:'J',name:'ฟัน',col:'#cfd8e6',cd:0,max:1},{k:'1',name:`${sw_.name} Lv${P.skills.swarm||0}`,col:'#b45cff',cd:P.cd.swarm||0,max:sw_.cd},
    {k:'Q',name:`ยา HP ×${cnt('hp')}`,col:'#ff4d6d',cd:0,max:1},{k:'E',name:`ยา SP ×${cnt('sp')}`,col:'#5aa8ff',cd:0,max:1},{k:'U',name:'หน้ากาก',col:'#9a7cff',cd:0,max:1}];
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
  ctx.drawImage(mapCv,mx,my,mw,mh);for(const m of mobs)if(!m.dead){ctx.fillStyle='#ff4d6d';ctx.fillRect(mx+m.x/MAP.w*mw-2,my+m.y/MAP.h*mh-2,4,4);}
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(mx+P.x/MAP.w*mw,my+P.y/MAP.h*mh,3.5,0,7);ctx.fill();
  ctx.fillStyle='#cfc4ff';ctx.font='700 11px system-ui';ctx.textAlign='center';ctx.fillText(`รากต้นไม้มืด · กำจัดแล้ว ${kills}`,mx+mw/2,my+mh+16);
  // วิธีเล่น
  ctx.fillStyle='rgba(255,255,255,.55)';ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillText('WASD / คลิก = เดิน · J = ฟัน · 1 = ฝูงอสูรเงา · Q/E = ยา · C = สเตตัส · I = กระเป๋า · เดินทับของ = เก็บ',16,H-16);
  if(toast.t>0){ctx.globalAlpha=Math.min(1,toast.t*2);ctx.font='900 22px system-ui';ctx.textAlign='center';ctx.lineWidth=6;ctx.strokeStyle='#120a1c';ctx.strokeText(toast.txt,W/2,H*.3);ctx.fillStyle='#fff';ctx.fillText(toast.txt,W/2,H*.3);ctx.globalAlpha=1;}}

let last=performance.now();
function loop(ms){const dt=Math.min(.05,(ms-last)/1000);last=ms;const t=ms/1000;update(dt,t);render(dt,t);requestAnimationFrame(loop);}
RPG.load().then(db=>{DB=db;makePlayer();cam.x=P.x;cam.y=P.y;spawnAll();UI.init(DB,P,say);
  if(P.statPoints>0)say(`มีแต้มสเตตัส ${P.statPoints} — กด C เพื่อแจก`);requestAnimationFrame(loop);
  setInterval(()=>RPG.save(),10000);})
 .catch(e=>{ctx.fillStyle='#fff';ctx.font='16px system-ui';ctx.fillText('โหลดข้อมูลเกมไม่สำเร็จ: '+e.message+' (ต้องเปิดผ่าน http server)',20,40);console.error(e);});
