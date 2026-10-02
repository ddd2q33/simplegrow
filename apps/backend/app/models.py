"""Persisted account, per-day metric and post tables.

Zernio keeps its own history: `GET /v1/analytics/daily-metrics` returns up to 180
days of day-level series in a single call, so the first sync of an account
backfills the whole 7/30/90 dashboard range instead of waiting for locally
accumulated readings.

These tables still exist for two reasons. Dumping the dashboard must not cost an
API call per page load, so the series is copied in and read back locally. And a
day-level row is the unit the charts need, which is exactly what Zernio returns,
so no re-bucketing is required on our side.

Account identity deserves a note. There is no "add by handle" flow any more: an
account only exists after its owner approved an OAuth connection, so
`external_id` holds Zernio's own `_id` and that is what every analytics call is
made with. The `id` primary key stays a local composite so a row cannot collide
if the same Zernio account is later reachable through two workspaces.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True)
    group_id: Mapped[str] = mapped_column(String(64), index=True)

    platform: Mapped[str] = mapped_column(String(32), index=True)
    handle: Mapped[str] = mapped_column(String(128))
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    profile_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    account_type: Mapped[str] = mapped_column(String(32), default="business")

    # Zernio's own id for this account. Every analytics call targets it.
    external_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    # The Zernio profile this account was connected under, so a workspace can map
    # back onto the provider's own grouping.
    zernio_profile_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # False when the connection cannot read Insights (for example an Instagram
    # personal account with no Business account attached). Surfaced rather than
    # silently rendered as zero.
    has_analytics_access: Mapped[bool] = mapped_column(Boolean, default=True)
    needs_reconnection: Mapped[bool] = mapped_column(Boolean, default=False)

    connected: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(32), default="active")

    followers: Mapped[int] = mapped_column(Integer, default=0)
    following: Mapped[int] = mapped_column(Integer, default=0)
    posts_count: Mapped[int] = mapped_column(Integer, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    followers_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_post_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    __table_args__ = (
        UniqueConstraint("workspace_id", "platform", "handle", name="uq_account"),
    )

    snapshots: Mapped[list["MetricSnapshot"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )
    posts: Mapped[list["PostSnapshot"]] = relationship(
        back_populates="account", cascade="all, delete-orphan"
    )


class MetricSnapshot(Base):
    """One dated row per account, unique per (account, day).

    The eight engagement columns come straight from Zernio's
    `dailyData[].metrics`, so a dashboard chart reads local rows rather than
    re-billing a provider call per page load.
    """

    __tablename__ = "metric_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("social_accounts.id", ondelete="CASCADE"), index=True
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )
    day: Mapped[date] = mapped_column(Date, index=True)

    followers: Mapped[int] = mapped_column(Integer, default=0)
    following: Mapped[int] = mapped_column(Integer, default=0)
    posts_count: Mapped[int] = mapped_column(Integer, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    post_count: Mapped[int] = mapped_column(Integer, default=0)
    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reach: Mapped[int | None] = mapped_column(Integer, nullable=True)
    views: Mapped[int | None] = mapped_column(Integer, nullable=True)
    likes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shares: Mapped[int | None] = mapped_column(Integer, nullable=True)
    saves: Mapped[int | None] = mapped_column(Integer, nullable=True)
    clicks: Mapped[int | None] = mapped_column(Integer, nullable=True)

    account: Mapped[SocialAccount] = relationship(back_populates="snapshots")

    __table_args__ = (UniqueConstraint("account_id", "day", name="uq_snapshot_day"),)


class PostSnapshot(Base):
    """One row per post per account, upserted by the provider's post id."""

    __tablename__ = "post_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    account_id: Mapped[str] = mapped_column(
        ForeignKey("social_accounts.id", ondelete="CASCADE"), index=True
    )
    external_id: Mapped[str] = mapped_column(String(128), index=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )

    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    day: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_external: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    impressions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reach: Mapped[int | None] = mapped_column(Integer, nullable=True)
    views: Mapped[int | None] = mapped_column(Integer, nullable=True)
    likes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    shares: Mapped[int | None] = mapped_column(Integer, nullable=True)
    saves: Mapped[int | None] = mapped_column(Integer, nullable=True)
    clicks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    follows: Mapped[int | None] = mapped_column(Integer, nullable=True)
    watch_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    engagement_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    account: Mapped[SocialAccount] = relationship(back_populates="posts")

    __table_args__ = (
        UniqueConstraint("account_id", "external_id", name="uq_post_external"),
        Index("ix_post_account_published", "account_id", "published_at"),
    )


class ScheduledPost(Base):
    """A post composed in SimpleGrow, optionally handed to Zernio to publish.

    Kept locally for two reasons. A draft has to exist before Zernio is involved
    at all, and the publishing queue must survive a page reload even if the
    upstream call is slow or fails. `external_post_id` is Zernio's own post id
    once a `now`/`schedule` compose has been accepted; `results` keeps the
    per-platform outcome verbatim so the UI can show which networks went out and
    which were rejected.
    """

    __tablename__ = "scheduled_posts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(64), index=True)

    content: Mapped[str] = mapped_column(Text)
    # `now` publishes synchronously, `schedule` waits for `scheduled_for`, and
    # `draft` is never sent upstream.
    mode: Mapped[str] = mapped_column(String(16), default="draft")
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)

    # Local account ids, plus the resolved targets used in the Zernio call so the
    # queue renders handles without a join.
    account_ids: Mapped[list[str]] = mapped_column(JSON, default=list)
    platforms: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    results: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    scheduled_for: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    timezone_name: Mapped[str] = mapped_column(String(64), default="UTC")

    external_post_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    platform_post_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )
