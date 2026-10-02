"""Dashboard aggregation over the local snapshot tables.

The frontend never sums accounts itself: every read here returns an already
aggregated, camelCase payload that matches `lib/types.ts`. Two tables feed it.

* `metric_snapshots` is the day-level series. A `scope` (range + account +
  platform) becomes one summed row per day, and each point also carries the
  value from the same day one range earlier, which is what the dashed
  "previous period" line and the KPI deltas compare against.
* `post_snapshots` feeds the top-content list and the follower proxy. Zernio
  does not expose a daily follower count, so "net followers gained per day" is
  summed from each post's `follows`; where the platform reports none the series
  is honestly zero rather than invented.

Engagement is a rate, so it is never summed. It is rebuilt from totals as
interactions over a denominator (impressions when present, otherwise reach or
views) and only then turned into a percentage.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import MetricSnapshot, PostSnapshot, SocialAccount, utcnow
from app.services.zernio import resolve_platform

RANGE_DAYS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}
DEFAULT_RANGE = "30d"

# The eight per-day counters Zernio reports. Followers are handled separately
# because the provider has no per-day follower point.
METRIC_FIELDS = (
    "impressions",
    "reach",
    "views",
    "likes",
    "comments",
    "shares",
    "saves",
    "clicks",
)


@dataclass(frozen=True)
class Scope:
    range_key: str
    days: int
    workspace_id: str
    account_id: str | None
    platform: str | None
    accounts: list[SocialAccount]

    @property
    def ids(self) -> list[str]:
        return [account.id for account in self.accounts]


def parse_range(value: str | None) -> str:
    key = (value or DEFAULT_RANGE).strip().lower()
    if key in RANGE_DAYS:
        return key
    digits = key[:-1] if key.endswith("d") else key
    if digits.isdigit() and f"{digits}d" in RANGE_DAYS:
        return f"{digits}d"
    return DEFAULT_RANGE


def resolve_scope(
    db: Session,
    *,
    workspace_id: str,
    range_key: str | None = None,
    account_id: str | None = None,
    platform: str | None = None,
) -> Scope:
    key = parse_range(range_key)
    wanted_account = account_id if account_id and account_id != "all" else None
    wanted_platform = (
        resolve_platform(platform) if platform and platform != "all" else None
    )

    stmt = select(SocialAccount).where(
        SocialAccount.workspace_id == workspace_id,
        SocialAccount.connected.is_(True),
    )
    if wanted_account:
        stmt = stmt.where(SocialAccount.id == wanted_account)
    if wanted_platform:
        stmt = stmt.where(SocialAccount.platform == wanted_platform)

    accounts = list(
        db.scalars(stmt.order_by(SocialAccount.platform, SocialAccount.handle))
    )
    return Scope(
        range_key=key,
        days=RANGE_DAYS[key],
        workspace_id=workspace_id,
        account_id=wanted_account,
        platform=wanted_platform,
        accounts=accounts,
    )


def scope_label(scope: Scope) -> str:
    if scope.account_id and scope.accounts:
        account = scope.accounts[0]
        return account.display_name or account.handle
    if scope.account_id:
        return "Unknown account"
    if scope.platform:
        return f"All {scope.platform} accounts"
    return "All accounts"


def window(days: int) -> tuple[date, date, date, date]:
    """Return current and previous periods as `(start, end, prev_start, prev_end)`."""
    end = utcnow().date()
    start = end - timedelta(days=days - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)
    return start, end, prev_start, prev_end


def _empty_row() -> dict[str, int]:
    return {field: 0 for field in METRIC_FIELDS} | {"post_count": 0}


def _load_daily(
    db: Session, account_ids: list[str], start: date, end: date
) -> dict[str, dict[date, dict[str, int]]]:
    if not account_ids:
        return {}
    rows = db.scalars(
        select(MetricSnapshot).where(
            MetricSnapshot.account_id.in_(account_ids),
            MetricSnapshot.day >= start,
            MetricSnapshot.day <= end,
        )
    )
    by_account: dict[str, dict[date, dict[str, int]]] = {}
    for row in rows:
        bucket = by_account.setdefault(row.account_id, {}).setdefault(
            row.day, _empty_row()
        )
        for field in METRIC_FIELDS:
            bucket[field] += getattr(row, field) or 0
        bucket["post_count"] += row.post_count or 0
    return by_account


def _load_follows(
    db: Session, account_ids: list[str], start: date, end: date
) -> dict[str, dict[date, int]]:
    if not account_ids:
        return {}
    rows = db.execute(
        select(
            PostSnapshot.account_id,
            PostSnapshot.day,
            func.coalesce(func.sum(PostSnapshot.follows), 0),
        )
        .where(
            PostSnapshot.account_id.in_(account_ids),
            PostSnapshot.day.is_not(None),
            PostSnapshot.day >= start,
            PostSnapshot.day <= end,
        )
        .group_by(PostSnapshot.account_id, PostSnapshot.day)
    )
    by_account: dict[str, dict[date, int]] = {}
    for account_id, day, total in rows:
        if day is None:
            continue
        by_account.setdefault(account_id, {})[day] = int(total or 0)
    return by_account


def _combine(
    by_account: dict[str, dict[date, dict[str, int]]], account_ids: list[str]
) -> dict[date, dict[str, int]]:
    combined: dict[date, dict[str, int]] = {}
    for account_id in account_ids:
        for day, row in by_account.get(account_id, {}).items():
            bucket = combined.setdefault(day, _empty_row())
            for field in METRIC_FIELDS:
                bucket[field] += row[field]
            bucket["post_count"] += row["post_count"]
    return combined


def _combine_follows(
    by_account: dict[str, dict[date, int]], account_ids: list[str]
) -> dict[date, int]:
    combined: dict[date, int] = {}
    for account_id in account_ids:
        for day, value in by_account.get(account_id, {}).items():
            combined[day] = combined.get(day, 0) + value
    return combined


def _sum_field(
    by_day: dict[date, dict[str, int]], start: date, end: date, field: str
) -> int:
    total = 0
    day = start
    while day <= end:
        row = by_day.get(day)
        if row:
            total += row.get(field, 0)
        day += timedelta(days=1)
    return total


def _sum_values(values: dict[date, int], start: date, end: date) -> int:
    total = 0
    day = start
    while day <= end:
        total += values.get(day, 0)
        day += timedelta(days=1)
    return total


def _rate(row: dict[str, int] | None) -> float:
    """Interactions over the best available denominator, as a percentage."""
    if not row:
        return 0.0
    interactions = row["likes"] + row["comments"] + row["shares"] + row["saves"]
    denominator = row["impressions"] or row["reach"] or row["views"]
    if denominator <= 0:
        return 0.0
    return round(interactions / denominator * 100, 2)


def _period_rate(by_day: dict[date, dict[str, int]], start: date, end: date) -> float:
    interactions = 0
    denominator = 0
    day = start
    while day <= end:
        row = by_day.get(day)
        if row:
            interactions += row["likes"] + row["comments"] + row["shares"] + row["saves"]
            denominator += row["impressions"] or row["reach"] or row["views"]
        day += timedelta(days=1)
    if denominator <= 0:
        return 0.0
    return round(interactions / denominator * 100, 2)


def _series(
    by_day: dict[date, dict[str, int]],
    start: date,
    end: date,
    days: int,
    field: str,
) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    day = start
    while day <= end:
        current = by_day.get(day, {})
        previous = by_day.get(day - timedelta(days=days), {})
        points.append(
            {
                "date": day.isoformat(),
                "value": current.get(field, 0),
                "previous": previous.get(field, 0),
            }
        )
        day += timedelta(days=1)
    return points


def _rate_series(
    by_day: dict[date, dict[str, int]], start: date, end: date, days: int
) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    day = start
    while day <= end:
        points.append(
            {
                "date": day.isoformat(),
                "value": _rate(by_day.get(day)),
                "previous": _rate(by_day.get(day - timedelta(days=days))),
            }
        )
        day += timedelta(days=1)
    return points


def _follows_series(
    follows: dict[date, int], start: date, end: date, days: int
) -> list[dict[str, Any]]:
    points: list[dict[str, Any]] = []
    day = start
    while day <= end:
        points.append(
            {
                "date": day.isoformat(),
                "value": follows.get(day, 0),
                "previous": follows.get(day - timedelta(days=days), 0),
            }
        )
        day += timedelta(days=1)
    return points


def _pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round((current - previous) / previous * 100, 2)


def _row_for_accounts(
    by_account: dict[str, dict[date, dict[str, int]]],
    follows_by_account: dict[str, dict[date, int]],
    account_ids: list[str],
    start: date,
    end: date,
    prev_start: date,
    prev_end: date,
) -> tuple[dict[date, dict[str, int]], dict[str, Any]]:
    """Aggregate a set of accounts into one period summary."""
    by_day = _combine(by_account, account_ids)
    follows = _combine_follows(follows_by_account, account_ids)
    summary = {
        "reach": _sum_field(by_day, start, end, "reach"),
        "impressions": _sum_field(by_day, start, end, "impressions"),
        "views": _sum_field(by_day, start, end, "views"),
        "prev_reach": _sum_field(by_day, prev_start, prev_end, "reach"),
        "prev_views": _sum_field(by_day, prev_start, prev_end, "views"),
        "engagementRate": _period_rate(by_day, start, end),
        "prev_engagementRate": _period_rate(by_day, prev_start, prev_end),
        "newFollowers": _sum_values(follows, start, end),
    }
    return by_day, summary


def platform_rows(
    scope: Scope,
    by_account: dict[str, dict[date, dict[str, int]]],
    follows_by_account: dict[str, dict[date, int]],
    start: date,
    end: date,
    prev_start: date,
    prev_end: date,
) -> list[dict[str, Any]]:
    groups: dict[str, list[SocialAccount]] = {}
    for account in scope.accounts:
        groups.setdefault(account.platform, []).append(account)

    rows: list[dict[str, Any]] = []
    for platform, accounts in groups.items():
        ids = [account.id for account in accounts]
        _, summary = _row_for_accounts(
            by_account, follows_by_account, ids, start, end, prev_start, prev_end
        )
        followers = sum(account.followers for account in accounts)
        rows.append(
            {
                "platform": platform,
                "followers": followers,
                "followersChangePct": round(
                    summary["newFollowers"] / followers * 100, 2
                )
                if followers
                else 0.0,
                "reach": summary["reach"],
                "impressions": summary["impressions"],
                "engagementRate": summary["engagementRate"],
                "sharePct": 0.0,
                "accountCount": len(accounts),
            }
        )

    total_reach = sum(row["reach"] for row in rows)
    for row in rows:
        row["sharePct"] = (
            round(row["reach"] / total_reach * 1000) / 10 if total_reach else 0.0
        )
    return rows


def account_rows(
    scope: Scope,
    by_account: dict[str, dict[date, dict[str, int]]],
    follows_by_account: dict[str, dict[date, int]],
    start: date,
    end: date,
    prev_start: date,
    prev_end: date,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for account in scope.accounts:
        _, summary = _row_for_accounts(
            by_account,
            follows_by_account,
            [account.id],
            start,
            end,
            prev_start,
            prev_end,
        )
        rows.append(
            {
                "accountId": account.id,
                "platform": account.platform,
                "handle": account.handle,
                "displayName": account.display_name or account.handle,
                "followers": account.followers,
                "followersChangePct": round(
                    summary["newFollowers"] / max(account.followers, 1) * 100, 2
                ),
                "reach": summary["reach"],
                "views": summary["views"],
                "impressions": summary["impressions"],
                "engagementRate": summary["engagementRate"],
                "sharePct": 0.0,
            }
        )

    total_reach = sum(row["reach"] for row in rows)
    for row in rows:
        row["sharePct"] = (
            round(row["reach"] / total_reach * 1000) / 10 if total_reach else 0.0
        )
    rows.sort(key=lambda row: row["reach"], reverse=True)
    return rows


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def _content_format(platform: str, media_type: str | None) -> str:
    value = (media_type or "").lower()
    if "carousel" in value or "album" in value:
        return "carousel"
    if platform == "youtube":
        return "video"
    if platform == "tiktok":
        return "short"
    if platform == "twitter":
        return "thread"
    if "video" in value or "reel" in value:
        return "reel" if platform == "instagram" else "video"
    return "image"


def _title(text: str | None) -> str:
    if not text:
        return "(untitled)"
    first = next((line.strip() for line in text.splitlines() if line.strip()), "")
    return (first[:80] or "(untitled)")


def top_content(
    db: Session, scope: Scope, start: date, end: date, limit: int = 5
) -> list[dict[str, Any]]:
    if not scope.ids:
        return []
    posts = list(
        db.scalars(
            select(PostSnapshot)
            .where(
                PostSnapshot.account_id.in_(scope.ids),
                PostSnapshot.day.is_not(None),
                PostSnapshot.day >= start,
                PostSnapshot.day <= end,
            )
            .order_by(
                (
                    func.coalesce(PostSnapshot.views, 0)
                    + func.coalesce(PostSnapshot.reach, 0)
                    + func.coalesce(PostSnapshot.likes, 0)
                ).desc()
            )
            .limit(limit)
        )
    )
    by_account = {account.id: account for account in scope.accounts}
    items: list[dict[str, Any]] = []
    for post in posts:
        account = by_account.get(post.account_id)
        if account is None:
            continue
        interactions = (
            (post.likes or 0)
            + (post.comments or 0)
            + (post.shares or 0)
            + (post.saves or 0)
        )
        denominator = (post.impressions or 0) or (post.reach or 0) or (post.views or 0)
        rate = round(interactions / denominator * 100, 2) if denominator else 0.0
        published = _as_utc(post.published_at)
        items.append(
            {
                "id": post.external_id,
                "accountId": post.account_id,
                "platform": account.platform,
                "format": _content_format(account.platform, post.media_type),
                "title": _title(post.text),
                "caption": post.text or "",
                "thumbnailUrl": post.thumbnail_url,
                "permalink": post.url,
                "publishedAt": (published or _as_utc(post.recorded_at)).isoformat(),
                "status": post.status or "published",
                "aiScore": round(min(rate, 10.0), 1),
                "tags": [],
                "metrics": {
                    "impressions": post.impressions or 0,
                    "reach": post.reach or 0,
                    "views": post.views or 0,
                    "likes": post.likes or 0,
                    "comments": post.comments or 0,
                    "shares": post.shares or 0,
                    "saves": post.saves or 0,
                    "engagementRate": rate,
                    "watchTimeSec": round((post.watch_time_ms or 0) / 1000, 1),
                    "avgViewPct": 0.0,
                },
            }
        )
    return items


def _kpis(
    scope: Scope, by_day: dict[date, dict[str, int]], follows: dict[date, int]
) -> list[dict[str, Any]]:
    start, end, prev_start, prev_end = window(scope.days)
    reach_now = _sum_field(by_day, start, end, "reach")
    reach_before = _sum_field(by_day, prev_start, prev_end, "reach")
    views_now = _sum_field(by_day, start, end, "views")
    views_before = _sum_field(by_day, prev_start, prev_end, "views")
    engagement_now = _period_rate(by_day, start, end)
    engagement_before = _period_rate(by_day, prev_start, prev_end)

    total_followers = sum(account.followers for account in scope.accounts)
    gained = _sum_values(follows, start, end)
    followers_before = max(total_followers - gained, 0)

    reach_points = _series(by_day, start, end, scope.days, "reach")
    views_points = _series(by_day, start, end, scope.days, "views")
    followers_points = _follows_series(follows, start, end, scope.days)

    return [
        {
            "key": "followers",
            "label": "Total followers",
            "value": total_followers,
            "previousValue": followers_before,
            "changePct": _pct_change(total_followers, followers_before),
            "format": "compact",
            "sparkline": [point["value"] for point in followers_points[-14:]],
            "platform": "all",
        },
        {
            "key": "reach",
            "label": f"Reach ({scope.days}d)",
            "value": reach_now,
            "previousValue": reach_before,
            "changePct": _pct_change(reach_now, reach_before),
            "format": "compact",
            "sparkline": [point["value"] for point in reach_points[-14:]],
            "platform": "all",
        },
        {
            "key": "views",
            "label": f"Video views ({scope.days}d)",
            "value": views_now,
            "previousValue": views_before,
            "changePct": _pct_change(views_now, views_before),
            "format": "compact",
            "sparkline": [point["value"] for point in views_points[-14:]],
            "platform": "all",
        },
        {
            "key": "engagement",
            "label": "Engagement rate",
            "value": engagement_now,
            "previousValue": engagement_before,
            "changePct": _pct_change(engagement_now, engagement_before),
            "format": "percent",
            "sparkline": [
                point["value"]
                for point in _rate_series(by_day, start, end, scope.days)[-14:]
            ],
            "platform": "all",
        },
    ]


@dataclass
class AnalyticsData:
    scope: Scope
    by_account: dict[str, dict[date, dict[str, int]]]
    follows_by_account: dict[str, dict[date, int]]
    start: date
    end: date
    prev_start: date
    prev_end: date

    def combined(self) -> dict[date, dict[str, int]]:
        return _combine(self.by_account, self.scope.ids)

    def combined_follows(self) -> dict[date, int]:
        return _combine_follows(self.follows_by_account, self.scope.ids)


def load(db: Session, scope: Scope) -> AnalyticsData:
    start, end, prev_start, prev_end = window(scope.days)
    # Load one extra period back so the "previous" points of the current window
    # resolve from the same cache instead of reading zero.
    return AnalyticsData(
        scope=scope,
        by_account=_load_daily(db, scope.ids, prev_start, end),
        follows_by_account=_load_follows(db, scope.ids, prev_start, end),
        start=start,
        end=end,
        prev_start=prev_start,
        prev_end=prev_end,
    )


def overview(db: Session, scope: Scope) -> dict[str, Any]:
    data = load(db, scope)
    by_day = data.combined()
    follows = data.combined_follows()
    return {
        "range": scope.range_key,
        "scopeLabel": scope_label(scope),
        "accountCount": len(scope.accounts),
        "kpis": _kpis(scope, by_day, follows),
        "followersSeries": _follows_series(
            follows, data.start, data.end, scope.days
        ),
        "engagementSeries": _rate_series(
            by_day, data.start, data.end, scope.days
        ),
        "reachSeries": _series(by_day, data.start, data.end, scope.days, "reach"),
        "reachByPlatform": platform_rows(
            scope,
            data.by_account,
            data.follows_by_account,
            data.start,
            data.end,
            data.prev_start,
            data.prev_end,
        ),
        "accountBreakdown": account_rows(
            scope,
            data.by_account,
            data.follows_by_account,
            data.start,
            data.end,
            data.prev_start,
            data.prev_end,
        ),
        "topContent": top_content(db, scope, data.start, data.end),
        "recentInsights": [],
        "recommendations": [],
        "activeExperiments": [],
    }


def detail(db: Session, scope: Scope) -> dict[str, Any]:
    data = load(db, scope)
    by_day = data.combined()
    return {
        "range": scope.range_key,
        "scopeLabel": scope_label(scope),
        "platforms": platform_rows(
            scope,
            data.by_account,
            data.follows_by_account,
            data.start,
            data.end,
            data.prev_start,
            data.prev_end,
        ),
        "accounts": account_rows(
            scope,
            data.by_account,
            data.follows_by_account,
            data.start,
            data.end,
            data.prev_start,
            data.prev_end,
        ),
        "reachSeries": _series(by_day, data.start, data.end, scope.days, "reach"),
        "viewsSeries": _series(by_day, data.start, data.end, scope.days, "views"),
        "engagementSeries": _rate_series(
            by_day, data.start, data.end, scope.days
        ),
    }


def platforms(db: Session, scope: Scope) -> list[dict[str, Any]]:
    data = load(db, scope)
    return platform_rows(
        scope,
        data.by_account,
        data.follows_by_account,
        data.start,
        data.end,
        data.prev_start,
        data.prev_end,
    )


def accounts(db: Session, scope: Scope) -> list[dict[str, Any]]:
    data = load(db, scope)
    return account_rows(
        scope,
        data.by_account,
        data.follows_by_account,
        data.start,
        data.end,
        data.prev_start,
        data.prev_end,
    )


def followers_series(db: Session, scope: Scope) -> list[dict[str, Any]]:
    data = load(db, scope)
    return _follows_series(
        data.combined_follows(), data.start, data.end, scope.days
    )


def engagement_series(db: Session, scope: Scope) -> list[dict[str, Any]]:
    data = load(db, scope)
    return _rate_series(data.combined(), data.start, data.end, scope.days)
