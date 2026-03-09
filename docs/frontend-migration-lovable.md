# ETHOS SKY Frontend Migration (Lovable as Primary UI)

## Primary frontend

- Primary UI app: `Frontend/` (Vite + React + TypeScript + Tailwind + shadcn)
- Workspace integration: root `package.json` now includes `"Frontend"` in `workspaces`
- Default dev command: `npm run dev` now starts Lovable UI (`dev:frontend`)

## Commands

- Run primary frontend: `npm run dev`
- Explicit frontend dev: `npm run dev:frontend`
- Web alias: `npm run dev:web`
- Build primary frontend: `npm run build:frontend`

## Architecture mapping

`Frontend/src` is already aligned with the target structure:

- `components/`
- `pages/`
- `services/`
- `hooks/`
- `lib/` (utils)
- `contexts/`
- `stores/`
- `api/`

## Business logic integration status

- Auth: `Frontend/src/contexts/AuthContext.tsx` + `Frontend/src/services/authService.ts`
- Clinical API: `Frontend/src/services/apiClient.ts` + service modules under `Frontend/src/services/*`
- Control plane API: `Frontend/src/services/controlClient.ts` and `control*` services
- Routing entrypoint: `Frontend/src/App.tsx`

No visual redesign was applied; existing Lovable UI remains source of truth.

## Safe cleanup executed

- Removed duplicated template stylesheet not used by Lovable app: `Frontend/src/App.css`
- Fixed duplicated/invalid export filename from Lovable export:
  - `Frontend/src/components/Sidebar (1).tsx`
  - renamed to `Frontend/src/components/Sidebar.tsx`

## Environment

Use `Frontend/.env.example` as base:

- `VITE_CLINICAL_BASE_URL`
- `VITE_CONTROL_BASE_URL`
- `VITE_APP_VERSION`
- `VITE_ENV`

## Notes

- Legacy UIs under `apps/ethos-desktop` and `apps/ethos-mobile` were preserved to avoid breaking non-web workflows.
- Lovable frontend is now the default/main web interface in this repository.
