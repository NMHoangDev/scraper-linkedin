# scraper-linkedin — LinkedIn Group Crawler

## Setup & run (Docker)

```bash
cp linkedin-crawler-ui/.env.example linkedin-crawler-ui/.env
cp linkedin_group_crawler/.env.example linkedin_group_crawler/.env
cp docker-compose.override.yml.example docker-compose.override.yml
# Fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET_KEY,
# MARKEE_FB_BASE_URL, MARKEE_FB_API_KEY, MARKEE_FB_EXTENSION_API_KEY
# in linkedin_group_crawler/.env (ask admin for real values)
docker compose up --build
# Open http://localhost:8080
```

## Architecture

```
linkedin_group_crawler/     FastAPI (Python 3.10, :8000)
  app/main.py                 entrypoint, CORS, lifespan, router includes
  app/modules/linkedin/       LinkedIn crawl/react/comment endpoints
  app/modules/facebook/       Facebook automation (Markee service)
  app/modules/zalo/           Zalo messaging bridge
  app/modules/all_platform/   KPI, teams, auth (Supabase), unified posts
  app/core/                   Playwright pool, config, logger
  app/shared/services/        Google Sheet, n8n webhook
linkedin-crawler-ui/        Next.js 16 + React 19 + Tailwind 4, App Router
  next.config.ts              output: "standalone", rewrites /api/* → :8000 (bare-metal only)
nginx-router/               :8080 → FE (:3000) + /api/* → BE (:8000)
```

Backend mounts three routers:
- `router` + `linkedin_app_router` — LinkedIn endpoints
- `api_router` (prefix `/facebook/api/v1`) — Facebook endpoints
- `all_platform_router` (prefix `/api/all-platform`) — KPI, auth, teams, Zalo, WebSocket

CORS middleware allows `chrome-extension://*`, `localhost:3000/8080`, plus comma-separated `CORS_ORIGINS` env var.

## Critical gotchas

### `NEXT_PUBLIC_*` vars are BUILD-TIME only

Changing `linkedin-crawler-ui/.env` has no effect in Docker. Override via build-args in `docker-compose.override.yml`:
```yaml
services:
  frontend:
    build:
      args:
        NEXT_PUBLIC_LINKEDIN_CRAWLER_API_URL: http://localhost:8080
```
The **original** `docker-compose.yml` hardcodes production URLs (`https://seeding.markeeai.com`). Without the override, the local frontend will call production — broken CORS, wrong auth cookies.

### `docker-compose.override.yml` must NOT be committed

It's in `.gitignore`. Docker Compose auto-merges it — no `-f` flag needed. The `.example` file IS safe to commit. Committing the real override file breaks production deploys (it silently overrides production build-args to `localhost:8080`).

### Backend env loading: `.env` then `.env.local` (override)

`app/core/config.py` loads `BASE_DIR/.env` first, then `BASE_DIR/.env.local` with `override=True`. Drop a `.env.local` to override production values without touching the committed `.env`.

### Dev safeguards — set env vars for local

For local Docker dev, the backend `.env` should include:
```
DISABLE_SCHEDULER=1          # Don't auto-crawl on startup
DISABLE_ZCA_LISTENERS=1      # Don't start Zalo persistent listeners
DISABLE_ALL_PLATFORM_CRAWL_24H=1
```
Without these, the local backend may trigger production crawls using real credentials.

### Frontend `--build` is required after code changes

The Dockerfile uses `sed` to strip `basePath`/`assetPrefix` at build time. `npm run build` runs `postbuild` (copies standalone assets via `scripts/copy-standalone-assets.mjs`). For bare metal:
```bash
cd linkedin-crawler-ui
npm ci
npm run dev   # port 3000
```

### Backend quirks

- **`setuptools<70`** required — `playwright-stealth==1.0.6` depends on `pkg_resources` (dropped in setuptools ≥70)
- **`uvicorn[standard]`** required for WebSocket (`/facebook/api/v1/ws/CrawlFbForFE`)
- **Health check**: `GET /health` → `{"success":true,"message":"Service is healthy","data":null}` (only on port 8000 directly; nginx doesn't proxy `/health` — it proxies `/api/*` and `/ws/*` only)

### `@/components/nguyen/*` legacy path alias

In `tsconfig.json`, `@/components/nguyen/*` maps to `components/facebook-crawler/*`. The `@/*` alias maps to the project root. Use `@/*` for new code.

### Reference docs

| File | Content |
|------|---------|
| `CRAWL_DATA_LINKEDIN_MAP.md` | Full architecture map (BE routes, FE components, data flow) |
| `LOCAL_DEV.md` | Local Docker setup with troubleshooting |
| `linkedin-crawler-ui/AGENTS.md` | Next.js 16 version-specific rules (read before writing FE code) |
| `linkedin_group_crawler/.env.example` | All backend env vars with descriptions |

## Commands

| What | Command | Where |
|------|---------|-------|
| Run all (Docker) | `docker compose up --build` | root |
| Frontend dev (bare metal) | `npm run dev` | `linkedin-crawler-ui/` |
| Frontend type-check + lint | `npm run check` | `linkedin-crawler-ui/` |
| Frontend type-check only | `npm run type-check` | `linkedin-crawler-ui/` |
| Frontend lint only | `npm run lint` | `linkedin-crawler-ui/` |
| Frontend build | `npm run build` | `linkedin-crawler-ui/` |
| Backend tests | `python -m pytest tests/` | `linkedin_group_crawler/` |
| Backend dev server | `uvicorn app.main:app --host 0.0.0.0 --port 8000` | `linkedin_group_crawler/` |
| Deploy frontend only | `bash deploy.sh frontend` | root (on 10.30.50.29) |
| Deploy backend only | `bash deploy.sh backend` | root (on 10.30.50.29) |
| Deploy all | `bash deploy.sh all` | root (on 10.30.50.29) |

## CI

- **PR → `dev`/`ui-trial`/`main`**: build check (`npm run build` FE + `py_compile` BE), no deploy
- **Push → `dev`**: auto-deploy on self-hosted runner at 10.30.50.29
- **Manual trigger (`workflow_dispatch`)**: deploy to production (10.120.60.26)

## CodeGraph

This repository is indexed by CodeGraph (`.codegraph/` exists at the project root). Reach for CodeGraph **before** `grep`, `find`, or `Read` when you need to understand or locate code:

- **MCP tool**: `codegraph_explore` returns relevant symbols' verbatim source plus call paths in one call
- **Shell**: `codegraph explore "<symbol names or question>"` from the project root

## GitNexus — Code Intelligence

This project is indexed by GitNexus as **scraper-linkedin** (11808 symbols, 27845 relationships, 300 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root.

### Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius to the user.
- **MUST run `detect_changes()` before committing** to verify changes only affect expected symbols.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk.
- When exploring unfamiliar code, use `query({search_query: "concept"})` instead of grepping.
- For full context on a symbol, use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (`analyze --pdg` required).

### Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()`.

### Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/scraper-linkedin/context` | Codebase overview, index freshness |
| `gitnexus://repo/scraper-linkedin/process/{name}` | Step-by-step execution trace |

### CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |
