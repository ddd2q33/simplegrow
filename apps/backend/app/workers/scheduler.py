"""Background sync loop.

Zernio stores its own history, so this loop is no longer what builds the
7/30/90 series from scratch; the first run already backfills it. What the loop
is still for is keeping the local copy current without an API call on every
dashboard load, and catching reconnect/plan problems on a schedule instead of
when a user opens a chart.

The HTTP client is synchronous and the loop is async because FastAPI's lifespan
awaits `start()` / `stop()`. Rather than make every call site async, the
blocking work runs in a worker thread via `asyncio.to_thread`, which keeps the
event loop responsive and keeps the client code simple. Each run opens its own
session and closes it, so a long poll cannot pin a connection.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from app.core.config import has_zernio, settings
from app.core.db import SessionLocal
from app.services.sync import sync_workspace, workspaces_with_accounts
from app.services.zernio import ZernioClient, ZernioError

log = logging.getLogger(__name__)


class SyncScheduler:
    def __init__(
        self,
        interval_hours: int | None = None,
        *,
        run_on_startup: bool | None = None,
    ) -> None:
        self.interval_hours = (
            interval_hours
            if interval_hours is not None
            else settings.zernio_sync_interval_hours
        )
        self.run_on_startup = (
            run_on_startup
            if run_on_startup is not None
            else settings.zernio_sync_on_startup
        )
        self._task: asyncio.Task | None = None
        self._stopping = asyncio.Event()
        self.last_run_at: datetime | None = None
        self.last_run_summary: dict[str, object] = {}
        self.runs = 0

    @property
    def enabled(self) -> bool:
        return self.interval_hours > 0 and has_zernio()

    async def start(self) -> None:
        if not self.enabled:
            log.info(
                "background sync disabled (interval=%sh, key=%s)",
                self.interval_hours,
                "set" if has_zernio() else "missing",
            )
            return
        self._stopping.clear()
        self._task = asyncio.create_task(self._run(), name="zernio-sync")
        log.info("background sync started, every %sh", self.interval_hours)

    async def stop(self) -> None:
        self._stopping.set()
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        self._task = None

    async def _run(self) -> None:
        if self.run_on_startup:
            await self.run_once()
        while not self._stopping.is_set():
            try:
                await asyncio.wait_for(
                    self._stopping.wait(), timeout=self.interval_hours * 3600
                )
                return
            except asyncio.TimeoutError:
                await self.run_once()

    async def run_once(self) -> dict[str, object]:
        """Sync every account in every workspace, one workspace at a time."""
        started = datetime.now(timezone.utc)
        try:
            summary = await asyncio.to_thread(self._sync_all)
        except Exception as exc:  # pragma: no cover - defensive
            log.exception("scheduled sync crashed")
            summary = {"error": str(exc), "accounts_synced": 0, "accounts_failed": 0}
        summary["started_at"] = started.isoformat()
        summary["finished_at"] = datetime.now(timezone.utc).isoformat()
        summary["duration_seconds"] = round(
            (datetime.now(timezone.utc) - started).total_seconds(), 1
        )
        self.last_run_at = started
        self.last_run_summary = summary
        self.runs += 1
        log.info("scheduled sync finished: %s", summary)
        return summary

    @staticmethod
    def _sync_all() -> dict[str, object]:
        db = SessionLocal()
        synced = failed = calls = 0
        stopped: str | None = None
        try:
            with ZernioClient() as client:
                workspaces = workspaces_with_accounts(db)
                # A fresh install has no local workspaces yet, but the API key
                # may already see connected accounts. Import into the default
                # workspace so the first scheduled run is not a no-op.
                if not workspaces and client.configured:
                    workspaces = ["default"]
                for workspace_id in workspaces:
                    try:
                        report = sync_workspace(
                            db, client, workspace_id=workspace_id, import_first=True
                        )
                    except ZernioError as exc:
                        failed += 1
                        log.warning("workspace %s sync failed: %s", workspace_id, exc)
                        continue
                    synced += report.accounts_synced
                    failed += report.accounts_failed
                    calls += report.api_calls
                    if not client.configured:
                        stopped = "not_configured"
                        break
        finally:
            db.close()
        return {
            "accounts_synced": synced,
            "accounts_failed": failed,
            "api_calls": calls,
            "stopped_reason": stopped,
        }


scheduler = SyncScheduler()


def describe() -> dict[str, object]:
    return {
        "enabled": scheduler.enabled,
        "running": scheduler._task is not None and not scheduler._task.done(),
        "interval_hours": scheduler.interval_hours,
        "run_on_startup": scheduler.run_on_startup,
        "runs": scheduler.runs,
        "last_run_at": scheduler.last_run_at.isoformat() if scheduler.last_run_at else None,
        "last_run": scheduler.last_run_summary,
    }


def next_run_at() -> datetime | None:
    if not scheduler.enabled or scheduler.last_run_at is None:
        return None
    return scheduler.last_run_at + timedelta(hours=scheduler.interval_hours)
