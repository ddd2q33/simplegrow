"""Pydantic contracts for the social endpoints.

The shapes mirror what `services.zernio` normalises, not Zernio's raw payloads,
so the frontend never has to know about `_id`, `followersCount` or the
`{"data": ...}` envelope.

The one structural change from the SocialCrawl era is that `AccountCreate` is
gone. Accounts can no longer be created by naming a handle; they only appear
after the account owner approves an OAuth flow. What replaces it is
`ConnectOut`, returned by `GET /social/connect/{platform}`, which carries the
URL the browser has to open.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.services.zernio import PLATFORM_ALIASES, SUPPORTED_PLATFORMS, resolve_platform

PLATFORMS = sorted(SUPPORTED_PLATFORMS)


def _check_platform(value: str) -> str:
    platform = resolve_platform(value)
    if platform not in SUPPORTED_PLATFORMS:
        known = ", ".join(PLATFORMS)
        extra = ", ".join(sorted(PLATFORM_ALIASES))
        raise ValueError(f"platform must be one of {known} (aliases: {extra})")
    return platform


class AccountOut(BaseModel):
    id: str
    workspace_id: str
    group_id: str
    platform: str
    handle: str
    display_name: str | None = None
    avatar_url: str | None = None
    profile_url: str | None = None
    connected: bool
    status: str
    followers: int
    following: int
    posts_count: int
    likes_count: int
    engagement_rate: float | None = None
    # Zernio-specific
    external_id: str | None = None
    zernio_profile_id: str | None = None
    has_analytics_access: bool = True
    needs_reconnection: bool = False
    connected_at: datetime | None = None
    last_sync_at: datetime | None = None
    last_error: str | None = None

    @classmethod
    def from_row(cls, row: Any) -> "AccountOut":
        return cls(
            id=row.id,
            workspace_id=row.workspace_id,
            group_id=row.group_id,
            platform=row.platform,
            handle=row.handle,
            display_name=row.display_name,
            avatar_url=row.avatar_url,
            profile_url=row.profile_url,
            connected=row.connected,
            status=row.status,
            followers=row.followers,
            following=row.following,
            posts_count=row.posts_count,
            likes_count=row.likes_count,
            engagement_rate=row.engagement_rate,
            external_id=row.external_id,
            zernio_profile_id=row.zernio_profile_id,
            has_analytics_access=row.has_analytics_access,
            needs_reconnection=row.needs_reconnection,
            connected_at=row.connected_at,
            last_sync_at=row.last_sync_at,
            last_error=row.last_error,
        )


class AccountUpdate(BaseModel):
    connected: bool | None = None
    group_id: str | None = Field(default=None, min_length=1, max_length=64)


class ProfileOut(BaseModel):
    id: str
    name: str | None = None
    is_default: bool = False

    @classmethod
    def from_row(cls, row: dict[str, Any]) -> "ProfileOut":
        return cls(
            id=str(row.get("_id") or ""),
            name=row.get("name"),
            is_default=bool(row.get("isDefault")),
        )


class ConnectOut(BaseModel):
    """What the frontend needs to start an OAuth connection."""

    platform: str
    profile_id: str
    auth_url: str
    state: str | None = None


class SyncOptions(BaseModel):
    history_days: int | None = Field(default=None, ge=1, le=180)
    with_posts: bool = True


class SyncReport(BaseModel):
    api_calls: int
    accounts_synced: int
    accounts_failed: int
    results: list[dict[str, Any]]


class StatusOut(BaseModel):
    provider: str
    configured: bool
    base_url: str
    supported_platforms: list[str]
    default_profile_id: str | None = None
    redirect_url: str
    requests_per_minute: int
    rate_state: dict[str, Any] = Field(default_factory=dict)


class HistoryPoint(BaseModel):
    day: date
    followers: int = 0
    post_count: int = 0
    impressions: int | None = None
    reach: int | None = None
    views: int | None = None
    likes: int | None = None
    comments: int | None = None
    shares: int | None = None
    saves: int | None = None
    clicks: int | None = None
    engagement_rate: float | None = None


class HistoryOut(BaseModel):
    account_id: str
    days: int
    points: list[HistoryPoint]


class PostOut(BaseModel):
    external_id: str
    url: str | None = None
    text: str | None = None
    thumbnail_url: str | None = None
    media_type: str | None = None
    published_at: datetime | None = None
    status: str | None = None
    is_external: bool | None = None
    impressions: int | None = None
    reach: int | None = None
    views: int | None = None
    likes: int | None = None
    comments: int | None = None
    shares: int | None = None
    saves: int | None = None
    clicks: int | None = None
    follows: int | None = None
    watch_time_ms: int | None = None
    engagement_rate: float | None = None


class PostListOut(BaseModel):
    account_id: str
    total: int
    posts: list[PostOut]


class PlatformQuery(BaseModel):
    """Kept as a named model so the validators are reusable elsewhere."""

    platform: str

    @field_validator("platform")
    @classmethod
    def _validate(cls, value: str) -> str:
        return _check_platform(value)


def _as_utc(value: datetime | None) -> datetime | None:
    """SQLite drops tzinfo on the way back; re-attach UTC so the client parses
    a scheduled time in the zone it was entered for."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class ComposePostIn(BaseModel):
    workspace_id: str = Field(default="default", min_length=1, max_length=64)
    content: str = Field(min_length=1, max_length=63206)
    account_ids: list[str] = Field(min_length=1)
    mode: Literal["now", "schedule", "draft"] = "draft"
    scheduled_for: datetime | None = None
    timezone: str = Field(default="UTC", min_length=1, max_length=64)

    @model_validator(mode="after")
    def _require_schedule_time(self) -> "ComposePostIn":
        if self.mode == "schedule" and self.scheduled_for is None:
            raise ValueError("scheduled_for is required when mode is 'schedule'")
        return self


class ScheduledPlatformOut(BaseModel):
    platform: str
    account_id: str | None = None
    status: str | None = None
    url: str | None = None
    error: str | None = None


class ScheduledPostOut(BaseModel):
    id: str
    workspace_id: str
    content: str
    mode: str
    status: str
    account_ids: list[str]
    platforms: list[dict[str, Any]] = Field(default_factory=list)
    results: list[ScheduledPlatformOut] = Field(default_factory=list)
    scheduled_for: datetime | None = None
    timezone: str = "UTC"
    external_post_id: str | None = None
    platform_post_url: str | None = None
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_row(cls, row: Any) -> "ScheduledPostOut":
        return cls(
            id=row.id,
            workspace_id=row.workspace_id,
            content=row.content,
            mode=row.mode,
            status=row.status,
            account_ids=list(row.account_ids or []),
            platforms=list(row.platforms or []),
            results=[
                ScheduledPlatformOut(**item)
                for item in (row.results or [])
                if isinstance(item, dict)
            ],
            scheduled_for=_as_utc(row.scheduled_for),
            timezone=row.timezone_name,
            external_post_id=row.external_post_id,
            platform_post_url=row.platform_post_url,
            last_error=row.last_error,
            created_at=_as_utc(row.created_at),
            updated_at=_as_utc(row.updated_at),
        )
