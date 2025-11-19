# Deploying ThriveThroughit to Render

This document explains how to deploy the `ThriveThroughit` app to Render, run database migrations, and validate a successful realtime smoke test.

Quick summary
- Use `render.yaml` (already present) to define the web service and a one-off `migrate` job.
- Add required Render environment variables (see list below).
- Add two GitHub repository secrets (`RENDER_API_KEY` and `RENDER_MIGRATE_SERVICE_ID`) so the workflow can trigger the migrate job.
- The repo includes a GitHub Actions workflow `.github/workflows/render-deploy.yml` that builds and triggers the `migrate` job.

Required environment variables (set these in Render service settings)
- `JWT_SECRET` (required): a strong secret used to sign JWTs. Generate with `openssl rand -hex 32`.
- `DATABASE_URL` (recommended): Postgres connection string (use Render Postgres or other provider).
- `REDIS_URL` (optional but recommended): Redis connection string for Socket.IO adapter if you expect multiple web instances.
- `WS_CORS_ORIGIN` (optional): restrict websocket origins (e.g., `https://app.example.com`).

GitHub secrets required for CI workflow
- `RENDER_API_KEY`: API key created in Render (Account → API Keys) with permissions to trigger jobs.
- `RENDER_MIGRATE_SERVICE_ID`: Render service ID of the `migrate` job (find in Render Dashboard or via API).

Render setup steps
1. In Render, create a new Web Service and connect your GitHub repository (or import using `render.yaml`).
2. Ensure the service picks up `render.yaml` from the `main` branch.
3. In the service settings, add the environment variables listed above.
4. Confirm the `migrate` job appears in Render's Jobs list (the job comes from `render.yaml`).
5. Optionally, run the `migrate` job once manually from the Render dashboard to ensure migrations succeed.
6. Merge to `main` to trigger a deploy. The GitHub Actions workflow will build and then call the Render API to run the `migrate` job.

How to trigger the migrate job manually (Render Dashboard)
1. Open your service on Render.
2. Choose the `Jobs` tab and select the `migrate` job.
3. Click **Manual Run**.

Triggering migrate via API (example)
```bash
# Replace SERVICE_ID and set RENDER_API_KEY in environment
curl -X POST "https://api.render.com/v1/services/$SERVICE_ID/jobs" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Accept: application/json"
```

Smoke test (after deploy)
1. Confirm `/ready` returns `200 OK`:
```bash
curl -v https://your-deployed-url/ready
```
2. Generate a dev token locally or via your auth provider. A helper script exists: `node scripts/gen-dev-token.js`.
3. Start the test socket client (from the repo) in a shell:
```bash
DEV_TOKEN=$(cat .dev_token) node scripts/test-socket-client.js
```
4. POST a response to the deployed API (use the same JWT):
```bash
DEV_TOKEN=$(cat .dev_token)
curl -X POST https://your-deployed-url/api/responses \
  -H "Authorization: Bearer $DEV_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"companyId":"acme","surveyId":"smoke-test","respondentId":"smoke-user","answers":{"q1":"7"}}'
```
5. The test socket client should log a `response:created` event.

Notes and troubleshooting
- Duplicate events: With the current setup the server emits the event on POST and Postgres NOTIFY is relayed — clients can receive two events for the same response. If you want single delivery, choose one path (emit in API or rely on NOTIFY relay) or add dedup logic.
- If Socket.IO clients can't connect in Render, check `WS_CORS_ORIGIN` and ensure `REDIS_URL` is set if you run multiple instances.
- If migrations fail, check `DATABASE_URL` is correct and that the Render service has network access to your DB.

If you'd like, I can automatically trigger a deploy now if you provide the `RENDER_API_KEY` and `RENDER_MIGRATE_SERVICE_ID` (or set them as GitHub secrets and push to `main`).

---
File references
- `render.yaml` — Render service and job configuration
- `.github/workflows/render-deploy.yml` — CI workflow that triggers the `migrate` job
- `scripts/gen-dev-token.js` — helper to create a dev JWT for testing
- `scripts/test-socket-client.js` — simple socket client to verify `response:created` events
