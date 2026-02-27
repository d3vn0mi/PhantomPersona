"""Tests for noise endpoints — fingerprint, status."""

import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_fingerprint(client):
    resp = await client.get("/api/fingerprint")
    assert resp.status_code == 200
    data = resp.json()
    assert "canvas_noise_seed" in data
    assert "webgl_noise_seed" in data
    assert "screen_width" in data
    assert "screen_height" in data
    assert "timezone" in data
    assert "language" in data
    assert "platform" in data
    # Seeds should be integers
    assert isinstance(data["canvas_noise_seed"], int)
    assert isinstance(data["webgl_noise_seed"], int)


@pytest.mark.asyncio
async def test_fingerprint_deterministic(client):
    """Same request within same time bucket should return same seeds."""
    resp1 = await client.get("/api/fingerprint")
    resp2 = await client.get("/api/fingerprint")
    assert resp1.json()["canvas_noise_seed"] == resp2.json()["canvas_noise_seed"]


@pytest.mark.asyncio
async def test_status(client):
    resp = await client.get("/api/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "running" in data
    assert "queue_depth" in data


@pytest.mark.asyncio
async def test_get_noise_empty(client):
    resp = await client.get("/api/noise/search")
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_get_all_noise_empty(client):
    resp = await client.get("/api/noise")
    assert resp.status_code == 200
    assert resp.json() == []
