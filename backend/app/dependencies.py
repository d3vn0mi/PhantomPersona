"""Shared FastAPI dependencies."""

from __future__ import annotations

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.user import User
from app.services.auth import decode_access_token

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate via JWT Bearer token or X-API-Key header."""
    # Try JWT first
    if credentials:
        user_id = decode_access_token(credentials.credentials)
        if user_id:
            user = await db.get(User, user_id)
            if user and user.is_active:
                return user

    # Fall back to API key (for extension)
    api_key = request.headers.get("X-API-Key")
    if api_key:
        result = await db.execute(select(User).where(User.api_key == api_key))
        user = result.scalar_one_or_none()
        if user and user.is_active:
            return user

    raise HTTPException(status_code=401, detail="Not authenticated")
