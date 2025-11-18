require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static client files. Prefer a built client at client/build if present (for React/Vite builds),
// otherwise check for a top-level `build/` directory (Vite outDir) and fallback to client/.
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
const repoBuildPath = path.join(__dirname, '..', 'build');
const clientStaticPath = path.join(__dirname, '..', 'client');

if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  console.log('Serving static files from client/build');
} else if (fs.existsSync(repoBuildPath)) {
  app.use(express.static(repoBuildPath));
  console.log('Serving static files from build/ at repo root');
} else if (fs.existsSync(clientStaticPath)) {
  app.use(express.static(clientStaticPath));
  console.log('Serving static files from client/');
} else {
  console.log('No client static files found (client/build, build/ or client/)');
}

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);
  socket.emit('server:welcome', { message: 'Welcome! socket.io connected.' });

  socket.on('client:test', (data) => {
    console.log('Received client:test', data);
    // Echo back to the sender
    socket.emit('server:echo', { received: data });
    // Broadcast to others
    socket.broadcast.emit('server:broadcast', { from: socket.id, data });
  });

  socket.on('disconnect', (reason) => {
    console.log(`socket disconnected: ${socket.id} (${reason})`);
  });
});

// Graceful shutdown
function shutdown() {
  console.log('Shutting down server...');
  io.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
