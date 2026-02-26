"""Shared test fixtures — in-memory DB, test client, mock LLM."""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.main import app

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_engine):
    """Async HTTP test client with overridden DB dependency."""
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client):
    """Register a test user and return auth headers."""
    resp = await client.post("/api/auth/register", json={
        "email": "test@phantom.dev",
        "password": "testpass123",
    })
    assert resp.status_code == 201
    login = await client.post("/api/auth/login", json={
        "email": "test@phantom.dev",
        "password": "testpass123",
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# Mock LLM to avoid real API calls in tests
MOCK_PERSONA_PROFILE = {
    "name": "Alex Rivera",
    "age": 32,
    "location": "Denver, Colorado",
    "profession": "UX Designer",
    "interests": ["hiking", "photography", "coffee", "design", "yoga"],
    "search_topics": ["best hiking trails colorado", "ux design patterns 2024"],
    "favorite_sites": ["https://dribbble.com", "https://medium.com"],
    "shopping_interests": ["camera lenses", "hiking boots"],
    "personality_traits": ["creative", "detail-oriented", "outdoorsy"],
    "daily_routine": "Wakes up early for yoga, works remotely, hikes on weekends.",
}

MOCK_PLAN_DATA = {
    "searches": [
        {"query": "best hiking trails near denver", "engine": "google", "time_offset_min": 10},
        {"query": "mirrorless camera deals", "engine": "google", "time_offset_min": 30},
    ],
    "page_visits": [
        {"url": "https://alltrails.com/trail/us/colorado", "dwell_seconds": 45, "time_offset_min": 15},
    ],
    "product_browsing": [
        {"site": "amazon", "search": "hiking boots waterproof", "add_to_cart": False, "time_offset_min": 50},
    ],
}


@pytest.fixture
def mock_llm():
    """Patch LLM to return deterministic test data.

    Must patch where generate_json is imported (persona_gen/plan_gen),
    not where it's defined (llm).
    """
    with patch("app.services.persona_gen.generate_json", new_callable=AsyncMock) as mock:
        mock.return_value = MOCK_PERSONA_PROFILE
        yield mock
