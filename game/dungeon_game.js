// =====================================================================
//  game/dungeon_game.js — ประตูมิติ (Rift): สุ่มเกิดในแมพทุ่ง/ป่า · สีบอกความโหด · เข้าแล้วเป็นดันสุ่ม (shared/rift.js + dungeon.js)
//  ในดัน: กำจัดมอนครบ % → ประตูบอสเปิด → โค่นบอส = จบ (รางวัลตามสี) · ออกก่อนได้ (กลับไปที่ประตูเดิม)
//  โหลดหลัง main.js
// =====================================================================
const DGG=(()=>{
let run=null;          // ดันที่อยู่ข้างใน {tier, T, id(template), plan, key, killed, boss, cleared, canvas, from}
const portals=[];      // ประตูในโลก {map, x, y, tier, until}
const nextAt={};       // map → เวลาเกม (SKG.now) ที่ประตูถัดไปจะเกิด
let near=null;         // ประตูที่ผู้เล่นยืนใกล้

// ---------- ภาพพื้นถ้ำ (สร้างจาก seed — รูปทรงง่าย รอชุดของจากสตูดิโอ) ----------
function buildCanvas(plan,tint){const c=document.createElement('canvas');c.width=plan.W;c.height=plan.H;const g=c.getContext('2d'),r=RNG.make(plan.seed^0x5f3759df);
  g.fillStyle='#120d18';g.fillRect(0,0,plan.W,plan.H);
  for(let i=0;i<plan.W*plan.H/30000;i++){const x=r()*plan.W,y=r()*plan.H,rr=80+r()*220,gr=g.createRadialGradient(x,y,0,x,y,rr);
    gr.addColorStop(0,r()<.5?tint+'40':'rgba(40,28,52,.5)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-rr,y-rr,rr*2,rr*2);}
  g.strokeStyle='rgba(150,110,230,.06)';g.lineWidth=2;
  for(let i=0;i<40;i++){let x=r()*plan.W,y=r()*plan.H,a=r()*6.28;g.beginPath();g.moveTo(x,y);for(let k=0;k<6;k++){x+=Math.cos(a)*50;y+=Math.sin(a)*30;a+=(r()-.5);g.lineTo(x,y);}g.stroke();}
  const v=g.createRadialGradient(plan.W/2,plan.H/2,Math.min(plan.W,plan.H)*.35,plan.W/2,plan.H/2,Math.max(plan.W,plan.H)*.65);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.85)');
  g.fillStyle=v;g.fillRect(0,0,plan.W,plan.H);return c;}

// ---------- ประตูในโลก ----------
function updatePortals(){const now=SKG.now(),R=DB.rifts.maps[MAP.id];
  for(let i=portals.length-1;i>=0;i--)if(portals[i].until<=now)portals.splice(i,1);
  near=null;if(!R||P.dead)return;
  if(nextAt[MAP.id]==null)nextAt[MAP.id]=now+R.firstDelay;
  const here=portals.filter(p=>p.map===MAP.id);
  if(now>=nextAt[MAP.id]){nextAt[MAP.id]=now+RIFT.nextDelay(DB,MAP.id,RPG.rng);
    if(here.length<R.max){const pos=RIFT.place(DB,{W:MAP.w,H:MAP.h,safe:DB.map.safe},P,here,RPG.rng);
      if(pos){const T=RIFT.rollTier(DB,RPG.rng);portals.push({map:MAP.id,...pos,tier:T.id,until:now+R.life});
        say(`ประตูมิติสี${T.name} (${T.rank}) ปรากฏขึ้นใน${DB.map.name}!`);}}}
  for(const p of here)if(Math.hypot(p.x-P.x,(p.y-P.y)*1.5)<70){near=p;break;}}
/** กด F ใกล้ประตู → เข้า (เลเวลต่ำกว่าแนะนำ = ถามยืนยัน) · คืน true ถ้าจัดการแล้ว */
function tryEnterNear(){if(!near)return false;const p=near,T=RIFT.tier(DB,p.tier);
  if(P.lv<T.recLv&&!confirm(`ประตูสี${T.name} (${T.rank}) แนะนำ Base Lv ${T.recLv}+ — คุณ Lv ${P.lv}\nอันตรายมาก เข้าไปไหม?`))return true;
  portals.splice(portals.indexOf(p),1);enter(p.tier,{map:MAP.id,x:p.x,y:p.y+60});return true;}

// ---------- เข้า / ออก ----------
function enter(tierId,from){const T=RIFT.tier(DB,tierId),seed=Math.floor(RPG.rng()*4294967295)>>>0,plan=RIFT.plan(DB,tierId,seed);
  run={tier:tierId,T,id:T.template,plan,key:`rift:${tierId}:${seed}:${Date.now()}`,killed:0,boss:null,cleared:false,canvas:buildCanvas(plan,T.color),from};
  const back=from||{map:'town'};
  DB.maps.dungeon={name:`ประตูมิติสี${T.name} (${T.rank})`,spawns:[],warps:[{to:back.map,arrive:from&&{x:from.x,y:from.y},label:'ออกจากประตู',x:plan.spawn.x-60,y:plan.spawn.y+70,r:42}]};
  enterMap('dungeon',plan.spawn);say(`ประตูสี${T.name} — กำจัดมอน ${DB.dungeons[T.template].bossUnlockPct}% เพื่อเปิดประตูบอส`);}
/** main.js enterMap เรียก: ตั้งขนาด/ภาพพื้น */
function mapInfo(){return run&&{W:run.plan.W,H:run.plan.H,canvas:run.canvas,spawn:run.plan.spawn};}
/** main.js enterMap เรียกเมื่อไปแมพอื่น */
function onLeave(){if(run&&!run.cleared)say('ออกจากประตูมิติ — ยังไม่ได้รางวัลจบดัน');run=null;}

function spawnAt(id,x,y,patch){spawnMob(id,0);const m=mobs[mobs.length-1];Object.assign(m,{x,y,hx:x,hy:y,dungeon:true},patch||{});return m;}
/** ทำให้มอนแรงขึ้นตามสีประตู (+ ดุร้าย) */
function scale(m,k,{hpMult,atkPct,expMult,name,edge,size}){m.k={...k,name,exp:Math.round(k.exp*expMult),jobExp:Math.round(k.jobExp*expMult)};m.name=name;
  m.hp=m.hpMax=Math.round(k.hp*hpMult);m.phaseMods={atkPct};m.shadowMult=run.T.shadowMult;if(edge)m.look={...m.look,scale:m.look.scale*(size||1),edge};}
function populate(){if(!run)return;const E=DB.dungeons[run.id].elite,T=run.T;
  for(const d of run.plan.mobs){const k=DB.mobs[d.mob],m=spawnAt(d.mob,d.x,d.y);
    if(d.elite)scale(m,k,{hpMult:T.hpMult*E.hpMult,atkPct:T.atkPct+E.atkPct,expMult:T.expMult*E.expMult,name:'ดุร้าย '+k.name,edge:'#ff4d4d',size:1.2});
    else scale(m,k,{hpMult:T.hpMult,atkPct:T.atkPct,expMult:T.expMult,name:k.name});
    m.elite=d.elite;}}
function spawnBoss(){const B=DB.dungeons[run.id].boss,T=run.T,k=DB.mobs[B.mob],b=run.plan.boss,m=spawnAt(B.mob,b.x,b.y,{dBoss:true});
  scale(m,k,{hpMult:B.hpMult*T.bossHpMult*T.hpMult,atkPct:T.atkPct,expMult:T.expMult,name:B.name,edge:T.color,size:1.1});run.boss=m;
  say(`ประตูบอสเปิดแล้ว! ${B.name} ตื่นขึ้น`);shake=Math.max(shake,10);}

/** main.js killMob เรียก */
function onKill(m){if(!run||!m.dungeon)return;
  if(m.dBoss){clear();return;}
  run.killed++;if(!run.boss&&DUNGEON.progress(DB,run.plan,run.killed).bossOpen)spawnBoss();}
function clear(){run.cleared=true;const rw=RIFT.reward(DB,run.tier,RPG.rng),r=RPG.dungeonClaim(run.key,rw,say);
  const b=run.plan.boss,w=DB.maps.dungeon.warps[0];DB.maps.dungeon.warps.push({...w,label:'กลับ',x:b.x,y:b.y+90,r:48});
  say(r?`จบดันแล้ว! แต่รับรางวัลไม่ได้: ${r}`:`ปิดประตูสี${run.T.name}! ได้ ${rw.exp} EXP · ${rw.zeny} z${rw.items.length?' + '+rw.items.map(x=>DB.items[x.id].name+' ×'+x.qty).join(', '):''}`);}

// ---------- ชน / วาด ----------
function blocked(x,y){if(!run)return false;return run.plan.obstacles.some(o=>Math.hypot(o.x-x,(o.y-y)*1.3)<o.r+12);}
function drawPortal(p,t){const T=RIFT.tier(DB,p.tier),left=p.until-SKG.now();if(left<30&&Math.sin(t*14)>.3)return;
  ctx.save();ctx.translate(p.x,p.y);
  ctx.save();ctx.scale(1,.4);const gl=ctx.createRadialGradient(0,0,10,0,0,90);gl.addColorStop(0,T.color+'aa');gl.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(0,0,90,0,7);ctx.fill();ctx.restore();
  ctx.translate(0,-70);ctx.scale(.62,1);
  for(let i=0;i<4;i++){ctx.save();ctx.rotate(t*(1.2+i*.4)*(i%2?-1:1));ctx.strokeStyle=T.color;ctx.globalAlpha=.9-i*.18;ctx.lineWidth=8-i*1.5;ctx.shadowColor=T.color;ctx.shadowBlur=18;
    ctx.beginPath();ctx.ellipse(0,0,62-i*10,62-i*10,0,i,i+4.6);ctx.stroke();ctx.restore();}
  const core=ctx.createRadialGradient(0,0,4,0,0,50);core.addColorStop(0,'#fff');core.addColorStop(.3,T.color);core.addColorStop(1,'rgba(10,0,20,.9)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,46,0,7);ctx.fill();
  ctx.restore();
  ctx.save();ctx.textAlign='center';ctx.font='900 14px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#000';const lab=`ประตูสี${T.name} (${T.rank}) · แนะนำ Lv ${T.recLv}+`;
  ctx.strokeText(lab,p.x,p.y-150);ctx.fillStyle=T.color;ctx.fillText(lab,p.x,p.y-150);
  ctx.font='700 11px system-ui';const tl=`ปิดใน ${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`;ctx.strokeText(tl,p.x,p.y-134);ctx.fillStyle='#fff';ctx.fillText(tl,p.x,p.y-134);
  if(near===p){ctx.font='800 14px system-ui';const fx='[F] เข้าประตู';ctx.strokeText(fx,p.x,p.y+34);ctx.fillStyle='#ffd166';ctx.fillText(fx,p.x,p.y+34);}
  ctx.restore();}
/** ของที่วาดเรียงความลึก (main.js render เรียก) */
function deco(t){const out=portals.filter(p=>p.map===MAP.id).map(p=>({y:p.y,f:()=>drawPortal(p,t)}));
  if(MAP.id!=='dungeon'||!run)return out;
  run.plan.obstacles.forEach((o,i)=>out.push({y:o.y,f:()=>drawProp({x:o.x,y:o.y,kind:o.kind==='rock'?'stump':'crystal',s:o.r/40,seed:i*7.3},t)}));
  if(!run.boss){const b=run.plan.boss;out.push({y:b.y,f:()=>{ctx.save();ctx.translate(b.x,b.y);ctx.scale(1,.45);const p=.6+.4*Math.sin(t*3);
    ctx.strokeStyle=`rgba(180,90,255,${.5+.3*p})`;ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,140,0,7);ctx.stroke();ctx.fillStyle=`rgba(90,30,140,${.15+.1*p})`;ctx.fill();ctx.restore();
    ctx.save();ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#000';ctx.strokeText('ประตูบอส (ปิด)',b.x,b.y-30);ctx.fillStyle='#c9a6ff';ctx.fillText('ประตูบอส (ปิด)',b.x,b.y-30);ctx.restore();}});}
  return out;}
/** จุดประตูบนมินิแมพ */
function minimap(mx,my,mw,mh,t){for(const p of portals){if(p.map!==MAP.id)continue;const T=RIFT.tier(DB,p.tier);
  ctx.fillStyle=T.color;ctx.beginPath();ctx.arc(mx+p.x/MAP.w*mw,my+p.y/MAP.h*mh,3.5+1.5*Math.sin(t*5),0,7);ctx.fill();}}
/** แถบความคืบหน้าบนจอ (main.js hud เรียก) */
function hud(){if(!run||MAP.id!=='dungeon')return;const pr=DUNGEON.progress(DB,run.plan,run.killed),D=DB.dungeons[run.id],nm=`ประตูสี${run.T.name} (${run.T.rank})`;
  const txt=run.cleared?`${nm} · จบแล้ว — เดินเข้าวาร์ป "กลับ"`:run.boss?`${nm} · บอส: ${run.boss.name} HP ${Math.max(0,Math.round(run.boss.hp/run.boss.hpMax*100))}%`
    :`${nm} · กำจัดแล้ว ${pr.killed}/${pr.total} (${pr.pct}%) · ประตูบอสเปิดที่ ${D.bossUnlockPct}%`;
  ctx.save();ctx.font='800 14px system-ui';ctx.textAlign='center';const w=ctx.measureText(txt).width+30;
  ctx.fillStyle='rgba(20,14,32,.85)';ctx.strokeStyle=run.T.color;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(W/2-w/2,14,w,30,10);ctx.fill();ctx.stroke();
  ctx.fillStyle=run.cleared?'#7bd88f':'#ffd166';ctx.fillText(txt,W/2,34);ctx.restore();}

return {update:updatePortals,tryEnterNear,enter,mapInfo,onLeave,populate,onKill,blocked,deco,minimap,hud,portals,get run(){return run;}};
})();
