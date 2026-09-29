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
| GET    | `/social/accounts`         | `SocialAccount[]`  |
| POST   | `/social/accounts/{id}/connect`    | `SocialAccount` |
| POST   | `/social/accounts/{id}/disconnect` | `SocialAccount` |

## Analytics

| Method | Path                             | Returns            |
| ------ | -------------------------------- | ------------------ |
| GET    | `/analytics?range=7d\|30d\|90d`   | `AnalyticsDetail`  |
| GET    | `/analytics/overview?range=…`     | `DashboardOverview` |
| GET    | `/analytics/platforms`            | `PlatformBreakdown[]` |
| GET    | `/analytics/followers?range=…`    | `MetricPoint[]`    |
| GET    | `/analytics/engagement?range=…`   | `MetricPoint[]`    |

## Content

| Method | Path           | Returns                                    |
| ------ | -------------- | ------------------------------------------ |
| GET    | `/content`     | `ContentLibrary` — `{ items, scheduled, totals }` |
| GET    | `/content/{id}`| `ContentItem \| null`                      |

Filters applied client-side today (`platform`, `status`, `search`, `sort`)
should be accepted as query params when the backend takes over:
`/content?platform=&status=&search=&sort=`.

## Experiments

| Method | Path                          | Returns              |
| ------ | ----------------------------- | -------------------- |
| GET    | `/experiments`                | `Experiment[]`       |
| GET    | `/experiments/{id}`           | `Experiment \| null` |
| POST   | `/experiments`                | `Experiment`         |
| PATCH  | `/experiments/{id}/status`    | `Experiment`         |

`POST /experiments` body: `{ name, hypothesis, platform, primaryMetric }`.

## Reports

| Method | Path            | Returns        |
| ------ | --------------- | -------------- |
| GET    | `/reports`      | `Report[]`     |
| POST   | `/reports`      | `Report`       |
| DELETE | `/reports/{id}` | `{ id: string }` |

`POST /reports` body: `{ name, periodStart, periodEnd, format, sections }`.
A newly created report may be returned with `status: "generating"` and a null
`downloadUrl`; the frontend renders a spinner until it flips to `ready`.

## AI output

| Method | Path               | Returns           |
| ------ | ------------------ | ----------------- |
| GET    | `/insights`        | `Insight[]`       |
| GET    | `/recommendations` | `Recommendation[]` |
| PATCH  | `/recommendations/{id}` | `Recommendation` — body `{ status }` |
| GET    | `/notifications`   | `Notification[]`  |

## Notes for implementation

- `DashboardOverview.kpis[].sparkline` and `AudienceOverview.activityHeatmap`
  are pre-aggregated for display; the frontend does no client-side math on them.
- `Insight.confidence` and `Experiment.confidence` are both percentages (0–100).
- `Report.sizeBytes` is `0` while generating.
- `SocialAccount.status` is one of `active | syncing | error | disconnected`.
