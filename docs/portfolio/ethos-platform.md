# Ethos — Offline-First Clinical Platform for Psychologists

## Overview

Ethos is a full-stack, privacy-first clinical management platform built for psychologists and mental health professionals. It runs entirely on the practitioner's own hardware — no data ever leaves the device unless the user explicitly chooses to sync. The platform covers the complete clinical workflow: session scheduling, audio recording, AI-powered transcription, clinical note generation, patient contract management, financial tracking, and encrypted backups — all accessible from desktop (Electron) and mobile (Expo/React Native).

The system is architected as a monorepo with two separate backend planes (clinical and administrative), a Python/Node transcription worker, and two client applications. A strict data boundary ensures that protected health information (PHI) never crosses into the cloud-facing admin plane.

---

## Problem

Mental health professionals in Brazil face a structural conflict: modern clinical software is cloud-dependent by default, which creates real legal exposure under LGPD (Brazil's GDPR equivalent) and CFP ethics guidelines for psychologists. Existing SaaS tools require uploading sensitive session notes, patient records, and audio to third-party servers — often without adequate data processing agreements.

At the same time, fully offline tools are rigid, fragmented, and offer no AI assistance for documentation — the most time-consuming part of clinical practice. Psychologists spend hours manually writing session notes after already spending hours in sessions.

Ethos exists to close this gap: full clinical automation with zero mandatory cloud dependency.

---

## Solution

Ethos runs a local Node.js REST server (the "clinical plane") on the practitioner's machine. All PHI, audio files, transcripts, and clinical notes are stored locally using an in-memory database backed by optional SQLite with AES-256-GCM encryption. The mobile and desktop apps connect to this local server over LAN — the phone and the PC share the same WiFi, making the mobile app a true remote interface to the local server.

AI transcription runs via a Python subprocess (Faster-Whisper) with models fine-tuned for Brazilian Portuguese, operating entirely offline. Transcripts feed into a draft clinical note generator, and the psychologist validates the final document — maintaining professional accountability while automating the paperwork.

A separate "control plane" server handles identity, billing, and subscription entitlements — but it is architecturally forbidden from receiving any clinical data. The clinical plane only calls the control plane to fetch the entitlements snapshot (what features the user's subscription allows), never to upload patient data.

---

## Features

- **Session lifecycle management** — schedule, confirm, record audio, transcribe, generate notes, validate, export
- **Offline AI transcription** — Faster-Whisper (Distil Whisper for speed, Whisper Large v3 for accuracy) via Python subprocess, no API key required
- **Draft clinical note generation** — transcript → structured draft → psychologist validation workflow
- **Patient portal** — shareable token-based links for patients to sign contracts, confirm sessions, fill scales, and write diary entries
- **Encrypted local storage** — SQLCipher (desktop), `expo-secure-store` (mobile), AES-256-GCM audio encryption
- **Biometric authentication** — TouchID/FaceID for mobile app unlock via `expo-local-authentication`
- **Contract management** — generate, send, and export (PDF/DOCX) clinical contracts with consent tracking
- **Financial tracking** — receivables/payables per session, monthly reports
- **Scale and anamnesis forms** — intake forms and validated psychological scales (PHQ-9, GAD-7, etc.)
- **Document templates** — render HTML/PDF/DOCX from customizable templates
- **Audit logging** — immutable event log for ethics/regulatory compliance
- **P2P sync** — QR+WiFi direct sync between devices without cloud intermediary
- **Backup/restore/purge** — full data portability; GDPR/LGPD-compliant right-to-erasure via `/purge`
- **Glassmorphism mobile UI** — blur-based design system with Reanimated animations
- **EAS cloud build** — CI/CD via Expo Application Services for APK/IPA distribution

---

## Technical Architecture

- **Frontend (Desktop):** Electron 28 + React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Frontend (Mobile):** Expo SDK 53 + React Native 0.79 + React 19 + React Navigation + Reanimated 3
- **Backend (Clinical Plane):** Node.js + TypeScript, pure in-memory Maps (no ORM, no external DB), HTTP server on port 8787
- **Backend (Admin Plane):** Node.js + TypeScript, same stack, port 8788. Strict data boundary — no PHI allowed
- **AI / Transcription Worker:** Python (Faster-Whisper + ffmpeg) orchestrated as a child process from Node.js via stdin/stdout JSON IPC
- **Database:** In-memory Maps for runtime; optional SQLite with `better-sqlite3-multiple-ciphers` (SQLCipher) for persistence; `expo-sqlite` on mobile
- **APIs:** REST + Bearer token auth; OpenAPI spec generated and validated at build time (`contracts:generate`, `contracts:check`)
- **Shared Types:** `packages/shared` — TypeScript DTOs and domain models used across all apps
- **SDK:** `packages/ethos-sdk` — typed client classes for clinical and control plane APIs
- **Build / CI:** EAS Build (Expo Application Services) for mobile APK/IPA; electron-builder for desktop distributables
- **Monorepo:** npm workspaces with `legacy-peer-deps` for React Native compatibility

---

## AI / Smart Components

### Offline Transcription Pipeline

The transcription system is a fully isolated Node.js worker (`apps/ethos-transcriber`) that:

1. Receives a `{ type: "enqueue", audioPath }` JSON message via stdin
2. Converts audio to 16kHz mono WAV using ffmpeg (normalizes format for Whisper)
3. Spawns a Python process running Faster-Whisper with one of two models:
   - `ptbr-fast` — Distil Whisper, optimized for real-time use (~3× faster than base)
   - `ptbr-accurate` — Whisper Large v3, highest accuracy for complex sessions
4. Streams `job_update` progress events back via stdout
5. Returns `job_result` with full transcript and time-coded segments

No API key. No cloud. Works completely air-gapped.

### Clinical Note Draft Generation

Once a transcript is available, the clinical plane can generate a structured draft clinical note from the transcript segments. The note follows the SOAP-like structure common in Brazilian clinical psychology documentation. The psychologist then reviews and validates the draft — the system enforces a `draft → validated` state machine, preventing unvalidated notes from being exported.

### Contract Validation

The HTTP client layer includes a contract assertion system (`assertPathAndMethod`) that validates every API call against the OpenAPI spec at runtime during development. This prevents frontend/API drift without needing a full mock server.

---

## My Role

- Designed and implemented the entire monorepo architecture from scratch
- Built the clinical plane REST API (~1300 lines, 60+ endpoints) with full in-memory database
- Built the admin/control plane with strict PHI boundary enforcement
- Integrated Faster-Whisper as an isolated IPC worker with job queuing and cancellation
- Implemented the Electron desktop app with SQLCipher encryption and PDF/DOCX export
- Built the React Native mobile app with Expo SDK 53, biometric auth, and glassmorphism UI
- Solved critical EAS Build failures caused by SDK version mismatches (expo-modules-core v1 vs v2) and npm workspace peer dependency conflicts in Linux build environments
- Designed the feature-based frontend architecture for mobile (auth, dashboard, sessions, patients, documents, finance, settings, onboarding)
- Configured EAS Build for Android development APK delivery with remote Keystore management
- Set up the full CI/CD pipeline for cloud-built APKs distributed via Expo Dev Portal

---

## Challenges

**1. Expo SDK version alignment in a monorepo**
All `expo-*` packages must match the same SDK major version for Gradle to resolve `expo-module-gradle-plugin` correctly. A single stale package (e.g., `expo-av@16` with `expo@50`) causes hard build failures with misleading Gradle error messages. Fixed by auditing all packages against the SDK 53 compatibility table and updating `package-lock.json`.

**2. npm workspaces + React Native on Linux build servers**
The monorepo root `package.json` pulls in Windows-only Rollup binaries (`@rollup/rollup-win32-x64-msvc`) that fail on EAS's Linux build agents. Fixed with `legacy-peer-deps=true` in the root `.npmrc` to prevent npm from resolving transitive React Native peer deps that drag in the Rollup chain.

**3. Node.js v24 + Expo CLI on Windows**
Expo CLI on Node v24 attempts to create a directory named `node:sea` as part of its SEA (Single Executable Application) initialization. On Windows, colons are illegal in directory names, causing a silent crash. Fixed by adding `"platforms": ["ios", "android"]` to app.json to skip web bundling, and running with `npx expo start --clear`.

**4. Strict data boundary enforcement**
Ensuring the clinical plane never leaks PHI into the control plane required careful API design — entitlements flow one direction (control → clinical, read-only snapshot), telemetry flows the other (clinical → control, sanitized events only). The control plane codebase has explicit comments marking what categories of data are forbidden.

**5. Two-layer authentication on mobile**
The mobile app has two distinct auth layers: device-level SQLCipher password (unlocks the local database) and API-level Bearer token (authenticates with the clinical backend). These must be kept separate — biometric auth unlocks the device layer; API login is a separate credential flow. Designing the React context hierarchy to reflect this cleanly required a careful `AuthProvider` scope.

---

## Impact

- **Zero cloud dependency for PHI** — full LGPD/CFP compliance out of the box
- **~80% reduction in documentation time** — audio → transcript → draft note in minutes vs. 30-60 minutes of manual writing
- **True offline operation** — runs during internet outages, in rural areas, in secure facilities where internet access is restricted
- **End-to-end encrypted** — data at rest (SQLCipher), data in transit (local LAN, HTTPS for control plane), audio files (AES-256-GCM)
- **EAS Build CI/CD** — APK generated and distributed to testers without requiring a physical build machine or Android Studio setup
- **Single codebase, three platforms** — Desktop (Windows/macOS/Linux), Mobile (iOS/Android), Web (optional)

---

## Differentiation

Ethos is not a wrapper around an existing EHR system. It is:

- **Architecturally offline-first** — not "offline capable" as a fallback, but offline as the primary mode with cloud as optional
- **AI-powered without API dependencies** — local Whisper, not OpenAI Whisper API — no per-minute transcription costs, no data sent to OpenAI
- **Regulation-aligned by design** — the PHI/non-PHI boundary is enforced at the architectural level (two separate servers, not just access control)
- **Technically complete** — not a CRUD app with a fancy name. Full session lifecycle, patient portal, contracts, scales, audit logs, document rendering, backup/restore, financial tracking — all implemented and tested
- **Production-ready mobile CI/CD** — EAS Build configured with remote Keystore, development profiles, and direct APK download links for beta testing

---

## Future Improvements

- **Real-time collaborative notes** — CRDTs (Yjs) for concurrent editing on LAN between desktop and mobile
- **LLM-assisted note generation** — local LLM (Ollama/LM Studio) integration for richer clinical draft generation from transcripts
- **Cloud sync (opt-in)** — end-to-end encrypted sync to user-controlled S3/Backblaze bucket
- **Patient mobile app** — separate Expo app for patient-side experience (currently patient portal is web-only)
- **FHIR export** — structured clinical data export in HL7 FHIR R4 format for interoperability
- **Supervision workflow** — supervisor review and co-sign clinical notes (relevant for supervised clinical training)
- **Multi-device SQLite sync** — replace in-memory Maps with SQLite + sync engine (e.g., Electric SQL or custom CRDT layer)
