#!/usr/bin/env sh
set -eu

export TMPDIR=/tmp
export TEMP=/tmp
export TMP=/tmp

mkdir -p /tmp

exec uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}"
