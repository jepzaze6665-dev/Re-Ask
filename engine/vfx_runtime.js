// VFX runtime — สกิลที่ใช้ได้ในเครื่องมืออื่น (Pose Studio / เกม)
// ใช้: VFX.play('swarm',{x,y,tx,ty})  แล้วเรียก VFX.draw(ctx,layer,time) ทุกเฟรม
//   layer 0 = พื้น (ก่อนตัวละคร), 1 = ตัวสกิล (หลังตัวละคร), 2 = จอ/UI (บนสุด)
// อ่าน VFX.shakeReq เพื่อสั่นจอ แล้วตั้งกลับเป็น 0
(function(){
const BASE=(window.VFX_BASE||'../assets/vfx/dark/');
function seq(n){const q={img:new Image(),glow:new Image(),F:0};q.img.src=BASE+'seq/'+n+'.png';q.glow.src=BASE+'seq/'+n+'_glow.png';
  fetch(BASE+'seq/'+n+'.json').then(r=>r.json()).then(j=>{q.F=j.frames;q.fw=j.w;q.fh=j.h;});return q;}
const S={beast:seq('beast'),burst:seq('burst'),thorns:seq('thorns')};
const P={};
for(const n of [...[0,1,2,3,4,5,6,7].map(i=>'rock_'+i),...[0,1,2,3,4,5].map(i=>'spark_'+i),...[0,1,2,3,4,5].map(i=>'smoke_'+i)])
  for(const g of ['','_glow']){const im=new Image();im.src=BASE+'sprites/'+n+g+'.png';P[n+g]=im;}
const hsh=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const cl=x=>Math.min(1,Math.max(0,x));
const ez={out:x=>1-Math.pow(1-cl(x),3),in:x=>{x=cl(x);return x*x*x;},inout:x=>{x=cl(x);return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;},
  back:x=>{x=cl(x);const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2);}};
const rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
let C;
function inst(q,f,x,y,h,{rot=0,sx=1,a=1,ax=.5,ay=.5,glow=1}={}){ if(!q.F||!q.img.width||a<=0||h<=0)return;
  const w=q.fw*h/q.fh; C.save();C.translate(x,y);C.rotate(rot);C.scale(sx,1);C.globalAlpha=a;
  C.drawImage(q.img,f*q.fw,0,q.fw,q.fh,-ax*w,-ay*h,w,h);
  if(glow>0&&q.glow.width){C.globalCompositeOperation='lighter';C.filter='blur(6px)';C.globalAlpha=a*.8*glow;C.drawImage(q.glow,f*q.fw,0,q.fw,q.fh,-ax*w,-ay*h,w,h);
    C.filter='blur(18px)';C.globalAlpha=a*.55*glow;C.drawImage(q.glow,f*q.fw,0,q.fw,q.fh,-ax*w,-ay*h,w,h);}
  C.restore();}
function spr(n,x,y,h,{rot=0,a=1,glow=1}={}){const im=P[n];if(!im||!im.width||a<=0)return;const w=im.width*h/im.height;
  C.save();C.translate(x,y);C.rotate(rot);C.globalAlpha=a;C.drawImage(im,-w/2,-h/2,w,h);const g=P[n+'_glow'];
  if(g&&g.width){C.globalCompositeOperation='lighter';C.globalAlpha=a*glow*.8;C.filter='blur(4px)';C.drawImage(g,-w/2,-h/2,w,h);}C.restore();}
function magicCircle(x,y,r,rot,a,col){ if(a<=0||r<=0)return;
  C.save();C.translate(x,y);C.scale(1,.34);C.globalCompositeOperation='lighter';C.globalAlpha=a;C.shadowColor=rgba(col,1);C.shadowBlur=18;C.strokeStyle=rgba(col,.95);
  C.lineWidth=4;C.beginPath();C.arc(0,0,r,0,7);C.stroke();C.lineWidth=2;C.beginPath();C.arc(0,0,r*.82,0,7);C.stroke();C.beginPath();C.arc(0,0,r*.38,0,7);C.stroke();
  C.rotate(rot);C.lineWidth=2.5;C.beginPath();for(let i=0;i<=7;i++){const an=i*Math.PI*2/7*3;const px=Math.cos(an)*r*.8,py=Math.sin(an)*r*.8;i?C.lineTo(px,py):C.moveTo(px,py);}C.stroke();
  for(let i=0;i<24;i++){C.save();C.rotate(i/24*Math.PI*2);C.fillStyle=rgba(col,.9);C.fillRect(r*.86,-2,r*.08*(i%3?1:1.8),4);C.restore();}
  C.rotate(-rot*2.3);C.setLineDash([10,8]);C.lineWidth=2;C.beginPath();C.arc(0,0,r*.6,0,7);C.stroke();C.setLineDash([]);C.restore();}
function shockRing(x,y,k,maxR,col,width){ if(k<=0||k>=1)return; const r=maxR*ez.out(k);
  C.save();C.translate(x,y);C.scale(1,.36);C.globalCompositeOperation='lighter';C.globalAlpha=1-k;C.lineWidth=width*(1-k)+1;C.strokeStyle=rgba(col,1);
  C.shadowColor=rgba(col,1);C.shadowBlur=20;C.beginPath();C.arc(0,0,r,0,7);C.stroke();C.strokeStyle='rgba(255,255,255,.9)';C.lineWidth=Math.max(1,width*.3*(1-k));C.beginPath();C.arc(0,0,r,0,7);C.stroke();C.restore();}
function speedLines(x0,x1,y,a,col,seed){ if(a<=0)return; C.save();C.globalCompositeOperation='lighter';
  for(let i=0;i<14;i++){const yy=y+(hsh(i+seed)-.5)*170,len=60+140*hsh(i+seed+3),xs=x0+(x1-x0)*hsh(i+seed+7);
    C.globalAlpha=a*(.3+.5*hsh(i+seed+9));C.strokeStyle=i%3?rgba(col,1):'#fff';C.lineWidth=1+2*hsh(i+seed+11);C.beginPath();C.moveTo(xs,yy);C.lineTo(xs-len,yy);C.stroke();}C.restore();}
function dmgNum(txt,x,y,k,{size=26,col='#ffd34a',big=false}={}){ if(k<0||k>1)return;
  const pop=k<.12?ez.back(k/.12):1,rise=big?0:ez.out(k)*40,a=k>.75?(1-k)/.25:1;
  C.save();C.translate(x,y-rise);C.scale(pop,pop);C.globalAlpha=a;C.textAlign='center';C.font=`900 ${size}px system-ui`;C.lineJoin='round';C.lineWidth=size*.22;C.strokeStyle='#2a0a3a';C.strokeText(txt,0,0);
  if(big){const g=C.createLinearGradient(0,-size,0,0);g.addColorStop(0,'#fff6c8');g.addColorStop(1,col);C.fillStyle=g;}else C.fillStyle=col;C.fillText(txt,0,0);C.restore();}
function title(txt,x,y,k,col){ if(k<0||k>1)return; const a=k<.1?k/.1:k>.8?(1-k)/.2:1,sc=k<.1?.6+.4*ez.back(k/.1):1;
  C.save();C.translate(x,y);C.scale(sc,sc);C.globalAlpha=a;C.textAlign='center';C.font='900 24px system-ui';C.lineWidth=6;C.strokeStyle='#120a1c';C.strokeText(txt,0,0);
  C.fillStyle='#fff';C.shadowColor=rgba(col,1);C.shadowBlur=14;C.fillText(txt,0,0);C.restore();}
function full(style,comp){C.save();C.setTransform(1,0,0,1,0,0);if(comp)C.globalCompositeOperation=comp;C.fillStyle=style;C.fillRect(0,0,C.canvas.width,C.canvas.height);C.restore();}
const bez=(a,b,c,k)=>{const u=1-k;return [u*u*a[0]+2*u*k*b[0]+k*k*c[0],u*u*a[1]+2*u*k*b[1]+k*k*c[1]];};
const bezDir=(a,b,c,k)=>{const u=1-k;return [2*u*(b[0]-a[0])+2*k*(c[0]-b[0]),2*u*(b[1]-a[1])+2*k*(c[1]-b[1])];};

// ---------------- สกิล: ฝูงอสูรเงา ----------------
const SW={LIFE:3.4,BEASTS:[{t0:.55,dur:.62,h:150,cy:-170,hitDY:-40},{t0:.75,dur:.62,h:160,cy:130,hitDY:30},{t0:1.15,dur:.4,h:280,cy:-30,hitDY:0,big:true}]};
function swTime(raw){let s=raw;for(const b of SW.BEASTS){const h=b.t0+b.dur,st=b.big?.12:.05;if(s>h&&s<h+st)return h;if(s>=h+st)s-=st;}return s;}
function swarm(A,s,layer,W,H){
  const B=SW.BEASTS,col=A.col,hx=A.x,gy=A.y,tx=A.tx,ty=A.ty,last=B[2],lastHit=last.t0+last.dur, flip=tx<hx?-1:1;
  if(layer===0){
    const dim=cl(s/.35)*(1-cl((s-2.4)/.6))*.5;full(`rgba(5,0,12,${dim})`);
    magicCircle(hx,gy,100*ez.back(cl(s/.3)),s*2.4,.9*(1-cl((s-1.4)/.3)),col);
    magicCircle(tx,gy,80*ez.out(cl((s-.3)/.3)),-s*3,.7*(1-cl((s-lastHit)/.2)),col);
    const T=S.thorns;if(T.F)[-120,-70,-25,25,70,120].forEach((dx,i)=>{const lt=s-lastHit-Math.abs(dx)/600;if(lt<0||lt>1.1)return;
      const f=lt<.12?3:lt<.4?4:lt<.7?5:Math.min(7,6+Math.floor((lt-.7)*6));
      inst(T,f,tx+dx*1.6,gy+6,(300+160*hsh(i+3))*(1-Math.abs(dx)/320),{ay:.92,sx:hsh(i)>.5?1:-1,glow:1.1,a:1-cl((lt-.8)/.3)});});
    B.forEach(b=>{const hit=s-(b.t0+b.dur);[0,.08].forEach((d,i)=>shockRing(tx,gy,(hit-d)/(b.big?.55:.35),(b.big?220:120)+i*60,col,b.big?12:6));});
    return;}
  if(layer===1){
    const Q=S.beast,Bq=S.burst;
    if(s<.6){C.save();C.globalCompositeOperation='lighter';for(let i=0;i<24;i++){const ph=((s*1.8+hsh(i))%1),an=hsh(i+40)*Math.PI*2,r=170*(1-ez.in(ph));
      C.globalAlpha=ph;C.fillStyle=i%4?rgba(col,1):'#fff';C.beginPath();C.ellipse(hx+Math.cos(an)*r,gy-90+Math.sin(an)*r*.6,2.5,1.5,an,0,7);C.fill();}C.restore();}
    B.forEach((b,bi)=>{
      const k=(s-b.t0)/b.dur,start=[hx-20*flip,gy-120],ctrl=[(hx+tx)/2,ty+b.cy],end=[tx-20*flip,ty+b.hitDY];
      const fly=Math.floor(A.clock*6)%2;
      if(k<0){const pre=(s-(b.t0-.35))/.35;if(pre<0)return;const p=ez.out(pre);
        inst(Q,fly,start[0]-(40-30*bi)*flip,start[1]-30*p+bi*10,b.h*(.5+.4*p),{ax:.75,a:p,glow:.8,sx:flip});return;}
      if(k<1){const kk=ez.inout(k),p=bez(start,ctrl,end,kk),d=bezDir(start,ctrl,end,kk),ang=Math.atan2(d[1],d[0]*flip)*flip,st=(1+.3*Math.sin(Math.PI*k))*flip;
        for(let g=3;g>=1;g--){const pg=bez(start,ctrl,end,ez.inout(cl(k-g*.07)));inst(Q,2,pg[0],pg[1],b.h,{rot:ang,sx:st,ax:.8,a:.18*(1-g/4),glow:0});}
        inst(Q,k<.55?fly:2,p[0],p[1],b.h,{rot:ang*.85,sx:st,ax:.8,glow:1.2});
        if(b.big)speedLines(hx,p[0],p[1],.9,col,bi*13);return;}
      const a=s-(b.t0+b.dur);if(a>.8)return;
      inst(Q,a<.1?3:a<.35?4:5,end[0],end[1],b.h*(a<.1?.95:1),{ax:.8,a:1-cl((a-.45)/.35),glow:a<.1?2:1,sx:flip});
      if(Bq.F)inst(Bq,Math.min(7,1+Math.floor(a/.07)),tx+(b.big?0:(bi?40:-40)),ty+b.hitDY*.6,b.big?480:240,{glow:1.2,a:1-cl((a-.5)/.25)});
      if(b.big)for(let i=0;i<12;i++){const lt=a/.8,an=-Math.PI*.5+(hsh(i+60)-.5)*3,sp=260+240*hsh(i+61);
        spr(i%2?'spark_'+(i%6):'rock_'+(i%8),tx+Math.cos(an)*sp*lt,ty+Math.sin(an)*sp*lt+380*lt*lt,i%2?34:22,{a:1-lt,rot:lt*9*(hsh(i)-.5),glow:1.3});}
    });
    C.save();C.globalCompositeOperation='lighter';for(let i=0;i<40;i++){const lt=((s*.35+hsh(i+100))%1),fd=cl(s/.4)*(1-cl((s-2.8)/.5));
      C.globalAlpha=(1-lt)*fd*.8;C.fillStyle=i%5?rgba(col,1):'#fff';C.beginPath();C.arc((hx+tx)/2+(hsh(i+101)-.5)*760,gy+20-lt*360,1+2*hsh(i+102),0,7);C.fill();}C.restore();
    return;}
  title('ฝูงอสูรเงา!',hx,gy-260,s/1.3,col);
  B.forEach((b,bi)=>{const a=s-(b.t0+b.dur);
    if(a>=0&&!A.fired[bi]){VFX.shakeReq=Math.max(VFX.shakeReq,b.big?20:7);A.fired[bi]=1;}
    if(a>=0&&a<(b.big?.16:.08))full(a<.04&&b.big?'rgba(255,255,255,.45)':rgba(col,(b.big?.4:.18)*(1-a/(b.big?.16:.08))),'lighter');
});
  const vig=cl(s/.3)*(1-cl((s-2.6)/.5));
  if(vig>0){const cw=C.canvas.width,chh=C.canvas.height;C.save();C.setTransform(1,0,0,1,0,0);const g=C.createRadialGradient(cw/2,chh/2,chh*.35,cw/2,chh/2,chh*.85);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(8,0,18,${.75*vig})`);C.fillStyle=g;C.fillRect(0,0,cw,chh);C.restore();}
  // ตัวเลขดาเมจ: ให้เกมแสดงเอง (VFX = ภาพล้วน)
}
const SKILLS={swarm:{life:SW.LIFE+.3,time:swTime,draw:swarm}};
const active=[];
window.VFX={shakeReq:0,skills:Object.keys(SKILLS),
  play(name,o){const k=SKILLS[name];if(!k)return;active.push({name,clock:0,fired:{},col:o.col||[180,82,255],...o});},
  clear(){active.length=0;},
  // dt = เวลาที่ผ่านไปตั้งแต่เฟรมก่อน (เรียกครั้งเดียวต่อเฟรม ก่อน draw)
  tick(dt){for(let i=active.length-1;i>=0;i--){const A=active[i];A.clock+=dt;if(A.clock>SKILLS[A.name].life)active.splice(i,1);}},
  draw(ctx,layer,W,H){C=ctx;for(const A of active){const k=SKILLS[A.name];k.draw(A,k.time(A.clock),layer,W,H);}},
  get busy(){return active.length>0;}};
})();
