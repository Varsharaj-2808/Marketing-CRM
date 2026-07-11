const fs = require('fs');
let file = fs.readFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', 'utf8');

// Replace test('...', async () => { with test(`...`, async () => {
file = file.replace(/test\('test-ep-5\.1\.1-b-(\d{3}): (.*?)',\s*async \(\) => {/g, (match, id, desc) => {
  // If the description contains an unescaped backtick (rare, but possible), escape it.
  const escapedDesc = desc.replace(/`/g, '\\`');
  return `test(\`test-ep-5.1.1-b-${id}: ${escapedDesc}\`, async () => {`;
});

fs.writeFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', file);
