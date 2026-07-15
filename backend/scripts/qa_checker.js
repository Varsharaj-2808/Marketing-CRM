const fs = require('fs');

const md = fs.readFileSync('D:/CRM market/story-5.1.1.md', 'utf8');
const js = fs.readFileSync('D:/CRM market/backend/src/__tests__/story5.1.1_history.test.js', 'utf8');

const mdTests = {};
const blocks = md.split(/test-ep-5\.1\.1-b-(\d{3})/);
let totalMdTests = 0;
for (let i = 1; i < blocks.length; i += 2) {
  totalMdTests++;
  const id = 'test-ep-5.1.1-b-' + blocks[i];
  const content = blocks[i+1];
  
  // Extract details
  let methodMatch = content.match(/Category: (GET|POST|PUT|PATCH|DELETE) (.*?)\n/);
  if (!methodMatch) methodMatch = content.match(/Send (GET|POST|PUT|PATCH|DELETE) (.*?)\s/);
  
  let expectedStatus = content.match(/HTTP\s+(\d{3})/);
  
  mdTests[id] = {
    method: methodMatch ? methodMatch[1] : null,
    endpoint: methodMatch ? methodMatch[2].trim() : null,
    expectedStatus: expectedStatus ? parseInt(expectedStatus[1]) : null
  };
}

let implementedTests = 0;
const testRegex = /test\(`(test-ep-5\.1\.1-b-\d{3}):.*?\`,[\s\S]*?\}\);/g;
const jsTests = {};
let match;
while ((match = testRegex.exec(js)) !== null) {
  implementedTests++;
  const id = match[1];
  const body = match[0];
  jsTests[id] = body;
}

const report = [];
report.push(`MD contains ${totalMdTests} tests. JS contains ${implementedTests} tests.`);

// Check for missing tests
const missing = Object.keys(mdTests).filter(id => !jsTests[id]);
if (missing.length > 0) {
  report.push(`\nMISSING TESTS IN JS (${missing.length}):`);
  missing.forEach(id => report.push(`- ${id}`));
}

// Check for method/endpoint/status mismatches
report.push(`\nIMPLEMENTATION MISMATCHES:`);
for (const id of Object.keys(jsTests)) {
  const mdData = mdTests[id];
  if (!mdData) continue;
  
  const body = jsTests[id];
  const issues = [];
  
  if (mdData.expectedStatus && !body.includes(`.toBe(${mdData.expectedStatus})`) && !body.includes(`.toContain(${mdData.expectedStatus})`)) {
    issues.push(`Expected status ${mdData.expectedStatus} not found in assertions.`);
  }
  
  if (mdData.method) {
    const methodLower = mdData.method.toLowerCase();
    if (!body.includes(`.${methodLower}(`)) {
       issues.push(`Expected HTTP method ${mdData.method} not used in request.`);
    }
  }
  
  if (issues.length > 0) {
    report.push(`${id}:`);
    issues.forEach(i => report.push(`  - ${i}`));
  }
}

fs.writeFileSync('D:/CRM market/qa_report.txt', report.join('\n'));
console.log('QA analysis complete');
