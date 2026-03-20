from __future__ import annotations

import os

import uvicorn

from app import settings


def is_reload_enabled() -> bool:
    value = os.getenv("UVICORN_RELOAD", "").strip().lower()
    return value in {"1", "true", "yes", "on"}


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=settings.port, reload=is_reload_enabled())
