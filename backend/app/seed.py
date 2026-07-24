from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models


HEADLINE_METRICS = [
    {
        "id": "compute",
        "value": "5×",
        "unit": "/year",
        "label": "Frontier training compute growth since 2020",
        "sort_order": 1,
    },
    {
        "id": "doubling",
        "value": "5.2",
        "unit": "mo",
        "label": "Approximate compute doubling time",
        "sort_order": 2,
    },
    {
        "id": "models",
        "value": "12",
        "unit": "",
        "label": "Notable frontier models in this sample",
        "sort_order": 3,
    },
]

COMPUTE_POINTS = [
    {"year": 2018, "label": "GPT-1", "flop": 1e19},
    {"year": 2019, "label": "GPT-2", "flop": 1.5e21},
    {"year": 2020, "label": "GPT-3", "flop": 3.1e23},
    {"year": 2022, "label": "PaLM", "flop": 2.5e24},
    {"year": 2023, "label": "GPT-4", "flop": 2e25},
    {"year": 2024, "label": "Frontier ’24", "flop": 5e25},
    {"year": 2025, "label": "Frontier ’25", "flop": 1e26},
]

AI_MODELS = [
    {
        "id": "gpt1",
        "name": "GPT-1",
        "org": "OpenAI",
        "year": 2018,
        "flop": 1e19,
        "domain": "Language",
    },
    {
        "id": "gpt2",
        "name": "GPT-2",
        "org": "OpenAI",
        "year": 2019,
        "flop": 1.5e21,
        "domain": "Language",
    },
    {
        "id": "gpt3",
        "name": "GPT-3",
        "org": "OpenAI",
        "year": 2020,
        "flop": 3.1e23,
        "domain": "Language",
    },
    {
        "id": "palm",
        "name": "PaLM",
        "org": "Google",
        "year": 2022,
        "flop": 2.5e24,
        "domain": "Language",
    },
    {
        "id": "llama2",
        "name": "LLaMA 2 70B",
        "org": "Meta",
        "year": 2023,
        "flop": 8e23,
        "domain": "Language",
    },
    {
        "id": "gpt4",
        "name": "GPT-4",
        "org": "OpenAI",
        "year": 2023,
        "flop": 2e25,
        "domain": "Multimodal",
    },
    {
        "id": "claude3",
        "name": "Claude 3 Opus",
        "org": "Anthropic",
        "year": 2024,
        "flop": None,
        "domain": "Language",
    },
    {
        "id": "gemini15",
        "name": "Gemini 1.5 Pro",
        "org": "Google",
        "year": 2024,
        "flop": None,
        "domain": "Multimodal",
    },
    {
        "id": "llama3",
        "name": "Llama 3.1 405B",
        "org": "Meta",
        "year": 2024,
        "flop": 4e25,
        "domain": "Language",
    },
    {
        "id": "o1",
        "name": "o1",
        "org": "OpenAI",
        "year": 2024,
        "flop": None,
        "domain": "Reasoning",
    },
    {
        "id": "deepseek",
        "name": "DeepSeek-R1",
        "org": "DeepSeek",
        "year": 2025,
        "flop": None,
        "domain": "Reasoning",
    },
    {
        "id": "claude4",
        "name": "Claude 4",
        "org": "Anthropic",
        "year": 2025,
        "flop": None,
        "domain": "Language",
    },
]


def seed_database(db: Session) -> None:
    """Idempotent seed so local/dev restarts stay simple."""
    if db.scalar(select(models.HeadlineMetric.id).limit(1)) is None:
        db.add_all(models.HeadlineMetric(**row) for row in HEADLINE_METRICS)

    if db.scalar(select(models.ComputePoint.id).limit(1)) is None:
        db.add_all(models.ComputePoint(**row) for row in COMPUTE_POINTS)

    if db.scalar(select(models.AiModel.id).limit(1)) is None:
        db.add_all(models.AiModel(**row) for row in AI_MODELS)

    db.commit()
