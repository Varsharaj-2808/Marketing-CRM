const fs = require('fs');
const md = fs.readFileSync('D:/CRM market/story-5.1.1.md', 'utf8');
let testFile = fs.readFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', 'utf8');

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

const testRegex = /test\('test-ep-5\.1\.1-b-(\d{3}): (.*?)',/g;
let match;
while ((match = testRegex.exec(testFile)) !== null) {
  const id = 'test-ep-5.1.1-b-' + match[1];
  const testDesc = match[2];
  const mdData = mdTests[id];
  
  if (mdData && mdData.description && mdData.description !== testDesc) {
     testFile = testFile.replace(`test('${id}: ${testDesc}'`, `test('${id}: ${mdData.description}'`);
  }
}

// Special message regex replacements
for (const [id, mdData] of Object.entries(mdTests)) {
  if (mdData.message) {
    // Find the block of the test
    const blockRegex = new RegExp(`test\\('${id}:.*?\\}\\);`, 's');
    const blockMatch = testFile.match(blockRegex);
    if (blockMatch) {
       let block = blockMatch[0];
       // Replace expect(res.body.message).toMatch(/.../i)
       block = block.replace(/expect\(res\.body\.message\)\.toMatch\(\/.*?\/i\);/g, `expect(res.body.message).toBe('${mdData.message}');`);
       // Replace expect(res.body.message).toBe('...') if it doesn't match
       block = block.replace(/expect\(res\.body\.message\)\.toBe\('[^']+'\);/g, `expect(res.body.message).toBe('${mdData.message}');`);
       
       testFile = testFile.replace(blockMatch[0], block);
    }
  }
}

fs.writeFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', testFile);
console.log('Tests updated successfully.');
