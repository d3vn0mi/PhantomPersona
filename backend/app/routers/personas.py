"""Persona CRUD endpoints."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.dependencies import get_current_user
from app.models.persona import Persona
from app.models.user import User
from app.schemas.persona import PersonaCreate, PersonaOut, PersonaUpdate
from app.services.persona_gen import generate_persona

router = APIRouter(prefix="/api/personas", tags=["personas"])


def _persona_to_out(p: Persona) -> PersonaOut:
    return PersonaOut(
        id=p.id,
        user_id=p.user_id,
        name=p.name,
        wizard_answers=json.loads(p.wizard_answers),
        profile=json.loads(p.profile),
        is_active=p.is_active,
        created_at=p.created_at,
        updated_at=p.updated_at,
    )


@router.post("", response_model=PersonaOut, status_code=201)
async def create_persona(
    body: PersonaCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new persona from wizard answers.  Calls LLM to generate profile."""
    profile = await generate_persona(body.wizard_answers)

    persona = Persona(
        user_id=user.id,
        name=profile.name,
        wizard_answers=body.wizard_answers.model_dump_json(),
        profile=profile.model_dump_json(),
        is_active=False,
    )
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    return _persona_to_out(persona)


@router.get("", response_model=list[PersonaOut])
async def list_personas(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Persona).where(Persona.user_id == user.id).order_by(Persona.created_at.desc())
    )
    return [_persona_to_out(p) for p in result.scalars().all()]


@router.get("/{persona_id}", response_model=PersonaOut)
async def get_persona(
    persona_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    persona = await db.get(Persona, persona_id)
    if not persona or persona.user_id != user.id:
        raise HTTPException(404, "Persona not found")
    return _persona_to_out(persona)


@router.patch("/{persona_id}", response_model=PersonaOut)
async def update_persona(
    persona_id: str,
    body: PersonaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    persona = await db.get(Persona, persona_id)
    if not persona or persona.user_id != user.id:
        raise HTTPException(404, "Persona not found")
    if body.is_active is not None:
        persona.is_active = body.is_active
    if body.name is not None:
        persona.name = body.name
    await db.commit()
    await db.refresh(persona)
    return _persona_to_out(persona)


@router.delete("/{persona_id}", status_code=204)
async def delete_persona(
    persona_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    persona = await db.get(Persona, persona_id)
    if not persona or persona.user_id != user.id:
        raise HTTPException(404, "Persona not found")
    await db.delete(persona)
    await db.commit()
