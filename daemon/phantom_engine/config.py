from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel


class LLMConfig(BaseModel):
    provider: str = "ollama"
    model: str = "llama3.2"
    base_url: str = "http://localhost:11434"


class SchedulerConfig(BaseModel):
    browsing_interval: int = 15
    search_interval: int = 10
    shopping_interval: int = 30
    active_hours: list[int] = [0, 23]
    max_concurrent: int = 3


class NoiseConfig(BaseModel):
    searches_per_cycle: int = 5
    pages_per_cycle: int = 8
    products_per_cycle: int = 3
    persona_rotation_hours: int = 4


class FingerprintConfig(BaseModel):
    rotation_interval: int = 30
    plausible_mode: bool = True


class ServerConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 7600


class PhantomConfig(BaseModel):
    llm: LLMConfig = LLMConfig()
    scheduler: SchedulerConfig = SchedulerConfig()
    noise: NoiseConfig = NoiseConfig()
    fingerprint: FingerprintConfig = FingerprintConfig()
    server: ServerConfig = ServerConfig()

    @classmethod
    def from_file(cls, path: str | Path) -> PhantomConfig:
        path = Path(path)
        if path.exists():
            with open(path) as f:
                data = yaml.safe_load(f) or {}
            return cls.model_validate(data)
        return cls()
