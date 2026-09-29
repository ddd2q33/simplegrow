# SimpleGrow

AI Growth Dashboard SaaS.

Stack:
- Frontend: Next.js + Tailwind
- Backend: FastAPI
- Database: PostgreSQL/Turso
- AI Engine: OpenAI integration

## Frontend (prototype)

The frontend is implemented and runs entirely on local fixture data — no
backend required. Types in `apps/frontend/lib/types.ts` are the contract the
FastAPI backend must satisfy.

```bash
cd apps/frontend
npm install
npm run dev          # http://localhost:3000
```

| Script              | Purpose                        |
| ------------------- | ------------------------------ |
| `npm run dev`       | Dev server                     |
| `npm run build`     | Production build               |
| `npm run lint`      | ESLint (`--max-warnings=0`)    |
| `npm run typecheck` | `tsc --noEmit`                 |

Routes: `/login`, `/register`, `/dashboard`, `/dashboard/{analytics,audience,content,experiments,reports,settings}`.

## Connecting the backend

Every read and write goes through `apps/frontend/services/*`, which calls
`query()` / `mutate()` from `apps/frontend/lib/api.ts`. While
`NEXT_PUBLIC_USE_MOCK=true` (the default) those helpers serve `lib/mock/*`
fixtures. Set it to `false` and every request is issued against
`NEXT_PUBLIC_API_URL` with no other code change.

The endpoints the frontend expects are listed in `docs/api-contract.md`.

## Backend

1. Configure FastAPI in apps/backend
2. Connect social APIs
