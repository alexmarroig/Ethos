# App Functional Completion — 8-Block Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Ethos mobile app functional for real-world usage — real login, real patient/session/document data from the backend, data persistence, and new screens for patient detail and clinical note editing.

**Architecture:**
- All changes live in the active worktree: `C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney`
- Mobile app is Expo SDK 53 / React Native 0.79, feature-based at `apps/ethos-mobile/src/features/`
- Backend is custom Node.js + TypeScript at `apps/ethos-clinic/` using in-memory Maps
- Auth is already fully implemented in `src/shared/hooks/useAuth.tsx` — the ONLY remaining auth problem is `App.js` still showing an old master-password gate BEFORE the new AuthProvider/AppNavigator
- HTTP client uses dependency-injection: `setTokenProvider` in `src/shared/services/api/httpClient.ts` — already wired in `useAuth.tsx`

**Tech Stack:** React Native 0.79, Expo SDK 53, expo-secure-store (auth token), React Navigation 7, Node.js backend, TypeScript throughout

---

## File Map

### Backend (apps/ethos-clinic)
- **Modify:** `src/application/service.ts` — add `createPatient` function
- **Modify:** `src/api/httpServer.ts` — add `POST /patients` route
- **Modify:** `src/domain/types.ts` — extend Patient type with optional name/phone fields
- **Create:** `src/infra/persist.ts` — JSON file dump/load for all Maps
- **Modify:** `src/index.ts` — call `loadFromFile()` on startup, schedule `saveToFile()` every 30s

### Mobile (apps/ethos-mobile)
- **Modify:** `App.js` — strip master-password gate; wrap `<AuthProvider><NotificationsProvider><AppNavigator/></NotificationsProvider></AuthProvider>` only
- **Modify:** `src/shared/services/api/sessions.ts` — add `createPatient`, `fetchDocuments`, `fetchFinancialEntries`, `fetchClinicalNotes`
- **Modify:** `src/shared/hooks/usePatients.ts` — replace dummy data with `fetchPatients()` API call + adapter
- **Modify:** `src/features/patients/screens/PatientsScreen.tsx` — accept navigation prop, tap opens PatientDetail, "+" button opens CreatePatient
- **Create:** `src/features/patients/screens/PatientDetailScreen.tsx` — shows patient info, sessions list, documents list
- **Create:** `src/features/patients/screens/CreatePatientScreen.tsx` — form to create patient via POST /patients
- **Create:** `src/features/sessions/screens/ClinicalNoteEditorScreen.tsx` — multi-line editor for clinical notes
- **Modify:** `src/features/sessions/screens/ScheduleScreen.tsx` — real date-filtered sessions with patient names
- **Modify:** `src/features/documents/screens/DocumentsScreen.tsx` — replace mockDocs with real API + fix filter rendering
- **Modify:** `src/features/finance/screens/FinanceScreen.tsx` — connect to GET /financial/entries
- **Modify:** `src/shared/navigation/AppNavigator.tsx` — add PatientDetail, CreatePatient, ClinicalNoteEditor routes; add Finance to bottom tabs
- **Create:** `src/shared/utils/timeline.ts` — timeline aggregation function
- **Modify:** `src/shared/types/shared.ts` — add ClinicalNote, FinancialEntry, Scale types

---

## Task 1: Fix App.js — Remove Dual Auth Gate

**Problem:** App.js currently shows an old master-password screen FIRST, then wraps `AppNavigator` with `AuthProvider` only AFTER `isLoggedIn` is true. This creates a double-login experience.
**Fix:** Strip all the old password logic; App.js becomes just font loading + providers + AppNavigator.

**Files:**
- Modify: `apps/ethos-mobile/App.js`

- [ ] **Step 1: Read the current App.js**

Read `App.js` in the worktree. Observe lines 1–215.

- [ ] **Step 2: Replace App.js**

Replace the ENTIRE file with:

```js
import React from 'react';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';

import AppNavigator from './src/shared/navigation/AppNavigator';
import { AuthProvider } from './src/shared/hooks/useAuth';
import SplashLoading from './src/shared/components/SplashLoading';
import { NotificationsProvider } from './src/contexts/NotificationsContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Inter': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Lora': Lora_400Regular,
    'Lora-Medium': Lora_500Medium,
    'Lora-SemiBold': Lora_600SemiBold,
    'Lora-Bold': Lora_700Bold,
  });

  if (!fontsLoaded) return <SplashLoading />;

  return (
    <AuthProvider>
      <NotificationsProvider>
        <AppNavigator />
      </NotificationsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({});
```

Note: `AppNavigator` at `src/shared/navigation/AppNavigator.tsx` wraps `NavigationContainer` internally and handles auth routing via `useAuth().token`. AuthProvider provides the auth context. NotificationsProvider enables background job polling.

- [ ] **Step 3: Verify the import chain is intact**

Confirm these files exist in the worktree:
- `src/shared/navigation/AppNavigator.tsx` — ✅ exists (verified earlier)
- `src/shared/hooks/useAuth.tsx` — ✅ exports `AuthProvider`, `useAuth`
- `src/shared/components/SplashLoading.tsx` — ✅ exists
- `src/contexts/NotificationsContext.tsx` — ✅ exists, exports `NotificationsProvider`

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/App.js
git commit -m "feat(mobile): unify auth — remove master-password gate, let AppNavigator/AuthProvider handle all auth"
```

---

## Task 2: Extend Backend — POST /patients + Patient Type

**Problem:** Backend has no `POST /patients` endpoint. The mobile app needs to create patients. The backend `Patient` type is too minimal (`external_id`, `label` only).

**Files:**
- Modify: `apps/ethos-clinic/src/domain/types.ts`
- Modify: `apps/ethos-clinic/src/application/service.ts`
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Extend Patient type in domain/types.ts**

Read `apps/ethos-clinic/src/domain/types.ts`. Find the `Patient` type (currently `Owned & { external_id: string; label: string }`). Extend it:

```ts
export type Patient = Owned & {
  external_id: string;  // keep for backward compat, can be empty string
  label: string;         // display name (used as the patient's full name)
  phone?: string;
  email?: string;
  notes?: string;
  birth_date?: string;
};
```

- [ ] **Step 2: Add createPatient to service.ts**

Read `apps/ethos-clinic/src/application/service.ts`. Find `createSession` (or `listPatients`) as a reference for the pattern. Add this function AFTER `listPatients`:

```ts
export const createPatient = (
  userId: string,
  data: { label: string; external_id?: string; phone?: string; email?: string; notes?: string; birth_date?: string }
): Patient => {
  const id = uid();
  const now_ = now();
  const patient: Patient = {
    id,
    owner_user_id: userId,
    created_at: now_,
    external_id: data.external_id ?? '',
    label: data.label,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    birth_date: data.birth_date,
  };
  db.patients.set(id, patient);
  return patient;
};
```

- [ ] **Step 3: Add POST /patients route in httpServer.ts**

Read `apps/ethos-clinic/src/api/httpServer.ts`. Search for `GET /patients` route. Just after that `if` block, add:

```ts
if (method === "POST" && pathname === "/patients") {
  const user = await requireUser(req, res, ["user", "assistente", "supervisor"]);
  if (!user) return;
  const body = await readBody(req);
  if (!body?.label) return sendError(res, 400, "MISSING_LABEL", "label is required");
  const patient = createPatient(user.id, {
    label: body.label,
    external_id: body.external_id ?? '',
    phone: body.phone,
    email: body.email,
    notes: body.notes,
    birth_date: body.birth_date,
  });
  addAudit(user.id, "patient.created", patient.id);
  return sendJson(res, 201, { data: patient });
}
```

Also add `createPatient` to the import from `"../application/service"` at the top of httpServer.ts.

- [ ] **Step 4: Verify the backend compiles**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-clinic"
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors related to Patient type or the new route.

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-clinic/src/domain/types.ts apps/ethos-clinic/src/application/service.ts apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat(backend): add POST /patients endpoint and extend Patient type with contact fields"
```

---

## Task 3: Backend JSON Persistence

**Problem:** All backend data is in-memory Maps — restarts wipe everything.
**Fix:** Minimal JSON file dump every 30s + load on startup.

**Files:**
- Create: `apps/ethos-clinic/src/infra/persist.ts`
- Modify: `apps/ethos-clinic/src/index.ts`

- [ ] **Step 1: Create persist.ts**

Create `apps/ethos-clinic/src/infra/persist.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { db } from "./database";

const DATA_FILE = path.resolve(process.env.DATA_FILE ?? "./data/ethos-db.json");

const PERSISTABLE_KEYS = [
  "users", "invites", "sessionsTokens",
  "patients", "sessions", "clinicalNotes",
  "financial", "documents", "forms",
  "anamnesis", "reports", "scales",
  "templates", "contracts", "notifications",
  "notificationConsents", "notificationSchedules",
] as const;

export function saveToFile(): void {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const snapshot: Record<string, unknown> = {};
    for (const key of PERSISTABLE_KEYS) {
      const map = (db as any)[key];
      if (map instanceof Map) {
        snapshot[key] = Object.fromEntries(map);
      }
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf-8");
  } catch (err) {
    console.warn("[persist] Failed to save:", (err as Error).message);
  }
}

export function loadFromFile(): void {
  if (!fs.existsSync(DATA_FILE)) {
    console.log("[persist] No data file found — starting fresh.");
    return;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const snapshot: Record<string, Record<string, unknown>> = JSON.parse(raw);
    for (const key of PERSISTABLE_KEYS) {
      const map = (db as any)[key];
      const data = snapshot[key];
      if (map instanceof Map && data && typeof data === "object") {
        for (const [k, v] of Object.entries(data)) {
          map.set(k, v);
        }
      }
    }
    console.log("[persist] Data loaded from", DATA_FILE);
  } catch (err) {
    console.warn("[persist] Failed to load — starting fresh:", (err as Error).message);
  }
}

export function startAutosave(intervalMs = 30_000): NodeJS.Timeout {
  return setInterval(() => {
    saveToFile();
  }, intervalMs);
}
```

- [ ] **Step 2: Wire into index.ts**

Read `apps/ethos-clinic/src/index.ts`. Add at the TOP after existing imports:

```ts
import { loadFromFile, startAutosave, saveToFile } from "./infra/persist";
```

Then, just BEFORE the server starts listening (find `server.listen` or the startup block), add:

```ts
// Load persisted data before starting
loadFromFile();

// Start autosave every 30s
startAutosave(30_000);

// Save on graceful shutdown
process.on("SIGINT", () => { saveToFile(); process.exit(0); });
process.on("SIGTERM", () => { saveToFile(); process.exit(0); });
```

- [ ] **Step 3: Verify compilation**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-clinic"
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Check which Map keys actually exist**

Before committing, read `apps/ethos-clinic/src/infra/database.ts` and verify the keys listed in `PERSISTABLE_KEYS` match the actual `db` object keys. Remove any that don't exist (e.g. `notifications` might not be a key — it might be called `notificationLogs`).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-clinic/src/infra/persist.ts apps/ethos-clinic/src/index.ts
git commit -m "feat(backend): add JSON file persistence — auto-save every 30s, load on startup"
```

---

## Task 4: Wire Patients API + Update usePatients Hook

**Problem:** `usePatients.ts` returns hardcoded dummy data. Backend's `Patient` has `label` (name) + `external_id`, but mobile `shared.ts` has `fullName`. Need adapter.

**Files:**
- Modify: `apps/ethos-mobile/src/shared/services/api/sessions.ts`
- Modify: `apps/ethos-mobile/src/shared/hooks/usePatients.ts`
- Modify: `apps/ethos-mobile/src/shared/types/shared.ts`

- [ ] **Step 1: Add Patient API functions to sessions.ts**

Read `apps/ethos-mobile/src/shared/services/api/sessions.ts`. The contract already has `'/patients': ['get']`.

First, add `'post'` to the patients contract entry:
```ts
'/patients': ['get', 'post'],
'/patients/{id}': ['get'],
```

Then add these functions at the bottom:

```ts
// Backend Patient adapter — backend uses "label" as display name
export type BackendPatient = {
  id: string;
  label: string;
  external_id: string;
  phone?: string;
  email?: string;
  notes?: string;
  birth_date?: string;
  created_at: string;
  owner_user_id: string;
};

export const adaptPatient = (bp: BackendPatient): import('../../types/shared').Patient => ({
  id: bp.id,
  fullName: bp.label,
  phoneNumber: bp.phone,
  cpf: bp.external_id || undefined,
  notes: bp.notes,
  birthDate: bp.birth_date,
  createdAt: bp.created_at,
});

export const fetchPatients = async (): Promise<import('../../types/shared').Patient[]> => {
  const raw = await apiClient.request<BackendPatient[]>('/patients', { method: 'GET' });
  return (raw ?? []).map(adaptPatient);
};

export const createPatient = async (data: {
  label: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<import('../../types/shared').Patient> => {
  const raw = await apiClient.request<BackendPatient>('/patients', {
    method: 'POST',
    body: { label: data.label, phone: data.phone, email: data.email, notes: data.notes },
  });
  return adaptPatient(raw);
};
```

Note: Remove the old `fetchPatients` that might already exist in the file (it only accepts `Patient[]` from sessions.ts imports that used the old contract). Check and deduplicate.

- [ ] **Step 2: Update usePatients.ts**

Replace the entire content of `apps/ethos-mobile/src/shared/hooks/usePatients.ts`:

```ts
import { useState, useEffect, useCallback } from 'react';
import { fetchPatients } from '../services/api/sessions';
import type { Patient } from '../types/shared';

export type { Patient };

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchPatients();
      setPatients(data);
    } catch (err: any) {
      setError(err?.message ?? 'Erro ao carregar pacientes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { patients, isLoading, error, reload };
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/shared/services/api/sessions.ts apps/ethos-mobile/src/shared/hooks/usePatients.ts
git commit -m "feat(mobile): wire usePatients to real API with backend adapter"
```

---

## Task 5: Update PatientsScreen — Navigation + Loading/Empty States

**Files:**
- Modify: `apps/ethos-mobile/src/features/patients/screens/PatientsScreen.tsx`

- [ ] **Step 1: Read the current PatientsScreen**

Read `apps/ethos-mobile/src/features/patients/screens/PatientsScreen.tsx`.

- [ ] **Step 2: Add navigation prop and patient tap + "+" button**

Make these changes:
1. Change function signature from `export default function PatientsScreen()` to `export default function PatientsScreen({ navigation }: any)`
2. On each patient card `TouchableOpacity`, add `onPress={() => navigation.navigate('PatientDetail', { patientId: patient.id, patientName: patient.fullName })}`
3. On the "+" (UserPlus) button, add `onPress={() => navigation.navigate('CreatePatient')}`
4. Add a loading state: when `isLoading` is true, show `<ActivityIndicator />` inside a centered View
5. Add an empty state: when `!isLoading && patients.length === 0`, show "Nenhum paciente cadastrado ainda." text
6. Add an error state: when `error`, show the error with a retry button calling `reload()`
7. Add `ActivityIndicator` to the React Native import

Key pattern for the patient card data — the `usePatients` hook now returns `Patient` from shared.ts with `fullName`, not `name`. Update any `.name` references to `.fullName`.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/features/patients/screens/PatientsScreen.tsx
git commit -m "feat(mobile): wire PatientsScreen — real data, tap-to-detail, loading/empty/error states"
```

---

## Task 6: Create PatientDetailScreen

**Files:**
- Create: `apps/ethos-mobile/src/features/patients/screens/PatientDetailScreen.tsx`

- [ ] **Step 1: Create the screen**

Create `apps/ethos-mobile/src/features/patients/screens/PatientDetailScreen.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, Alert,
} from 'react-native';
import { ChevronLeft, User, Phone, FileText, Calendar, Plus } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { fetchSessions } from '../../../shared/services/api/sessions';
import type { Session } from '../../../shared/types/shared';

const primaryTeal = '#234e5c';

export default function PatientDetailScreen({ navigation, route }: any) {
  const { patientId, patientName } = route.params ?? {};
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const bg = isDark ? '#1a1d21' : '#f8f9fa';
  const card = isDark ? '#2a2d31' : '#fff';

  useEffect(() => {
    loadSessions();
  }, [patientId]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const all = await fetchSessions();
      // Filter sessions for this patient
      const mine = all.filter((s: any) => s.patient_id === patientId || s.patientId === patientId);
      setSessions(mine);
    } catch {
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'Agendada',
      confirmed: 'Confirmada',
      in_progress: 'Em andamento',
      completed: 'Concluída',
      missed: 'Faltou',
    };
    return map[status] ?? status;
  };

  const statusColor = (status: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'in_progress') return '#f97316';
    if (status === 'missed') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color={primaryTeal} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: primaryTeal }]} numberOfLines={1}>
            {patientName ?? 'Paciente'}
          </Text>
          <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>
            {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.newSessionBtn, { backgroundColor: primaryTeal }]}
          onPress={() => navigation.navigate('SessionHub', { patientId, patientName })}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.card, { backgroundColor: card }]}>
          <View style={styles.cardRow}>
            <User size={18} color={primaryTeal} />
            <Text style={[styles.cardLabel, { color: theme.mutedForeground }]}>Paciente</Text>
            <Text style={[styles.cardValue, { color: theme.foreground }]}>{patientName}</Text>
          </View>
        </View>

        {/* Sessions */}
        <Text style={[styles.sectionTitle, { color: primaryTeal }]}>Sessões</Text>

        {isLoading ? (
          <ActivityIndicator color={primaryTeal} style={{ marginTop: 20 }} />
        ) : sessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: card }]}>
            <Calendar size={32} color={theme.mutedForeground} style={{ opacity: 0.4 }} />
            <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
              Nenhuma sessão registrada ainda
            </Text>
            <TouchableOpacity
              style={[styles.addSessionBtn, { backgroundColor: primaryTeal }]}
              onPress={() => navigation.navigate('SessionHub', { patientId, patientName })}
            >
              <Text style={styles.addSessionBtnText}>Nova Sessão</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sessions.map((s: any) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sessionCard, { backgroundColor: card }]}
              onPress={() => navigation.navigate('SessionHub', {
                sessionId: s.id,
                patientId,
                patientName,
                status: s.status,
                time: s.scheduled_at ?? s.scheduledAt ?? '',
              })}
            >
              <View style={[styles.sessionDot, { backgroundColor: statusColor(s.status) }]} />
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionStatus, { color: theme.foreground }]}>
                  {statusLabel(s.status)}
                </Text>
                <Text style={[styles.sessionDate, { color: theme.mutedForeground }]}>
                  {s.scheduled_at ?? s.scheduledAt ?? '—'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('ClinicalNoteEditor', { sessionId: s.id, patientName })}
              >
                <FileText size={18} color={primaryTeal} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, gap: 12 },
  backBtn: { padding: 4 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 20, fontFamily: 'Inter', fontWeight: '700' },
  headerSub: { fontSize: 13, fontFamily: 'Inter', marginTop: 2 },
  newSessionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardLabel: { fontSize: 13, fontFamily: 'Inter', flex: 1 },
  cardValue: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, gap: 12 },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionInfo: { flex: 1 },
  sessionStatus: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600' },
  sessionDate: { fontSize: 12, fontFamily: 'Inter', marginTop: 2 },
  emptyCard: { borderRadius: 16, padding: 32, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter', textAlign: 'center' },
  addSessionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  addSessionBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/features/patients/screens/PatientDetailScreen.tsx
git commit -m "feat(mobile): create PatientDetailScreen with sessions list"
```

---

## Task 7: Create CreatePatientScreen

**Files:**
- Create: `apps/ethos-mobile/src/features/patients/screens/CreatePatientScreen.tsx`

- [ ] **Step 1: Create the screen**

Create `apps/ethos-mobile/src/features/patients/screens/CreatePatientScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  useColorScheme, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { createPatient } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';

export default function CreatePatientScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const bg = isDark ? '#1a1d21' : '#f8f9fa';
  const inputBg = isDark ? '#2a2d31' : '#fff';

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Nome obrigatório', 'Insira o nome completo do paciente.');
      return;
    }
    setIsSaving(true);
    try {
      await createPatient({ label: fullName.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, notes: notes.trim() || undefined });
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Erro ao criar paciente', err?.message ?? 'Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const Field = ({ label, value, onChange, placeholder, keyboardType = 'default', multiline = false }: any) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.foreground }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: inputBg, color: theme.foreground, height: multiline ? 100 : 52, textAlignVertical: multiline ? 'top' : 'center' }]}
        placeholder={placeholder}
        placeholderTextColor={theme.mutedForeground}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={26} color={primaryTeal} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: primaryTeal }]}>Novo Paciente</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Field label="Nome completo *" value={fullName} onChange={setFullName} placeholder="Ex: João da Silva" />
          <Field label="Telefone" value={phone} onChange={setPhone} placeholder="(11) 99999-9999" keyboardType="phone-pad" />
          <Field label="E-mail" value={email} onChange={setEmail} placeholder="paciente@email.com" keyboardType="email-address" />
          <Field label="Observações" value={notes} onChange={setNotes} placeholder="Informações adicionais..." multiline />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: primaryTeal, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Salvar Paciente</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: 'Inter', fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontFamily: 'Inter', fontWeight: '600', marginBottom: 8 },
  input: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: 'Inter' },
  saveBtn: { height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Inter', fontWeight: '700' },
});
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/features/patients/screens/CreatePatientScreen.tsx
git commit -m "feat(mobile): create CreatePatientScreen with POST /patients integration"
```

---

## Task 8: Create ClinicalNoteEditorScreen

**Files:**
- Create: `apps/ethos-mobile/src/features/sessions/screens/ClinicalNoteEditorScreen.tsx`
- Modify: `apps/ethos-mobile/src/shared/services/api/sessions.ts` — ensure `saveClinicalNote` is in contract

- [ ] **Step 1: Check sessions.ts contract**

Read `apps/ethos-mobile/src/shared/services/api/sessions.ts`. Verify:
- `/sessions/{id}/clinical-note` is in the contract with `['post']`
- `saveClinicalNote(sessionId, text)` is exported

If not, add them (they should already exist from prior work).

- [ ] **Step 2: Create ClinicalNoteEditorScreen.tsx**

Create `apps/ethos-mobile/src/features/sessions/screens/ClinicalNoteEditorScreen.tsx`:

```tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  useColorScheme, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { ChevronLeft, Save, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { saveClinicalNote } from '../../../shared/services/api/sessions';
import { useNotifications } from '../../../contexts/NotificationsContext';

const primaryTeal = '#234e5c';

const SECTION_TEMPLATES = [
  { key: 'queixa', label: 'Queixa Principal', placeholder: 'Descreva o motivo da consulta...' },
  { key: 'intervencao', label: 'Intervenção', placeholder: 'Técnicas e abordagens utilizadas...' },
  { key: 'evolucao', label: 'Evolução', placeholder: 'Progresso e observações clínicas...' },
  { key: 'plano', label: 'Plano para próxima sessão', placeholder: 'Tarefas e objetivos...' },
];

export default function ClinicalNoteEditorScreen({ navigation, route }: any) {
  const { sessionId, patientName } = route.params ?? {};
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const { addNotification } = useNotifications();

  const bg = isDark ? '#1a1d21' : '#f8f9fa';
  const inputBg = isDark ? '#2a2d31' : '#fff';

  const [sections, setSections] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const updateSection = (key: string, value: string) => {
    setSections(prev => ({ ...prev, [key]: value }));
  };

  const buildNoteText = () =>
    SECTION_TEMPLATES
      .map(s => sections[s.key] ? `## ${s.label}\n${sections[s.key]}` : '')
      .filter(Boolean)
      .join('\n\n');

  const hasContent = SECTION_TEMPLATES.some(s => (sections[s.key] ?? '').trim().length > 0);

  const handleSave = async () => {
    if (!hasContent) {
      Alert.alert('Nota vazia', 'Preencha ao menos uma seção antes de salvar.');
      return;
    }
    const text = buildNoteText();
    setIsSaving(true);
    try {
      if (sessionId) {
        await saveClinicalNote(sessionId, text);
      }
      setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      addNotification({
        type: 'prontuario_gerado',
        title: 'Prontuário salvo',
        body: patientName ?? 'Paciente',
        document: {
          id: `note-${Date.now()}`,
          title: `Prontuário — ${patientName ?? 'Paciente'}`,
          patient: patientName ?? '',
          status: 'rascunho',
          date: new Date().toLocaleDateString('pt-BR'),
          content: text,
        },
      });
      Alert.alert('Salvo!', 'Prontuário salvo com sucesso.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err?.message ?? 'Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: bg }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={26} color={primaryTeal} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.title, { color: primaryTeal }]} numberOfLines={1}>
              Prontuário
            </Text>
            <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
              {patientName ?? 'Paciente'}
              {savedAt ? ` · Salvo ${savedAt}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: hasContent ? primaryTeal : '#ccc' }]}
            onPress={handleSave}
            disabled={isSaving || !hasContent}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Save size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {SECTION_TEMPLATES.map((s) => (
            <View key={s.key} style={[styles.section, { backgroundColor: inputBg }]}>
              <Text style={[styles.sectionLabel, { color: primaryTeal }]}>{s.label}</Text>
              <TextInput
                style={[styles.sectionInput, { color: theme.foreground }]}
                multiline
                placeholder={s.placeholder}
                placeholderTextColor={theme.mutedForeground}
                value={sections[s.key] ?? ''}
                onChangeText={(val) => updateSection(s.key, val)}
                textAlignVertical="top"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  title: { fontSize: 18, fontFamily: 'Inter', fontWeight: '700' },
  subtitle: { fontSize: 12, fontFamily: 'Inter', marginTop: 2 },
  saveBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  section: { borderRadius: 16, padding: 16 },
  sectionLabel: { fontSize: 12, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  sectionInput: { fontSize: 15, fontFamily: 'Inter', lineHeight: 24, minHeight: 80 },
});
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/features/sessions/screens/ClinicalNoteEditorScreen.tsx
git commit -m "feat(mobile): create ClinicalNoteEditorScreen with 4-section structured template"
```

---

## Task 9: Add New Routes to AppNavigator + Finance Tab

**Files:**
- Modify: `apps/ethos-mobile/src/shared/navigation/AppNavigator.tsx`

- [ ] **Step 1: Read the current AppNavigator**

Read `apps/ethos-mobile/src/shared/navigation/AppNavigator.tsx`.

- [ ] **Step 2: Add imports**

Add at the top (near other screen imports):
```tsx
import PatientDetailScreen from '../../features/patients/screens/PatientDetailScreen';
import CreatePatientScreen from '../../features/patients/screens/CreatePatientScreen';
import ClinicalNoteEditorScreen from '../../features/sessions/screens/ClinicalNoteEditorScreen';
import { DollarSign } from 'lucide-react-native';
```

- [ ] **Step 3: Add Finance to BottomTabs**

In the `BottomTabs` function, add a Finance tab BEFORE Settings:
```tsx
<Tab.Screen
  name="Finance"
  component={FinanceScreen}
  options={{
    title: 'Finanças',
    headerShown: false,
    tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />
  }}
/>
```

Note: `FinanceScreen` is already imported. Just add the `Tab.Screen` entry.

- [ ] **Step 4: Add stack routes**

In `MainStackNavigator`, add:
```tsx
<MainStack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ headerShown: false }} />
<MainStack.Screen name="CreatePatient" component={CreatePatientScreen} options={{ headerShown: false }} />
<MainStack.Screen name="ClinicalNoteEditor" component={ClinicalNoteEditorScreen} options={{ headerShown: false }} />
```

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/shared/navigation/AppNavigator.tsx
git commit -m "feat(mobile): add PatientDetail, CreatePatient, ClinicalNoteEditor routes + Finance tab"
```

---

## Task 10: Wire Documents Screen with Real API + Fix Filter

**Files:**
- Modify: `apps/ethos-mobile/src/shared/services/api/sessions.ts`
- Modify: `apps/ethos-mobile/src/features/documents/screens/DocumentsScreen.tsx`

- [ ] **Step 1: Add fetchDocuments to sessions.ts**

Read `apps/ethos-mobile/src/shared/services/api/sessions.ts`. Add to the contract:
```ts
'/documents': ['get'],
```

Add at the bottom:
```ts
export type BackendDocument = {
  id: string;
  title?: string;
  patient_id?: string;
  status?: string;
  created_at: string;
  content?: string;
  type?: string;
};

export const fetchDocuments = async (): Promise<BackendDocument[]> => {
  return apiClient.request<BackendDocument[]>('/documents', { method: 'GET' });
};
```

- [ ] **Step 2: Update DocumentsScreen to use real data**

Read the full `DocumentsScreen.tsx`. Replace the hardcoded `mockDocs` with API data:

1. Add imports: `useState`, `useEffect`, `ActivityIndicator`
2. Add state: `const [docs, setDocs] = useState<BackendDocument[]>([])`, `const [isLoading, setIsLoading] = useState(true)`
3. Add `useEffect` to call `fetchDocuments()` on mount
4. Replace references to `mockDocs` with `docs`
5. Fix the filter: currently the filter chip selection works but the FlatList/ScrollView still renders all items. Apply the filter:

```tsx
const filteredDocs = docs.filter(doc => {
  if (filter === 'Todos') return true;
  if (filter === 'Assinados' || filter === 'rascunhos') {
    const status = doc.status ?? '';
    if (filter === 'Assinados') return status === 'validated' || status === 'signed' || status === 'assinado';
    if (filter === 'Rascunhos' || filter === 'rascunhos') return status === 'draft' || status === 'rascunho';
  }
  return true;
});
```

6. Render `filteredDocs` instead of `mockDocs` in the map
7. Map `BackendDocument` to the shape expected by the card (title, patient, date, status)
8. On each document card, wire `onPress` to navigate to `DocumentDetail` with the doc

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/shared/services/api/sessions.ts apps/ethos-mobile/src/features/documents/screens/DocumentsScreen.tsx
git commit -m "feat(mobile): wire DocumentsScreen with real API data and fix active filter rendering"
```

---

## Task 11: Wire Finance Screen with Real API

**Files:**
- Modify: `apps/ethos-mobile/src/shared/services/api/sessions.ts`
- Modify: `apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx`

- [ ] **Step 1: Add fetchFinancialEntries to sessions.ts**

Add to the contract:
```ts
'/financial/entries': ['get', 'post'],
```

Add at the bottom:
```ts
export type BackendFinancialEntry = {
  id: string;
  patient_id: string;
  type: 'receivable' | 'payable';
  amount: number; // in centavos
  due_date: string;
  status: 'open' | 'paid';
  category?: string;
  description?: string;
  created_at: string;
};

export const fetchFinancialEntries = async (): Promise<BackendFinancialEntry[]> => {
  return apiClient.request<BackendFinancialEntry[]>('/financial/entries', { method: 'GET' });
};
```

- [ ] **Step 2: Update FinanceScreen**

Read `apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx`.

Replace the hardcoded values with:
1. `const [entries, setEntries] = useState<BackendFinancialEntry[]>([])`
2. `const [isLoading, setIsLoading] = useState(true)`
3. `useEffect` to call `fetchFinancialEntries()`
4. Compute totals from real data:
```tsx
const received = entries
  .filter(e => e.type === 'receivable' && e.status === 'paid')
  .reduce((sum, e) => sum + e.amount / 100, 0);

const pending = entries
  .filter(e => e.type === 'receivable' && e.status === 'open')
  .reduce((sum, e) => sum + e.amount / 100, 0);

const total = received + pending;
```
5. Format amounts as `R$ ${value.toFixed(2).replace('.', ',')}`
6. Show the entries list replacing the hardcoded transactions array
7. Show `ActivityIndicator` while loading

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/shared/services/api/sessions.ts apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx
git commit -m "feat(mobile): wire FinanceScreen with real /financial/entries data"
```

---

## Task 12: Wire ScheduleScreen with Real Sessions + Patient Names

**Files:**
- Modify: `apps/ethos-mobile/src/features/sessions/screens/ScheduleScreen.tsx`
- Modify: `apps/ethos-mobile/src/shared/services/api/sessions.ts`

- [ ] **Step 1: Add fetchPatientById to sessions.ts**

Add to contract:
```ts
'/patients/{id}': ['get'],
```

Add function:
```ts
export const fetchPatientById = async (patientId: string): Promise<BackendPatient | null> => {
  try {
    return await apiClient.request<BackendPatient>(`/patients/${patientId}` as any, { method: 'GET' });
  } catch {
    return null;
  }
};
```

- [ ] **Step 2: Update ScheduleScreen to show real patient names**

Read `apps/ethos-mobile/src/features/sessions/screens/ScheduleScreen.tsx`.

The ScheduleScreen already calls `fetchSessions()`. The problem is backend sessions have `patient_id` not `patientName`. Fix:

After loading sessions, enrich them with patient names:
```tsx
const enrichedSessions = await Promise.all(
  (data ?? []).map(async (s: any) => {
    const pid = s.patient_id ?? s.patientId;
    const patient = pid ? await fetchPatientById(pid) : null;
    return {
      ...s,
      patientName: patient?.label ?? pid ?? 'Paciente',
    };
  })
);
setSessions(enrichedSessions);
```

Also update the calendar strip to use real dates (today and next 6 days):
```tsx
const today = new Date();
const weekDays = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() + i - today.getDay()); // start from Monday
  return {
    day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3),
    date: String(d.getDate()).padStart(2, '0'),
    active: d.toDateString() === today.toDateString(),
    fullDate: d,
  };
});
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/features/sessions/screens/ScheduleScreen.tsx apps/ethos-mobile/src/shared/services/api/sessions.ts
git commit -m "feat(mobile): ScheduleScreen shows real patient names + live calendar dates"
```

---

## Task 13: Wire SettingsScreen Logout + Update Dashboard Greeting

**Files:**
- Modify: `apps/ethos-mobile/src/features/settings/screens/SettingsScreen.tsx`
- Modify: `apps/ethos-mobile/src/features/dashboard/screens/DashboardScreen.tsx`

- [ ] **Step 1: Wire logout in SettingsScreen**

Read `apps/ethos-mobile/src/features/settings/screens/SettingsScreen.tsx`.

1. Add `const { logout, user } = useAuth();` (import useAuth from `'../../../shared/hooks/useAuth'`)
2. Find the logout `TouchableOpacity` — add:
```tsx
onPress={() => {
  Alert.alert('Sair', 'Deseja encerrar a sessão?', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Sair', style: 'destructive', onPress: () => logout() },
  ]);
}}
```
3. Replace hardcoded "Dr. Joao Silva" with `user?.email ?? 'Usuário'` (or parse name from user object)

- [ ] **Step 2: Update Dashboard greeting**

Read `apps/ethos-mobile/src/features/dashboard/screens/DashboardScreen.tsx`.

Find the hardcoded "Olá, Dr. Silva" greeting. Replace with:
```tsx
const { user } = useAuth();
// ...
<Text>Olá, {user?.email?.split('@')[0] ?? 'Doutor'}</Text>
```

Import `useAuth` from `'../../../shared/hooks/useAuth'`.

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/features/settings/screens/SettingsScreen.tsx apps/ethos-mobile/src/features/dashboard/screens/DashboardScreen.tsx
git commit -m "feat(mobile): wire logout in Settings, show real user info in Dashboard + Settings"
```

---

## Task 14: Timeline Aggregation + Scale Model (Block 8)

**Files:**
- Create: `apps/ethos-mobile/src/shared/utils/timeline.ts`
- Modify: `apps/ethos-mobile/src/shared/types/shared.ts`

- [ ] **Step 1: Add missing types to shared.ts**

Read `apps/ethos-mobile/src/shared/types/shared.ts`. Append:

```ts
export type ClinicalNote = {
  id: string;
  sessionId: string;
  content: string;
  status: 'draft' | 'validated';
  version: number;
  createdAt: string;
  validatedAt?: string;
};

export type FinancialEntry = {
  id: string;
  patientId: string;
  type: 'receivable' | 'payable';
  amount: number; // centavos
  dueDate: string;
  status: 'open' | 'paid';
  description?: string;
  createdAt: string;
};

export type ScaleRecord = {
  id: string;
  patientId: string;
  scaleId: string;
  scaleName: 'PHQ-9' | 'GAD-7' | string;
  score: number;
  recordedAt: string;
};

export type TimelineItem = {
  id: string;
  type: 'session' | 'note' | 'document' | 'scale';
  title: string;
  subtitle?: string;
  date: string; // ISO string for sorting
  status?: string;
  ref?: Session | ClinicalNote | ScaleRecord;
};
```

- [ ] **Step 2: Create timeline.ts**

Create `apps/ethos-mobile/src/shared/utils/timeline.ts`:

```ts
import type { Session, ClinicalNote, ScaleRecord, TimelineItem } from '../types/shared';
import type { BackendDocument } from '../services/api/sessions';

/**
 * Aggregates sessions, clinical notes, documents, and scales into a
 * unified timeline sorted by date descending (most recent first).
 */
export function buildTimeline(params: {
  sessions?: Session[];
  notes?: ClinicalNote[];
  documents?: BackendDocument[];
  scales?: ScaleRecord[];
}): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const s of params.sessions ?? []) {
    items.push({
      id: s.id,
      type: 'session',
      title: `Sessão`,
      subtitle: `Status: ${s.status}`,
      date: s.scheduledAt ?? s.createdAt ?? '',
      status: s.status,
      ref: s,
    });
  }

  for (const n of params.notes ?? []) {
    items.push({
      id: n.id,
      type: 'note',
      title: 'Prontuário',
      subtitle: n.status === 'validated' ? 'Assinado' : 'Rascunho',
      date: n.validatedAt ?? n.createdAt ?? '',
      status: n.status,
      ref: n,
    });
  }

  for (const d of params.documents ?? []) {
    items.push({
      id: d.id,
      type: 'document',
      title: d.title ?? 'Documento',
      date: d.created_at ?? '',
      status: d.status,
    });
  }

  for (const sc of params.scales ?? []) {
    items.push({
      id: sc.id,
      type: 'scale',
      title: sc.scaleName,
      subtitle: `Pontuação: ${sc.score}`,
      date: sc.recordedAt ?? '',
      ref: sc,
    });
  }

  // Sort by date descending (most recent first)
  return items.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db_ = b.date ? new Date(b.date).getTime() : 0;
    return db_ - da;
  });
}

/** Filter a timeline to a specific date (YYYY-MM-DD). */
export function filterTimelineByDate(timeline: TimelineItem[], dateStr: string): TimelineItem[] {
  return timeline.filter(item => item.date.startsWith(dateStr));
}

/** Filter timeline to a specific patient (by patientId matching ref object). */
export function filterTimelineByPatient(timeline: TimelineItem[], patientId: string): TimelineItem[] {
  return timeline.filter(item => {
    const ref = item.ref as any;
    return ref?.patientId === patientId || ref?.patient_id === patientId;
  });
}
```

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add apps/ethos-mobile/src/shared/utils/timeline.ts apps/ethos-mobile/src/shared/types/shared.ts
git commit -m "feat(mobile): add timeline aggregation utility + ClinicalNote, FinancialEntry, ScaleRecord types"
```

---

## Task 15: Final Integration Verification

**Files:** No changes — verification only.

- [ ] **Step 1: Check TypeScript for files we touched**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney\apps\ethos-mobile"
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Fix any errors in files we created or modified. Pre-existing errors in unrelated files are acceptable.

- [ ] **Step 2: Check backend compiles**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-clinic"
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Confirm .env file has API URL**

Check if `apps/ethos-mobile/.env` exists with `EXPO_PUBLIC_API_URL`. If not, create:
```
EXPO_PUBLIC_API_URL=http://192.168.15.182:8787
```

- [ ] **Step 4: Verify AppNavigator.tsx has all routes registered**

Read `apps/ethos-mobile/src/shared/navigation/AppNavigator.tsx`. Confirm these are all present:
- AuthStack: Login, RecoverPassword, EmailSent, RegisterStep1, RegisterStep2, WelcomeOnboarding
- Tabs: Dashboard, Schedule, Patients, Documents, Finance, Settings
- MainStack: MainTabs, SessionHub, Search, Notifications, DocumentDetail, Finance, PatientDetail, CreatePatient, ClinicalNoteEditor

Note: Finance should be both a Tab (via BottomTabs) and optionally reachable via stack (from dashboard alerts). The Tab.Screen is the primary entry.

- [ ] **Step 5: Final commit**

```bash
cd "C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney"
git add -A
git commit -m "feat: complete 8-block functional implementation — auth, patients, sessions, notes, finance, documents, persistence, timeline"
```

---

## Summary of What Each Block Delivers

| Block | Tasks | What it delivers |
|---|---|---|
| B1 Auth | Task 1 | Login works, no double-gate, token persisted in SecureStore |
| B2 Patients | Tasks 2, 4, 5, 6, 7 | Real patient list, create patient, tap-to-detail, sessions per patient |
| B3 Sessions | Tasks 12 | Real session list with patient names, live calendar dates |
| B4 Clinical Notes | Task 8 | Structured 4-section editor, saves to backend, notification |
| B5 Finance | Task 11 | Finance in tab, real financial entries, computed totals |
| B6 Documents | Task 10 | Real documents, filter works, taps to detail |
| B7 Persistence | Tasks 3 | Backend survives restarts, JSON file dump every 30s |
| B8 Timeline | Task 14 | Aggregation utility + type definitions for future use |
