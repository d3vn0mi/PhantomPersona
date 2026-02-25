from __future__ import annotations

from pydantic import BaseModel


class NoiseEventOut(BaseModel):
    event_type: str
    payload: dict

    model_config = {"from_attributes": True}


class StatusResponse(BaseModel):
    running: bool
    current_persona: str | None
    stats: dict
    queue_depth: int


class FingerprintResponse(BaseModel):
    canvas_noise_seed: int
    webgl_noise_seed: int
    screen_width: int
    screen_height: int
    timezone: str
    language: str
    platform: str
