# ETHOS Architecture Consolidation (Control Plane x Clinical Plane)

## 1) Final plane separation

### Clinical Plane (offline-first, local)
- Scope: all clinical routes in `apps/ethos-backend/src/api/httpServer.ts` (`/sessions`, `/patients`, `/clinical-notes`, `/reports`, `/documents`, `/financial`, `/forms`, `/scales`, `/notifications`, `/contracts`, `/jobs`, `/retention-policy`, `/backup`, `/restore`, `/purge`).
- Data: local database (`src/infra/database.ts`) with encrypted fields for sensitive artifacts (ex: audio path stored as encrypted).
- Processing: local transcription job orchestration via `/sessions/:id/transcribe` + `/jobs/:id` polling.
- Privacy guardrails: consent before audio upload, PHI-free generic error payloads, RBAC gate for clinical paths.

### Control Plane (cloud)
- Scope: entitlements, billing lifecycle, and sanitized telemetry/observability.
- Current integration boundary in this repo: `apps/ethos-control-plane` and entitlement sync endpoints (`/local/entitlements/*`) consumed by clinical backend.
- Clinical backend only consumes entitlement snapshots and does not require external services by default for clinical operations.

## 2) Backend modules (/modules)
Created backend module boundaries in `apps/ethos-backend/src/modules`:
- auth
- patients
- sessions
- audio
- transcriber
- notes
- reports
- documents
- templates
- contracts
- financial
- forms
- scales
- notifications
- jobs
- retention
- audit
- admin

Each module currently has an `index.ts` placeholder to enforce explicit bounded-context ownership before route extraction.

## 3) Route map (organized by module)

- **auth**: `/auth/login`, `/auth/logout`, `/auth/invite`, `/auth/accept-invite`
- **patients**: `/patients`, `/patients/:id`, `/patients/access`, `/patient/*`
- **sessions**: `/sessions`, `/sessions/:id`, `/sessions/:id/status`
- **audio**: `/sessions/:id/audio` (multipart standard field `audio_file`)
- **transcriber**: `/sessions/:id/transcribe`, `/webhooks/transcriber`, `/api/webhook`
- **notes**: `/sessions/:id/clinical-note`, `/clinical-notes/:id`, `/clinical-notes/:id/validate`, `/sessions/:id/clinical-notes`
- **reports**: `/reports`
- **documents**: `/documents`, `/documents/:id/versions`, `/document-templates`
- **templates**: `/templates*`
- **contracts**: `/contracts*`, `/portal/contracts/*`
- **financial**: `/financial/entry`, `/financial/entries`
- **forms**: `/forms/entry`, `/forms/entries`
- **scales**: `/scales`, `/scales/record`, `/scales/records`
- **notifications**: `/notifications/*`
- **jobs**: `/jobs/:id`
- **retention**: `/retention-policy`
- **audit/admin**: `/admin/*`

## 4) Hardening/consolidation completed
- Added `GET /patients/:id`.
- Added server-side filters:
  - `GET /sessions`: `patient_id`, `status`, `from`, `to`
  - `GET /documents`: `case_id`, `patient_id`, `template_id`, `q`
  - `GET /financial/entries`: `patient_id`, `status`, `type`
- Audio multipart standardization: `POST /sessions/:id/audio` now validates multipart field `audio_file` and explicit consent.
- Transcription response consistency: transcription/export/backup responses include `jobId` (kept `job_id` for backward compatibility).
- Job states consolidated to include `queued/running/succeeded/failed/canceled` (`completed` accepted as backward-compatible input and normalized to `succeeded`).

## 5) Integrity checklist
- [x] No clinical route available without clinical RBAC gate.
- [x] Generic errors without sensitive body echo in responses.
- [x] Explicit consent required before audio upload.
- [x] Report creation requires previously validated note.
- [x] Patient-scoped clinical queries remain owner-isolated.

## 6) Textual architecture diagram

```text
+-------------------------------+          +----------------------------------+
|         Control Plane         |          |          Clinical Plane          |
|  (cloud / sanitized context)  |          |      (local, offline-first)      |
|-------------------------------|          |----------------------------------|
| Entitlements / Billing        |<-------->| /local/entitlements/* sync       |
| Sanitized telemetry endpoints |          | RBAC + owner isolation           |
+-------------------------------+          | Sessions/Patients/Notes/Reports  |
                                           | Documents/Financial/Forms/Scales |
                                           | Local jobs: transcribe/export     |
                                           | Local vault + encrypted artifacts |
                                           +-------------------+--------------+
                                                               |
                                                               v
                                                     Local persistence (SQLite/
                                                     SQLCipher target boundary)
```
