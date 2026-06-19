# Deploy Facebook crawl (HTTP + WebSocket) — Docker

Khi crawl chạy qua **HTTP** (`POST /facebook/api/v1/CrawlFbForFE`) hoặc **WebSocket**, container backend cần đủ dependency và cấu hình dưới đây.

## 1. Backend (`linkedin_group_crawler`)

### Dockerfile (đã có)

- Image: `mcr.microsoft.com/playwright/python` — có Chromium cho crawl FB.
- `requirements.txt` phải có **`uvicorn[standard]`** và **`websockets`** (WebSocket upgrade).
- Rebuild image sau khi đổi `requirements.txt`:
  ```bash
  docker build -t linkedin-crawler-api ./linkedin_group_crawler
  ```

### Biến môi trường bắt buộc / quan trọng

| Biến | Mô tả |
|------|--------|
| `API_KEY` | Khớp header FE (nếu dùng) |
| `CORS_ORIGINS` | URL frontend production, vd. `https://your-domain.com` |
| `HEADLESS=true` | Bắt buộc trong Docker |
| `GOOGLE_CREDENTIALS_PATH` | Đường dẫn **trong container** tới file service account JSON |
| `SPREADSHEET_ID` | Google Sheet FB |
| `FB_EMAIL`, `FB_PASSWORD`, `FB_2FA_SECRET` | Tài khoản crawl mặc định (nếu dùng) |
| Các biến sheet FB | `GOOGLE_SHEET_NAME_GROUPS`, intent, … theo `env.py` module facebook |

### Volume mount (khuyến nghị)

```yaml
volumes:
  - ./storage:/app/storage          # session FB, linkedin state
  - ./secrets/google-sa.json:/app/secrets/google-sa.json:ro
environment:
  GOOGLE_CREDENTIALS_PATH: /app/secrets/google-sa.json
```

### HTTP crawl trên production

- Request **đồng bộ**, có thể **5–15+ phút** / lần crawl (Playwright).
- Reverse proxy (Nginx/Traefik) cần tăng timeout:
  - `proxy_read_timeout 600s;`
  - `proxy_send_timeout 600s;`
- FE fallback HTTP: đảm bảo client/axios không timeout quá ngắn.

### WebSocket (tuỳ chọn nhưng nên bật)

- Cần `uvicorn[standard]` trong image (đã thêm vào `requirements.txt`).
- Proxy phải hỗ trợ upgrade:
  ```nginx
  location /facebook/api/v1/ws/ {
      proxy_pass http://backend:8000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
      proxy_read_timeout 3600s;
  }
  ```
- Nếu chỉ dùng HTTP: vẫn chạy được, FE tự fallback.

### Resource

- RAM: tối thiểu **2GB**, khuyến nghị **4GB+** (Chromium).
- CPU: 2 core+ khi crawl song song.

## 2. Frontend (`linkedin-crawler-ui`)

Build-time (`.env.production` hoặc build args):

```env
NEXT_PUBLIC_API_FACEBOOK_BASE_URL=https://api.your-domain.com
NEXT_PUBLIC_LINKEDIN_CRAWLER_API_URL=https://api.your-domain.com
```

- URL **không** thêm `/facebook` — FE tự gắn prefix `/facebook` cho API FB.
- Nếu API sau reverse proxy: `https://domain.com/minhhoang-scraper/api` → set đúng base public.

## 3. Checklist trước go-live

- [ ] `GET /health` → 200
- [ ] `GET /facebook/api/v1/groups` → 200 (sheet credentials OK)
- [ ] `POST /facebook/api/v1/CrawlFbForFE` test 1 nhóm (timeout proxy đủ dài)
- [ ] Log không còn `No supported WebSocket library` (rebuild image)
- [ ] `CORS_ORIGINS` có domain FE production
- [ ] File Google credentials mount read-only vào container

## 4. Lệnh chạy mẫu

```bash
docker run -d --name crawler-api \
  -p 8000:8000 \
  --env-file ./linkedin_group_crawler/.env \
  -v $(pwd)/linkedin_group_crawler/storage:/app/storage \
  -v $(pwd)/secrets/google-sa.json:/app/secrets/google-sa.json:ro \
  linkedin-crawler-api
```

Sau deploy, mở UI → Crawl Facebook → nếu WS lỗi, app vẫn crawl qua HTTP như môi trường dev hiện tại.
