"""Analytics endpoints, aggregated from the local snapshot tables.

Everything the dashboard reads is here. Each route resolves the same scope
(`range`, `account_id`, `platform`) and answers a payload shaped exactly like
`apps/frontend/lib/types.ts`. The backend is the source of truth for
aggregation, so the frontend never sums accounts itself.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.modules.analytics.schemas import (
    AccountBreakdown,
    AnalyticsDetail,
    DashboardOverview,
    MetricPoint,
    PlatformBreakdown,
)
from app.services import analytics as agg

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _scope(
    db: Session,
    *,
    range_key: str,
    account_id: str | None,
    platform: str | None,
    workspace_id: str,
) -> agg.Scope:
    return agg.resolve_scope(
        db,
        workspace_id=workspace_id,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
    )


@router.get("", response_model=AnalyticsDetail)
def get_analytics(
    range_key: str = Query(default="30d", alias="range"),
    account_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    workspace_id: str = Query(default="default"),
    db: Session = Depends(get_db),
) -> AnalyticsDetail:
    scope = _scope(
        db,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
        workspace_id=workspace_id,
    )
    return AnalyticsDetail.model_validate(agg.detail(db, scope))


@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    range_key: str = Query(default="30d", alias="range"),
    account_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    workspace_id: str = Query(default="default"),
    db: Session = Depends(get_db),
) -> DashboardOverview:
    scope = _scope(
        db,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
        workspace_id=workspace_id,
    )
    return DashboardOverview.model_validate(agg.overview(db, scope))


@router.get("/platforms", response_model=list[PlatformBreakdown])
def get_platforms(
    range_key: str = Query(default="30d", alias="range"),
    account_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    workspace_id: str = Query(default="default"),
    db: Session = Depends(get_db),
) -> list[PlatformBreakdown]:
    scope = _scope(
        db,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
        workspace_id=workspace_id,
    )
    return [PlatformBreakdown.model_validate(row) for row in agg.platforms(db, scope)]


@router.get("/accounts", response_model=list[AccountBreakdown])
def get_accounts(
    range_key: str = Query(default="30d", alias="range"),
    account_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    workspace_id: str = Query(default="default"),
    db: Session = Depends(get_db),
) -> list[AccountBreakdown]:
    scope = _scope(
        db,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
        workspace_id=workspace_id,
    )
    return [AccountBreakdown.model_validate(row) for row in agg.accounts(db, scope)]


@router.get("/followers", response_model=list[MetricPoint])
def get_followers(
    range_key: str = Query(default="30d", alias="range"),
    account_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    workspace_id: str = Query(default="default"),
    db: Session = Depends(get_db),
) -> list[MetricPoint]:
    scope = _scope(
        db,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
        workspace_id=workspace_id,
    )
    return [MetricPoint.model_validate(point) for point in agg.followers_series(db, scope)]


@router.get("/engagement", response_model=list[MetricPoint])
def get_engagement(
    range_key: str = Query(default="30d", alias="range"),
    account_id: str | None = Query(default=None),
    platform: str | None = Query(default=None),
    workspace_id: str = Query(default="default"),
    db: Session = Depends(get_db),
) -> list[MetricPoint]:
    scope = _scope(
        db,
        range_key=range_key,
        account_id=account_id,
        platform=platform,
        workspace_id=workspace_id,
    )
    return [
        MetricPoint.model_validate(point) for point in agg.engagement_series(db, scope)
    ]
