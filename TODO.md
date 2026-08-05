# TODO - Resolve Merge Conflict Markers

## Objective
Xóa toàn bộ conflict marker (<<<<<<<, =======, >>>>>>>) còn sót trong repo,
giữ lại phiên bản code "incoming" (96109985) ở mọi block (HEAD rỗng hoặc thiếu
biến code phía sau dùng).

## Files to fix
- [x] 1. `app/modules/facebook/src/modules/facebook/services/facebook_scraper.py` (2 blocks)
- [x] 2. `app/modules/all_platform/router.py` (1 block)
- [x] 3. `app/modules/all_platform/routers/extension_crawl.py` (3 blocks)

## Verification
- [x] Backend: `py -3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000` → "Application startup complete." (no SyntaxError/NameError)
- [x] Frontend: `npx tsc --noEmit --pretty` → EXIT_0, 0 errors
- [x] Endpoint test: `curl http://localhost:8000/docs` → HTTP_200
