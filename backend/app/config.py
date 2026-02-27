"""Unified configuration — merges backend + daemon config via Pydantic Settings."""

from __future__ import annotations

from functools import lru_cache

from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMSettings(BaseModel):
    backend: str = "ollama"  # "ollama" | "openai"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"


class SchedulerSettings(BaseModel):
    enabled: bool = True
    search_interval: int = 10  # minutes
    browsing_interval: int = 15
    active_hours_start: int = 8
    active_hours_end: int = 22
    max_concurrent: int = 3


class NoiseSettings(BaseModel):
    searches_per_cycle: int = 5
    pages_per_cycle: int = 8
    products_per_cycle: int = 3
    persona_rotation_hours: int = 4


class FingerprintSettings(BaseModel):
    rotation_interval: int = 30  # minutes


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        extra="ignore",
    )

    database_url: str = "sqlite+aiosqlite:///./phantom.db"
    secret_key: str = "change-me-in-production"

    llm: LLMSettings = LLMSettings()
    scheduler: SchedulerSettings = SchedulerSettings()
    noise: NoiseSettings = NoiseSettings()
    fingerprint: FingerprintSettings = FingerprintSettings()


@lru_cache
def get_settings() -> Settings:
    return Settings()
