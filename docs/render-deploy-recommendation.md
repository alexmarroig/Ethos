# Render deployment recommendation (monorepo)

## Recommended service target
Deploy **`apps/ethos-clinic`** as the primary clinical backend service.

Why:
- Root scripts already alias backend development/build to clinic (`dev:backend -> dev:clinic`, `build:backend -> build:clinic`).
- `ethos-clinic` contains newer clinical modules (for example notifications types/storage/routes) that are not fully present in `ethos-backend`.

## Render option A (recommended): service root at app folder
- **Root Directory:** `apps/ethos-clinic`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `node dist/index.js`

## Render option B: root at monorepo root, workspace commands
- **Root Directory:** *(empty / repository root)*
- **Build Command:** `npm ci && npm --workspace apps/ethos-clinic run build`
- **Start Command:** `npm --workspace apps/ethos-clinic exec node dist/index.js`

## Minimal environment variables
- `PORT` (Render injects this automatically).

The service entrypoint reads:
- `const port = Number(process.env.PORT ?? 8787);`
- `server.listen(port, "0.0.0.0", ...)`

## Important note
Current TypeScript build is failing in both backend apps. Fix compile errors before production deploy so build reliably regenerates `dist/` in CI.
