import { Pool } from 'pg';

export function startPgNotifyListener(cb: (channel: string, payload: string) => void) {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.log('startPgNotifyListener: noop (DATABASE_URL not configured)');
    return () => {};
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  (async () => {
    const client = await pool.connect();
    try {
      await client.query('LISTEN responses_channel');
      client.on('notification', (msg) => {
        try {
          cb(msg.channel, msg.payload || '');
        } catch (e) {
          console.error('notify callback error', e);
        }
      });
      console.log('Postgres NOTIFY listener started on responses_channel');
    } catch (e) {
      console.error('Failed to start Postgres notify listener', e);
      client.release();
    }
  })();

  return () => {
    try { pool.end(); } catch (e) { /* noop */ }
  };
}
