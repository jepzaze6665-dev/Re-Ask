// ตรวจ data/db: node tools/validate_db.js (หรือ npm run validate)
const {loadDb}=require('./load_db.js'),{validateDb}=require('../shared/validate.js');
const errs=validateDb(loadDb());
if(errs.length){console.error('data/db มีปัญหา '+errs.length+' จุด:\n - '+errs.join('\n - '));process.exit(1);}
console.log('data/db ผ่านการตรวจ ✓');
