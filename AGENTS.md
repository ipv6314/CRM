# AGENTS.md — Base44 Dev Notes

## Stack
- Frontend-only Vite 6 + React 19 + TypeScript app (no backend, no database).
- All data is in `localStorage` via `services/db.ts`. No API server exists despite `services/api.ts` and `.env.example` referencing `VITE_API_URL`.
- Tailwind is loaded via CDN in `index.html` (no PostCSS/build step).
- `@google/genai` is imported in `components/SupportView.tsx` but never instantiated — no API key needed to boot.

## Running
- `docker compose -f docker-compose.base44.yml up -d`
- Vite dev server on port 3000, bind-mounted source, live reload enabled.
- Host allowlist handled via `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` (Vite 6.1+).

## Login
- Default admin: username `admin`, password `admin`.

## Verification
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → 200
- `/index.tsx` and `/App.tsx` should return 200 (dev server transpiles on the fly).
