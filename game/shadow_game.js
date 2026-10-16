// =====================================================================
//  game/shadow_game.js — เงาอสูรในสนาม: ตัวที่ถูกเรียกออกมา (พยาบาล/แทงค์/นักล่า/ทุบพื้น) + ผลพิเศษของเงาที่ผนึก
//  โหลดหลัง main.js · ค่าทั้งหมดจาก data/db/shadows.json ผ่าน shared/shadow.js
// =====================================================================
const SHG=(()=>{
let E=null;                         // ตัวที่ถูกเรียก
const REVIVE=20;                    // วินาทีที่เงากลับมาหลังถูกตีจนสลาย
const procs=()=>SHADOW.procs(DB,P.inv);

function sync(){const s=RPG.summoned();if(s&&!DB.shadows.rules.summonEnabled){RPG.unsummon();E=null;return;}   // ระบบเรียกถูกปิด → เก็บตัวที่ค้างอยู่
  if(!s){E=null;return;}if(E&&E.uid===s.uid)return;
  const info=SHADOW.summonInfo(DB,DB.items[s.id].shadow,s.star||1,!!s.alt),mk=DB.mobs[info.mob];
  const hpMax=Math.round(P.hpMax*(info.hpMult||1)*info.mult*.6);
  E={uid:s.uid,info,x:P.x-P.dir*60,y:P.y+10,cd:1,down:0,hp:hpMax,hpMax,dir:P.dir,seed:3,hit:0,dead:0,vx:0,vy:0,
    name:`${info.name} ${'★'.repeat(s.star||1)}`,lv:P.lv,k:{boss:false},look:{...mk.look,scale:mk.look.scale*.6,body:'#241536',edge:s.alt?'#7fffd4':'#c9a6ff'}};}

const nearestMob=(x,y,r)=>{let b=null,bd=r;for(const m of mobs){if(m.dead)continue;const d=Math.hypot(m.x-x,m.y-y);if(d<bd){bd=d;b=m;}}return b;};
function strike(m,pct,element,stun){const r=RO.physical(DB,RPG.attacker(),SKG.mobProfileNow(m),{pct,element,rng:RPG.rng});damageMob(m,r,{stun:stun||.2});return r;}

function update(dt){sync();if(!E||P.dead)return;const I=E.info;E.hit=Math.max(0,E.hit-dt);
  if(E.down>0){E.down-=dt;if(E.down<=0){E.hp=E.hpMax;E.x=P.x;E.y=P.y;}return;}
  if(MAP.id==='town'){E.x=P.x-P.dir*60;E.y=P.y+10;return;}
  E.cd-=dt;let goal={x:P.x-P.dir*60,y:P.y+10};
  if(I.role==='healer'&&E.cd<=0){E.cd=I.interval;const h=Math.min(P.hpMax-P.hp,Math.round(P.hpMax*I.healPctMaxHp*I.mult/100));
    if(h>0){P.hp+=h;num(P.x,P.y-140,'+'+h,{col:'#7bd88f',size:16});}
    for(const s of I.cleanse||[])if(P.st[s]){delete P.st[s];num(P.x,P.y-160,'ล้างพิษ',{col:'#7fffd4',size:13});}}
  if(I.role==='hunter'){const m=P.target&&!P.target.dead?P.target:nearestMob(P.x,P.y,320);
    if(m){goal={x:m.x-(m.x>E.x?50:-50),y:m.y};if(Math.hypot(m.x-E.x,m.y-E.y)<90&&E.cd<=0){E.cd=1/(I.aspdMult||1);E.dir=m.x<E.x?-1:1;strike(m,60*I.mult,I.element);}}}
  if(I.role==='slam'&&E.cd<=0&&nearestMob(E.x,E.y,I.aoeRadius)){E.cd=I.interval;
    for(const m of mobs){if(m.dead||Math.hypot(m.x-E.x,(m.y-E.y)*1.4)>I.aoeRadius)continue;strike(m,I.pct*I.mult/2,I.element,I.stun);
      if(I.stun)STATUS.apply(DB,m.st,'stun',{now:SKG.now(),dur:I.stun});
      if(I.pull){m.vx+=(E.x-m.x)*2;m.vy+=(E.y-m.y)*2;}}
    shake=Math.max(shake,6);ringFx(E.x,E.y,I.aoeRadius);}
  const dx=goal.x-E.x,dy=goal.y-E.y,l=Math.hypot(dx,dy);
  if(l>12){const sp=Math.min(l,(l>300?520:230)*dt);E.x+=dx/l*sp;E.y+=dy/l*sp;if(Math.abs(dx)>4)E.dir=dx>0?1:-1;}}

const fx=[];function ringFx(x,y,r){fx.push({x,y,r,t:0});}
/** มอนตัวนี้ควรตีเงาแทงค์แทนผู้เล่นไหม */
function mobTarget(m){if(!E||E.down>0||!E.info.taunt||MAP.id==='town')return null;return Math.hypot(m.x-E.x,m.y-E.y)<350?E:null;}
function hitSummon(r){if(!E)return;if(r.miss){num(E.x,E.y-90,'MISS',{col:'#9fb3c8',size:14});return;}
  E.hp-=r.dmg;E.hit=.08;num(E.x,E.y-90,r.dmg,{col:'#c9a6ff',size:16});
  if(E.hp<=0){E.hp=0;E.down=REVIVE;say(`${E.info.name} สลายไป — กลับมาใน ${REVIVE} วิ`);}}

// ---------- ผลพิเศษของเงาที่ผนึก ----------
function onAutoHit(m){for(const h of procs().onHit)if(!m.dead&&RPG.rng()*100<h.chance&&STATUS.apply(DB,m.st,h.status,{now:SKG.now(),dur:h.dur}))
  num(m.x,m.y-130,DB.statuses[h.status].name,{col:DB.statuses[h.status].color,size:14});}
function onPlayerDamaged(m,dmg){const p=procs();if(!p.reflectMeleePct||m.dead)return;const back=Math.max(1,Math.floor(dmg*p.reflectMeleePct/100));
  const R=DB.rules,eleMod=R.elementTable[p.reflectElement][R.elements.indexOf(m.k.element)]/100;
  damageMob(m,{dmg:Math.floor(back*eleMod),miss:false,crit:false,eleMod},{stun:0});}
function onKill(){const p=procs();if(p.onKillHealPct&&!P.dead){const h=Math.min(P.hpMax-P.hp,Math.round(P.hpMax*p.onKillHealPct/100));if(h>0){P.hp+=h;num(P.x,P.y-140,'+'+h,{col:'#7bd88f',size:14});}}}

function drawables(t){const out=[];
  for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=1/60;if(f.t>.45){fx.splice(i,1);continue;}
    out.push({y:f.y-500,f:()=>{const k=f.t/.45;ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.45);ctx.strokeStyle=`rgba(201,166,255,${1-k})`;ctx.lineWidth=8*(1-k)+2;ctx.beginPath();ctx.arc(0,0,f.r*(.4+.6*k),0,7);ctx.stroke();ctx.restore();}});}
  if(E&&!E.down&&!P.dead)out.push({y:E.y,f:()=>drawMob(E,t)});
  return out;}

return {update,mobTarget,hitSummon,onAutoHit,onPlayerDamaged,onKill,drawables,get entity(){return E;}};
})();
