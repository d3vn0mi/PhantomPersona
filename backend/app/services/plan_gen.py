"""Generate daily browsing plans from a persona profile."""

from __future__ import annotations

import json

from app.schemas.plan import BrowsingPlanData
from app.services.llm import generate_json

INTENSITY_MAP = {
    "subtle": 10,
    "moderate": 35,
    "heavy": 100,
}

PLAN_PROMPT = """\
You are a privacy tool that generates realistic decoy internet activity.

Given this persona:
{persona_json}

Generate a realistic day of internet activity for this person. \
The activity should look natural — clusters of actions with gaps between them, \
not evenly spaced. The time offsets are minutes from the start of the activity window.

Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "searches": [
    {{"query": "example search query", "engine": "google", "time_offset_min": 0}},
    ...
  ],
  "page_visits": [
    {{"url": "https://example.com/page", "dwell_seconds": 45, "time_offset_min": 5}},
    ...
  ],
  "product_browsing": [
    {{"site": "amazon", "search": "product search term", "add_to_cart": false, "time_offset_min": 30}},
    ...
  ]
}}

Generate approximately {action_count} total actions (split roughly 40% searches, \
40% page visits, 20% product browsing). Spread them across a {window_hours}-hour window.
"""


async def generate_plan(
    persona_profile: dict,
    noise_intensity: str = "moderate",
    window_hours: int = 16,
) -> BrowsingPlanData:
    """Generate a browsing plan for the given persona."""
    action_count = INTENSITY_MAP.get(noise_intensity, 35)
    prompt = PLAN_PROMPT.format(
        persona_json=json.dumps(persona_profile, indent=2),
        action_count=action_count,
        window_hours=window_hours,
    )
    data = await generate_json(prompt)
    return BrowsingPlanData(**data)
