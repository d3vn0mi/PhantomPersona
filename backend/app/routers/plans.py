"""Browsing plan endpoints — generation + extension polling."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.persona import Persona
from app.models.plan import BrowsingPlan
from app.schemas.plan import PlanComplete, PlanOut
from app.services.plan_gen import generate_plan

router = APIRouter(prefix="/api/plans", tags=["plans"])

DEFAULT_USER = "default"


def _plan_to_out(p: BrowsingPlan) -> PlanOut:
    return PlanOut(
        id=p.id,
        persona_id=p.persona_id,
        plan_data=json.loads(p.plan_data),
        scheduled_for=p.scheduled_for,
        executed=p.executed,
        created_at=p.created_at,
    )


@router.post("/generate/{persona_id}", response_model=PlanOut, status_code=201)
async def generate_browsing_plan(persona_id: str, db: AsyncSession = Depends(get_db)):
    """Generate a new browsing plan for a persona.  Calls LLM."""
    persona = await db.get(Persona, persona_id)
    if not persona or persona.user_id != DEFAULT_USER:
        raise HTTPException(404, "Persona not found")

    profile = json.loads(persona.profile)
    answers = json.loads(persona.wizard_answers)
    plan_data = await generate_plan(profile, noise_intensity=answers.get("noise_intensity", "moderate"))

    plan = BrowsingPlan(
        persona_id=persona_id,
        plan_data=plan_data.model_dump_json(),
        scheduled_for=datetime.now(timezone.utc),
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return _plan_to_out(plan)


@router.get("/next", response_model=list[PlanOut])
async def get_next_plans(db: AsyncSession = Depends(get_db)):
    """Extension polls this — returns unexecuted plans for active personas."""
    # Get active persona IDs for this user
    persona_result = await db.execute(
        select(Persona.id).where(Persona.user_id == DEFAULT_USER, Persona.is_active == True)
    )
    active_ids = [row[0] for row in persona_result.all()]
    if not active_ids:
        return []

    result = await db.execute(
        select(BrowsingPlan)
        .where(
            BrowsingPlan.persona_id.in_(active_ids),
            BrowsingPlan.executed == False,
            BrowsingPlan.scheduled_for <= datetime.now(timezone.utc) + timedelta(hours=1),
        )
        .order_by(BrowsingPlan.scheduled_for)
        .limit(5)
    )
    return [_plan_to_out(p) for p in result.scalars().all()]


@router.post("/{plan_id}/complete", response_model=PlanOut)
async def complete_plan(
    plan_id: str, body: PlanComplete, db: AsyncSession = Depends(get_db)
):
    """Extension reports a plan as executed."""
    plan = await db.get(BrowsingPlan, plan_id)
    if not plan:
        raise HTTPException(404, "Plan not found")
    plan.executed = True
    await db.commit()
    await db.refresh(plan)
    return _plan_to_out(plan)


@router.get("/activity", response_model=list[PlanOut])
async def get_activity(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Activity log — recent plans (executed and pending)."""
    result = await db.execute(
        select(BrowsingPlan).order_by(BrowsingPlan.created_at.desc()).limit(limit)
    )
    return [_plan_to_out(p) for p in result.scalars().all()]
