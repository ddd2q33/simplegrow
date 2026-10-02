"""Pydantic contracts for the analytics endpoints.

These mirror `apps/frontend/lib/types.ts` field for field, so the field names are
camelCase on purpose: the frontend consumes the JSON verbatim and there is no
second mapping layer. An empty collection is a valid, honest answer — the AI and
experiment sections are simply not backed by the snapshot tables yet.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class MetricPoint(BaseModel):
    date: str
    value: float
    previous: float


class Kpi(BaseModel):
    key: str
    label: str
    value: float
    previousValue: float
    changePct: float
    format: Literal["compact", "percent", "number", "duration"]
    sparkline: list[float]
    platform: str = "all"


class PlatformBreakdown(BaseModel):
    platform: str
    followers: int
    followersChangePct: float
    reach: int
    impressions: int
    engagementRate: float
    sharePct: float
    accountCount: int


class AccountBreakdown(BaseModel):
    accountId: str
    platform: str
    handle: str
    displayName: str
    followers: int
    followersChangePct: float
    reach: int
    views: int
    impressions: int
    engagementRate: float
    sharePct: float


class ContentMetrics(BaseModel):
    impressions: int
    reach: int
    views: int
    likes: int
    comments: int
    shares: int
    saves: int
    engagementRate: float
    watchTimeSec: float
    avgViewPct: float


class ContentItem(BaseModel):
    id: str
    accountId: str
    platform: str
    format: str
    title: str
    caption: str
    thumbnailUrl: str | None = None
    permalink: str | None = None
    publishedAt: str
    status: str
    aiScore: float
    tags: list[str] = []
    metrics: ContentMetrics


class DashboardOverview(BaseModel):
    range: str
    scopeLabel: str
    accountCount: int
    kpis: list[Kpi]
    followersSeries: list[MetricPoint]
    engagementSeries: list[MetricPoint]
    reachSeries: list[MetricPoint]
    reachByPlatform: list[PlatformBreakdown]
    accountBreakdown: list[AccountBreakdown]
    topContent: list[ContentItem]
    # Owned by the AI and experiments modules, which are not implemented yet.
    recentInsights: list[dict] = []
    recommendations: list[dict] = []
    activeExperiments: list[dict] = []


class AnalyticsDetail(BaseModel):
    range: str
    scopeLabel: str
    platforms: list[PlatformBreakdown]
    accounts: list[AccountBreakdown]
    reachSeries: list[MetricPoint]
    viewsSeries: list[MetricPoint]
    engagementSeries: list[MetricPoint]
