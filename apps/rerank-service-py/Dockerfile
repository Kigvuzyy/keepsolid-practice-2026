# syntax=docker/dockerfile:1.7

ARG PYTHON_VERSION=3.13
ARG APP_PORT=3004
ARG RERANK_COMPUTE_PROFILE=cpu

FROM python:${PYTHON_VERSION}-slim AS runner
ARG APP_PORT
ARG RERANK_COMPUTE_PROFILE

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/app/.cache/huggingface \
    PORT=${APP_PORT} \
    RERANK_COMPUTE_PROFILE=${RERANK_COMPUTE_PROFILE}

WORKDIR /app

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/.cache/huggingface /app/.cache/temp \
    && chown -R appuser:appuser /app

COPY requirements.base.txt ./requirements.base.txt
COPY requirements.cpu.txt ./requirements.cpu.txt
COPY requirements.gpu.txt ./requirements.gpu.txt
COPY requirements.txt ./requirements.txt

RUN --mount=type=cache,target=/root/.cache/pip \
    python -m pip install --upgrade pip \
    && if [ "$RERANK_COMPUTE_PROFILE" = "cpu" ]; then \
        python -m pip install --index-url https://download.pytorch.org/whl/cpu torch \
        && python -m pip install -r requirements.cpu.txt; \
    elif [ "$RERANK_COMPUTE_PROFILE" = "gpu" ]; then \
        python -m pip install -r requirements.gpu.txt; \
    else \
        echo "Unsupported RERANK_COMPUTE_PROFILE: $RERANK_COMPUTE_PROFILE" >&2 \
        && exit 1; \
    fi

COPY app.py ./app.py
COPY run.py ./run.py
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=5m --retries=6 \
  CMD sh -c "python -c \"import urllib.request; urllib.request.urlopen('http://127.0.0.1:$PORT/health')\"" || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["python", "run.py"]
