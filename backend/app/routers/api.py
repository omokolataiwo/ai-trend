from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.db import get_db
from app.services.ollama import OllamaError, check_ollama, generate_insight
from app.config import settings

router = APIRouter()


@router.get("/health", response_model=schemas.HealthResponse)
async def health(db: Session = Depends(get_db)) -> schemas.HealthResponse:
    try:
        db.execute(select(1))
        database = "ok"
    except Exception as exc:  # noqa: BLE001
        database = f"error: {exc.__class__.__name__}"

    ollama = await check_ollama()
    status = "ok" if database == "ok" else "degraded"
    return schemas.HealthResponse(
        status=status,
        database=database,
        ollama=ollama,
        ollama_model=settings.ollama_model,
    )


@router.get("/metrics", response_model=list[schemas.HeadlineMetricOut])
def list_metrics(db: Session = Depends(get_db)) -> list[models.HeadlineMetric]:
    return list(
        db.scalars(
            select(models.HeadlineMetric).order_by(models.HeadlineMetric.sort_order)
        ).all()
    )


@router.get("/compute-series", response_model=list[schemas.ComputePointOut])
def list_compute_series(db: Session = Depends(get_db)) -> list[models.ComputePoint]:
    return list(
        db.scalars(select(models.ComputePoint).order_by(models.ComputePoint.year)).all()
    )


@router.get("/models", response_model=list[schemas.AiModelOut])
def list_models(
    domain: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[models.AiModel]:
    stmt = select(models.AiModel).order_by(models.AiModel.year, models.AiModel.name)
    if domain and domain.lower() != "all":
        stmt = stmt.where(models.AiModel.domain == domain)
    return list(db.scalars(stmt).all())


@router.post("/insights", response_model=schemas.InsightResponse)
async def create_insight(
    body: schemas.InsightRequest,
    db: Session = Depends(get_db),
) -> schemas.InsightResponse:
    try:
        content, model_name, cached, created_at = await generate_insight(
            db, body.question
        )
    except OllamaError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return schemas.InsightResponse(
        question=body.question,
        insight=content,
        model=model_name,
        cached=cached,
        created_at=created_at,
    )
