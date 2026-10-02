"""Social account endpoints backed by the Zernio API.

The account lifecycle changed shape with the provider and the routes reflect
that. There is no `POST /social/accounts` any more, because an account cannot be
created by naming a handle: it only exists after its owner approves an OAuth
flow. The two routes that replace it are:

* `GET /social/connect/{platform}` hands the browser the URL to open.
* `POST /social/accounts/import` mirrors whatever Zernio now reports as
  connected, which is what the frontend calls when the browser comes back.

Everything else (list, sync, history, posts, enable/disable) keeps the same
path and mostly the same payloads as before, so the frontend migration is a
matter of swapping the "add account" form for the OAuth redirect.
"""

from __future__ import annotations

import logging
from datetime import timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import (
    MetricSnapshot,
    PostSnapshot,
    ScheduledPost,
    SocialAccount,
    utcnow,
)
from app.modules.social.schemas import (
    AccountOut,
    AccountUpdate,
    ComposePostIn,
    ConnectOut,
    HistoryOut,
    HistoryPoint,
    PostListOut,
    PostOut,
    ProfileOut,
    ScheduledPostOut,
    StatusOut,
    SyncOptions,
    SyncReport,
)
from app.services.sync import import_accounts, sync_account, sync_workspace
from app.services.zernio import (
    SUPPORTED_PLATFORMS,
    ZernioClient,
    ZernioError,
    normalise_post_result,
    resolve_platform,
    rate_state,
)

log = logging.getLogger(__name__)

router = APIRouter(prefix="/social", tags=["social"])


def _get_account(db: Session, account_id: str) -> SocialAccount:
    account = db.get(SocialAccount, account_id)
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


def _http_error(exc: ZernioError) -> HTTPException:
    status = exc.status_code or 502
    if exc.code in {"not_configured", "bad_platform", "invalid_request"}:
        status = 400 if exc.code != "not_configured" else 503
    return HTTPException(
        status_code=status,
        detail={"error": str(exc), "code": exc.code},
    )


@router.get("/status", response_model=StatusOut)
def social_status() -> StatusOut:
    with ZernioClient() as client:
        configured = client.configured
        profile_id: str | None = None
        if configured:
            try:
                profile_id = client.ensure_profile()
            except ZernioError as exc:
                log.warning("could not resolve default Zernio profile: %s", exc)
    return StatusOut(
        provider="zernio",
        configured=configured,
        base_url=settings.zernio_base_url,
        supported_platforms=sorted(SUPPORTED_PLATFORMS),
        default_profile_id=profile_id,
        redirect_url=settings.zernio_redirect_url,
        requests_per_minute=settings.zernio_requests_per_minute,
        rate_state=rate_state(),
    )


@router.get("/profiles", response_model=list[ProfileOut])
def list_profiles() -> list[ProfileOut]:
    with ZernioClient() as client:
        try:
            rows = client.profiles()
        except ZernioError as exc:
            raise _http_error(exc) from exc
    return [ProfileOut.from_row(row) for row in rows]


@router.get("/connect/{platform}", response_model=ConnectOut)
def begin_connect(
    platform: str,
    profile_id: str | None = Query(default=None),
) -> ConnectOut:
    """Return the OAuth URL the browser must open to connect one account."""
    slug = resolve_platform(platform)
    with ZernioClient() as client:
        try:
            target_profile = profile_id or client.ensure_profile()
            result = client.connect_url(slug, profile_id=target_profile)
        except ZernioError as exc:
            raise _http_error(exc) from exc
    return ConnectOut(
        platform=slug,
        profile_id=target_profile,
        auth_url=result["authUrl"],
        state=result.get("state"),
    )


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(
    workspace_id: str = Query(default="default"),
    platform: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[AccountOut]:
    stmt = select(SocialAccount).where(SocialAccount.workspace_id == workspace_id)
    if platform:
        stmt = stmt.where(SocialAccount.platform == resolve_platform(platform))
    rows = db.scalars(stmt.order_by(SocialAccount.platform, SocialAccount.handle))
    return [AccountOut.from_row(row) for row in rows]


@router.post("/accounts/import", response_model=list[AccountOut])
def import_connected_accounts(
    workspace_id: str = Query(default="default"),
    group_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[AccountOut]:
    """Mirror Zernio's connected accounts into the local workspace.

    This is the post-OAuth step: once the browser returns from Zernio, the
    frontend calls this to persist whatever the account owner just approved.
    """
    with ZernioClient() as client:
        try:
            imported = import_accounts(
                db,
                client,
                workspace_id=workspace_id,
                group_id=group_id,
                platform=platform,
            )
        except ZernioError as exc:
            raise _http_error(exc) from exc
    return [AccountOut.from_row(row) for row in imported]


@router.patch("/accounts/{account_id}", response_model=AccountOut)
def update_account(
    account_id: str, payload: AccountUpdate, db: Session = Depends(get_db)
) -> AccountOut:
    """Disconnect/reconnect without dropping the stored history."""
    account = _get_account(db, account_id)
    if payload.group_id:
        account.group_id = payload.group_id
    if payload.connected is not None:
        account.connected = payload.connected
        account.status = "active" if payload.connected else "disconnected"
    db.commit()
    db.refresh(account)
    return AccountOut.from_row(account)


@router.delete("/accounts/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db)) -> None:
    account = _get_account(db, account_id)
    db.delete(account)
    db.commit()


@router.post("/accounts/{account_id}/sync", response_model=SyncReport)
def sync_one(
    account_id: str,
    options: SyncOptions | None = None,
    db: Session = Depends(get_db),
) -> SyncReport:
    account = _get_account(db, account_id)
    opts = options or SyncOptions()
    with ZernioClient() as client:
        report = sync_account(
            db,
            client,
            account,
            history_days=opts.history_days,
            with_posts=opts.with_posts,
        )
    return SyncReport(
        api_calls=report.api_calls,
        accounts_synced=1 if report.ok else 0,
        accounts_failed=0 if report.ok else 1,
        results=[report.to_dict()],
    )


@router.post("/sync", response_model=SyncReport)
def sync_everything(
    workspace_id: str = Query(default="default"),
    options: SyncOptions | None = None,
    db: Session = Depends(get_db),
) -> SyncReport:
    opts = options or SyncOptions()
    with ZernioClient() as client:
        report = sync_workspace(db, client, workspace_id=workspace_id)
    payload = report.to_dict()
    return SyncReport(
        api_calls=payload["api_calls"],
        accounts_synced=payload["accounts_synced"],
        accounts_failed=payload["accounts_failed"],
        results=payload["results"],
    )


@router.get("/accounts/{account_id}/history", response_model=HistoryOut)
def account_history(
    account_id: str,
    days: int = Query(default=30, ge=1, le=180),
    db: Session = Depends(get_db),
) -> HistoryOut:
    account = _get_account(db, account_id)
    since = (utcnow() - timedelta(days=days)).date()
    rows = db.scalars(
        select(MetricSnapshot)
        .where(MetricSnapshot.account_id == account.id, MetricSnapshot.day >= since)
        .order_by(MetricSnapshot.day)
    )
    return HistoryOut(
        account_id=account.id,
        days=days,
        points=[
            HistoryPoint(
                day=row.day,
                followers=row.followers,
                post_count=row.post_count,
                impressions=row.impressions,
                reach=row.reach,
                views=row.views,
                likes=row.likes,
                comments=row.comments,
                shares=row.shares,
                saves=row.saves,
                clicks=row.clicks,
                engagement_rate=row.engagement_rate,
            )
            for row in rows
        ],
    )


@router.get("/accounts/{account_id}/posts", response_model=PostListOut)
def account_posts(
    account_id: str,
    days: int = Query(default=30, ge=1, le=365),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> PostListOut:
    account = _get_account(db, account_id)
    stmt = (
        select(PostSnapshot)
        .where(PostSnapshot.account_id == account.id)
        .order_by(PostSnapshot.published_at.desc().nullslast())
        .limit(limit)
    )
    if days < 365:
        stmt = stmt.where(PostSnapshot.published_at >= utcnow() - timedelta(days=days))
    rows = list(db.scalars(stmt))
    return PostListOut(
        account_id=account.id,
        total=len(rows),
        posts=[PostOut.model_validate(row, from_attributes=True) for row in rows],
    )


# ----------------------------------------------------------------- publishing


def _get_scheduled_post(db: Session, post_id: str) -> ScheduledPost:
    row = db.get(ScheduledPost, post_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return row


def _compose_targets(
    db: Session, workspace_id: str, account_ids: list[str]
) -> list[SocialAccount]:
    """Resolve local ids to connected accounts in this workspace.

    A post targets real accounts, so a missing, disconnected or upstream-less
    account is a 404/409 rather than something to quietly skip: publishing to
    the wrong set is worse than failing loudly.
    """
    wanted = list(dict.fromkeys(account_ids))
    rows = list(
        db.scalars(
            select(SocialAccount).where(
                SocialAccount.id.in_(wanted),
                SocialAccount.workspace_id == workspace_id,
            )
        )
    )
    found = {row.id for row in rows}
    missing = [account_id for account_id in wanted if account_id not in found]
    if missing:
        raise HTTPException(
            status_code=404,
            detail=f"Accounts not found in workspace: {', '.join(missing)}",
        )
    for account in rows:
        if not account.connected:
            raise HTTPException(
                status_code=409, detail=f"{account.handle} is disconnected"
            )
        if not account.external_id:
            raise HTTPException(
                status_code=409,
                detail=f"{account.handle} has no upstream account id",
            )
    return rows


@router.post("/posts", response_model=ScheduledPostOut)
def compose_post(payload: ComposePostIn, db: Session = Depends(get_db)) -> ScheduledPostOut:
    """Compose a post and either publish it now, schedule it, or keep a draft.

    Drafts never leave the server, so this is the only mode that works without a
    configured Zernio key.
    """
    accounts = _compose_targets(db, payload.workspace_id, payload.account_ids)
    targets = [
        {
            "platform": account.platform,
            "account_id": account.id,
            "handle": account.handle,
            "external_id": account.external_id,
        }
        for account in accounts
    ]

    row = ScheduledPost(
        id=uuid4().hex,
        workspace_id=payload.workspace_id,
        content=payload.content,
        mode=payload.mode,
        status="draft",
        account_ids=[account.id for account in accounts],
        platforms=targets,
        results=[],
        scheduled_for=payload.scheduled_for,
        timezone_name=payload.timezone,
    )

    if payload.mode == "draft":
        db.add(row)
        db.commit()
        db.refresh(row)
        return ScheduledPostOut.from_row(row)

    platforms_payload = [
        {"platform": account.platform, "accountId": account.external_id}
        for account in accounts
    ]
    with ZernioClient() as client:
        try:
            created = client.create_post(
                content=payload.content,
                platforms=platforms_payload,
                scheduled_for=(
                    payload.scheduled_for.isoformat() if payload.scheduled_for else None
                ),
                timezone_name=payload.timezone,
                publish_now=payload.mode == "now",
                is_draft=False,
                request_id=row.id,
            )
        except ZernioError as exc:
            row.status = "failed"
            row.last_error = str(exc)
            db.add(row)
            db.commit()
            raise _http_error(exc) from exc

    result = normalise_post_result(created)
    row.external_post_id = result["external_id"]
    row.status = result["status"] or ("published" if payload.mode == "now" else "scheduled")
    row.platform_post_url = result["url"]
    row.results = result["platforms"]
    db.add(row)
    db.commit()
    db.refresh(row)
    return ScheduledPostOut.from_row(row)


@router.get("/posts", response_model=list[ScheduledPostOut])
def list_scheduled_posts(
    workspace_id: str = Query(default="default"),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[ScheduledPostOut]:
    stmt = select(ScheduledPost).where(ScheduledPost.workspace_id == workspace_id)
    if status:
        stmt = stmt.where(ScheduledPost.status == status)
    rows = db.scalars(stmt.order_by(ScheduledPost.created_at.desc()))
    return [ScheduledPostOut.from_row(row) for row in rows]


@router.get("/posts/{post_id}", response_model=ScheduledPostOut)
def get_scheduled_post(
    post_id: str,
    refresh: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> ScheduledPostOut:
    """Return one queue row. `refresh=true` re-reads the status from Zernio."""
    row = _get_scheduled_post(db, post_id)
    if refresh and row.external_post_id:
        with ZernioClient() as client:
            try:
                result = normalise_post_result(client.get_post(row.external_post_id))
            except ZernioError as exc:
                log.warning("could not refresh Zernio post %s: %s", post_id, exc)
            else:
                if result["status"]:
                    row.status = result["status"]
                if result["url"]:
                    row.platform_post_url = result["url"]
                if result["platforms"]:
                    row.results = result["platforms"]
                db.commit()
                db.refresh(row)
    return ScheduledPostOut.from_row(row)


@router.delete("/posts/{post_id}", status_code=204)
def delete_scheduled_post(post_id: str, db: Session = Depends(get_db)) -> None:
    """Drop a local queue row. A draft that never reached Zernio is gone for
    good; an already sent post is only forgotten here, not deleted upstream."""
    row = _get_scheduled_post(db, post_id)
    db.delete(row)
    db.commit()
