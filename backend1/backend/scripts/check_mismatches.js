const fs = require('fs');
const md = fs.readFileSync('D:/CRM market/story-5.1.1.md', 'utf8');
const testFile = fs.readFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', 'utf8');

const mdTests = {};
const blocks = md.split(/test-ep-5\.1\.1-b-(\d{3})/);
for (let i = 1; i < blocks.length; i += 2) {
  const id = 'test-ep-5.1.1-b-' + blocks[i];
  const content = blocks[i+1];
  
  let descMatch = content.match(/Description:\s*(.*?)\n/);
  let statusMatch = content.match(/HTTP\s+(\d{3})/);
  let messageMatch = content.match(/"message":\s*"([^"]+)"/);
  
  mdTests[id] = {
    description: descMatch ? descMatch[1].trim() : '',
    status: statusMatch ? parseInt(statusMatch[1]) : null,
    message: messageMatch ? messageMatch[1] : null
  };
}

let mismatches = [];
const testRegex = /test\('test-ep-5\.1\.1-b-(\d{3}): (.*?)',[\s\S]*?\}\);/g;
let match;
while ((match = testRegex.exec(testFile)) !== null) {
  const id = 'test-ep-5.1.1-b-' + match[1];
  const testDesc = match[2];
  const body = match[0];
  const mdData = mdTests[id];
  
  if (mdData) {
    if (mdData.description && mdData.description !== testDesc) {
       mismatches.push(id + ' Description Mismatch\n  MD: ' + mdData.description + '\n  Test: ' + testDesc);
    }
    
    if (mdData.message) {
       if (!body.includes(mdData.message)) {
          mismatches.push(id + ' Message Mismatch\n  MD Expected: ' + mdData.message + '\n  Test does not contain exact match');
       }
    }
  }
}

fs.writeFileSync('D:/CRM market/mismatches.txt', mismatches.join('\n\n'));
console.log('Mismatches found: ' + mismatches.length);
