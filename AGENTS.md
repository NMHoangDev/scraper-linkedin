# scraper-linkedin — LinkedIn Group Crawler

## Project structure

```
linkedin_group_crawler/     FastAPI backend (Python 3.10, port 8000)
  app/
    main.py                   FastAPI app, CORS, includes routers
    modules/linkedin/         LinkedIn crawl/react/comment endpoints
    modules/facebook/         Facebook automation (via Markee service)
    modules/zalo/             Zalo messaging bridge
    modules/all_platform/     KPI, teams, auth (Supabase)
    core/                     Playwright browser pool, config, Supabase client
    shared/services/          Google Sheet, n8n webhook, category sheet
linkedin-crawler-ui/        Next.js frontend (React 19, TypeScript, port 3000)
  next.config.ts             standalone output, `output: "standalone"`
nginx-router/               nginx config routing :8080 → FE (:3000) /api/* → BE (:8000)
deploy.sh                   Zero-downtime deploy (build-then-switch, auto-verify, auto-rollback)
```

## Commands

### Local dev (Docker — preferred)
```bash
cp linkedin-crawler-ui/.env.example linkedin-crawler-ui/.env
cp linkedin_group_crawler/.env.example linkedin_group_crawler/.env
cp docker-compose.override.yml.example docker-compose.override.yml
# Fill secrets in linkedin_group_crawler/.env (ask admin for Supabase/JWT/Markee/Zalo values)
docker compose up --build
# Open http://localhost:8080
```

### Local dev (bare metal)
```bash
# Backend
cd linkedin_group_crawler
pip install -r requirements.txt
playwright install
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Frontend
cd linkedin-crawler-ui
npm ci
npm run dev   # requires linkedin-crawler-ui/.env (even default values)
```

### Deploy (on host 10.30.50.29)
```bash
bash deploy.sh frontend     # most common — UI only
bash deploy.sh backend      # API only
bash deploy.sh all          # backend then frontend
```

### CI (GitHub Actions)
- Push to `dev` → auto-deploy on self-hosted runner at 10.30.50.29 (git pull + docker compose build + recycle)
- Manual trigger → deploys to production (10.120.60.26)
- PR to `dev`/`ui-trial`/`main` → build check: `npm run build` (FE) + `python -m py_compile` (BE, no deps needed)

### Frontend checks
```bash
cd linkedin-crawler-ui
npm run check        # type-check + lint
npm run type-check   # tsc --noEmit
npm run lint         # eslint (core-web-vitals + TS rules)
npm run build        # next build + postbuild (copies standalone assets)
npm run dev
```

### Backend tests
```bash
cd linkedin_group_crawler
python -m pytest tests/
```

## Gotchas

- **`NEXT_PUBLIC_*` vars are baked at BUILD time** — changing `.env` alone is not enough. Rebuild with `docker compose up --build` or set via build-args for Docker.
- **`docker-compose.override.yml` must NOT be committed** — it overrides build args for local dev. The `.example` template is safe; the real file differs per host and is in `.gitignore`.
- **`setuptools<70`** is pinned in backend Dockerfile — `pkg_resources` (required by `playwright-stealth`) was dropped in setuptools ≥70.
- **`uvicorn[standard]`** required for WebSocket support (`/facebook/api/v1/ws/CrawlFbForFE`).
- **Frontend `output: "standalone"`** — `npm run build` generates `.next/standalone/` with a `server.js`. The `postbuild` script copies static assets into the standalone dir.
- **nginx router at :8080** proxies `/api/*` → backend, everything else → frontend. Single origin avoids CORS/cookie issues.
- **Frontend `linkedin-crawler-ui/.env` must exist** (even with default values) — `docker-compose.yml` requires it. `cp .env.example .env` before running.
- **Backend health check**: GET `/health` returns `{"success": true, "message": "Service is healthy", "data": null}`.
- **Do NOT deploy during demos** — `deploy.sh` header warns this explicitly.

## Reference documentation

| File | Content |
|------|---------|
| `CRAWL_DATA_LINKEDIN_MAP.md` | Full architecture map (BE routes, FE components, data flow) |
| `LOCAL_DEV.md` | Local Docker setup walkthrough with troubleshooting |
| `linkedin-crawler-ui/AGENTS.md` | Next.js version-specific rules (read before writing FE code) |
| `.github/workflows/` | CI/CD pipeline definitions |
| `linkedin_group_crawler/.env.example` | All backend env vars with descriptions |
| `docker-compose.yml` | Full service definitions (frontend, backend, router) |
