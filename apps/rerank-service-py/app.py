from __future__ import annotations

import importlib.util
import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sentence_transformers import CrossEncoder

logger = logging.getLogger("rerank-service")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    port: int = 3004
    rerank_model: str = "BAAI/bge-reranker-v2-m3"
    rerank_fallback_model: str | None = None
    rerank_backend: Literal["torch", "onnx", "openvino"] = "onnx"
    rerank_device: str = "cpu"
    rerank_batch_size: int = 16
    rerank_max_length: int = 256
    rerank_max_candidates: int = 200
    rerank_top_k_default: int = 10
    rerank_query_max_chars: int = 256
    rerank_candidate_max_chars: int = 1_600
    rerank_allow_backend_fallback: bool = True
    rerank_local_files_only: bool = True
    rerank_trust_remote_code: bool = False
    rerank_temp_dir: str = ".cache/temp"


settings = Settings()
model: CrossEncoder | None = None
model_backend: str | None = None
model_name: str | None = None


class Candidate(BaseModel):
    id: str
    text: str = Field(min_length=1)
    metadata: dict[str, Any] | None = None
    retrieval_score: float | None = None


class RerankRequest(BaseModel):
    query: str = Field(min_length=1)
    candidates: list[Candidate] = Field(min_length=1)
    top_k: int | None = Field(default=None, ge=1)


class RankedCandidate(BaseModel):
    id: str
    text: str
    metadata: dict[str, Any] | None = None
    retrieval_score: float | None = None
    rerank_score: float


class RerankResponse(BaseModel):
    query: str
    total_candidates: int
    returned: int
    backend: str
    model_name: str
    items: list[RankedCandidate]


@asynccontextmanager
async def lifespan(_: FastAPI):
    global model, model_backend, model_name
    model, model_backend, model_name = load_model()
    yield
    model = None
    model_backend = None
    model_name = None


app = FastAPI(
    title="Reranker Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, str | int]:
    return {
        "status": "ok",
        "model_name": model_name or settings.rerank_model,
        "backend": model_backend or settings.rerank_backend,
        "device": settings.rerank_device,
        "batch_size": settings.rerank_batch_size,
        "max_length": settings.rerank_max_length,
    }


@app.post("/rerank", response_model=RerankResponse)
async def rerank(payload: RerankRequest) -> RerankResponse:
    global model, model_backend, model_name

    if model is None:
        raise HTTPException(status_code=503, detail="Model is not initialized")

    if len(payload.candidates) > settings.rerank_max_candidates:
        raise HTTPException(
            status_code=400,
            detail=f"Too many candidates. Max allowed: {settings.rerank_max_candidates}",
        )

    top_k = payload.top_k or settings.rerank_top_k_default
    top_k = min(top_k, len(payload.candidates))

    normalized_query = truncate_text(payload.query, settings.rerank_query_max_chars)
    pairs = [
        (normalized_query, truncate_text(candidate.text, settings.rerank_candidate_max_chars))
        for candidate in payload.candidates
    ]

    scores = model.predict(
        pairs,
        batch_size=settings.rerank_batch_size,
        show_progress_bar=False,
    )

    ranked = [
        RankedCandidate(
            id=candidate.id,
            text=candidate.text,
            metadata=candidate.metadata,
            retrieval_score=candidate.retrieval_score,
            rerank_score=float(score),
        )
        for candidate, score in zip(payload.candidates, scores, strict=True)
    ]

    ranked.sort(key=lambda item: item.rerank_score, reverse=True)
    result = ranked[:top_k]

    return RerankResponse(
        query=payload.query,
        total_candidates=len(payload.candidates),
        returned=len(result),
        backend=model_backend or settings.rerank_backend,
        model_name=model_name or settings.rerank_model,
        items=result,
    )


def load_model() -> tuple[CrossEncoder, str, str]:
    attempts = build_model_attempts()
    last_error: Exception | None = None

    for attempt_model_name, attempt_backend in attempts:
        try:
            loaded_model = build_cross_encoder(attempt_model_name, attempt_backend)
            logger.info(
                "Loaded reranker model='%s' backend='%s' device='%s' batch_size=%s max_length=%s",
                attempt_model_name,
                attempt_backend,
                settings.rerank_device,
                settings.rerank_batch_size,
                settings.rerank_max_length,
            )
            return loaded_model, attempt_backend, attempt_model_name
        except Exception as error:
            last_error = error
            logger.exception(
                "Failed to initialize reranker model='%s' backend='%s'.",
                attempt_model_name,
                attempt_backend,
            )

    if last_error is not None:
        raise last_error

    raise RuntimeError("Failed to initialize reranker: no model attempts were configured")


def build_model_attempts() -> list[tuple[str, Literal["torch", "onnx", "openvino"]]]:
    attempts: list[tuple[str, Literal["torch", "onnx", "openvino"]]] = []
    candidate_models = [settings.rerank_model]

    if (
        settings.rerank_fallback_model
        and settings.rerank_fallback_model != settings.rerank_model
    ):
        candidate_models.append(settings.rerank_fallback_model)

    backend_candidates = []

    if is_backend_available(settings.rerank_backend):
        backend_candidates.append(settings.rerank_backend)
    elif settings.rerank_allow_backend_fallback:
        logger.warning(
            "Requested backend '%s' is unavailable in the current environment. Falling back.",
            settings.rerank_backend,
        )
    else:
        logger.warning(
            "Requested backend '%s' is unavailable and backend fallback is disabled.",
            settings.rerank_backend,
        )

    if settings.rerank_allow_backend_fallback and settings.rerank_backend != "torch":
        backend_candidates.append("torch")

    for candidate_model in candidate_models:
        for backend in backend_candidates:
            attempts.append((candidate_model, backend))

    return attempts


def is_backend_available(backend: Literal["torch", "onnx", "openvino"]) -> bool:
    if backend == "torch":
        return True

    if backend == "onnx":
        return has_module("onnxruntime") and has_module("optimum")

    if backend == "openvino":
        return has_module("openvino")

    return False


def has_module(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def build_cross_encoder(
    selected_model_name: str,
    backend: Literal["torch", "onnx", "openvino"],
) -> CrossEncoder:
    model_kwargs = build_model_kwargs(backend)

    return CrossEncoder(
        selected_model_name,
        backend=backend,
        device=settings.rerank_device,
        trust_remote_code=settings.rerank_trust_remote_code,
        local_files_only=settings.rerank_local_files_only,
        max_length=settings.rerank_max_length,
        model_kwargs=model_kwargs,
    )


def truncate_text(value: str, max_chars: int) -> str:
    trimmed = value.strip()

    if len(trimmed) <= max_chars:
        return trimmed

    return trimmed[:max_chars]


def build_model_kwargs(backend: Literal["torch", "onnx", "openvino"]) -> dict[str, Any]:
    if backend != "onnx":
        return {}

    return {
        "provider": select_onnx_provider(),
        "file_name": "onnx/model.onnx",
    }


def select_onnx_provider() -> str:
    normalized_device = settings.rerank_device.strip().lower()

    if normalized_device.startswith("cuda"):
        return "CUDAExecutionProvider"

    return "CPUExecutionProvider"


def configure_runtime_paths() -> None:
    configured_temp_dir = Path(settings.rerank_temp_dir).expanduser()

    if not configured_temp_dir.is_absolute():
        configured_temp_dir = (Path.cwd() / configured_temp_dir).resolve()

    fallback_temp_dir = (Path(tempfile.gettempdir()) / "rerank-service-py").resolve()

    for candidate in (configured_temp_dir, fallback_temp_dir):
        try:
            candidate.mkdir(parents=True, exist_ok=True)

            probe_file = candidate / ".write-test"
            probe_file.write_text("ok", encoding="utf-8")
            probe_file.unlink(missing_ok=True)

            os.environ["TMP"] = str(candidate)
            os.environ["TEMP"] = str(candidate)
            os.environ["TMPDIR"] = str(candidate)
            tempfile.tempdir = str(candidate)
            return
        except OSError:
            logger.warning("Temp directory '%s' is unavailable. Trying fallback.", candidate)

    raise RuntimeError("Failed to initialize a writable temp directory for rerank-service")


configure_runtime_paths()
