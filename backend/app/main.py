"""Phantom — Data Poisoning Privacy Tool API."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.middleware import ExceptionMiddleware, RequestIDMiddleware
from app.routers import auth, noise, personas, plans
from app.services.scheduler import PhantomScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    settings = get_settings()
    scheduler = PhantomScheduler(settings)
    app.state.scheduler = scheduler
    await scheduler.start()
    yield
    await scheduler.stop()


app = FastAPI(
    title="Phantom",
    description="Data poisoning privacy tool — hide in plain sight",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(ExceptionMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "chrome-extension://*",
        "moz-extension://*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(personas.router)
app.include_router(plans.router)
app.include_router(noise.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
