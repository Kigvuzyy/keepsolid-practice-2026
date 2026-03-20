#!/bin/sh
set -eu

APP_UID=10001
APP_GID=10001

ensure_writable_dir() {
  dir="$1"
  mkdir -p "$dir"

  owner="$(stat -c '%u:%g' "$dir")"
  if [ "$owner" != "${APP_UID}:${APP_GID}" ]; then
    chown -R "${APP_UID}:${APP_GID}" "$dir"
  fi
}

ensure_writable_dir "${HF_HOME:-/app/.cache/huggingface}"
ensure_writable_dir "/app/.cache/temp"

if [ "$#" -eq 0 ]; then
  set -- python run.py
fi

if [ "$#" -eq 2 ] && [ "$1" = "python" ] && [ "$2" = "run.py" ]; then
  exec su -s /bin/sh appuser -c 'exec python run.py'
fi

exec su -s /bin/sh appuser -c "$*"
