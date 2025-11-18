const { io } = require('socket.io-client');
const fs = require('fs');

const token = process.env.DEV_TOKEN || (() => {
  try { return fs.readFileSync('./.dev_token', 'utf8').trim(); } catch (e) { return null; }
})();

const SERVER = process.env.SERVER_URL || 'http://localhost:4000';
const SURVEY_ID = process.env.SURVEY_ID || 'test-survey-1';

console.log('connecting to', SERVER, 'with token?', !!token);
const socket = token ? io(SERVER, { auth: { token }, transports: ['websocket', 'polling'] }) : io(SERVER, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('join:survey', SURVEY_ID);
});

socket.on('response:created', (data) => {
  console.log('response:created event received:', JSON.stringify(data, null, 2));
});

socket.on('connect_error', (err) => {
  console.error('connect_error', err && err.message);
});

socket.on('disconnect', (reason) => {
  console.log('disconnected', reason);
});

// keep process alive
setInterval(() => {}, 1000);
