from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import has_zernio, settings
from app.core.db import Base, engine
from app.models import MetricSnapshot, PostSnapshot, ScheduledPost, SocialAccount  # noqa: F401
from app.modules.analytics.router import router as analytics_router
from app.modules.social.router import router as social_router
from app.workers.scheduler import scheduler

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    if not has_zernio():
        log.warning(
            "ZERNIO_API_KEY is not set: social endpoints will report "
            "not_configured until it is added to the server environment."
        )
    await scheduler.start()
    try:
        yield
    finally:
        await scheduler.stop()


app = FastAPI(title="SimpleGrow API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(social_router)
app.include_router(analytics_router)


@app.get("/")
def root() -> dict[str, object]:
    return {
        "status": "SimpleGrow API running",
        "zernio_configured": has_zernio(),
        "base_url": settings.zernio_base_url,
        "sync_scheduler": scheduler.enabled,
    }


@app.post("/social/sync/run")
async def run_sync_now() -> dict[str, object]:
    """Trigger a scheduled sync immediately."""
    return await scheduler.run_once()
