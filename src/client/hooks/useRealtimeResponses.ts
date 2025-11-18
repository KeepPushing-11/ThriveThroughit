import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

type ResponseCreated = { response: any };

export function useRealtimeResponses(opts?: { serverUrl?: string; token?: string }) {
  const serverUrl = opts?.serverUrl ?? (process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace(/\/$/, '') : 'http://localhost:4000');
  const token = opts?.token ?? (typeof window !== 'undefined' ? (localStorage.getItem('authToken') || localStorage.getItem('token')) : undefined);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch(e) { /* noop */ }
        socketRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const socket = token ? io(serverUrl, { auth: { token }, transports: ['websocket', 'polling'] }) : io(serverUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => {
      console.debug('Realtime socket connected', socket.id);
    });
    socket.on('connect_error', (err: any) => {
      console.warn('Realtime connect_error', err);
    });
    return socket;
  }, [serverUrl, token]);

  const disconnect = useCallback(() => {
    if (!socketRef.current) return;
    try { socketRef.current.disconnect(); } catch(e) { /* noop */ }
    socketRef.current = null;
  }, []);

  const joinSurvey = useCallback((surveyId: string) => {
    const s = connect();
    if (!s) return;
    s.emit('join:survey', surveyId);
  }, [connect]);

  const leaveSurvey = useCallback((surveyId: string) => {
    const s = socketRef.current;
    if (!s) return;
    s.emit('leave:survey', surveyId);
  }, []);

  const onResponseCreated = useCallback((cb: (payload: ResponseCreated) => void) => {
    const s = connect();
    if (!s) return () => {};
    const handler = (data: ResponseCreated) => cb(data);
    s.on('response:created', handler);
    return () => { s.off('response:created', handler); };
  }, [connect]);

  return { connect, disconnect, joinSurvey, leaveSurvey, onResponseCreated } as const;
}
