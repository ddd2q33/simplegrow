# API contract expected by the frontend

The frontend is built and running on fixtures. This is the exact surface it
will call once `NEXT_PUBLIC_USE_MOCK=false`. Response shapes are the
TypeScript types in `apps/frontend/lib/types.ts` — treat those as the source of
truth and generate the Pydantic models from them.

Base URL comes from `NEXT_PUBLIC_API_URL`. Requests send
`Content-Type: application/json` and `Accept: application/json`. A non-2xx
response surfaces to the UI as `ApiError` carrying `status` and `path`.

Auth is not enforced in the prototype. Sessions currently live in
`localStorage`; `/auth/*` below is the intended replacement.

## Scope

Multi-account is the default, not an opt-in. The frontend keeps a single
global scope and sends it to every read endpoint:

| Param        | Values                                                    |
| ------------ | --------------------------------------------------------- |
| `range`      | `7d \| 30d \| 90d`                                       |
| `account_id` | a `SocialAccount.id`, or the literal `all` (default)     |
| `platform`   | `instagram \| tiktok \| youtube \| twitter \| facebook`, or the literal `all` |

`account_id=all` aggregates every connected account the caller can read.
Passing a concrete id narrows the aggregate to that one account. The backend
is the source of truth for aggregation — the frontend does not sum accounts
itself once it is talking to the API.

## Auth

| Method | Path              | Returns                                |
| ------ | ----------------- | -------------------------------------- |
| GET    | `/auth/me`        | `User \| null`                         |
| GET    | `/auth/session`   | `{ user: User, workspace: Workspace } \| null` |
| POST   | `/auth/login`     | `User` — body `{ email, password }`    |
| POST   | `/auth/register`  | `User` — body `{ fullName, email, password, workspaceName }` |
| POST   | `/auth/logout`    | `{ ok: true }`                         |

## Workspace

| Method | Path                       | Returns            |
| ------ | -------------------------- | ------------------ |
| GET    | `/workspaces/{id}`         | `Workspace`        |
| GET    | `/account-groups`           | `AccountGroup[]`   |

`AccountGroup` is `{ id, name, description, color }` and
`SocialAccount.groupId` points at one. A group is a presentation layer for
organising accounts — there is no "select a group" scope. The frontend groups
accounts client-side by `groupId`.

## Social accounts (implemented)

Backed by the Zernio unified API. The key lives only in the server env as
`ZERNIO_API_KEY`; it is never sent to the browser.

Accounts are **connected, not looked up**. There is no "add @handle": an
account only exists after its owner approves an OAuth flow, so the connect
endpoints hand the browser a URL instead of accepting a handle.

| Method | Path                          | Returns         |
| ------ | ----------------------------- | --------------- |
| GET    | `/social/status`              | provider status, default profile, supported platforms, rate window |
| GET    | `/social/profiles`            | `ProfileOut[]`  |
| GET    | `/social/connect/{platform}`  | `ConnectOut` — `{ platform, profile_id, auth_url, state }` |
| GET    | `/social/accounts?workspace_id=&platform=` | `AccountOut[]` |
| POST   | `/social/accounts/import?workspace_id=&group_id=` | `AccountOut[]` — mirrors connected accounts |
| PATCH  | `/social/accounts/{id}`       | `AccountOut` — body `{ connected?, group_id? }` |
| DELETE | `/social/accounts/{id}`       | `204`, cascades snapshots |
| POST   | `/social/accounts/{id}/sync`  | `SyncReport` — body `{ history_days?, with_posts? }` |
| POST   | `/social/sync?workspace_id=`  | `SyncReport` |
| GET    | `/social/accounts/{id}/history?days=` | `HistoryOut` (per-day series) |
| GET    | `/social/accounts/{id}/posts?days=&limit=` | `PostListOut` |

The frontend opens `ConnectOut.auth_url`. Zernio redirects back to
`ZERNIO_REDIRECT_URL` with `connected`, `profileId`, `accountId` and `username`
appended; the settings view then calls `POST /social/accounts/import` to persist
whatever was just approved.

`AccountOut` includes `external_id` (Zernio's account id), `zernio_profile_id`,
`has_analytics_access` and `needs_reconnection`. A connection with no analytics
access still lists but its metrics read zero.

Disconnecting uses `PATCH { connected: false }`, which keeps the stored
snapshots. `DELETE` is the destructive variant and cascades them.

Backend field names are snake_case (`display_name`, `avatar_url`,
`last_sync_at`, `group_id`). `services/workspace.ts` owns the mapping to the
camelCase `SocialAccount` the UI expects.

## Publishing (implemented)

Composing and scheduling, also on Zernio. A post is composed against local
account ids and is published, scheduled or kept as a draft:

| Method | Path                        | Returns                |
| ------ | --------------------------- | ---------------------- |
| POST   | `/social/posts`             | `ScheduledPost` — body `ComposePostIn` |
| GET    | `/social/posts?workspace_id=&status=` | `ScheduledPost[]` |
| GET    | `/social/posts/{id}?refresh=` | `ScheduledPost`      |
| DELETE | `/social/posts/{id}`        | `204`                  |

`ComposePostIn` is `{ workspace_id, content, account_ids, mode, scheduled_for?,
timezone? }`, where `mode` is `now | schedule | draft`. `scheduled_for` is
required when `mode="schedule"`.

- `draft` never reaches Zernio; the row is local and works without a configured
  key.
- `now` calls `POST /v1/posts` with `publishNow: true` and returns once every
  platform has been attempted.
- `schedule` sends `scheduledFor` + `timezone`.
- Every create is idempotent: the local row id is sent as the `x-request-id`
  header, so a retry returns the original post instead of publishing twice.

`ScheduledPost` carries `status` (`draft | scheduled | publishing | published |
partial | failed`), `results` (per-platform `{ platform, account_id, status,
url, error }`) and `platform_post_url`. `GET /social/posts/{id}?refresh=true`
re-reads the status from Zernio instead of trusting the cached row. `DELETE`
only forgets the local row; it does not delete a post already sent upstream.

This first version is text-only. Images and video would add a
`POST /v1/media/presign` → `PUT` → `mediaItems` step and a multipart upload
route on our side.

## Analytics (implemented)

Aggregated on the backend from the local snapshot tables, so the frontend does
no summation. Every route resolves the same scope and returns the matching
`lib/types.ts` shape with camelCase fields.

| Method | Path                             | Returns            |
| ------ | -------------------------------- | ------------------ |
| GET    | `/analytics?range=…&account_id=…&platform=…` | `AnalyticsDetail`  |
| GET    | `/analytics/overview?range=…&account_id=…&platform=…` | `DashboardOverview` |
| GET    | `/analytics/platforms?range=…&account_id=…`   | `PlatformBreakdown[]` |
| GET    | `/analytics/accounts?range=…&platform=…`      | `AccountBreakdown[]` |
| GET    | `/analytics/followers?range=…&account_id=…&platform=…` | `MetricPoint[]` |
| GET    | `/analytics/engagement?range=…&account_id=…&platform=…` | `MetricPoint[]` |

Scope rules match the rest of the app: `range` is `7d | 30d | 90d`, `account_id`
is a local account id or `all`, `platform` is the canonical platform or `all`.
The series always covers every day of the range, and each point's `previous` is
the value on the same day one range earlier, which is what the dashed
comparison line reads.

Two honest gaps are baked in rather than faked:

- Zernio has no per-day follower count. `followersSeries` (and the followers
  KPI's delta) is summed from each post's `follows`, so on platforms that do not
  report it the series is zero.
- The AI and experiments modules do not exist yet, so `overview` returns empty
  `recentInsights`, `recommendations` and `activeExperiments`. `/insights`,
  `/recommendations`, `/audience/overview`, `/experiments`, `/reports` and
  `/content` are still unimplemented and fall back to fixtures on 404.

## Content

| Method | Path           | Returns                                    |
| ------ | -------------- | ------------------------------------------ |
| GET    | `/content`     | `ContentLibrary` — `{ items, scheduled, totals }` |
| GET    | `/content/{id}`| `ContentItem \| null`                      |

Filters applied client-side today (`platform`, `status`, `search`, `sort`)
should be accepted as query params when the backend takes over:
`/content?platform=&status=&search=&sort=`, alongside the standard
`account_id` and `range` scope params. Every `ContentItem` carries an
`accountId`, and `ContentLibrary.totals.accountCount` reports how many
accounts the payload covers.

## Experiments

| Method | Path                          | Returns              |
| ------ | ----------------------------- | -------------------- |
| GET    | `/experiments?account_id=…&platform=…` | `Experiment[]` |
| GET    | `/experiments/{id}`           | `Experiment \| null` |
| POST   | `/experiments`                | `Experiment`         |
| PATCH  | `/experiments/{id}/status`    | `Experiment`         |

`POST /experiments` body: `{ name, hypothesis, platform, accountId, primaryMetric }`.
`accountId` is required — an experiment always belongs to exactly one account.

## Reports

| Method | Path            | Returns        |
| ------ | --------------- | -------------- |
| GET    | `/reports?account_id=…&platform=…` | `Report[]` |
| POST   | `/reports`      | `Report`       |
| DELETE | `/reports/{id}` | `{ id: string }` |

`POST /reports` body: `{ name, periodStart, periodEnd, format, sections, accountId }`.
`accountId` may be `all` to generate a cross-account report. A newly created
report may be returned with `status: "generating"` and a null
`downloadUrl`; the frontend renders a spinner until it flips to `ready`.

## AI output

| Method | Path               | Returns           |
| ------ | ------------------ | ----------------- |
| GET    | `/insights?account_id=…&platform=…` | `Insight[]` |
| GET    | `/recommendations?account_id=…&platform=…` | `Recommendation[]` |
| PATCH  | `/recommendations/{id}` | `Recommendation` — body `{ status }` |
| GET    | `/notifications`   | `Notification[]`  |

`Insight` and `Recommendation` carry an `accountId`; a `null` value means
workspace-level and it shows under any scope. When `account_id` is set, the
backend returns only that account's rows plus the workspace-level ones.

## Notes for implementation

- `DashboardOverview.kpis[].sparkline` and `AudienceOverview.activityHeatmap`
  are pre-aggregated for display; the frontend does no client-side math on them.
- `Insight.confidence` and `Experiment.confidence` are both percentages (0–100).
- `Report.sizeBytes` is `0` while generating.
- `SocialAccount.status` is one of `active | syncing | error | disconnected`.
- `PlatformBreakdown` includes `impressions`; `AccountBreakdown` does too.
- `AudienceOverview.accountCount` and `DashboardOverview.accountCount` say how
  many accounts the aggregate covers, so the UI can label the scope honestly.
- Engagement is a rate. When aggregating across accounts, weight each
  account's engagement rate by its own impressions — never average the rates
  unweighted, and never scale a per-account rate by the cross-account total.
- All dashboard pages currently prerender as static. They must become dynamic
  (or use revalidation) once reads hit the API, or every visitor will see the
  payload frozen at build time.
- Zernio keeps its own history (~180 days via `daily-metrics`), so the first
  sync backfills the whole 7/30/90 range rather than growing one day at a time.
  `metric_snapshots` is a local cache so dashboard reads never cost an API call;
  `POST /social/sync` and the daily worker keep it current. Zernio meters a
  per-minute request window (60/min), not per-call credits.
