/* React hook to subscribe to analysis updates via Socket.IO.
   Usage:
     const { connect, disconnect, connected, updates, start } = useRealtimeAnalysis();
*/
import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { AnalysisUpdate } from "../../types/analysis";

export function useRealtimeAnalysis(serverUrl = (process.env.REACT_APP_ANALYSIS_URL ?? "http://localhost:4000")) {
  const socketRef = useRef<Socket | null>(null);
  const [updates, setUpdates] = useState<AnalysisUpdate[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) return;
    const socket = io(serverUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("analysis:update", (data: AnalysisUpdate) => {
      setUpdates((u) => [...u, data]);
    });
    socket.on("analysis:complete", (data: { id: string; success?: boolean }) => {
      setUpdates((u) => [...u, { id: data.id, stage: "complete", progress: 100 }]);
    });
    socket.on("analysis:error", (err: { id: string; error: string }) => {
      setUpdates((u) => [...u, { id: err.id, stage: "error", progress: 0, error: err.error }]);
    });
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
  }, []);

  const start = useCallback(
    async (body?: any) => {
      const res = await fetch(`${serverUrl.replace(/\/$/, "")}/analysis/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      return res.json();
    },
    [serverUrl]
  );

  return { connect, disconnect, connected, updates, start };
}