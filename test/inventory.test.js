const {test}=require('node:test'),assert=require('node:assert/strict');
const INV=require('../shared/inventory.js'),RNG=require('../shared/rng.js'),{loadDb}=require('../tools/load_db.js');
const db=loadDb();

test('ธุรกรรมซ้ำ key เดิม = ไม่ทำซ้ำ (กันของ/เงินซ้ำ)',()=>{
  const inv=INV.create(),tx={key:'kill:1',reason:'drop',zeny:50,add:[{id:'red_potion',qty:2}]};
  assert.equal(INV.apply(db,inv,tx).ok,true);
  assert.equal(INV.apply(db,inv,tx).dup,true);
  assert.equal(inv.zeny,50);assert.equal(inv.items[0].qty,2);assert.equal(inv.ledger.length,1);});

test('all-or-nothing: เงินไม่พอ = ไม่มีอะไรเปลี่ยน',()=>{
  const inv=INV.create();INV.apply(db,inv,{key:'a',reason:'t',add:[{id:'red_potion',qty:3}]});
  const uid=inv.items[0].uid,snap=JSON.stringify(inv);
  const r=INV.apply(db,inv,{key:'b',reason:'buy',zeny:-10,remove:[{uid,qty:1}],add:[{id:'root_mail',qty:1}]});
  assert.equal(r.ok,false);assert.equal(JSON.stringify(inv),snap);});

test('ห้ามจำนวนติดลบ/ศูนย์/ทศนิยม และห้ามเอาของเกินที่มี',()=>{
  const inv=INV.create();INV.apply(db,inv,{key:'a',reason:'t',add:[{id:'red_potion',qty:3}]});const uid=inv.items[0].uid;
  for(const q of [0,-1,1.5])assert.equal(INV.apply(db,inv,{key:'q'+q,reason:'t',add:[{id:'red_potion',qty:q}]}).ok,false);
  assert.equal(INV.apply(db,inv,{key:'r',reason:'t',remove:[{uid,qty:2},{uid,qty:2}]}).ok,false,'ลบ uid เดียวซ้ำรวมกันเกิน');
  assert.equal(inv.items[0].qty,3);});

test('ไอเทมสวมใส่ = instance แยกชิ้น uid ไม่ซ้ำ · ยาซ้อนกอง',()=>{
  const inv=INV.create();INV.apply(db,inv,{key:'a',reason:'t',add:[{id:'root_mail',qty:2},{id:'red_potion',qty:1},{id:'red_potion',qty:4}]});
  const mails=inv.items.filter(x=>x.id==='root_mail');assert.equal(mails.length,2);assert.notEqual(mails[0].uid,mails[1].uid);
  const pots=inv.items.filter(x=>x.id==='red_potion');assert.equal(pots.length,1);assert.equal(pots[0].qty,5);});

test('น้ำหนักเกิน = ปฏิเสธ',()=>{const inv=INV.create();
  assert.equal(INV.apply(db,inv,{key:'w',reason:'t',add:[{id:'lord_greatsword',qty:10}]},{weightMax:1000}).err,'น้ำหนักเกิน!');assert.equal(inv.items.length,0);});

test('ของที่สวมอยู่ขายไม่ได้ · อาวุธสองมือถอดโล่อัตโนมัติ',()=>{
  const inv=INV.create();INV.apply(db,inv,{key:'a',reason:'t',add:[{id:'moon_edge',qty:1},{id:'buckler',qty:1},{id:'dark_blade',qty:1}]});
  const [moon,shield,blade]=inv.items;
  assert.equal(INV.equip(db,inv,moon.uid,10).ok,true);assert.equal(INV.equip(db,inv,shield.uid,10).ok,true);
  assert.equal(INV.apply(db,inv,{key:'s',reason:'sell',remove:[{uid:shield.uid,qty:1}]}).ok,false);
  assert.equal(INV.equip(db,inv,blade.uid,10).ok,true);
  assert.equal(INV.equipped(inv,'shield'),null);assert.equal(INV.equipped(inv,'weapon').uid,blade.uid);
  assert.equal(INV.equip(db,inv,shield.uid,10).ok,false);});

test('lvReq',()=>{const inv=INV.create();INV.apply(db,inv,{key:'a',reason:'t',add:[{id:'lord_greatsword',qty:1}]});
  assert.equal(INV.equip(db,inv,inv.items[0].uid,1).ok,false);});

test('rollDrops: seed เดียวกัน = ผลเดียวกัน · อัตราใกล้ค่าที่ตั้ง · ช่องไม่เกิน maxSockets',()=>{
  const mob=db.mobs.shadow_root;
  assert.deepEqual(INV.rollDrops(db,mob,1,RNG.make(5)),INV.rollDrops(db,mob,1,RNG.make(5)));
  const rng=RNG.make(9),N=20000;let jelly=0;
  for(let i=0;i<N;i++){const d=INV.rollDrops(db,mob,0,rng);if(d.items.some(x=>x.id==='shadow_jelly'))jelly++;
    for(const x of d.items)if(x.sockets)assert.ok(x.sockets.length<=db.items[x.id].maxSockets);
    assert.ok(d.zeny>=mob.zeny[0]&&d.zeny<=mob.zeny[1]);}
  const rate=mob.drops.find(d=>d.item==='shadow_jelly').rate/100;assert.ok(Math.abs(jelly/N-rate)<0.015,'ได้ '+jelly/N);});
