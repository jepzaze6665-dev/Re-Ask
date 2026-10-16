// โหลด data/db ฝั่ง Node (เทสต์ / เครื่องมือ / เซิร์ฟเวอร์ในอนาคต) — ตัด key ที่ขึ้นต้นด้วย _ เหมือน game/rpg.js
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','data','db');
const SHADOW=require('../shared/shadow.js');
const read=f=>JSON.parse(fs.readFileSync(path.join(ROOT,f),'utf8'));
const strip=o=>{const r={};for(const k in o)if(k[0]!=='_')r[k]=o[k];return r;};
/** @returns {any} */
function loadDb(){const maps={};
  for(const f of fs.readdirSync(path.join(ROOT,'maps')))if(f.endsWith('.json'))maps[f.slice(0,-5)]=read('maps/'+f);
  return SHADOW.installItems({rules:read('rules.json'),refine:read('refine.json'),codex:read('codex.json'),shops:read('shops.json'),quests:strip(read('quests.json')),dungeons:strip(read('dungeons.json')),rifts:read('rifts.json'),jobs:strip(read('jobs.json')),skills:strip(read('skills.json')),items:strip(read('items.json')),
    mobs:strip(read('mobs.json')),statuses:strip(read('statuses.json')),shadows:strip(read('shadows.json')),maps});}
module.exports={loadDb};
