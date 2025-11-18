const jwt = require('jsonwebtoken');
const fs = require('fs');

const secret = process.env.JWT_SECRET || 'dev_secret';
const companyId = process.env.DEV_COMPANY_ID || 'acme';
const sub = process.env.DEV_USER_ID || 'dev-user';

const payload = {
  sub,
  companyId,
  iat: Math.floor(Date.now() / 1000),
};

const token = jwt.sign(payload, secret, { expiresIn: '7d' });
// Persist token to .dev_token for convenience
try {
  fs.writeFileSync('.dev_token', token, { encoding: 'utf8' });
} catch (e) {
  // ignore write errors
}
console.log(token);
