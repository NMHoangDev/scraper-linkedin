FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    PORT=8000

WORKDIR /app

# Node 20 (zca-js chỉ chạy được trên Node, không phải Python) — cài qua
# NodeSource ngay trên base Python thường (KHÔNG dùng base
# mcr.microsoft.com/playwright/python như app gốc vì zalo-module không có
# Playwright, xem docs/ZALO_CHAT_FEATURE_EXTRACTION_GUIDE.md mục 6.1).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# npm ci chạy TRONG container Linux — KHÔNG copy node_modules từ máy dev
# (tránh bug symlink Windows→Linux, mục 6.3 guide).
COPY package.json package-lock.json* ./
COPY vendor/zca-js ./vendor/zca-js
RUN npm install --omit=dev

COPY . .

RUN useradd --create-home appuser \
    && mkdir -p /app/artifacts/zca-auth /app/artifacts/debug \
    && chown -R appuser:appuser /app

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health').read()"

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
