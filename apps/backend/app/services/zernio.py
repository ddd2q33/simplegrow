"""HTTP client for the Zernio API.

Every route, parameter name and response path below was verified against the
live API with a real key, not against the published schema alone. Two reasons
that matters here: Zernio's spec leaves `GET /v1/analytics` untyped, and its
profile-like resources nest differently than a scraper's would.

    what                 endpoint                              gives us
    account list         GET /v1/accounts                      _id, platform, username, followersCount
    day-level series     GET /v1/analytics/daily-metrics       date, postCount, metrics{8 fields}
    per-post series      GET /v1/analytics                     posts[].analytics{9 fields}
    follower history     GET /v1/accounts/follower-stats       currentFollowers, dataPoints[], growth
    connect URL          GET /v1/connect/{platform}            authUrl, state
    profile bootstrap    POST /v1/profiles                     profile._id

The three things that differ from the previous SocialCrawl provider and that
shaped this module:

* **Accounts are connected, not looked up.** There is no "add @handle". Every
  account arrives from an OAuth flow the account owner approved, so the account
  id is the Zernio `_id` and our own composite id is only a local convenience.
* **Billing is a subscription, not per-call credits**, so there is no credit
  meter here. What there is instead is a per-minute request window advertised
  in `x-ratelimit-remaining` / `x-ratelimit-reset`. `_throttle` reads the last
  observed window before spending a call and waits it out, and a 429 is retried
  after the reset it reports.
* **History already exists upstream.** `daily-metrics` defaults to 180 days, so
  a first sync backfills the whole 7/30/90 dashboard range in one call instead
  of waiting weeks for locally accumulated snapshots.

Synchronous on purpose. The app runs a blocking SQLAlchemy `Session` per request
and the scheduler is a plain worker thread, so an async client here would force
`asyncio.run` at every call site for no benefit. One `ZernioClient` instance is
reused per sync run so its request count and rate window stay coherent.

Payloads come back at the top level, not inside a `{"data": ...}` envelope:
`GET /v1/accounts` answers `{accounts, hasAnalyticsAccess, pagination}`,
`daily-metrics` answers `{dailyData, platformBreakdown}`, and so on. `_data`
still unwraps a `data` key when one is present, because a couple of routes do
use it, but it never assumes it. Errors carry an `error` object with `code` and
`message`.
"""

from __future__ import annotations

import logging
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings

log = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
RETRY_STATUSES = frozenset({429, 500, 502, 503, 504})

# Zernio's own platform values. Note `twitter` for X, which is what the connect
# endpoint and the account payloads both use.
SUPPORTED_PLATFORMS = frozenset(
    {
        "instagram",
        "tiktok",
        "facebook",
        "youtube",
        "twitter",
        "linkedin",
        "threads",
        "pinterest",
        "reddit",
        "bluesky",
        "googlebusiness",
        "telegram",
        "snapchat",
        "discord",
        "slack",
        "whatsapp",
    }
)

# The product spells X "twitter" everywhere, matching Zernio. This alias exists
# only so a client sending the brand name is not rejected.
PLATFORM_ALIASES: dict[str, str] = {"x": "twitter"}


def resolve_platform(platform: str) -> str:
    value = (platform or "").strip().lower()
    return PLATFORM_ALIASES.get(value, value)


def _data(payload: Any) -> Any:
    """Return the useful part of a response.

    Zernio mostly answers at the top level, but a couple of routes wrap their
    body in `data`. Prefer `data` only when it is actually populated, so a
    top-level `{"accounts": [...]}` is not mistaken for an empty envelope.
    """
    if isinstance(payload, dict) and payload.get("data") is not None:
        return payload["data"]
    return payload


def _post_from(payload: Any) -> dict[str, Any]:
    """Pull the post object out of a create/get/delete response.

    Those routes answer `{"post": {...}}` (sometimes wrapped in `data`), while a
    delete may return just `{success: true}`. Never raise here: a caller treats an
    empty dict as "the provider said nothing useful".
    """
    raw = _data(payload)
    if isinstance(raw, dict):
        post = raw.get("post")
        if isinstance(post, dict):
            return post
        return raw
    return {}


class ZernioError(RuntimeError):
    def __init__(
        self,
        message: str,
        *,
        code: str = "upstream_error",
        status_code: int | None = None,
        details: Any = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.details = details


class ZernioNotConfigured(ZernioError):
    def __init__(self) -> None:
        super().__init__("ZERNIO_API_KEY is not set on the server.", code="not_configured")


def _as_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return int(value)
    return None


def _as_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def parse_timestamp(value: Any) -> datetime | None:
    """Parse an ISO 8601 string (or epoch seconds/millis) into an aware datetime."""
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        seconds = float(value)
        if seconds > 1e11:
            seconds /= 1000.0
        try:
            return datetime.fromtimestamp(seconds, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if text.isdigit():
            return parse_timestamp(int(text))
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def date_range(days: int, *, end: date | None = None) -> tuple[str, str]:
    """Inclusive `fromDate`/`toDate` pair covering `days` back from `end`."""
    last = end or date.today()
    return (last - timedelta(days=max(0, days))).isoformat(), last.isoformat()


class ZernioClient:
    """Stateless HTTP wrapper. One instance is reused per sync run."""

    def __init__(self, api_key: str | None = None) -> None:
        raw = api_key if api_key is not None else settings.zernio_api_key
        self._key = (raw or "").strip()
        self._base = settings.zernio_base_url.rstrip("/")
        self._calls = 0
        self._http = httpx.Client(timeout=45.0)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "ZernioClient":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    @property
    def configured(self) -> bool:
        return bool(self._key)

    @property
    def call_count(self) -> int:
        return self._calls

    # ------------------------------------------------------------- rate window

    def _throttle(self) -> None:
        """Pause before spending a call if the minute window is nearly spent."""
        remaining = _RATE_STATE.get("remaining")
        if isinstance(remaining, int) and remaining <= settings.zernio_min_remaining_requests:
            wait = _seconds_until(_RATE_STATE.get("reset"))
            log.warning(
                "Zernio rate window nearly spent (%s left); waiting %ss",
                remaining,
                round(wait, 1),
            )
            time.sleep(min(wait + 1, 65))
        delay = settings.zernio_request_delay_seconds
        if delay > 0:
            time.sleep(delay)

    # ------------------------------------------------------------------ request

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_body: dict[str, Any] | None = None,
        authenticated: bool = True,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if authenticated and not self.configured:
            raise ZernioNotConfigured()

        url = f"{self._base}/{path.lstrip('/')}"
        headers = {"Accept": "application/json"}
        if authenticated:
            headers["Authorization"] = f"Bearer {self._key}"
        if extra_headers:
            headers.update({k: str(v) for k, v in extra_headers.items()})

        last_error: ZernioError | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                self._throttle()
                response = self._http.request(
                    method, url, params=params or {}, json=json_body, headers=headers
                )
                self._calls += 1
                carry_rate_headers(response)
            except httpx.HTTPError as exc:
                last_error = ZernioError(f"Upstream request failed: {exc}", code="network_error")
            else:
                if response.status_code in RETRY_STATUSES and attempt < MAX_ATTEMPTS:
                    time.sleep(_retry_delay(response, attempt))
                    continue
                error = _error_for(response)
                if error is not None:
                    # 4xx that is not 429 is a caller problem: retrying only
                    # burns a request out of the minute window.
                    raise error
                payload = _parse_json(response)
                if not isinstance(payload, dict):
                    raise ZernioError("Zernio returned a non-object body.")
                return payload

            if attempt < MAX_ATTEMPTS:
                time.sleep(min(2**attempt, 8))

        raise last_error or ZernioError("Zernio request failed.")

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = self._request("GET", path, params=params)
        data = _data(payload)
        return data if isinstance(data, dict) else {}

    # ------------------------------------------------------------------ accounts

    def list_accounts(
        self, *, profile_id: str | None = None, platform: str | None = None
    ) -> list[dict[str, Any]]:
        """Every account the key can see, following pagination to the end."""
        rows, _ = self._accounts_page_sweep(profile_id=profile_id, platform=platform)
        return rows

    def accounts_with_analytics_flag(self) -> tuple[list[dict[str, Any]], bool]:
        """`list_accounts` plus the workspace-level `hasAnalyticsAccess` flag.

        The flag sits beside `accounts` in the envelope rather than on each row,
        so it has to be captured from the first page while the sweep continues.
        """
        return self._accounts_page_sweep()

    def _accounts_page_sweep(
        self, *, profile_id: str | None = None, platform: str | None = None
    ) -> tuple[list[dict[str, Any]], bool]:
        rows: list[dict[str, Any]] = []
        has_analytics = False
        page = 1
        while True:
            params: dict[str, Any] = {"page": page, "limit": 100}
            if profile_id:
                params["profileId"] = profile_id
            if platform:
                params["platform"] = platform
            data = self._get("accounts", params)
            if page == 1:
                has_analytics = bool(data.get("hasAnalyticsAccess"))
            batch = data.get("accounts")
            if not isinstance(batch, list) or not batch:
                break
            rows.extend(x for x in batch if isinstance(x, dict))
            pagination = data.get("pagination") or {}
            total_pages = _as_int(pagination.get("pages")) or 1
            if page >= total_pages or page >= 50:
                break
            page += 1
        return rows, has_analytics

    def update_account(self, account_id: str, body: dict[str, Any]) -> dict[str, Any]:
        payload = self._request("PATCH", f"accounts/{account_id}", json_body=body)
        data = _data(payload)
        return data if isinstance(data, dict) else {}

    def account_health(self) -> list[dict[str, Any]]:
        data = self._get("accounts/health")
        rows = data.get("accounts") or data.get("health") or []
        return [x for x in rows if isinstance(x, dict)]

    # ----------------------------------------------------------------- analytics

    def daily_metrics(
        self,
        *,
        account_id: str | None = None,
        profile_id: str | None = None,
        platform: str | None = None,
        days: int | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> list[dict[str, Any]]:
        """Day-level series. `days` is a convenience over from/to."""
        params: dict[str, Any] = {}
        if account_id:
            params["accountId"] = account_id
        if profile_id:
            params["profileId"] = profile_id
        if platform:
            params["platform"] = platform
        if from_date and to_date:
            params["fromDate"] = from_date
            params["toDate"] = to_date
        elif days is not None:
            start, end = date_range(days)
            params["fromDate"] = start
            params["toDate"] = end
        data = self._get("analytics/daily-metrics", params)
        return [x for x in (data.get("dailyData") or []) if isinstance(x, dict)]

    def post_analytics(
        self,
        *,
        account_id: str | None = None,
        days: int | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        limit: int = 50,
        page: int = 1,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"limit": limit, "page": page}
        if account_id:
            params["accountId"] = account_id
        if from_date and to_date:
            params["fromDate"] = from_date
            params["toDate"] = to_date
        elif days is not None:
            start, end = date_range(days)
            params["fromDate"] = from_date or start
            params["toDate"] = to_date or end
        return self._get("analytics", params)

    def follower_stats(
        self,
        *,
        account_ids: list[str] | None = None,
        profile_id: str | None = None,
        days: int = 30,
        granularity: str = "day",
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"granularity": granularity}
        start, end = date_range(days)
        params["fromDate"] = start
        params["toDate"] = end
        if account_ids:
            params["accountIds"] = ",".join(account_ids[:50])
        if profile_id:
            params["profileId"] = profile_id
        data = self._get("accounts/follower-stats", params)
        return [x for x in (data.get("accounts") or []) if isinstance(x, dict)]

    # ------------------------------------------------------------------- connect

    def profiles(self) -> list[dict[str, Any]]:
        """Profiles, tolerating both a list and a list-in-object body."""
        payload = self._request("GET", "profiles")
        raw = _data(payload)
        if isinstance(raw, list):
            rows: Any = raw
        elif isinstance(raw, dict):
            rows = raw.get("profiles") or raw.get("items") or []
        else:
            rows = []
        return [x for x in rows if isinstance(x, dict)]

    def create_profile(self, name: str) -> dict[str, Any]:
        payload = self._request("POST", "profiles", json_body={"name": name})
        data = _data(payload)
        if isinstance(data, dict):
            profile = data.get("profile")
            if isinstance(profile, dict):
                return profile
            return data
        return {}

    def ensure_profile(self, name: str | None = None) -> str:
        """Return a usable profile id, creating one only when none exists."""
        wanted = (name or settings.zernio_default_profile_name).strip()
        existing = self.profiles()
        for profile in existing:
            pid = profile.get("_id")
            if isinstance(pid, str) and pid:
                if profile.get("isDefault") or profile.get("name") == wanted:
                    return pid
        if existing and wanted:
            # Something exists but nothing is named/defaulted as asked for.
            # Reuse rather than littering the Zernio account with profiles.
            first = existing[0].get("_id")
            if isinstance(first, str) and first:
                log.info("reusing existing Zernio profile %s instead of creating %r", first, wanted)
                return first
        created = self.create_profile(wanted)
        pid = created.get("_id")
        if not pid:
            raise ZernioError("Zernio did not return a profile id after create.")
        return str(pid)

    def connect_url(
        self, platform: str, *, profile_id: str, redirect_url: str | None = None
    ) -> dict[str, Any]:
        """The OAuth URL the browser must open to approve one account."""
        slug = resolve_platform(platform)
        if slug not in SUPPORTED_PLATFORMS:
            raise ZernioError(
                f"Unsupported platform: {platform!r}. "
                f"Supported: {', '.join(sorted(SUPPORTED_PLATFORMS))}.",
                code="bad_platform",
            )
        params: dict[str, Any] = {"profileId": profile_id}
        target = redirect_url or settings.zernio_redirect_url
        if target:
            params["redirect_url"] = target
        data = self._get(f"connect/{slug}", params)
        auth_url = data.get("authUrl")
        if not auth_url:
            raise ZernioError("Zernio did not return an authUrl.", code="no_auth_url")
        return {"authUrl": str(auth_url), "state": data.get("state")}

    # --------------------------------------------------------------------- posts

    def create_post(
        self,
        *,
        content: str,
        platforms: list[dict[str, Any]],
        scheduled_for: str | None = None,
        timezone_name: str = "UTC",
        publish_now: bool = False,
        is_draft: bool = False,
        media_items: list[dict[str, Any]] | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a post on Zernio. Precedence matches the API: draft wins over
        everything, then publish-now, then a scheduled time. With none set the
        post is saved as a draft, so a caller can never publish by omission.

        `request_id` is sent as `x-request-id`, making a retry of the same
        logical post return the original instead of publishing twice.
        """
        body: dict[str, Any] = {"content": content, "platforms": platforms}
        if media_items:
            body["mediaItems"] = media_items
        if is_draft:
            body["isDraft"] = True
        elif publish_now:
            body["publishNow"] = True
        elif scheduled_for:
            body["scheduledFor"] = scheduled_for
            body["timezone"] = timezone_name
        headers = {"x-request-id": request_id} if request_id else None
        payload = self._request("POST", "posts", json_body=body, extra_headers=headers)
        return _post_from(payload)

    def get_post(self, post_id: str) -> dict[str, Any]:
        """Fetch one post, used to refresh a queue row's status."""
        payload = self._request("GET", f"posts/{post_id}")
        return _post_from(payload)

    def delete_post(self, post_id: str) -> dict[str, Any]:
        payload = self._request("DELETE", f"posts/{post_id}")
        return _post_from(payload)


# Shared rate-limit bookkeeping so a whole run can report its window usage and
# the next call can see it before spending.
_RATE_STATE: dict[str, Any] = {"limit": None, "remaining": None, "reset": None}


def carry_rate_headers(response: httpx.Response) -> None:
    for header, key in (
        ("x-ratelimit-limit", "limit"),
        ("x-ratelimit-remaining", "remaining"),
        ("x-ratelimit-reset", "reset"),
    ):
        value = response.headers.get(header)
        if value is not None:
            try:
                _RATE_STATE[key] = int(value)
            except ValueError:
                _RATE_STATE[key] = value


def rate_state() -> dict[str, Any]:
    return dict(_RATE_STATE)


def _seconds_until(reset: Any) -> float:
    try:
        target = float(reset)
    except (TypeError, ValueError):
        return 5.0
    return max(1.0, min(target - time.time(), 65.0))


def _retry_delay(response: httpx.Response, attempt: int) -> float:
    retry_after = response.headers.get("Retry-After")
    if retry_after:
        try:
            return min(float(retry_after), 60.0)
        except ValueError:
            pass
    reset = response.headers.get("x-ratelimit-reset")
    if reset:
        return min(_seconds_until(reset), 60.0)
    return float(min(2**attempt, 15))


def _parse_json(response: httpx.Response) -> Any:
    try:
        return response.json()
    except ValueError as exc:
        raise ZernioError(
            f"Zernio returned a non-JSON body ({response.status_code}).", code="bad_response"
        ) from exc


def _error_for(response: httpx.Response) -> ZernioError | None:
    if response.status_code < 400:
        return None
    mapping = {
        400: ("invalid_request", "Zernio rejected the request parameters."),
        401: ("unauthorized", "Zernio rejected the API key."),
        402: ("plan_required", "This Zernio plan does not cover that call."),
        403: ("forbidden", "Zernio denied access to this resource."),
        404: ("not_found", "Zernio could not find that resource."),
        409: ("conflict", "Zernio reported a conflicting request."),
        422: ("invalid_request", "Zernio could not process those fields."),
        424: ("failed_dependency", "Zernio could not reach the platform."),
        429: ("rate_limited", "Zernio rate limit reached."),
        502: ("upstream_error", "Zernio is having trouble upstream."),
        503: ("upstream_unavailable", "Zernio is temporarily unavailable."),
    }
    code, message = mapping.get(
        response.status_code, ("upstream_error", f"Zernio returned {response.status_code}.")
    )
    details = None
    try:
        body = response.json()
        error = body.get("error") if isinstance(body, dict) else None
        if isinstance(error, dict):
            code = str(error.get("code") or code)
            message = str(error.get("message") or message)
            details = error.get("details")
    except ValueError:
        pass
    return ZernioError(message, code=code, status_code=response.status_code, details=details)


# --------------------------------------------------------------------- normalisers


def normalise_account(row: dict[str, Any]) -> dict[str, Any]:
    """Flatten one `GET /v1/accounts` row.

    `is_active` stays `None` when the payload omits the field so callers can
    tell "not reported" from "reported inactive" and avoid flagging accounts as
    disconnected on an incomplete response.
    """
    is_active = row.get("isActive")
    # `profileId` arrives as an object ({_id, name}) on the accounts route, not
    # as a bare id, so pull the id out before it reaches a String column.
    profile = row.get("profileId")
    if isinstance(profile, dict):
        profile = profile.get("_id")
    return {
        "external_id": (str(row.get("_id")) if row.get("_id") else None),
        "platform": resolve_platform(str(row.get("platform") or "")),
        "username": (row.get("username") or "").lstrip("@") or None,
        "display_name": row.get("displayName") or row.get("username"),
        "avatar_url": row.get("profilePicture"),
        "profile_url": row.get("profileUrl"),
        "zernio_profile_id": str(profile) if profile else None,
        "followers": _as_int(row.get("followersCount")) or 0,
        "followers_updated_at": parse_timestamp(row.get("followersLastUpdated")),
        "is_active": None if is_active is None else bool(is_active),
        "needs_reconnection": bool(row.get("needsReconnection")),
        "enabled": True if row.get("enabled") is None else bool(row.get("enabled")),
    }


def normalise_daily_metric(row: dict[str, Any]) -> dict[str, Any]:
    """Flatten one `dailyData[]` row into a per-day metric snapshot."""
    metrics = row.get("metrics") if isinstance(row.get("metrics"), dict) else {}
    return {
        "day": row.get("date"),
        "post_count": _as_int(row.get("postCount")) or 0,
        "impressions": _as_int(metrics.get("impressions")),
        "reach": _as_int(metrics.get("reach")),
        "likes": _as_int(metrics.get("likes")),
        "comments": _as_int(metrics.get("comments")),
        "shares": _as_int(metrics.get("shares")),
        "saves": _as_int(metrics.get("saves")),
        "clicks": _as_int(metrics.get("clicks")),
        "views": _as_int(metrics.get("views")),
    }


def normalise_post(row: dict[str, Any]) -> dict[str, Any]:
    """Flatten one `posts[]` row from `GET /v1/analytics`."""
    analytics = row.get("analytics") if isinstance(row.get("analytics"), dict) else {}
    thumb = row.get("thumbnailUrl")
    media = row.get("mediaItems") or []
    if not thumb and media and isinstance(media[0], dict):
        thumb = media[0].get("url")
    return {
        "external_id": (str(row.get("_id")) if row.get("_id") else ""),
        "platform": resolve_platform(str(row.get("platform") or "")),
        "url": row.get("platformPostUrl"),
        "text": row.get("content"),
        "thumbnail_url": thumb,
        "media_type": row.get("mediaType"),
        "published_at": parse_timestamp(row.get("publishedAt")),
        "status": row.get("status"),
        "is_external": bool(row.get("isExternal")),
        "impressions": _as_int(analytics.get("impressions")),
        "reach": _as_int(analytics.get("reach")),
        "views": _as_int(analytics.get("views")),
        "likes": _as_int(analytics.get("likes")),
        "comments": _as_int(analytics.get("comments")),
        "shares": _as_int(analytics.get("shares")),
        "saves": _as_int(analytics.get("saves")),
        "clicks": _as_int(analytics.get("clicks")),
        "follows": _as_int(analytics.get("follows")),
        "watch_time_ms": _as_int(analytics.get("igReelsAvgWatchTime")),
        "engagement_rate": _as_float(analytics.get("engagementRate")),
    }


def normalise_follower_stat(row: dict[str, Any]) -> dict[str, Any]:
    """Flatten one `GET /v1/accounts/follower-stats` row."""
    return {
        "external_id": (str(row.get("_id")) if row.get("_id") else ""),
        "platform": resolve_platform(str(row.get("platform") or "")),
        "username": (row.get("username") or "").lstrip("@") or None,
        "display_name": row.get("displayName"),
        "current_followers": _as_int(row.get("currentFollowers")) or 0,
        "growth": _as_int(row.get("growth")),
        "growth_pct": _as_float(row.get("growthPercentage")),
        "data_points": [x for x in (row.get("dataPoints") or []) if isinstance(x, dict)],
    }


def _platform_error(value: Any) -> str | None:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        message = value.get("message") or value.get("error")
        return str(message) if message else None
    return None


def normalise_post_result(row: dict[str, Any]) -> dict[str, Any]:
    """Flatten the post object returned by `POST/GET /v1/posts`.

    The per-platform outcomes are what the UI shows ("went out on TikTok, X
    rejected it"), so they are normalised here rather than in the router.
    """
    platforms = [p for p in (row.get("platforms") or []) if isinstance(p, dict)]
    url = row.get("platformPostUrl")
    if not url:
        url = next(
            (p.get("platformPostUrl") for p in platforms if p.get("platformPostUrl")),
            None,
        )
    return {
        "external_id": (str(row.get("_id")) if row.get("_id") else None),
        "status": row.get("status"),
        "url": url,
        "platforms": [
            {
                "platform": resolve_platform(str(p.get("platform") or "")),
                "account_id": str(p.get("accountId")) if p.get("accountId") else None,
                "status": p.get("status"),
                "url": p.get("platformPostUrl"),
                "error": _platform_error(p.get("error")),
            }
            for p in platforms
        ],
    }
