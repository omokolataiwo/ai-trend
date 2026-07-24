import hashlib
import math
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.config import settings


class OllamaError(RuntimeError):
    pass


async def check_ollama() -> str:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_base_url}/api/tags")
            response.raise_for_status()
        return "ok"
    except Exception as exc:  # noqa: BLE001 - health endpoint should never raise
        return f"unavailable: {exc.__class__.__name__}"


def _format_flop(flop: float | None) -> str:
    if flop is None:
        return "unpublished"
    exp = int(math.floor(math.log10(flop)))
    coef = flop / (10**exp)
    text = f"{coef:.0f}" if coef % 1 == 0 else f"{coef:.1f}"
    return f"{text}e{exp}"


def build_context(db: Session) -> str:
    points = db.scalars(
        select(models.ComputePoint).order_by(models.ComputePoint.year)
    ).all()
    ai_models = db.scalars(select(models.AiModel).order_by(models.AiModel.year)).all()

    point_lines = [
        f"- {p.year}: {p.label} ≈ {_format_flop(p.flop)} FLOP" for p in points
    ]
    model_lines = [
        f"- {m.year} {m.name} ({m.org}, {m.domain}): {_format_flop(m.flop)}"
        for m in ai_models
    ]
    return (
        "Frontier training compute milestones:\n"
        + "\n".join(point_lines)
        + "\n\nNotable models:\n"
        + "\n".join(model_lines)
    )


async def generate_insight(db: Session, question: str) -> tuple[str, str, bool, datetime]:
    context = build_context(db)
    prompt = (
        "You are an analyst for an AI trends dashboard. "
        "Use only the supplied sample data. Be concise (3-5 sentences). "
        "Do not invent precise figures that are not in the data.\n\n"
        f"DATA:\n{context}\n\nQUESTION:\n{question}\n"
    )
    prompt_hash = hashlib.sha256(
        f"{settings.ollama_model}:{prompt}".encode()
    ).hexdigest()

    cached = db.scalar(
        select(models.InsightCache).where(models.InsightCache.prompt_hash == prompt_hash)
    )
    if cached is not None:
        return cached.content, cached.model_name, True, cached.created_at

    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.3},
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.ollama_base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise OllamaError(f"Ollama request failed: {exc}") from exc

    content = (data.get("response") or "").strip()
    if not content:
        raise OllamaError("Ollama returned an empty response")

    created_at = datetime.now(UTC)
    row = models.InsightCache(
        prompt_hash=prompt_hash,
        model_name=settings.ollama_model,
        content=content,
        created_at=created_at,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return content, settings.ollama_model, False, row.created_at
