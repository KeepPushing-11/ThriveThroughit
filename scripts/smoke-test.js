const { spawnSync } = require('child_process');
const axios = require('axios');
const fs = require('fs');

// Generate token and write to .dev_token
console.log('Generating dev token...');
const token = spawnSync('node', ['scripts/gen-dev-token.js'], { encoding: 'utf8' }).stdout.trim();
fs.writeFileSync('.dev_token', token);

// Start test socket client in background
console.log('Starting socket client...');
const client = spawnSync('node', ['scripts/test-socket-client.js'], { env: { ...process.env, DEV_TOKEN: token }, stdio: 'inherit' });

// Post a test response
console.log('Posting test response...');
axios.post('http://localhost:4000/api/responses', {
  companyId: 'acme',
  surveyId: 'smoke-test-survey',
  respondentId: 'smoke-user',
  answers: { 'ai-1': 5 }
}, { headers: { Authorization: `Bearer ${token}` } }).then(res => {
  console.log('POST response status', res.status);
  process.exit(0);
}).catch(err => {
  console.error('POST failed', err.message);
  process.exit(2);
});
