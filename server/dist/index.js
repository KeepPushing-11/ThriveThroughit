"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const body_parser_1 = __importDefault(require("body-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
// Optional Redis adapter for horizontal scaling
let redisAdapterConfigured = false;
if (process.env.REDIS_URL) {
    try {
        // lazy-require redis adapter to avoid dev dependency issues when not set
        // use the official redis client and socket.io redis adapter
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createAdapter } = require('@socket.io/redis-adapter');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { createClient } = require('redis');
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();
        Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
            io.adapter(createAdapter(pubClient, subClient));
            redisAdapterConfigured = true;
            console.log('Socket.IO Redis adapter configured');
        }).catch((err) => {
            console.error('Failed to connect Redis for adapter', err);
        });
    }
    catch (e) {
        console.warn('Redis adapter not available (install @socket.io/redis-adapter and redis)');
    }
}
const notifyListener_1 = require("./notifyListener");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
app.use(body_parser_1.default.json());
// Serve frontend build if present at repo root `build/` or in `client/build`
const clientBuildPath = path_1.default.join(__dirname, '..', 'client', 'build');
const repoBuildPath = path_1.default.join(__dirname, '..', '..', 'build');
if (fs_1.default.existsSync(clientBuildPath)) {
    app.use(express_1.default.static(clientBuildPath));
    console.log('Serving static files from client/build');
}
else if (fs_1.default.existsSync(repoBuildPath)) {
    app.use(express_1.default.static(repoBuildPath));
    console.log('Serving static files from build/ at repo root');
}
else {
    console.log('No frontend build found to serve (client/build or build/)');
}
// Health check endpoint for Render and load balancers
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
const server = http_1.default.createServer(app);
exports.server = server;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.WS_CORS_ORIGIN || '*',
    },
    maxHttpBufferSize: 1e6,
});
exports.io = io;
// Socket auth middleware: expects handshake.auth.token (JWT)
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token)
        return next(new Error('Auth token required'));
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev_secret');
        if (!payload.companyId)
            return next(new Error('companyId required in token'));
        socket.data.companyId = String(payload.companyId);
        socket.data.userId = payload.sub;
        return next();
    }
    catch (err) {
        return next(new Error('Invalid token'));
    }
});
io.on('connection', (socket) => {
    const companyId = socket.data.companyId;
    socket.join(`company:${companyId}`);
    socket.emit('connected', { companyId });
    socket.on('join:survey', (surveyId) => {
        socket.join(`company:${companyId}:survey:${surveyId}`);
    });
    socket.on('leave:survey', (surveyId) => {
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
        let payload;
        try {
            payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'dev_secret');
        }
        catch {
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
        const saved = await (0, db_1.saveResponse)({ companyId, surveyId, respondentId, answers });
        // Emit to rooms
        io.to(`company:${companyId}`).emit('response:created', { response: saved });
        io.to(`company:${companyId}:survey:${surveyId}`).emit('response:created', { response: saved });
        return res.json({ ok: true, response: saved });
    }
    catch (err) {
        console.error('POST /api/responses error', err);
        return res.status(500).json({ error: err.message || 'internal server error' });
    }
});
// Start Postgres NOTIFY listener (optional but useful if responses inserted elsewhere)
(0, notifyListener_1.startPgNotifyListener)((channel, payload) => {
    try {
        const data = JSON.parse(payload);
        if (data.companyId) {
            io.to(`company:${data.companyId}`).emit(data.event || channel, data);
            if (data.surveyId)
                io.to(`company:${data.companyId}:survey:${data.surveyId}`).emit(data.event || channel, data);
        }
        else {
            io.emit(data.event || channel, data);
        }
    }
    catch (err) {
        console.error('Invalid payload from NOTIFY', payload);
    }
});
const PORT = Number(process.env.PORT || 4000);
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Realtime Socket.IO server listening on port ${PORT}`);
    });
}
