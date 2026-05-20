#!/usr/bin/env sh
set -eu

mkdir -p "${TMPDIR:-/tmp}"

exec uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"
