// =====================================================================
//  RIG engine — ตัวละคร 2D แบบกระดูก (ใช้ร่วมกันระหว่างสตูดิโอกับเกม)
//  RIG.loadOutfit(base)            โหลดชิ้นส่วนชุด
//  RIG.makeChar({...})             สร้างตัวละคร
//  RIG.play(ch, clip)              เล่นท่า (clip จาก Pose Studio)
//  RIG.update(ch, dt, moving)      อัปเดตท่า + ยิงเหตุการณ์คีย์ (ch.onEvent)
//  RIG.draw(ctx, ch, t)            วาด
// =====================================================================
(function(){
const B={root:{p:null,off:[0,0]},torso:{p:'root',off:[0,0]},sheath:{p:'torso',off:[-8,-28]},head:{p:'torso',off:[2,-47]},
  armB_u:{p:'torso',off:[-11,-34]},armB_l:{p:'armB_u',off:[0,28]},armF_u:{p:'torso',off:[11,-34]},armF_l:{p:'armF_u',off:[0,28]},
  weapon:{p:'armF_l',off:[0,27]},shB:{p:'armB_u',off:[0,0]},shF:{p:'armF_u',off:[0,0]},
  legB_u:{p:'root',off:[-8,-2]},legB_l:{p:'legB_u',off:[0,22]},legF_u:{p:'root',off:[8,-2]},legF_l:{p:'legF_u',off:[0,22]}};
const FOOT=48, WOFF={weapon:90};
const ORDER=['sheath','armB_l','armB_u','shB','legB_u','legB_l','legF_u','legF_l','torso','weapon','armF_l','armF_u','shF','head'];
const PART_OF={head:'head',torso:'torso',armF_u:'arm_upper',armB_u:'arm_upper',armF_l:'arm_lower',armB_l:'arm_lower',
  legF_u:'leg_upper',legB_u:'leg_upper',legF_l:'leg_lower',legB_l:'leg_lower',shF:'shoulder',shB:'shoulder'};
const SPEC={head:{h:54,px:.6,py:.93},torso:{h:81,px:.5,py:.63},arm_upper:{h:39,px:.5,py:.12},arm_lower:{h:36,px:.5,py:.08},
  leg_upper:{h:29,px:.5,py:.1},leg_lower:{h:28,px:.5,py:.06},shoulder:{h:28,px:.5,py:.3}};
const SHEATH={a:-40,s:.8}; // มุมดาบบนหลัง (องศา) + ย่อเล็กน้อย — เลือกจากภาพลอง 6 แบบ: ใบดาบโผล่เหนือไหล่ฝั่งหลัง
const GEAR={sword:{h:84,px:.5,py:.86},helm:{h:92,px:.5,py:.84,dx:-3,dy:2}};
const READY={root:0,torso:4,head:-3,armF_u:-20,armF_l:-55,weapon:-15,armB_u:15,armB_l:-30,legF_u:-14,legF_l:12,legB_u:16,legB_l:10};
const BONES=['legB_u','legB_l','legF_u','legF_l','torso','head','armF_u','armF_l','armB_u','armB_l','weapon','rootY'];
const E={hold:s=>0,lin:s=>s,inout:s=>s<.5?2*s*s:1-((-2*s+2)**2)/2,exp:s=>1-Math.pow(1-s,4),out:s=>1-(1-s)**3};

function img(src){const i=new Image();i.src=src;return i;}
// spec/bones/foot = ค่าเฉพาะชุด (ชีทจาก AI สเกลไม่เท่ากัน) เช่น hero2 — ค่าเดียวกับ SPEC_SET/BODY ใน rig_lab
function loadOutfit(base,{gear='data/gear/',parts=['head','torso','arm_upper','arm_lower','leg_upper','leg_lower','shoulder'],glows=[],helmet=false,sword=true,leg='leg_lower_3',hair=true,spec=null,bones=null,foot=null,swordImg='greatsword',boneParts=[],idleParts={}}={}){
  const O={img:{},glow:{},hair:hair?img(base+'head_hair.png'):null,helmet,sword,spec,bones,foot};
  for(const p of parts)O.img[p]=img(base+p+'.png');
  for(const b of boneParts)O.img[b]=img(base+b+'.png');
  O.idleImg={};for(const b in idleParts)O.idleImg[b]=img(base+idleParts[b]+'.png');   // ทริคขาหน้า (c4): ยืน = ปลายเท้าหันหาคนดู (มั่นใจสุด) · เดิน/วิ่ง = หันไปทางที่ไป   // แขน/ขาหน้า-หลังคนละภาพ (ชีท C2 v2)
  for(const g of glows)O.glow[g]=img(base+g+'_glow.png');
  if(leg)O.leg=img(base+leg+'.png');
  if(sword){O.sword=img(gear+swordImg+'.png');O.swordGlow=img(gear+swordImg+'_glow.png');}
  if(helmet){O.helmOpen=img(gear+'helmet_open.png');O.helmClosed=img(gear+'helmet_closed.png');O.helmGlow=img(gear+'helmet_closed_glow.png');O.helmMask=img(gear+'helmet_mask.png');}
  return O;}
const ok=i=>i&&i.complete&&i.naturalWidth>0;

// ---------- ท่า ----------
function lerpPose(a,b,s){const r={};for(const k of BONES)r[k]=(a[k]??READY[k]??0)+((b[k]??READY[k]??0)-(a[k]??READY[k]??0))*s;return r;}
// ยืนพร้อมสู้ = ค่า "ท่าพร้อมสู้" จาก Pose Studio ของ Night Camp (knowledge/_raw_notes.md c2-ละเอียด)
//   ค่าเขา: ขาหลัง 17 เข่าหลัง 33 · ขาหน้า -16 เข่าหน้า 26 · โน้มตัว 7 · หัว 0 · ต้นแขนหน้า 49 ศอกหน้า 54 · ต้นแขนหลัง 75 ศอกหลัง 18
//   แปลงเป็นระบบเรา: ต้นแขน = ค่าเขา-90, ศอก = -ค่าเขา, ขา/เข่า/ตัว ใช้ตรงๆ
//   ปรับหลังลองจริง (ภาพเทียบ knowledge/compare_stance.png): เข่าหลังของเรางอกลับทิศกับของเขา -> ใช้ค่าลบ ไม่งั้นแข้งไขว้กัน;
//   แขนหน้ายื่นออก + ดาบเอียงไปหน้า ~45° ให้เหมือนภาพเขา (ค่าแปลงตรงๆ ดาบหันหลัง)
const STANCE={legB_u:6,legB_l:3,legF_u:-6,legF_l:3,torso:4,head:0,armF_u:6,armF_l:-14,armB_u:6,armB_l:-12,weapon:60,rootY:0}; // ถือแบบภาพต้นฉบับ: มือห้อยข้างสะโพก ใบดาบชี้ลงไปข้างหน้า
// ทับด้วยชีวิต (หลัก 4/5): หายใจแบบ ease · หัว/แขนหลังตามช้ากว่าลำตัว (overlap) · ถ่ายน้ำหนักช้าๆ · ทุก ~7 วิ เหลียว/ขยับดาบ 1 ครั้ง
function idle(t){const sm=x=>x*x*(3-2*x),br=Math.sin(t*2.2),brL=Math.sin(t*2.2-.7),ws=Math.sin(t*.7),S=STANCE;
  const ph=t%7,fid=ph<1.4?sm(Math.min(1,ph/.35))*sm(Math.min(1,(1.4-ph)/.35)):0;
  return {...READY,
    legB_u:S.legB_u+ws*1.5,legB_l:S.legB_l+ws*2+br*1.5,legF_u:S.legF_u+ws*1.5,legF_l:S.legF_l-ws*2+br*1.5,   // เข่าย่อตามจังหวะหายใจ
    torso:S.torso+br*1.4+ws*1,head:S.head-brL*1.6-fid*8,
    armF_u:S.armF_u+br*2-fid*5,armF_l:S.armF_l+br*1.5,weapon:S.weapon+brL*3-fid*8,
    armB_u:S.armB_u-brL*2.5,armB_l:S.armB_l-brL*2,
    rootY:S.rootY+br*1.3,sq:.014*br};}
// นอกการต่อสู้ (ดาบสะพายหลัง) — ยืนผ่อนคลาย: แขนห้อยข้างตัว กำหมัดหลวมๆ ศอกงอนิด (ค่า "ยืนเก็บดาบ" ของ Night Camp)
const REST={legB_u:5,legB_l:3,legF_u:-5,legF_l:3,torso:2,head:0,armF_u:14,armF_l:-16,armB_u:-12,armB_l:-14,rootY:0};
function rest(t){const br=Math.sin(t*2),brL=Math.sin(t*2-.7),R=REST,ph=t%8,sm=x=>x*x*(3-2*x),fid=ph<1.6?sm(Math.min(1,ph/.4))*sm(Math.min(1,(1.6-ph)/.4)):0;
  return {...READY,...R,torso:R.torso+br*1.2,head:R.head-brL*1.5-fid*7,armF_u:R.armF_u+brL*2,armF_l:R.armF_l-brL*2,armB_u:R.armB_u-brL*2,armB_l:R.armB_l+brL*1.5,
    legF_l:R.legF_l+br*.8,legB_l:R.legB_l+br*.8,rootY:br*1.1,sq:.012*br};}
// วิ่งมือเปล่า: หมัดระดับอก ศอกงอ ~90° แกว่งสวนขาแรงกว่าตอนถือดาบ
function runFree(t){const p=walk(t),ph=((t*RUN_HZ)%1)*Math.PI*2,s=Math.sin(ph);
  return {...p,armF_u:-22+34*s,armF_l:-88+10*s,armB_u:14-34*s,armB_l:-90-10*s};}
// วิ่ง (คลิป c4 ช่วง 1:29 นับทีละเฟรม): 1 รอบ = 2 ก้าว = 0.67 วิ (1.5 รอบ/วิ ≈ 3 ก้าว/วิ)
// · ตัวโน้มไปหน้าตลอด หัวนิ่ง · ขาที่ตามหลังเตะส้นขึ้น เข่างอมาก · ตัวเด้ง 2 ครั้ง/รอบ
// · เข่า "ทั้งสองขา" งอทิศเดียวกัน (ค่าบวก = แข้งไปข้างหลัง) — ค่าลบ = เข่าหักไปหน้าแบบขานก (ผิด)
// · แขน: หมัดหน้ายื่นระดับอก, ศอกหลังดึงไปข้างหลังจนหมัดหลบหลังตัว, แกว่งสวนขา (ไม่ให้หมัดสองข้างมาชนกันกลางพุง)
// · ดาบหมุนสวนแขน ให้มุมดาบในโลกคงที่ ไม่เหวี่ยงขึ้นตามแขน
const RUN_HZ=1.5;
function walk(t){const ph=((t*RUN_HZ)%1)*Math.PI*2,s=Math.sin(ph),c=Math.cos(ph),c2=Math.cos(2*ph);
  const lift=x=>{x=Math.max(0,x);return x*x*(3-2*x);};
  return {...READY,
    legF_u:-30*s-4,legB_u:30*s+4,legF_l:8+65*lift(c),legB_l:8+65*lift(-c),
    armF_u:-28+28*s,armF_l:-75+8*s,armB_u:20-28*s,armB_l:-85-8*s,
    weapon:150-36*s,torso:11+1.5*c2,head:-6-1.5*c2,
    rootY:-5*Math.abs(c2)+2,sq:.03*c2};}
const ATK=[
 {wind:{...READY,armF_u:-195,armF_l:-25,weapon:-15,torso:-10,head:-8,legF_u:-20,legB_u:22,armB_u:-30,rootY:-3},
  hit:{...READY,armF_u:-35,armF_l:-15,weapon:15,torso:18,head:8,legF_u:-30,legF_l:22,legB_u:30,armB_u:35,rootY:5}},
 {wind:{...READY,armF_u:-10,armF_l:-40,weapon:70,torso:10,head:4,legF_u:-26,legB_u:24,armB_u:20,rootY:4},
  hit:{...READY,armF_u:-160,armF_l:-15,weapon:-10,torso:-12,head:-10,legF_u:-14,legB_u:18,armB_u:-40,rootY:-6}},
 {wind:{...READY,armF_u:-185,armF_l:-10,weapon:-35,torso:-16,head:-12,legF_u:-32,legF_l:30,legB_u:30,rootY:-10,armB_u:-60},
  hit:{...READY,armF_u:-15,armF_l:-5,weapon:25,torso:28,head:12,legF_u:-42,legF_l:34,legB_u:36,legB_l:20,armB_u:40,rootY:9},big:true}];
const TM={wind:.32,strike:.07,stop:.07,follow:.16,rec:.28};
const clean=p=>{const r={};for(const k of BONES)r[k]=Math.round((p[k]||0)*10)/10;return r;};
function atkClip(i){const k=ATK[i],st=k.big?TM.stop*1.8:TM.stop;let t=0;const keys=[{t:0,pose:clean(READY),ease:'inout'}];
  t+=TM.wind;keys.push({t,pose:clean(k.wind),ease:'inout'});t+=TM.strike;keys.push({t,pose:clean(k.hit),ease:'exp',evt:'hit'});
  t+=st+TM.follow;keys.push({t,pose:clean(k.hit),ease:'hold'});t+=TM.rec;keys.push({t,pose:clean(READY),ease:'out'});
  return {name:'โจมตี '+(i+1)+(k.big?' (ปิดคอมโบ)':''),len:+t.toFixed(3),speed:1,fps:0,loop:false,big:!!k.big,keys};}
function swarmClip(){const cast={...READY,armF_u:-150,armF_l:-20,weapon:-10,torso:-6,head:-8,armB_u:-40,legF_u:-20,legB_u:18,rootY:-2};
  return {name:'สกิล: ฝูงอสูรเงา',len:3.0,speed:1,fps:0,loop:false,keys:[{t:0,pose:clean(READY),ease:'inout'},{t:.35,pose:clean(cast),ease:'exp',evt:'swarm'},{t:2.4,pose:clean(cast),ease:'hold'},{t:3.0,pose:clean(READY),ease:'inout'}]};}
const CLIPS={'โจมตี 1':atkClip(0),'โจมตี 2':atkClip(1),'โจมตี 3 (ปิดคอมโบ)':atkClip(2),'สกิล: ฝูงอสูรเงา':swarmClip()};
// ท่าที่ส่งออกจาก Pose Studio ทับค่าเริ่มต้น (data/clips.json)
function loadClips(url){return fetch(url).then(r=>r.ok?r.json():null).then(j=>{if(j&&j.clips)for(const c of j.clips)CLIPS[c.name]=c;}).catch(()=>{});}
function sample(c,t){const K=c.keys;if(c.fps>0)t=Math.floor(t*c.fps)/c.fps;
  if(t<=K[0].t)return K[0].pose;if(t>=K[K.length-1].t)return K[K.length-1].pose;
  for(let i=0;i<K.length-1;i++){const a=K[i],b=K[i+1];if(t>=a.t&&t<=b.t){const s=(t-a.t)/Math.max(1e-6,b.t-a.t);return lerpPose(a.pose,b.pose,(E[b.ease]||E.inout)(s));}}
  return K[K.length-1].pose;}

function makeChar(o){return Object.assign({x:0,y:0,dir:1,scale:1,t:0,act:null,hitstop:0,flash:0,visor:false,pose:{...READY},onEvent:()=>{}},o);}
const ARMED_SEC=5;
function play(ch,clip){if(typeof clip==='string')clip=CLIPS[clip];if(!clip)return false;ch.act={clip,t:0,last:-1};ch.armed=ARMED_SEC;return true;}
function update(ch,dt,moving){
  ch.t+=dt;ch.moving=moving; ch.flash=Math.max(0,ch.flash-dt*2.2);
  if(!ch.act)ch.armed=moving?0:Math.max(0,(ch.armed||0)-dt);   // เดิน/วิ่ง = เก็บดาบเข้าหลังทันที (วิ่งมือเปล่าเสมอ)
  const armed=ch.armed>0;
  const base=moving?(armed?walk(ch.t):runFree(ch.t)):(armed?idle(ch.t):rest(ch.t));
  if(!ch.act){ch.pose=base;return;}
  if(ch.hitstop>0){ch.hitstop-=dt;return;}            // หยุดภาพ: ค้างท่าเดิม
  const a=ch.act;a.t+=dt*(a.clip.speed||1);
  for(const k of a.clip.keys)if(k.evt&&a.last<k.t&&a.t>=k.t)ch.onEvent(k.evt,a.clip,ch);
  a.last=a.t;
  if(a.t>=a.clip.len&&!a.clip.loop){ch.act=null;ch.pose=base;return;}
  ch.pose=sample(a.clip,a.clip.loop?a.t%a.clip.len:a.t);}

// ---------- วาด ----------
function world(pose,bo){const M={};for(const n in B){const b=B[n],off=(bo&&bo[n])||b.off,P=b.p?M[b.p]:{x:0,y:0,a:0},c=Math.cos(P.a),s=Math.sin(P.a);
  M[n]={x:P.x+off[0]*c-off[1]*s,y:P.y+off[0]*s+off[1]*c,a:P.a+((pose[n]||0)+(WOFF[n]||0))*Math.PI/180};}return M;}
function pulse(t){const x=t%1.3;return Math.max(Math.exp(-((x-.15)**2)/.004),.7*Math.exp(-((x-.38)**2)/.004));}
function glowDraw(c,g,x,y,w,h,amt){if(!ok(g)||amt<=0)return;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(1,amt);c.drawImage(g,x,y,w,h);
  c.filter='blur(3px)';c.globalAlpha=Math.min(1,amt*.9);c.drawImage(g,x,y,w,h);c.filter='blur(9px)';c.globalAlpha=Math.min(1,amt*.7);c.drawImage(g,x,y,w,h);c.restore();}
const OFF={};function off(cv,id){const k=cv.width+'x'+cv.height+id;if(!OFF[k]){OFF[k]=document.createElement('canvas');OFF[k].width=cv.width;OFF[k].height=cv.height;}return OFF[k];}
function drawPart(c,ch,bone,back){const O=ch.outfit,t=ch.t,ga=.35+.65*pulse(t)+ch.flash;
  const inHand=ch.act||(ch.armed>0);
  if(bone==='sheath'){if(inHand||!O.sword||!ok(O.sword))return;const ws=GEAR.sword,ww=O.sword.width*ws.h/O.sword.height;c.rotate(SHEATH.a*Math.PI/180);c.scale(SHEATH.s,SHEATH.s);
    c.filter='brightness(.8)';c.drawImage(O.sword,-ws.px*ww,-ws.py*ws.h,ww,ws.h);c.filter='none';return;}
  if(bone==='weapon'){if(!inHand||!O.sword||!ok(O.sword))return;const ws=GEAR.sword,ww=O.sword.width*ws.h/O.sword.height;c.scale(-1,1);
    c.drawImage(O.sword,-ws.px*ww,-ws.py*ws.h,ww,ws.h);glowDraw(c,O.swordGlow,-ws.px*ww,-ws.py*ws.h,ww,ws.h,ga);return;}
  const key=PART_OF[bone];let im=(!ch.moving&&!ch.act&&O.idleImg&&ok(O.idleImg[bone])&&O.idleImg[bone])||O.img[bone]||O.img[key];if((bone==='legF_l'||bone==='legB_l')&&ok(O.leg))im=O.leg;if(!ok(im))return;
  const s=(O.spec&&O.spec[key])||SPEC[key],w=im.width*s.h/im.height*(s.sx||1),sc=back?.92:1,sq=(bone==='torso'||bone==='head')?1+(ch.pose.sq||0):1,x=-s.px*w,y=-s.py*s.h;
  c.scale(sc/Math.sqrt(sq),sc*sq);if(back)c.filter='brightness(.68) saturate(.85)';
  if(bone==='head'&&O.helmet&&ok(O.helmMask)&&ok(O.hair)){ // ซ่อนเฉพาะผมที่โผล่นอกหมวก
    const hs=GEAR.helm,hw=O.helmMask.width*hs.h/O.helmMask.height,hx=-hs.px*hw+hs.dx,hy=-hs.py*hs.h+hs.dy,T=c.getTransform();
    const A=off(c.canvas,'a'),a=A.getContext('2d'),Bc=off(c.canvas,'b'),b=Bc.getContext('2d');
    for(const z of [a,b]){z.setTransform(1,0,0,1,0,0);z.clearRect(0,0,A.width,A.height);z.setTransform(T);}
    b.drawImage(O.hair,x,y,w,s.h);b.globalCompositeOperation='destination-out';b.drawImage(O.helmMask,hx,hy,hw,hs.h);b.globalCompositeOperation='source-over';
    a.drawImage(im,x,y,w,s.h);a.setTransform(1,0,0,1,0,0);a.globalCompositeOperation='destination-out';a.drawImage(Bc,0,0);a.globalCompositeOperation='source-over';
    c.save();c.setTransform(1,0,0,1,0,0);c.drawImage(A,0,0);c.restore();
  } else c.drawImage(im,x,y,w,s.h);
  c.filter='none';
  if(O.glow[key])glowDraw(c,O.glow[key],x,y,w,s.h,ga*(back?.5:1));
  if(bone==='head'&&O.helmet){const hi=ch.visor?O.helmClosed:O.helmOpen;if(ok(hi)){const hs=GEAR.helm,hw=hi.width*hs.h/hi.height,hx=-hs.px*hw+hs.dx,hy=-hs.py*hs.h+hs.dy;
    c.drawImage(hi,hx,hy,hw,hs.h);if(ch.visor)glowDraw(c,O.helmGlow,hx,hy,hw,hs.h,ga*1.3);}}}
function draw(c,ch){const s=ch.scale,p=ch.pose,O=ch.outfit,M=world(p,O.bones),FT=O.foot||FOOT;
  c.save();c.translate(ch.x,ch.y);c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(0,0,30*s,7*s,0,0,7);c.fill();c.restore();
  c.save();c.translate(ch.x,ch.y-FT*s+(p.rootY||0)*s*.5);c.scale(ch.dir*s,s);
  for(const n of ORDER){const m=M[n];c.save();c.translate(m.x,m.y);c.rotate(m.a);drawPart(c,ch,n,n.includes('B_')||n==='shB');c.restore();}
  c.restore();
  return {head:{x:ch.x,y:ch.y-(FT+60)*s}};}
window.RIG={loadOutfit,makeChar,play,update,draw,loadClips,CLIPS,READY,idle,walk,FOOT,world,B,SHEATH}; // world/B/SHEATH = ใช้ตรวจ/จูนท่า
})();
