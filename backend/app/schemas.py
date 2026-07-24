from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HeadlineMetricOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    value: str
    unit: str
    label: str


class ComputePointOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    year: int
    label: str
    flop: float


class AiModelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    org: str
    year: int
    flop: float | None
    domain: str


class InsightRequest(BaseModel):
    question: str = Field(
        default="What stands out about frontier training compute growth?",
        min_length=3,
        max_length=500,
    )


class InsightResponse(BaseModel):
    question: str
    insight: str
    model: str
    cached: bool
    created_at: datetime | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    ollama: str
    ollama_model: str
