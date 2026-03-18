# syntax=docker/dockerfile:1.7

ARG PYTHON_VERSION=3.13

FROM python:${PYTHON_VERSION}-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/var/cache/huggingface

WORKDIR /app

RUN useradd --create-home --uid 10001 appuser

COPY requirements.txt ./requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt

COPY app.py ./app.py
COPY .env ./.env

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:3004/health')" || exit 1

USER appuser

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "3004"]
