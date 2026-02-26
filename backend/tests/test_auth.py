"""Tests for authentication — registration, login, token, API key."""

import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/auth/register", json={
        "email": "new@phantom.dev",
        "password": "securepass",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@phantom.dev"
    assert "api_key" in data
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await client.post("/api/auth/register", json={
        "email": "dup@phantom.dev",
        "password": "pass1",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "dup@phantom.dev",
        "password": "pass2",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/auth/register", json={
        "email": "login@phantom.dev",
        "password": "mypassword",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "login@phantom.dev",
        "password": "mypassword",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/auth/register", json={
        "email": "wrong@phantom.dev",
        "password": "correct",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrong@phantom.dev",
        "password": "incorrect",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint(client, auth_headers):
    resp = await client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@phantom.dev"


@pytest.mark.asyncio
async def test_me_no_auth(client):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_api_key_auth(client):
    """Extension-style auth via X-API-Key header."""
    reg = await client.post("/api/auth/register", json={
        "email": "apikey@phantom.dev",
        "password": "pass123",
    })
    api_key = reg.json()["api_key"]
    resp = await client.get("/api/auth/me", headers={"X-API-Key": api_key})
    assert resp.status_code == 200
    assert resp.json()["email"] == "apikey@phantom.dev"


@pytest.mark.asyncio
async def test_token_refresh(client, auth_headers):
    resp = await client.post("/api/auth/refresh", headers=auth_headers)
    assert resp.status_code == 200
    assert "access_token" in resp.json()
