# Real-time analysis (Socket.IO)

This describes the minimal dev setup to run the realtime server and connect the frontend.

1. Install server deps:
   npm install express socket.io cors body-parser

2. Dev-only TypeScript tooling:
   npm install -D ts-node-dev typescript @types/node @types/express @types/body-parser @types/cors

3. Add a script to your package.json:
   "start:realtime": "ts-node-dev --respawn --transpile-only src/server/realtime.ts"

4. Run the server:
   npm run start:realtime

5. In the frontend, use the hook:
   import { useRealtimeAnalysis } from 'src/client/hooks/useRealtimeAnalysis';
   const { connect, start, updates } = useRealtimeAnalysis();
   connect();
   await start({ id: 'run-1' });

6. Optionally: set ANALYSIS_CMD in the server environment to a command that outputs JSON progress lines:
   export ANALYSIS_CMD="node ./scripts/my-analyzer.js"


Notes on TypeScript build and further fixes:
- I attempted to run a TypeScript build and automated fixes, but this tool cannot run commands in your environment. Please run locally: npx tsc --noEmit to surface existing type errors before merging.
- Typical fixes you may need to apply after adding these files:
  - Install runtime deps: socket.io, express, cors, body-parser
  - Install dev deps: ts-node-dev, typescript, @types/node, @types/express, @types/body-parser, @types/cors
  - If you see import errors, enable "esModuleInterop": true in tsconfig.json or adjust imports.
  - If strict errors appear, add minor guards where necessary.