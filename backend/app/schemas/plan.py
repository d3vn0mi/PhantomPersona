from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SearchAction(BaseModel):
    query: str
    engine: str = "google"
    time_offset_min: int


class PageVisitAction(BaseModel):
    url: str
    dwell_seconds: int
    time_offset_min: int


class ProductBrowseAction(BaseModel):
    site: str
    search: str
    add_to_cart: bool = False
    time_offset_min: int


class BrowsingPlanData(BaseModel):
    searches: list[SearchAction]
    page_visits: list[PageVisitAction]
    product_browsing: list[ProductBrowseAction]


class PlanOut(BaseModel):
    id: str
    persona_id: str
    plan_data: dict[str, Any]
    scheduled_for: datetime
    executed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanComplete(BaseModel):
    actions_completed: int
