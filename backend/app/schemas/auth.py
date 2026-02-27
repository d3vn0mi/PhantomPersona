from __future__ import annotations

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    api_key: str
    is_active: bool

    model_config = {"from_attributes": True}
