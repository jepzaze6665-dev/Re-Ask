// =====================================================================
//  game/mob_game.js — มอนในสนาม: AI (shared/ai.js) · ง้างก่อนตี (หลบได้) · เรียกพวก · กลับจุดเกิด · บอสเฟส + วงเตือนบนพื้น
//  โหลดหลัง main.js · main.js เรียก MOBG.update(m,dt) ทุกตัวที่ยังไม่ตาย และ MOBG.tick(dt) ทุกเฟรม
// =====================================================================
const MOBG=(()=>{
const tele=[];             // วงเตือนสกิลบอส {m, sid, x, y, r, t, total}
const reachOf=m=>50+20*m.look.scale;

/** โดนตี → ตื่นตัว + เรียกพวกชนิดเดียวกันรอบๆ (ถ้า ai.assist) */
function alert(m){m.alert=4;if(m.state==='idle'||m.state==='return')m.state='chase';
  const A=AI.cfg(DB,m.k);if(!A.assist)return;
  for(const o of mobs)if(o!==m&&!o.dead&&o.id===m.id&&dist(o,m)<A.assistRange&&o.state==='idle'){o.alert=4;o.state='chase';}}

/** มอนตีผู้เล่น (ใช้ทั้งตีปกติและสกิลบอส) */
function hitPlayer(m,r,label){
  if(r.miss){num(P.x,P.y-130,r.lucky?'LUCKY':'MISS',{col:'#9fb3c8',size:16});return;}
  P.hp-=r.dmg;num(P.x,P.y-130,r.dmg,{col:'#ff5a6a',size:label?24:20});shake=Math.max(shake,label?10:3);SKG.onPlayerHit();SHG.onPlayerDamaged(m,r.dmg);
  if(P.hp<=0){P.hp=0;P.dead=true;P.act=null;P.casting=null;RPG.deathPenalty();say('คุณถูกเงากลืนกิน... กด R เพื่อเกิดใหม่');}}

function update(m,dt){
  m.hit=Math.max(0,m.hit-dt);m.atkCd=Math.max(0,m.atkCd-dt);m.alert=Math.max(0,(m.alert||0)-dt);
  m.x+=m.vx*dt;m.y+=m.vy*dt;m.vx*=.86;m.vy*=.86;
  if(m.stun>0){m.stun-=dt;if(m.state==='windup')m.state='chase';return;}
  const mf=SKG.mobFlags(m);if(mf.cantAct){if(m.state==='windup')m.state='chase';return;}
  if(m.casting)return;                                         // บอสกำลังร่าย (วงเตือน)
  const tg=P.dead||MAP.id==='town'?null:(SHG.mobTarget(m)||P);
  const d=tg?dist(m,tg):Infinity,A=AI.cfg(DB,m.k),reach=reachOf(m),dHome=Math.hypot(m.x-m.hx,m.y-m.hy);
  // บอส: เปลี่ยนเฟสตาม HP · ใช้สกิลเมื่อพร้อม
  if(m.k.phases&&tg&&(m.state==='chase'||m.state==='windup')){
    const ph=AI.phaseOf(m.k,m.hp/m.hpMax*100);
    if(ph!==m.phase){m.phase=ph;const P_=m.k.phases[ph];m.phaseMods=P_.mods||null;if(P_.say&&ph>0){say(P_.say);shake=Math.max(shake,10);}}
    m.bcds=m.bcds||{};const sid=AI.pickSkill(m.k,ph,m.bcds,SKG.now());
    if(sid&&d<520){startSkill(m,sid,tg);return;}}
  const act=AI.step(DB,m.k,m,{dt,dTarget:d,dHome,reach,atkReady:m.atkCd<=0,hpPct:m.hp/m.hpMax*100,alerted:m.alert>0||mf.aggro});
  if(act.windupStart)m.wuTotal=A.windup;
  if(act.arrivedHome)m.hp=Math.min(m.hpMax,m.hp+m.hpMax*A.returnHealPct/100);
  const go=(tx,ty,sp)=>{const dx=tx-m.x,dy=ty-m.y,l=Math.hypot(dx,dy);if(l>4&&!mf.cantMove){const s=Math.min(l,sp*dt);m.x+=dx/l*s;m.y+=dy/l*s;m.dir=dx>0?1:-1;}};
  if(act.move==='wander'){m.tw-=dt;if(m.tw<=0){m.tw=2+Math.random()*3;m.tx=m.hx+(Math.random()-.5)*240;m.ty=m.hy+(Math.random()-.5)*160;}go(m.tx,m.ty,A.wanderSpeed);}
  else if(act.move==='target'&&tg)go(tg.x,tg.y,m.k.speed);
  else if(act.move==='home')go(m.hx,m.hy,m.k.speed*1.3);
  else if(act.move==='away'&&tg)go(m.x+(m.x-tg.x),m.y+(m.y-tg.y),m.k.speed*1.1);
  if(m.state==='windup'&&tg)m.dir=tg.x>m.x?1:-1;
  if(act.attack){m.atkCd=m.k.aspd;if(!tg)return;
    if(d>reach*A.dodgeSlack){if(tg===P)num(P.x,P.y-130,'หลบ!',{col:'#7fffd4',size:16});return;}   // ถอยออกตอนมันง้าง = หลบได้
    const r=RO.physical(DB,SKG.mobProfileNow(m),tg===P?RPG.defender():{def:tg.lv,flee:tg.lv,element:'shadow',size:'medium'},{rng:RPG.rng});
    if(tg===P)hitPlayer(m,r);else SHG.hitSummon(r);}}

// ---------- สกิลบอส ----------
function startSkill(m,sid,tg){const s=m.k.skills[sid];m.bcds[sid]=SKG.now()+s.cd;m.casting=sid;m.state='chase';
  const at=s.at==='self'?m:tg;tele.push({m,sid,s,x:at.x,y:at.y,r:s.radius||0,t:0,total:s.telegraph});
  num(m.x,m.y-60-70*m.look.scale,s.name+'!',{col:'#ff9a3a',size:18});}
function resolve(T){const m=T.m,s=T.s;m.casting=null;if(m.dead)return;
  if(T.sid==='summon'||s.mob){for(let i=0;i<s.count;i++){spawnMob(s.mob,0);const o=mobs[mobs.length-1];const a=i/s.count*6.28;
      o.x=o.hx=m.x+Math.cos(a)*120;o.y=o.hy=m.y+Math.sin(a)*70;o.minion=true;o.state='chase';o.alert=4;}
    say('ต้นอ่อนเงางอกขึ้นมา!');return;}
  shake=Math.max(shake,12);
  if(!P.dead&&AI.inCircle(T.x,T.y,T.r,P.x,P.y)){const r=RO.physical(DB,SKG.mobProfileNow(m),RPG.defender(),{pct:s.pct,ignoreFlee:true,noCrit:true,rng:RPG.rng});
    hitPlayer(m,r,s.name);if(s.stun&&!P.dead&&STATUS.apply(DB,P.st,'stun',{now:SKG.now(),dur:s.stun}))num(P.x,P.y-150,'สตัน',{col:'#ffe14d',size:15});}
  else if(!P.dead&&Math.hypot(T.x-P.x,(T.y-P.y)*1.4)<T.r+120)num(P.x,P.y-130,'หลบ!',{col:'#7fffd4',size:16});}
function tick(dt){for(let i=tele.length-1;i>=0;i--){const T=tele[i];if(T.m.dead||MAP.id==='town'){T.m.casting=null;tele.splice(i,1);continue;}
  T.t+=dt;if(T.t>=T.total){tele.splice(i,1);resolve(T);}}}
const clear=()=>{for(const T of tele)T.m.casting=null;tele.length=0;};

// ---------- วาด ----------
function drawGround(t){for(const T of tele){if(!T.r)continue;const k=Math.min(1,T.t/T.total);
  ctx.save();ctx.translate(T.x,T.y);ctx.scale(1,1/1.4);
  ctx.fillStyle=`rgba(255,60,60,${.12+.1*Math.sin(t*12)})`;ctx.beginPath();ctx.arc(0,0,T.r,0,7);ctx.fill();
  ctx.fillStyle='rgba(255,90,60,.35)';ctx.beginPath();ctx.arc(0,0,T.r*k,0,7);ctx.fill();
  ctx.strokeStyle='rgba(255,120,90,.9)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,T.r,0,7);ctx.stroke();ctx.restore();}}
function drawOver(t){ctx.save();ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#000';
  for(const m of mobs){if(m.dead)continue;const top=m.y-70-60*m.look.scale;
    if(m.state==='windup'){const k=1-Math.max(0,m.wt||0)/(m.wuTotal||.3);ctx.font=`900 ${18+8*k}px system-ui`;ctx.strokeText('!',m.x,top);ctx.fillStyle=`rgb(255,${Math.round(220-160*k)},60)`;ctx.fillText('!',m.x,top);}
    if(m.k.phases&&m.phase>0){ctx.font='800 11px system-ui';const tx='เฟส: '+m.k.phases[m.phase].name;ctx.strokeText(tx,m.x,top-14);ctx.fillStyle='#ff9a3a';ctx.fillText(tx,m.x,top-14);}}
  ctx.restore();}

return {update,tick,alert,clear,drawGround,drawOver};
})();
