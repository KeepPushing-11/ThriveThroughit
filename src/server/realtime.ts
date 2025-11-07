/* Simple Express + Socket.IO server to stream analysis updates.
   - POST /analysis/start will kick off a run (either a spawned command if ANALYSIS_CMD is set,
     or a simulated run otherwise).
   - Emits 'analysis:update', 'analysis:complete', 'analysis:error' via Socket.IO.

   Dev run:
     npm install express socket.io cors body-parser
     npm install -D ts-node-dev typescript @types/node @types/express @types/body-parser @types/cors
     Add script: "start:realtime": "ts-node-dev --respawn --transpile-only src/server/realtime.ts"
     npm run start:realtime
*/
import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import bodyParser from "body-parser";
import cors from "cors";
import { spawn } from "child_process";

export type AnalysisUpdate = {
  id: string;
  stage: string;
  progress: number; // 0..100
  payload?: any;
  error?: string;
};

const app = express();
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// Start analysis endpoint
app.post("/analysis/start", async (req, res) => {
  const { id } = req.body as { id?: string };
  const runId = id ?? `run-${Date.now()}`;
  res.status(202).json({ runId });

  try {
    const cmd = process.env.ANALYSIS_CMD;
    if (cmd) {
      await runAnalysisCommand(runId, cmd, (update) => {
        io.emit("analysis:update", update);
      });
      io.emit("analysis:complete", { id: runId, success: true });
    } else {
      // fallback to simulation
      await runAnalysisSimulation(runId, (update) => {
        io.emit("analysis:update", update);
      });
      io.emit("analysis:complete", { id: runId, success: true });
    }
  } catch (err: any) {
    console.error("Analysis failed:", err);
    io.emit("analysis:error", { id: runId, error: err?.message ?? String(err) });
  }
});

// If ANALYSIS_CMD is set, spawn it and stream progress via stdout lines formatted as JSON:
// e.g. {"stage":"scan","progress":12,"payload":{...}}
function runAnalysisCommand(id: string, cmd: string, onUpdate: (u: AnalysisUpdate) => void) {
  return new Promise<void>((resolve, reject) => {
    const parts = cmd.split(" ");
    const proc = spawn(parts[0], parts.slice(1), { shell: false, env: process.env });

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");

    proc.stdout.on("data", (chunk: string) => {
      const lines = String(chunk).split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          onUpdate({
            id,
            stage: parsed.stage ?? "log",
            progress: parsed.progress ?? 0,
            payload: parsed.payload ?? { text: line },
          });
        } catch {
          onUpdate({ id, stage: "log", progress: 0, payload: { text: line } });
        }
      }
    });

    proc.stderr.on("data", (chunk: string) => {
      onUpdate({ id, stage: "error", progress: 0, payload: { text: String(chunk) } });
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

// Simulation function used when no ANALYSIS_CMD is defined.
// Emits periodic updates and completes at 100.
async function runAnalysisSimulation(id: string, onUpdate: (u: AnalysisUpdate) => void) {
  const steps = [
    { stage: "init", duration: 300 },
    { stage: "scan-files", duration: 700 },
    { stage: "parse", duration: 900 },
    { stage: "analyze", duration: 1400 },
    { stage: "finalize", duration: 400 },
  ];

  let progress = 0;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    const increments = Math.max(3, Math.floor(s.duration / 200));
    for (let j = 0; j < increments; j++) {
      await wait(s.duration / increments);
      progress = Math.min(100, progress + Math.floor(100 / (steps.length * increments)));
      onUpdate({
        id,
        stage: s.stage,
        progress,
        payload: { stepIndex: i, subStep: j },
      });
    }
  }
  onUpdate({ id, stage: "done", progress: 100 });
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Realtime analysis server listening on http://localhost:${PORT}`);
});
