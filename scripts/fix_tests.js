const fs = require('fs');
let file = fs.readFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', 'utf8');
file = file.replace(/toBe\('Not authorized to view this lead's history'\)/g, "toBe(`Not authorized to view this lead's history`)");
fs.writeFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', file);
