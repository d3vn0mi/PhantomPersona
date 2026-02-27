"""Tests for persona CRUD — creation, listing, update, delete, auth enforcement."""

import pytest
from unittest.mock import AsyncMock, patch

from tests.conftest import MOCK_PERSONA_PROFILE


@pytest.mark.asyncio
async def test_create_persona(client, auth_headers, mock_llm):
    resp = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["hiking", "photography"],
            "age_range": "25-34",
            "location": "Colorado",
            "profession": "designer",
            "shopping_style": "midrange",
            "noise_intensity": "moderate",
        }
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Alex Rivera"
    assert data["is_active"] is False
    mock_llm.assert_called_once()


@pytest.mark.asyncio
async def test_list_personas(client, auth_headers, mock_llm):
    # Create one persona
    await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["cooking"],
            "age_range": "35-44",
            "location": "random",
            "profession": "chef",
            "shopping_style": "luxury",
            "noise_intensity": "subtle",
        }
    })
    resp = await client.get("/api/personas", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_get_persona(client, auth_headers, mock_llm):
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["gaming"],
            "age_range": "18-24",
            "location": "Texas",
            "profession": "student",
            "shopping_style": "budget",
            "noise_intensity": "heavy",
        }
    })
    pid = create.json()["id"]
    resp = await client.get(f"/api/personas/{pid}", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == pid


@pytest.mark.asyncio
async def test_update_persona(client, auth_headers, mock_llm):
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["running"],
            "age_range": "25-34",
            "location": "Oregon",
            "profession": "nurse",
            "shopping_style": "midrange",
            "noise_intensity": "moderate",
        }
    })
    pid = create.json()["id"]
    resp = await client.patch(f"/api/personas/{pid}", headers=auth_headers, json={
        "is_active": True,
        "name": "Updated Name",
    })
    assert resp.status_code == 200
    assert resp.json()["is_active"] is True
    assert resp.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_persona(client, auth_headers, mock_llm):
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["fishing"],
            "age_range": "45-54",
            "location": "Florida",
            "profession": "retiree",
            "shopping_style": "window_shopper",
            "noise_intensity": "subtle",
        }
    })
    pid = create.json()["id"]
    resp = await client.delete(f"/api/personas/{pid}", headers=auth_headers)
    assert resp.status_code == 204

    resp2 = await client.get(f"/api/personas/{pid}", headers=auth_headers)
    assert resp2.status_code == 404


@pytest.mark.asyncio
async def test_persona_requires_auth(client, mock_llm):
    resp = await client.get("/api/personas")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_persona_isolation(client, mock_llm):
    """User A can't see User B's personas."""
    # Create user A
    await client.post("/api/auth/register", json={
        "email": "userA@test.com", "password": "pass123"
    })
    login_a = await client.post("/api/auth/login", json={
        "email": "userA@test.com", "password": "pass123"
    })
    headers_a = {"Authorization": f"Bearer {login_a.json()['access_token']}"}

    # Create user B
    await client.post("/api/auth/register", json={
        "email": "userB@test.com", "password": "pass123"
    })
    login_b = await client.post("/api/auth/login", json={
        "email": "userB@test.com", "password": "pass123"
    })
    headers_b = {"Authorization": f"Bearer {login_b.json()['access_token']}"}

    # User A creates a persona
    create = await client.post("/api/personas", headers=headers_a, json={
        "wizard_answers": {
            "interests": ["secret"],
            "age_range": "25-34",
            "location": "hidden",
            "profession": "spy",
            "shopping_style": "midrange",
            "noise_intensity": "moderate",
        }
    })
    pid = create.json()["id"]

    # User B can't see it
    resp = await client.get(f"/api/personas/{pid}", headers=headers_b)
    assert resp.status_code == 404

    # User B's list is empty
    resp = await client.get("/api/personas", headers=headers_b)
    assert resp.json() == []
