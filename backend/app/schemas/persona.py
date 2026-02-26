from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


# --- Wizard input ---


class WizardAnswers(BaseModel):
    interests: list[str]
    age_range: str  # e.g. "25-34"
    location: str  # e.g. "Colorado" or "random"
    profession: str
    shopping_style: str  # "budget" | "midrange" | "luxury" | "window_shopper"
    noise_intensity: str  # "subtle" | "moderate" | "heavy"


class PersonaCreate(BaseModel):
    wizard_answers: WizardAnswers


class PersonaUpdate(BaseModel):
    is_active: bool | None = None
    name: str | None = None


# --- LLM-generated profile ---


class PersonaProfile(BaseModel):
    name: str
    age: int
    location: str
    profession: str
    interests: list[str]
    search_topics: list[str]
    favorite_sites: list[str]
    shopping_interests: list[str]
    personality_traits: list[str]
    daily_routine: str


# --- API responses ---


class PersonaOut(BaseModel):
    id: str
    user_id: str
    name: str
    wizard_answers: dict[str, Any]
    profile: dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
