"""Sync orchestration: pull Zernio state into the local tables.

Three responsibilities, in order of importance:

* `import_accounts` is now the only way an account enters the app. There is no
  "add by handle" any more, so this mirrors `GET /v1/accounts` into
  `social_accounts` and is what the connect button calls once OAuth finishes.
* `sync_account` copies one account's day-level series. Zernio returns up to 180
  days from `daily-metrics`, so a fresh account arrives with its whole 7/30/90
  range already populated rather than growing one day at a time.
* `sync_workspace` runs the second over every account, one at a time, because
  Zernio meters a per-minute request window rather than credits.

Failure handling is per account on purpose. One dead token or one account that
needs reauthorizing must not stop the other fourteen from syncing, so each
account records its own `last_error` and the run keeps going.
"""

from __future__ import annotations

import hashlib
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import MetricSnapshot, PostSnapshot, SocialAccount, utcnow
from app.services.zernio import (
    ZernioClient,
    ZernioError,
    normalise_account,
    normalise_daily_metric,
    normalise_post,
    resolve_platform,
)

log = logging.getLogger(__name__)


class SyncReport:
    def __init__(self, account_id: str, platform: str) -> None:
        self.account_id = account_id
        self.platform = platform
        self.ok = False
        self.profile_updated = False
        self.days_written = 0
        self.posts_seen = 0
        self.posts_written = 0
        self.api_calls = 0
        self.error: str | None = None
        self.error_code: str | None = None
        self.warnings: list[str] = []

    def to_dict(self) -> dict:
        return {
            "account_id": self.account_id,
            "platform": self.platform,
            "ok": self.ok,
            "profile_updated": self.profile_updated,
            "days_written": self.days_written,
            "posts_seen": self.posts_seen,
            "posts_written": self.posts_written,
            "api_calls": self.api_calls,
            "error_code": self.error_code,
            "error": self.error,
            "warnings": list(self.warnings),
        }


class WorkspaceSyncReport:
    def __init__(self) -> None:
        self.accounts_synced = 0
        self.accounts_failed = 0
        self.days_written = 0
        self.posts_written = 0
        self.api_calls = 0
        self.results: list[SyncReport] = []

    def to_dict(self) -> dict:
        return {
            "accounts_synced": self.accounts_synced,
            "accounts_failed": self.accounts_failed,
            "days_written": self.days_written,
            "posts_written": self.posts_written,
            "api_calls": self.api_calls,
            "results": [r.to_dict() for r in self.results],
        }


def local_account_id(workspace_id: str, platform: str, external_id: str) -> str:
    """Composite primary key so two workspaces can hold the same account."""
    digest = hashlib.sha1(f"{workspace_id}|{platform}|{external_id}".encode()).hexdigest()
    return f"{platform}_{digest[:16]}"


def upsert_account_row(
    db: Session,
    row: dict,
    *,
    workspace_id: str,
    group_id: str | None = None,
    has_analytics_access: bool = True,
) -> SocialAccount:
    """Create or refresh one account from a `GET /v1/accounts` row."""
    external_id = row.get("external_id")
    if not external_id:
        raise ZernioError("Zernio returned an account without an id.", code="bad_account")

    account_id = local_account_id(workspace_id, row["platform"], external_id)
    account = db.get(SocialAccount, account_id)
    created = account is None
    if account is None:
        account = SocialAccount(
            id=account_id,
            workspace_id=workspace_id,
            group_id=group_id or "default",
            platform=row["platform"],
            handle=row.get("username") or external_id,
            connected=True,
        )
        db.add(account)
    elif group_id:
        account.group_id = group_id

    account.external_id = external_id
    account.zernio_profile_id = row.get("zernio_profile_id")
    account.has_analytics_access = bool(has_analytics_access)
    account.needs_reconnection = bool(row.get("needs_reconnection"))
    account.handle = row.get("username") or account.handle
    account.display_name = row.get("display_name") or account.display_name
    account.avatar_url = row.get("avatar_url") or account.avatar_url
    account.profile_url = row.get("profile_url") or account.profile_url
    account.followers = row.get("followers") or 0
    account.followers_updated_at = row.get("followers_updated_at")
    account.connected = True

    if row.get("needs_reconnection"):
        account.status = "needs_reconnection"
    elif row.get("is_active") is False:
        account.status = "disconnected"
    elif account.status in {"needs_reconnection", "error", "unavailable"}:
        account.status = "active"

    db.flush()
    return account


def import_accounts(
    db: Session,
    client: ZernioClient,
    *,
    workspace_id: str,
    group_id: str | None = None,
    platform: str | None = None,
) -> list[SocialAccount]:
    """Mirror every account the key can see. This is the account import path."""
    rows, has_analytics = client.accounts_with_analytics_flag()
    wanted = resolve_platform(platform) if platform else None

    imported: list[SocialAccount] = []
    for raw in rows:
        parsed = normalise_account(raw)
        if not parsed["platform"]:
            continue
        if wanted and parsed["platform"] != wanted:
            continue
        account = upsert_account_row(
            db,
            parsed,
            workspace_id=workspace_id,
            group_id=group_id,
            has_analytics_access=has_analytics,
        )
        imported.append(account)

    db.commit()
    return imported


def sync_account(
    db: Session,
    client: ZernioClient,
    account: SocialAccount,
    *,
    history_days: int | None = None,
    with_posts: bool = True,
) -> SyncReport:
    """Copy one account's day series and posts into the local tables."""
    report = SyncReport(account.id, account.platform)
    calls_before = client.call_count

    if not account.external_id:
        report.error = "Account has no Zernio id; reconnect it."
        report.error_code = "missing_external_id"
        account.status = "needs_reconnection"
        account.last_error = report.error
        db.commit()
        return report

    if not account.has_analytics_access:
        report.warnings.append(
            "This connection has no analytics access, so metrics will read zero."
        )

    days = history_days if history_days is not None else settings.zernio_history_days

    try:
        rows = client.daily_metrics(account_id=account.external_id, days=days)
        report.days_written = _write_daily(db, account, rows)
        report.profile_updated = True
    except ZernioError as exc:
        report.error = str(exc)
        report.error_code = exc.code
        report.api_calls = client.call_count - calls_before
        _record_failure(db, account, exc)
        return report

    if with_posts:
        cap = max(1, settings.zernio_max_posts_per_account)
        try:
            data = client.post_analytics(
                account_id=account.external_id,
                days=days,
                limit=min(cap, 100),
                page=1,
            )
            posts = [x for x in (data.get("posts") or []) if isinstance(x, dict)]
            report.posts_seen = len(posts)
            report.posts_written = _write_posts(db, account, posts)

            pagination = data.get("pagination") or {}
            pages = int(pagination.get("pages") or 1) if isinstance(pagination, dict) else 1
            page = 2
            while report.posts_seen < cap and page <= pages:
                more = client.post_analytics(
                    account_id=account.external_id,
                    days=days,
                    limit=min(100, cap - report.posts_seen),
                    page=page,
                )
                batch = [x for x in (more.get("posts") or []) if isinstance(x, dict)]
                if not batch:
                    break
                report.posts_seen += len(batch)
                report.posts_written += _write_posts(db, account, batch)
                page += 1

            overview = data.get("overview") or {}
            staleness = overview.get("dataStaleness") or {}
            if isinstance(staleness, dict) and staleness.get("staleAccountCount"):
                report.warnings.append(
                    f"{staleness['staleAccountCount']} account(s) had stale data upstream."
                )
        except ZernioError as exc:
            # A post read failing must not invalidate the day series we just wrote.
            report.warnings.append(f"Posts unavailable: {exc}")

    account.last_sync_at = utcnow()
    account.last_error = None
    if account.status == "error":
        account.status = "active"
    db.commit()

    report.api_calls = client.call_count - calls_before
    report.ok = True
    return report


def _write_daily(db: Session, account: SocialAccount, rows: list[dict]) -> int:
    """Upsert one MetricSnapshot per day. Returns rows written.

    An empty `rows` is normal: a brand-new account has no history upstream yet.
    Every dated row carries the account's current follower count, because
    Zernio's day series reports engagement but not a follower point per day.
    """
    written = 0
    for row in rows:
        parsed = normalise_daily_metric(row)
        day = _parse_day(parsed.get("day"))
        if day is None:
            continue

        snapshot = db.scalar(
            select(MetricSnapshot).where(
                MetricSnapshot.account_id == account.id, MetricSnapshot.day == day
            )
        )
        if snapshot is None:
            snapshot = MetricSnapshot(account_id=account.id, day=day)
            db.add(snapshot)

        snapshot.recorded_at = utcnow()
        snapshot.post_count = parsed["post_count"]
        snapshot.impressions = parsed["impressions"]
        snapshot.reach = parsed["reach"]
        snapshot.views = parsed["views"]
        snapshot.likes = parsed["likes"]
        snapshot.comments = parsed["comments"]
        snapshot.shares = parsed["shares"]
        snapshot.saves = parsed["saves"]
        snapshot.clicks = parsed["clicks"]
        snapshot.followers = account.followers
        snapshot.engagement_rate = account.engagement_rate
        written += 1

    db.flush()
    return written


def _write_posts(db: Session, account: SocialAccount, rows: list[dict]) -> int:
    written = 0
    newest_at: datetime | None = None
    for row in rows:
        parsed = normalise_post(row)
        if not parsed["external_id"]:
            continue
        existing = db.scalar(
            select(PostSnapshot).where(
                PostSnapshot.account_id == account.id,
                PostSnapshot.external_id == parsed["external_id"],
            )
        )
        created = existing is None
        if existing is None:
            existing = PostSnapshot(
                account_id=account.id, external_id=parsed["external_id"]
            )
            db.add(existing)

        existing.recorded_at = utcnow()
        existing.url = parsed["url"]
        existing.text = parsed["text"]
        existing.thumbnail_url = parsed["thumbnail_url"]
        existing.media_type = parsed["media_type"]
        existing.published_at = parsed["published_at"]
        existing.day = parsed["published_at"].date() if parsed["published_at"] else None
        existing.status = parsed["status"]
        existing.is_external = parsed["is_external"]
        existing.impressions = parsed["impressions"]
        existing.reach = parsed["reach"]
        existing.views = parsed["views"]
        existing.likes = parsed["likes"]
        existing.comments = parsed["comments"]
        existing.shares = parsed["shares"]
        existing.saves = parsed["saves"]
        existing.clicks = parsed["clicks"]
        existing.follows = parsed["follows"]
        existing.watch_time_ms = parsed["watch_time_ms"]
        existing.engagement_rate = parsed["engagement_rate"]

        if parsed["published_at"] and (newest_at is None or parsed["published_at"] > newest_at):
            newest_at = parsed["published_at"]
        if created:
            written += 1

    # SQLite drops tzinfo on round-trip, so a previously stored aware datetime
    # comes back naive. Coerce before comparing or the second sync crashes.
    previous_post_at = _aware(account.last_post_at)
    if newest_at and (previous_post_at is None or newest_at > previous_post_at):
        account.last_post_at = newest_at
    db.flush()
    return written


def _aware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _record_failure(db: Session, account: SocialAccount, exc: ZernioError) -> None:
    account.last_error = str(exc)
    if exc.code in {"unauthorized", "not_found", "failed_dependency"}:
        account.status = "needs_reconnection" if exc.code != "not_found" else "unavailable"
    elif exc.code == "plan_required":
        account.status = "error"
    else:
        account.status = "error"
    db.commit()


def _parse_day(value: object) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    if isinstance(value, datetime):
        return value.date()
    return None


def sync_workspace(
    db: Session,
    client: ZernioClient,
    *,
    workspace_id: str,
    import_first: bool = True,
    history_days: int | None = None,
) -> WorkspaceSyncReport:
    """Sync every account in a workspace, one call sequence at a time."""
    report = WorkspaceSyncReport()

    if import_first:
        try:
            import_accounts(db, client, workspace_id=workspace_id)
        except ZernioError as exc:
            log.warning("account import failed for %s: %s", workspace_id, exc)
            detail = SyncReportDetail(workspace_id, "import", exc)
            report.results.append(detail)
            report.accounts_failed += 1

    stmt = select(SocialAccount).where(
        SocialAccount.workspace_id == workspace_id, SocialAccount.connected.is_(True)
    )
    for account in db.scalars(stmt.order_by(SocialAccount.platform, SocialAccount.handle)):
        result = sync_account(db, client, account, history_days=history_days)
        report.results.append(result)
        report.api_calls += result.api_calls
        report.days_written += result.days_written
        report.posts_written += result.posts_written
        if result.ok:
            report.accounts_synced += 1
        else:
            report.accounts_failed += 1

    return report


class SyncReportDetail(SyncReport):
    """A report row for a failure that happened outside any single account."""

    def __init__(self, subject: str, kind: str, exc: ZernioError) -> None:
        super().__init__(subject, kind)
        self.ok = False
        self.error = str(exc)
        self.error_code = exc.code


def workspaces_with_accounts(db: Session) -> list[str]:
    rows = db.scalars(select(SocialAccount.workspace_id).distinct())
    return sorted({r for r in rows if r})
