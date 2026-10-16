const {test}=require('node:test'),assert=require('node:assert/strict');
const SHOP=require('../shared/shop.js'),INV=require('../shared/inventory.js'),{loadDb}=require('../tools/load_db.js');
const db=loadDb();
const fresh=(z=10000)=>{const inv=INV.create();inv.zeny=z;return inv;};

test('ซื้อ: หักเงินตามราคา × จำนวน · ร้านต้องขายของชิ้นนั้น · เงินไม่พอ = ไม่เปลี่ยนอะไร',()=>{
  const inv=fresh(1000);assert.equal(SHOP.buy(db,inv,'b1','item_shop','red_potion',5).ok,true);
  assert.equal(inv.zeny,1000-5*db.items.red_potion.price);assert.equal(inv.items[0].qty,5);
  assert.equal(SHOP.buy(db,inv,'b2','item_shop','dark_blade',1).ok,false,'ร้านของชำไม่ขายดาบ');
  const snap=JSON.stringify(inv);assert.equal(SHOP.buy(db,inv,'b3','item_shop','blue_potion',99).err,'เงินไม่พอ');assert.equal(JSON.stringify(inv),snap);
  assert.equal(SHOP.buy(db,inv,'b1','item_shop','red_potion',5).dup,true);assert.equal(inv.items[0].qty,5,'กดซ้ำ key เดิมไม่ได้ของเพิ่ม');});

test('ซื้อ: จำนวนต้องเป็นจำนวนเต็ม 1–999',()=>{const inv=fresh();for(const q of [0,-2,1.5,1000])assert.equal(SHOP.buy(db,inv,'q'+q,'item_shop','red_potion',q).ok,false);});

test('ขาย: ได้ครึ่งราคา · ของที่สวม/มีเงาผนึก/ราคา 0 ขายไม่ได้',()=>{
  const inv=fresh(0);const [w,a,sh]=INV.apply(db,inv,{key:'g',reason:'t',add:[{id:'root_cleaver',qty:1},{id:'root_mail',qty:1,sockets:[{sid:'shadow_root',star:1,alt:false}]},{id:'shadow:shadow_root',qty:1,attrs:{star:1}}]}).added;
  assert.equal(SHOP.sell(db,inv,'s1',w,1).ok,true);assert.equal(inv.zeny,Math.floor(db.items.root_cleaver.price*0.5));
  assert.match(SHOP.sell(db,inv,'s2',a,1).err,/เงา/);assert.match(SHOP.sell(db,inv,'s3',sh,1).err,/ไม่รับซื้อ/);
  INV.find(inv,a).sockets=[null];INV.find(inv,a).eq='armor';assert.equal(SHOP.sell(db,inv,'s4',a,1).ok,false,'สวมอยู่');});

test('ซื้อแล้วขายคืนขาดทุนเสมอ (กันปั๊มเงิน)',()=>{
  for(const sh of Object.values(db.shops.shops))for(const id of sh.items)assert.ok(SHOP.sellPrice(db,id)<SHOP.buyPrice(db,id),id);});

test('คลัง: ย้ายไป-กลับ คุณสมบัติประจำชิ้นติดไป · ยาซ้อนกอง · ช่องเต็ม = ปฏิเสธ · key ซ้ำไม่ทำซ้ำ',()=>{
  const bag=fresh(),box=INV.create();
  const [w,p]=INV.apply(db,bag,{key:'g',reason:'t',add:[{id:'dark_blade',qty:1,sockets:[null],attrs:{refine:5}},{id:'red_potion',qty:10}]}).added;
  assert.equal(SHOP.transfer(db,bag,box,'t1',w,1,{toSlots:5}).ok,true);
  const moved=box.items[0];assert.equal(moved.refine,5);assert.deepEqual(moved.sockets,[null]);assert.equal(INV.find(bag,w),null);
  assert.equal(SHOP.transfer(db,bag,box,'t1',p,4).dup,true);assert.equal(INV.find(bag,p).qty,10);
  SHOP.transfer(db,bag,box,'t2',p,4);SHOP.transfer(db,bag,box,'t3',p,3);
  assert.equal(box.items.filter(x=>x.id==='red_potion').length,1);assert.equal(box.items.find(x=>x.id==='red_potion').qty,7);assert.equal(INV.find(bag,p).qty,3);
  assert.equal(SHOP.transfer(db,box,bag,'t4',moved.uid,1).ok,true);assert.equal(bag.items.find(x=>x.id==='dark_blade').refine,5);
  const full=INV.create();INV.apply(db,full,{key:'f',reason:'t',add:[{id:'root_mail',qty:2}]});
  assert.equal(SHOP.transfer(db,bag,full,'t5',bag.items.find(x=>x.id==='dark_blade').uid,1,{toSlots:2}).err,'ช่องเต็ม');
  assert.equal(SHOP.transfer(db,bag,box,'t6',INV.find(bag,p).uid,9).ok,false,'ย้ายเกินที่มี');});

test('คลัง: ของรวมไม่หายไม่งอก (ย้ายไปมา 200 ครั้ง)',()=>{
  const bag=fresh(),box=INV.create();INV.apply(db,bag,{key:'g',reason:'t',add:[{id:'red_potion',qty:50},{id:'root_mail',qty:3}]});
  const total=()=>[bag,box].flatMap(i=>i.items).reduce((n,x)=>n+x.qty,0);const t0=total();
  for(let i=0;i<200;i++){const [a,b]=i%2?[box,bag]:[bag,box];const s=a.items[i%a.items.length];if(s)SHOP.transfer(db,a,b,'m'+i,s.uid,Math.min(s.qty,1+i%7));}
  assert.equal(total(),t0);});

test('โรงแรม & ค่าคลัง หักเงิน · สถิติเงินเข้า/ออกแยกหมวด',()=>{
  const inv=fresh(500);SHOP.rest(db,inv,'r1');SHOP.storageFee(db,inv,'f1');SHOP.buy(db,inv,'b','item_shop','red_potion',2);
  INV.apply(db,inv,{key:'k',reason:'zeny:kill',zeny:30});
  assert.equal(inv.zeny,500-50-40-100+30);
  assert.deepEqual(inv.stats.sink,{inn:90,shop:100});assert.deepEqual(inv.stats.src,{zeny:30});});
