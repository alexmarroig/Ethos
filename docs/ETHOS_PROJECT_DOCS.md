# Ethos — Offline-First Clinical Platform for Psychologists

## Overview

Ethos is a production-grade monorepo platform purpose-built for Brazilian psychologists to run their entire clinical practice from a single, privacy-first, offline-capable system. It spans a React Native mobile app (Expo SDK 53), an Electron desktop app, a Node.js REST backend, an admin control plane, and a Whisper-based AI transcription worker — all coordinated through npm workspaces with shared types and a typed SDK.

The system is designed around a fundamental constraint: a psychologist's session must never depend on internet connectivity. Patient records, session notes, and recordings are encrypted locally on-device. The server backend is intentionally stateless and ephemeral (in-memory Maps), reinforcing the offline-first philosophy rather than fighting it.

---

## Problem

Solo and small psychology practices in Brazil face a fragmented tooling landscape. The existing options either:

- Require constant internet connectivity, making them unusable in low-signal environments or during strict in-session focus
- Store sensitive patient data on third-party servers without meaningful transparency or compliance guarantees
- Lack integrated workflows — psychologists juggle separate tools for scheduling, note-taking, audio recording, and billing
- Offer no AI assistance, forcing manual transcription of session audio into clinical notes

The result is that psychologists either rely on insecure consumer apps (WhatsApp, Google Docs) or expensive, bloated EHR systems built for hospitals — neither of which fits the workflow of a solo practitioner running 6–8 sessions per day.

---

## Solution

Ethos consolidates the full clinical workflow into a single offline-first platform with a two-layer security model and AI-assisted documentation:

1. **Device-level encryption**: All local data is stored in an SQLCipher-encrypted SQLite database, with the encryption key derived via PBKDF2 from the psychologist's device password — meaning no one, including Ethos, can read patient data without the practitioner's credential.
2. **Session-level Bearer auth**: API calls are authenticated with Bearer tokens stored in expo-secure-store, managed by a central `AuthContext` that injects tokens and handles 401s without coupling HTTP logic to React.
3. **AI transcription pipeline**: Audio recorded during sessions via expo-av is sent to a Whisper worker (`ethos-transcriber`), which returns a transcript that is automatically composed into a structured clinical note.
4. **Unified backend**: `ethos-clinic` exposes a clean REST API for patients, sessions, contracts, and clinical notes. `ethos-control-plane` handles billing entitlements, invite codes, and RBAC enforcement separately from clinical operations.

---

## Features

**Mobile (ethos-mobile)**
- Biometric/password-gated login with device-level SQLCipher key derivation
- Dashboard with upcoming session cards, financial summary, and alert indicators — all React.memo-optimized for smooth 60fps rendering
- Session Hub: in-session screen with real-time audio recording, animated waveform (20-bar react-native-reanimated visualization), and direct upload to the transcription worker
- Patient registry with full CRUD, persisted locally and synced when online
- Schedule management with session context modal (notes, mood tags, session type)
- Finance tracking screen for session billing and receivables
- Document management screen for clinical attachments
- Onboarding flow for first-time account setup

**Backend (ethos-clinic)**
- `/auth/login`, `/auth/logout` (idempotent), `/auth/invite` — session lifecycle with 24h token expiry and full purge on logout
- `/patients`, `/sessions` (full CRUD), `/clinical-notes`, `/contracts` — all protected by RBAC (`psychologist` vs `admin` roles)
- `/health` — public endpoint, used in load tests and uptime checks
- In-memory Map storage: intentional choice for a backend that serves as a sync target, not a source of truth

**Admin (ethos-control-plane)**
- Invite management and entitlement enforcement
- Billing and subscription state per psychologist account
- Role-based access control evaluated independently of the clinic backend

---

## Technical Architecture

```
monorepo (npm workspaces)
├── apps/
│   ├── ethos-clinic          # Node.js + TypeScript REST API (port 8787)
│   ├── ethos-control-plane   # Admin backend (RBAC, billing, invites)
│   ├── ethos-transcriber     # Python/Node Whisper worker
│   ├── ethos-desktop         # Electron + React (Vite)
│   └── ethos-mobile          # Expo SDK 53 + React Native 0.79.2
├── packages/
│   ├── @ethos/shared         # Shared TypeScript types and DTOs
│   └── ethos-sdk             # Typed client SDK
└── Frontend/                 # Lovable-based React web interface
```

**Mobile folder structure** (feature-based, not layer-based):
```
src/features/{auth,dashboard,sessions,patients,finance,documents,settings,onboarding}/
src/shared/hooks/             # useAuth, useDashboard, usePatients, useTheme
src/shared/services/api/      # httpClient, auth.ts, sessions.ts
src/shared/navigation/        # AppNavigator (AuthStack vs MainStack + BottomTabs)
```

**Two-navigator pattern**: `AppNavigator` conditionally renders either an `AuthStack` (login/register/recover) or a `MainStack` with `BottomTabs` based on auth state from `AuthContext`. Navigation state resets cleanly on logout without any leaked session state.

**Contract-based HTTP client**: All API calls are validated at runtime against a typed contract definition using regex-based path matching to handle dynamic segments like `{id}`. A call to a non-existent route or malformed URL fails loudly at the HTTP layer before it ever hits the server.

**Dependency injection for auth**: `httpClient` exports `setTokenProvider` and `setUnauthorizedHandler` functions. `AuthContext` calls these on mount, injecting the token getter and the logout callback. This decouples the HTTP layer from React entirely — no hooks are imported outside of component trees, no circular dependencies.

**SQLCipher encryption flow**: On device unlock, the psychologist's password is run through PBKDF2 to derive the SQLCipher key. The derived key is used to open the encrypted database. The raw password never leaves the device. expo-secure-store holds only the API Bearer token, not the database key.

---

## AI / Smart Components

**Audio Recording + Waveform Visualization**
The `SessionHubScreen` uses expo-av to record session audio with configurable quality settings. During recording, a 20-bar waveform animation runs via `react-native-reanimated` using `useSharedValue<number[]>` — each bar's height is driven by a shared value array updated on the JS thread and animated natively, maintaining performance even while audio I/O is active.

**Whisper Transcription Worker (ethos-transcriber)**
Recorded audio is uploaded to the `ethos-transcriber` service, a Python/Node hybrid worker running OpenAI's Whisper model locally. The worker returns a timestamped transcript, which the mobile app and backend compose into a structured clinical note — reducing post-session documentation time significantly.

**Clinical Note Auto-generation**
The pipeline goes: audio capture → upload → Whisper transcript → clinical note template hydration → stored in `/clinical-notes` via the clinic API. The psychologist reviews and signs off on the note rather than writing it from scratch, cutting documentation overhead from ~20 minutes to under 5 minutes per session.

---

## My Role

Designed and built the full system architecture from monorepo structure to feature implementation. Key contributions:

- Architected the two-layer security model (SQLCipher device encryption + Bearer token API auth) and its key derivation flow
- Built the contract-based typed HTTP client with runtime path validation and dependency-injection auth wiring
- Reorganized the mobile app from a flat file structure into a scalable feature-based folder layout
- Implemented the `SessionHubScreen` with live waveform animation and audio recording pipeline
- Aligned the entire Expo project to SDK 53, resolving native module incompatibilities across `react-native-reanimated`, `expo-sqlite`, `expo-av`, and `expo-secure-store`
- Fixed and stabilized the backend test suite (34/34 passing) covering endpoints, load behavior, auth lifecycle, RBAC, and validation edge cases
- Configured EAS Build for cloud-based Android APK generation with npm workspace compatibility

---

## Challenges

**1. Offline-first with encrypted local storage on mobile**
Integrating SQLCipher via `expo-sqlite` required careful handling of the PBKDF2 key derivation lifecycle. The database must not open until the key is derived, and the key must never be stored — only derived on demand. Coordinating this with React Navigation's auth flow required a staged initialization sequence.

**2. Expo SDK 53 + React 19 + Native Module Alignment**
Upgrading to SDK 53 introduced cascading compatibility breaks: `react-native-reanimated` 3.17 required a newer peer, `lucide-react-native` needed `react-native-svg` explicitly added, and several packages (including native crypto modules) had to be removed because they lacked EAS Build-compatible native binaries. Each dependency required individual diagnosis rather than a bulk upgrade.

**3. Contract-based HTTP validation without type erasure**
TypeScript types are erased at runtime. Building a contract validator that enforced route correctness at runtime — not just at compile time — required writing a regex-based path matcher that converted `{id}`-style dynamic segments into patterns, evaluated on every request.

**4. Decoupling HTTP auth from React**
The standard pattern of calling `useAuth()` inside API utility files causes React hook rule violations. The solution — exporting setter functions from the HTTP client and calling them from `AuthContext` on mount — required careful sequencing to ensure tokens were always available before the first authenticated request fired.

**5. Backend test reliability**
Several test failures were non-obvious: `/contracts` silently required a user token (not documented), `/auth/logout` was not idempotent (failed if called twice), and a missing `uid` import caused a test file to crash before any assertions ran.

---

## Impact

- A solo psychologist using Ethos can run an entire session day — scheduling, in-session recording, note generation, and billing — without internet connectivity
- Post-session documentation time is reduced from ~20 minutes to under 5 minutes per session via AI-assisted transcription
- Patient data never leaves the device unencrypted; even if the device is seized or stolen, the SQLCipher database is unreadable without the practitioner's password
- The typed SDK and contract-based client mean API integration bugs are caught at development time, not in production during a session
- EAS Build integration means the mobile app can be distributed and updated without requiring a local Android/Xcode build environment

---

## Differentiation

Most clinical management software for psychologists is either a consumer SaaS with weak privacy guarantees or an enterprise EHR that is overkill for solo practitioners. Ethos is different in three concrete ways:

1. **Encryption is structural, not optional**: SQLCipher encryption is baked into the data layer via PBKDF2 key derivation. There is no "enable encryption" toggle — the data is always encrypted, the key never persists.

2. **Offline is the default, not a fallback**: The architecture treats the server as a sync endpoint, not the source of truth. The mobile app functions fully without a server connection; sync happens opportunistically. This is the inverse of most cloud-first SaaS tools that bolt on "offline mode" as an afterthought.

3. **AI is embedded in the workflow, not bolted on**: Transcription and note generation happen as part of the session flow, not as a separate export-and-paste step. The psychologist ends a session and gets a draft clinical note — not a raw audio file they need to process manually.

---

## Future Improvements

- **End-to-end encrypted cloud sync**: Replace in-memory server Maps with an encrypted sync protocol (CRDTs over HTTPS with server-side opaque blobs) so patient records can safely roam across devices without the server ever seeing plaintext
- **EAS Update / OTA updates**: Push bug fixes and UI improvements to installed APKs without requiring a full EAS Build cycle
- **iOS build pipeline**: Current EAS configuration targets Android; add iOS provisioning and App Store Connect integration
- **Structured clinical note templates**: Move beyond Whisper-transcript-to-note to template-driven SOAP/DAP note generation with LLM post-processing
- **Offline billing reconciliation**: Allow the finance module to queue billing records locally and reconcile with a payment gateway (e.g., Pagar.me) on next connection
- **Multi-device session continuity**: Allow a psychologist to start a session note on mobile and complete it on desktop, with conflict-free merge via CRDT
- **Audit log**: Append-only tamper-evident log of record access and modifications for CFP (Brazilian Federal Council of Psychology) compliance
- **Telemetry with privacy constraints**: Opt-in, anonymized usage analytics built with differential privacy to prevent any patient-identifying signal from leaking
