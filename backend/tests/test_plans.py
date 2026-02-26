"""Tests for browsing plan endpoints — generation, polling, completion."""

import pytest
from unittest.mock import AsyncMock, patch

from tests.conftest import MOCK_PERSONA_PROFILE, MOCK_PLAN_DATA


@pytest.fixture
def mock_llm_plan():
    """Mock LLM for both persona creation and plan generation."""
    with (
        patch("app.services.persona_gen.generate_json", new_callable=AsyncMock) as persona_mock,
        patch("app.services.plan_gen.generate_json", new_callable=AsyncMock) as plan_mock,
    ):
        persona_mock.return_value = MOCK_PERSONA_PROFILE
        plan_mock.return_value = MOCK_PLAN_DATA
        yield plan_mock


@pytest.mark.asyncio
async def test_generate_plan(client, auth_headers, mock_llm_plan):
    # Create persona first
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["hiking"],
            "age_range": "25-34",
            "location": "Colorado",
            "profession": "designer",
            "shopping_style": "midrange",
            "noise_intensity": "moderate",
        }
    })
    pid = create.json()["id"]

    resp = await client.post(f"/api/plans/generate/{pid}", headers=auth_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["persona_id"] == pid
    assert data["executed"] is False
    assert "searches" in data["plan_data"]


@pytest.mark.asyncio
async def test_get_next_plans(client, auth_headers, mock_llm_plan):
    # Create + activate persona, then generate plan
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["coding"],
            "age_range": "25-34",
            "location": "California",
            "profession": "engineer",
            "shopping_style": "budget",
            "noise_intensity": "moderate",
        }
    })
    pid = create.json()["id"]
    await client.patch(f"/api/personas/{pid}", headers=auth_headers, json={"is_active": True})

    await client.post(f"/api/plans/generate/{pid}", headers=auth_headers)

    resp = await client.get("/api/plans/next", headers=auth_headers)
    assert resp.status_code == 200
    plans = resp.json()
    assert len(plans) >= 1
    assert plans[0]["executed"] is False


@pytest.mark.asyncio
async def test_complete_plan(client, auth_headers, mock_llm_plan):
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["music"],
            "age_range": "18-24",
            "location": "NY",
            "profession": "musician",
            "shopping_style": "midrange",
            "noise_intensity": "subtle",
        }
    })
    pid = create.json()["id"]

    plan_resp = await client.post(f"/api/plans/generate/{pid}", headers=auth_headers)
    plan_id = plan_resp.json()["id"]

    resp = await client.post(f"/api/plans/{plan_id}/complete", headers=auth_headers, json={
        "actions_completed": 3,
    })
    assert resp.status_code == 200
    assert resp.json()["executed"] is True


@pytest.mark.asyncio
async def test_activity_log(client, auth_headers, mock_llm_plan):
    create = await client.post("/api/personas", headers=auth_headers, json={
        "wizard_answers": {
            "interests": ["art"],
            "age_range": "35-44",
            "location": "random",
            "profession": "artist",
            "shopping_style": "luxury",
            "noise_intensity": "moderate",
        }
    })
    pid = create.json()["id"]
    await client.post(f"/api/plans/generate/{pid}", headers=auth_headers)

    resp = await client.get("/api/plans/activity", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_plans_require_auth(client):
    resp = await client.get("/api/plans/next")
    assert resp.status_code == 401
