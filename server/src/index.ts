import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { saveResponse, pgPool } from './db';
// redis adapter will be configured after `io` is created (below)
let redisAdapterConfigured = false;
import { startPgNotifyListener } from './notifyListener';

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Serve frontend build if present at repo root `build/` or in `client/build`
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
const repoBuildPath = path.join(__dirname, '..', '..', 'build');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  console.log('Serving static files from client/build');
} else if (fs.existsSync(repoBuildPath)) {
  app.use(express.static(repoBuildPath));
  console.log('Serving static files from build/ at repo root');
} else {
  console.log('No frontend build found to serve (client/build or build/)');
}

// Health check endpoint for Render and load balancers
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const io = new IOServer(server, {
  cors: {
    origin: process.env.WS_CORS_ORIGIN || '*',
  },
  maxHttpBufferSize: 1e6,
});

// Optional Redis adapter for horizontal scaling - configure now that `io` exists
if (process.env.REDIS_URL) {
  try {
    // lazy-require redis adapter to avoid dev dependency issues when not set
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createAdapter } = require('@socket.io/redis-adapter');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createClient } = require('redis');
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      (io as any).adapter(createAdapter(pubClient, subClient));
      redisAdapterConfigured = true;
      console.log('Socket.IO Redis adapter configured');
    }).catch((err: any) => {
      console.error('Failed to connect Redis for adapter', err);
    });
  } catch (e) {
    console.warn('Redis adapter not available (install @socket.io/redis-adapter and redis)');
  }
}

// Socket auth middleware: expects handshake.auth.token (JWT)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth token required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
    if (!payload.companyId) return next(new Error('companyId required in token'));
    socket.data.companyId = String(payload.companyId);
    socket.data.userId = payload.sub;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const companyId = socket.data.companyId;
  socket.join(`company:${companyId}`);
  socket.emit('connected', { companyId });

  socket.on('join:survey', (surveyId: string) => {
    socket.join(`company:${companyId}:survey:${surveyId}`);
  });

  socket.on('leave:survey', (surveyId: string) => {
    socket.leave(`company:${companyId}:survey:${surveyId}`);
  });

  socket.on('disconnect', () => {
    // noop
  });
});

// API: submit a survey response
app.post('/api/responses', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    // Basic token check: Bearer <token> (recommended to use middleware)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header required' });
    }
    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as any;
    } catch {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    const { companyId, surveyId, respondentId, answers } = req.body;
    if (!companyId || !surveyId || !answers) {
      return res.status(400).json({ error: 'companyId, surveyId and answers are required' });
    }
    // Ensure token company matches body company
    if (String(payload.companyId) !== String(companyId)) {
      return res.status(403).json({ error: 'Token not valid for companyId' });
    }

    const saved = await saveResponse({ companyId, surveyId, respondentId, answers });

    // Emit to rooms
    io.to(`company:${companyId}`).emit('response:created', { response: saved });
    io.to(`company:${companyId}:survey:${surveyId}`).emit('response:created', { response: saved });

    return res.json({ ok: true, response: saved });
  } catch (err: any) {
    console.error('POST /api/responses error', err);
    return res.status(500).json({ error: err.message || 'internal server error' });
  }
});

// Start Postgres NOTIFY listener (optional but useful if responses inserted elsewhere)
startPgNotifyListener((channel, payload) => {
  try {
    const data = JSON.parse(payload);
    if (data.companyId) {
      io.to(`company:${data.companyId}`).emit(data.event || channel, data);
      if (data.surveyId) io.to(`company:${data.companyId}:survey:${data.surveyId}`).emit(data.event || channel, data);
    } else {
      io.emit(data.event || channel, data);
    }
  } catch (err) {
    console.error('Invalid payload from NOTIFY', payload);
  }
});

const PORT = Number(process.env.PORT || 4000);
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Realtime Socket.IO server listening on port ${PORT}`);
  });
}

export { app, io, server };