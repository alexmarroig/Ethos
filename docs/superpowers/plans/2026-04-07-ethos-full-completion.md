# Ethos Full Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all Ethos apps (mobile, web, backend) fully functional end-to-end — real data, real auth, APK buildable, all screens wired, WhatsApp notifications, patient invites, and no mock data left.

**Architecture:**
- Worktree: `C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney`
- Backend at `apps/ethos-clinic/` (Node.js HTTP, in-memory Maps, port 8787)
- Mobile at `apps/ethos-mobile/` (Expo SDK 53, React Native 0.79)
- Web at `Frontend/` (React 18 + Vite)
- All changes committed per task to branch `claude/funny-dewdney`

**Tech Stack:** Node.js + TypeScript (backend), Expo SDK 53 / React Native 0.79 (mobile), React 18 + Vite (web), expo-secure-store (auth), React Navigation 7, EAS Build (APK)

---

## File Map

### Backend (`apps/ethos-clinic/`)
- **Modify:** `src/domain/types.ts` — extend Patient type with phone, email, cpf, birth_date, notes
- **Modify:** `src/application/service.ts` — add `createPatient`, `updatePatient` functions
- **Modify:** `src/api/httpServer.ts` — add `POST /patients`, `PATCH /patients/:id`, `POST /notifications/whatsapp/send`
- **Create:** `src/infra/persist.ts` — JSON file dump/load for all Maps
- **Modify:** `src/index.ts` — call `loadFromFile()` + `startAutosave()` on startup

### Mobile (`apps/ethos-mobile/`)
- **Modify:** `App.js` — strip master-password gate; keep only fonts + AuthProvider + NotificationsProvider + AppNavigator
- **Modify:** `src/shared/hooks/usePatients.ts` — replace dummy data with real API call + adapter
- **Modify:** `src/shared/services/api/sessions.ts` — add `createPatient`, `fetchDocuments`, `fetchFinancialEntries`, `sendWhatsAppNotification`
- **Modify:** `src/features/patients/screens/PatientsScreen.tsx` — wire navigation: "+" → CreatePatient, row tap → PatientDetail
- **Create:** `src/features/patients/screens/PatientDetailScreen.tsx` — patient info + sessions list
- **Create:** `src/features/patients/screens/CreatePatientScreen.tsx` — form → POST /patients
- **Create:** `src/features/sessions/screens/ClinicalNoteEditorScreen.tsx` — textarea → POST /clinical-notes
- **Modify:** `src/features/sessions/screens/ScheduleScreen.tsx` — wire to real sessions + patient names
- **Modify:** `src/features/finance/screens/FinanceScreen.tsx` — replace hardcoded array with API call
- **Modify:** `src/features/documents/screens/DocumentsScreen.tsx` — replace mockDocs with API + fix filter chips
- **Modify:** `src/shared/navigation/AppNavigator.tsx` — add PatientDetail, CreatePatient, ClinicalNoteEditor routes; move Finance to BottomTabs
- **Modify:** `src/features/settings/screens/SettingsScreen.tsx` — wire Logout button

---

## Task 1: Fix App.js — Remove Master-Password Gate

**Problem:** App.js has an old local-encryption password screen that blocks the entire app before AuthProvider even mounts. The new auth system (`useAuth` + `AppNavigator`) handles login properly. The old gate must be removed.

**Files:**
- Modify: `apps/ethos-mobile/App.js`

- [ ] **Step 1: Replace App.js entirely**

Write the following content to `apps/ethos-mobile/App.js`:

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

- [ ] **Step 2: Commit**

```bash
cd C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney
git add apps/ethos-mobile/App.js
git commit -m "fix(mobile): remove master-password gate — auth handled by useAuth + AppNavigator"
```

---

## Task 2: Extend Patient Type + Add POST /patients to Backend

**Problem:** Backend `Patient` type only has `external_id` and `label`. Mobile needs phone, email, cpf, birth_date, notes. Also there is no `POST /patients` endpoint to create patients.

**Files:**
- Modify: `apps/ethos-clinic/src/domain/types.ts`
- Modify: `apps/ethos-clinic/src/application/service.ts`
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Extend Patient type**

In `apps/ethos-clinic/src/domain/types.ts`, replace:
```typescript
export type Patient = Owned & {
  external_id: string;
  label: string;
};
```
With:
```typescript
export type Patient = Owned & {
  external_id: string;
  label: string;
  phone?: string;
  email?: string;
  cpf?: string;
  birth_date?: string;
  notes?: string;
};
```

- [ ] **Step 2: Add createPatient + updatePatient to service.ts**

At the end of `apps/ethos-clinic/src/application/service.ts`, add:

```typescript
export const createPatient = (
  ownerUserId: string,
  data: { label: string; external_id?: string; phone?: string; email?: string; cpf?: string; birth_date?: string; notes?: string }
): Patient => {
  const patient: Patient = {
    id: uid(),
    owner_user_id: ownerUserId,
    external_id: data.external_id ?? uid(),
    label: data.label,
    phone: data.phone,
    email: data.email,
    cpf: data.cpf,
    birth_date: data.birth_date,
    notes: data.notes,
    created_at: now(),
  };
  db.patients.set(patient.id, patient);
  return patient;
};

export const updatePatient = (
  id: string,
  ownerUserId: string,
  data: Partial<{ label: string; phone: string; email: string; cpf: string; birth_date: string; notes: string }>
): Patient | null => {
  const patient = db.patients.get(id);
  if (!patient || patient.owner_user_id !== ownerUserId) return null;
  if (data.label !== undefined) patient.label = data.label;
  if (data.phone !== undefined) patient.phone = data.phone;
  if (data.email !== undefined) patient.email = data.email;
  if (data.cpf !== undefined) patient.cpf = data.cpf;
  if (data.birth_date !== undefined) patient.birth_date = data.birth_date;
  if (data.notes !== undefined) patient.notes = data.notes;
  db.patients.set(id, patient);
  return patient;
};
```

- [ ] **Step 3: Add POST /patients + PATCH /patients/:id to httpServer.ts**

In `apps/ethos-clinic/src/api/httpServer.ts`:

First, add `createPatient` and `updatePatient` to the imports from `../application/service`:
```typescript
  createPatient,
  updatePatient,
```

Then find the block at line ~1133 that has `GET /patients` and add AFTER it:

```typescript
      if (method === "POST" && url.pathname === "/patients") {
        const body = await readJson(req);
        if (typeof body.label !== "string" || !body.label.trim()) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "label is required");
        }
        const patient = createPatient(auth.user.id, {
          label: String(body.label).trim(),
          external_id: body.external_id ? String(body.external_id) : undefined,
          phone: body.phone ? String(body.phone) : undefined,
          email: body.email ? String(body.email) : undefined,
          cpf: body.cpf ? String(body.cpf) : undefined,
          birth_date: body.birth_date ? String(body.birth_date) : undefined,
          notes: body.notes ? String(body.notes) : undefined,
        });
        addAudit(auth.user.id, "PATIENT_CREATED", patient.id);
        return ok(res, requestId, 201, patient);
      }

      if (method === "PATCH" && /^\/patients\/[^/]+$/.test(url.pathname)) {
        const patientId = url.pathname.split("/")[2];
        const body = await readJson(req);
        const patient = updatePatient(patientId, auth.user.id, {
          label: body.label ? String(body.label) : undefined,
          phone: body.phone !== undefined ? String(body.phone) : undefined,
          email: body.email !== undefined ? String(body.email) : undefined,
          cpf: body.cpf !== undefined ? String(body.cpf) : undefined,
          birth_date: body.birth_date !== undefined ? String(body.birth_date) : undefined,
          notes: body.notes !== undefined ? String(body.notes) : undefined,
        });
        if (!patient) return error(res, requestId, 404, "NOT_FOUND", "Patient not found");
        addAudit(auth.user.id, "PATIENT_UPDATED", patientId);
        return ok(res, requestId, 200, patient);
      }
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/domain/types.ts apps/ethos-clinic/src/application/service.ts apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat(backend): extend Patient type + add POST /patients + PATCH /patients/:id"
```

---

## Task 3: Backend JSON Persistence

**Problem:** Every backend restart loses all data (patients, sessions, notes, etc.). Need to dump Maps to a JSON file and reload on startup.

**Files:**
- Create: `apps/ethos-clinic/src/infra/persist.ts`
- Modify: `apps/ethos-clinic/src/index.ts`

- [ ] **Step 1: Create persist.ts**

Create `apps/ethos-clinic/src/infra/persist.ts`:

```typescript
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { db } from "./database";

const DATA_FILE = process.env.DATA_FILE ?? path.join(process.cwd(), "data", "ethos-db.json");

export function saveToFile(): void {
  const dir = path.dirname(DATA_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const snapshot: Record<string, [string, unknown][]> = {};
  for (const [key, value] of Object.entries(db)) {
    if (value instanceof Map) {
      snapshot[key] = Array.from(value.entries());
    }
  }
  writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

export function loadFromFile(): void {
  if (!existsSync(DATA_FILE)) {
    process.stdout.write(`[persist] No data file found at ${DATA_FILE}, starting fresh.\n`);
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Record<string, [string, unknown][]>;
    for (const [key, entries] of Object.entries(raw)) {
      const map = (db as Record<string, unknown>)[key];
      if (map instanceof Map && Array.isArray(entries)) {
        for (const [k, v] of entries) map.set(k, v);
      }
    }
    process.stdout.write(`[persist] Loaded data from ${DATA_FILE}\n`);
  } catch (e) {
    process.stderr.write(`[persist] Failed to load data: ${(e as Error).message}\n`);
  }
}

export function startAutosave(intervalMs = 30_000): NodeJS.Timeout {
  const timer = setInterval(() => {
    try {
      saveToFile();
    } catch (e) {
      process.stderr.write(`[persist] Autosave failed: ${(e as Error).message}\n`);
    }
  }, intervalMs);
  timer.unref();
  return timer;
}
```

- [ ] **Step 2: Wire persist.ts into index.ts**

Replace `apps/ethos-clinic/src/index.ts` with:

```typescript
import { createEthosBackend } from "./server";
import { loadFromFile, saveToFile, startAutosave } from "./infra/persist";

loadFromFile();
startAutosave(30_000);

const port = Number(process.env.PORT ?? 8787);
const server = createEthosBackend();

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`ETHOS backend listening on ${port}\n`);
});

process.on("SIGTERM", () => {
  saveToFile();
  process.exit(0);
});
```

- [ ] **Step 3: Add data/ to .gitignore**

Check if `apps/ethos-clinic/.gitignore` exists. If so, add `data/` to it. If not, create it with:
```
data/
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-clinic/src/infra/persist.ts apps/ethos-clinic/src/index.ts apps/ethos-clinic/.gitignore
git commit -m "feat(backend): add JSON file persistence — loadFromFile on startup, autosave every 30s"
```

---

## Task 4: Mobile API Helpers — createPatient, fetchDocuments, fetchFinancialEntries

**Problem:** Mobile `sessions.ts` API client only has GET /patients. Need POST /patients, GET /documents, GET /financial/entries.

**Files:**
- Modify: `apps/ethos-mobile/src/shared/services/api/sessions.ts`

- [ ] **Step 1: Update sessions.ts**

In `apps/ethos-mobile/src/shared/services/api/sessions.ts`, update the `sessionContract` to add new routes:

```typescript
const sessionContract = {
    '/sessions': ['get', 'post'],
    '/sessions/{id}': ['get'],
    '/sessions/{id}/status': ['patch'],
    '/sessions/{id}/audio': ['post'],
    '/sessions/{id}/transcribe': ['post'],
    '/sessions/{id}/clinical-note': ['post'],
    '/clinical-notes/{id}/validate': ['post'],
    '/clinical-notes': ['post', 'get'],
    '/patients': ['get', 'post'],
    '/patients/{id}': ['patch'],
    '/documents': ['get'],
    '/financial/entries': ['get'],
    '/financial/entry': ['post'],
    '/jobs/{id}': ['get'],
    '/notifications/whatsapp/send': ['post'],
} as const;
```

Then add these functions after `saveClinicalNote`:

```typescript
export const createPatient = async (data: {
    label: string;
    phone?: string;
    email?: string;
    cpf?: string;
    birth_date?: string;
    notes?: string;
}): Promise<any> => {
    return apiClient.request<any>('/patients', {
        method: 'POST',
        body: data,
    });
};

export const updatePatient = async (id: string, data: Partial<{
    label: string;
    phone: string;
    email: string;
    cpf: string;
    birth_date: string;
    notes: string;
}>): Promise<any> => {
    return apiClient.request<any>(`/patients/${id}`, {
        method: 'PATCH',
        body: data,
    });
};

export const fetchDocuments = async (): Promise<any[]> => {
    return apiClient.request<any[]>('/documents', { method: 'GET' });
};

export const fetchFinancialEntries = async (): Promise<any[]> => {
    return apiClient.request<any[]>('/financial/entries', { method: 'GET' });
};

export const createFinancialEntry = async (data: {
    patient_id?: string;
    amount: number;
    type: 'payment' | 'charge';
    category: 'session' | 'package' | 'other';
    method: string;
    notes?: string;
}): Promise<any> => {
    return apiClient.request<any>('/financial/entry', {
        method: 'POST',
        body: data,
    });
};

export const sendWhatsAppNotification = async (data: {
    to: string;
    message: string;
    patient_id?: string;
}): Promise<any> => {
    return apiClient.request<any>('/notifications/whatsapp/send', {
        method: 'POST',
        body: data,
    });
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/shared/services/api/sessions.ts
git commit -m "feat(mobile): add createPatient, fetchDocuments, fetchFinancialEntries, sendWhatsApp API helpers"
```

---

## Task 5: Replace usePatients with Real API

**Problem:** `usePatients.ts` returns hardcoded dummy patients. Backend `Patient` uses `label` as name. Need adapter.

**Files:**
- Modify: `apps/ethos-mobile/src/shared/hooks/usePatients.ts`

- [ ] **Step 1: Replace usePatients.ts**

Write the following to `apps/ethos-mobile/src/shared/hooks/usePatients.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { fetchPatients } from '../services/api/sessions';

export interface Patient {
    id: string;
    name: string;
    lastSession: string;
    status: 'active' | 'inactive';
    phone?: string;
    email?: string;
    cpf?: string;
    birth_date?: string;
    notes?: string;
    external_id?: string;
}

function adaptPatient(raw: any): Patient {
    return {
        id: raw.id,
        name: raw.label ?? raw.name ?? '—',
        lastSession: raw.last_session_at
            ? new Date(raw.last_session_at).toLocaleDateString('pt-BR')
            : '—',
        status: 'active',
        phone: raw.phone,
        email: raw.email,
        cpf: raw.cpf,
        birth_date: raw.birth_date,
        notes: raw.notes,
        external_id: raw.external_id,
    };
}

export function usePatients() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const raw = await fetchPatients();
            setPatients(Array.isArray(raw) ? raw.map(adaptPatient) : []);
        } catch (e: any) {
            setError(e?.message ?? 'Erro ao carregar pacientes');
            setPatients([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { patients, isLoading, error, reload: load };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/shared/hooks/usePatients.ts
git commit -m "feat(mobile): wire usePatients to real GET /patients API with label→name adapter"
```

---

## Task 6: Wire PatientsScreen Navigation

**Problem:** The "+" button and patient row tap have no `onPress` handlers. Navigation to PatientDetail and CreatePatient is missing.

**Files:**
- Modify: `apps/ethos-mobile/src/features/patients/screens/PatientsScreen.tsx`

- [ ] **Step 1: Add navigation prop and wire buttons**

Replace the function signature and add navigation:

```typescript
export default function PatientsScreen({ navigation }: any) {
```

Replace the "+" button `TouchableOpacity`:
```tsx
<TouchableOpacity
    style={[styles.addButton, { backgroundColor: primaryTeal }]}
    onPress={() => navigation.navigate('CreatePatient')}
>
    <UserPlus size={22} color="#fff" />
</TouchableOpacity>
```

Replace the patient row `TouchableOpacity` (the one with `style={styles.patientCard}`):
```tsx
<TouchableOpacity
    style={[styles.patientCard, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
    onPress={() => navigation.navigate('PatientDetail', { patient })}
>
```

- [ ] **Step 2: Add loading and error states**

After `const filteredPatients = ...`, add:
```tsx
if (isLoading) return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.mutedForeground, fontFamily: 'Inter' }}>Carregando pacientes...</Text>
    </View>
);

if (error) return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#ef4444', fontFamily: 'Inter', marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity onPress={reload} style={[styles.addButton, { backgroundColor: primaryTeal }]}>
            <Text style={{ color: '#fff', fontFamily: 'Inter' }}>Tentar novamente</Text>
        </TouchableOpacity>
    </View>
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-mobile/src/features/patients/screens/PatientsScreen.tsx
git commit -m "feat(mobile): wire PatientsScreen navigation — tap opens PatientDetail, + opens CreatePatient"
```

---

## Task 7: Create PatientDetailScreen

**Problem:** No screen to view a patient's details, sessions list, or quick actions.

**Files:**
- Create: `apps/ethos-mobile/src/features/patients/screens/PatientDetailScreen.tsx`

- [ ] **Step 1: Create PatientDetailScreen.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    useColorScheme, Alert
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ChevronLeft, Phone, Mail, FileText, Calendar, Plus, Edit2 } from 'lucide-react-native';
import { fetchSessions } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

export default function PatientDetailScreen({ navigation, route }: any) {
    const { patient } = route.params as { patient: any };
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);

    useEffect(() => {
        fetchSessions()
            .then(all => setSessions(all.filter((s: any) => s.patient_id === patient.id)))
            .catch(() => setSessions([]))
            .finally(() => setLoadingSessions(false));
    }, [patient.id]);

    const statusLabel: Record<string, string> = {
        scheduled: 'Agendada',
        confirmed: 'Confirmada',
        completed: 'Realizada',
        missed: 'Faltou',
        in_progress: 'Em andamento',
    };

    const statusColor: Record<string, string> = {
        scheduled: '#3b82f6',
        confirmed: '#10b981',
        completed: '#6366f1',
        missed: '#ef4444',
        in_progress: '#f59e0b',
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={primaryTeal} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: primaryTeal }]}>Ficha do Paciente</Text>
                <TouchableOpacity
                    onPress={() => navigation.navigate('CreatePatient', { patient, editMode: true })}
                    style={styles.editBtn}
                >
                    <Edit2 size={20} color={accentTeal} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Avatar + Name */}
                <View style={[styles.card, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}>
                    <View style={[styles.avatar, { backgroundColor: 'rgba(67,146,153,0.12)' }]}>
                        <Text style={[styles.avatarText, { color: accentTeal }]}>
                            {patient.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                    </View>
                    <Text style={[styles.name, { color: primaryTeal }]}>{patient.name}</Text>

                    {/* Contact info */}
                    {patient.phone ? (
                        <View style={styles.infoRow}>
                            <Phone size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>{patient.phone}</Text>
                        </View>
                    ) : null}
                    {patient.email ? (
                        <View style={styles.infoRow}>
                            <Mail size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>{patient.email}</Text>
                        </View>
                    ) : null}
                    {patient.cpf ? (
                        <View style={styles.infoRow}>
                            <FileText size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>CPF: {patient.cpf}</Text>
                        </View>
                    ) : null}
                    {patient.birth_date ? (
                        <View style={styles.infoRow}>
                            <Calendar size={16} color={accentTeal} />
                            <Text style={[styles.infoText, { color: theme.mutedForeground }]}>
                                Nascimento: {patient.birth_date}
                            </Text>
                        </View>
                    ) : null}
                    {patient.notes ? (
                        <View style={[styles.notesBox, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
                            <Text style={[styles.notesLabel, { color: theme.mutedForeground }]}>Observações</Text>
                            <Text style={[styles.notesText, { color: primaryTeal }]}>{patient.notes}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: primaryTeal }]}
                        onPress={() => navigation.navigate('SessionHub', { patientId: patient.id, patientName: patient.name })}
                    >
                        <FileText size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Nova Sessão</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: accentTeal }]}
                        onPress={() => navigation.navigate('ClinicalNoteEditor', { patientId: patient.id, patientName: patient.name })}
                    >
                        <Plus size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Nova Nota</Text>
                    </TouchableOpacity>
                </View>

                {/* Sessions */}
                <Text style={[styles.sectionTitle, { color: primaryTeal }]}>Sessões</Text>
                {loadingSessions ? (
                    <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Carregando...</Text>
                ) : sessions.length === 0 ? (
                    <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>Nenhuma sessão registrada.</Text>
                ) : (
                    sessions.map(session => (
                        <TouchableOpacity
                            key={session.id}
                            style={[styles.sessionRow, { backgroundColor: isDark ? '#2a2d31' : '#fff' }]}
                            onPress={() => navigation.navigate('SessionHub', { sessionId: session.id, patientId: patient.id, patientName: patient.name })}
                        >
                            <View>
                                <Text style={[styles.sessionDate, { color: primaryTeal }]}>
                                    {new Date(session.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: (statusColor[session.status] ?? '#6b7280') + '22' }]}>
                                    <Text style={[styles.statusText, { color: statusColor[session.status] ?? '#6b7280' }]}>
                                        {statusLabel[session.status] ?? session.status}
                                    </Text>
                                </View>
                            </View>
                            <ChevronLeft size={18} color={theme.mutedForeground} style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Lora', fontWeight: '700' },
    editBtn: { padding: 8 },
    scroll: { padding: 20, paddingBottom: 100 },
    card: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
    avatar: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { fontSize: 36, fontFamily: 'Lora', fontWeight: '700' },
    name: { fontSize: 22, fontFamily: 'Lora', fontWeight: '700', marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, alignSelf: 'flex-start' },
    infoText: { fontSize: 14, fontFamily: 'Inter' },
    notesBox: { width: '100%', borderRadius: 12, padding: 12, marginTop: 12 },
    notesLabel: { fontSize: 11, fontFamily: 'Inter', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    notesText: { fontSize: 14, fontFamily: 'Inter' },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
    actionBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
    sectionTitle: { fontSize: 18, fontFamily: 'Lora', fontWeight: '700', marginBottom: 12 },
    emptyText: { fontFamily: 'Inter', fontSize: 14, textAlign: 'center', marginVertical: 16 },
    sessionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
    sessionDate: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600', marginBottom: 4 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    statusText: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/features/patients/screens/PatientDetailScreen.tsx
git commit -m "feat(mobile): create PatientDetailScreen with contact info, quick actions, sessions list"
```

---

## Task 8: Create CreatePatientScreen

**Problem:** "+" button in PatientsScreen has nowhere to go. Need a form to create patients via `POST /patients`.

**Files:**
- Create: `apps/ethos-mobile/src/features/patients/screens/CreatePatientScreen.tsx`

- [ ] **Step 1: Create CreatePatientScreen.tsx**

```tsx
import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, ScrollView,
    TouchableOpacity, useColorScheme, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ChevronLeft, Save } from 'lucide-react-native';
import { createPatient, updatePatient } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

interface Field { label: string; key: string; placeholder: string; keyboardType?: any; required?: boolean; multiline?: boolean; }

const FIELDS: Field[] = [
    { label: 'Nome completo *', key: 'label', placeholder: 'Ex: João da Silva', required: true },
    { label: 'Telefone / WhatsApp', key: 'phone', placeholder: 'Ex: (11) 99999-9999', keyboardType: 'phone-pad' },
    { label: 'E-mail', key: 'email', placeholder: 'Ex: joao@email.com', keyboardType: 'email-address' },
    { label: 'CPF', key: 'cpf', placeholder: 'Ex: 000.000.000-00', keyboardType: 'numeric' },
    { label: 'Data de nascimento', key: 'birth_date', placeholder: 'Ex: 15/03/1990' },
    { label: 'Observações', key: 'notes', placeholder: 'Histórico, encaminhamento, observações...', multiline: true },
];

export default function CreatePatientScreen({ navigation, route }: any) {
    const editMode = route.params?.editMode ?? false;
    const existingPatient = route.params?.patient;
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<Record<string, string>>({
        label: '', phone: '', email: '', cpf: '', birth_date: '', notes: ''
    });

    useEffect(() => {
        if (editMode && existingPatient) {
            setForm({
                label: existingPatient.name ?? '',
                phone: existingPatient.phone ?? '',
                email: existingPatient.email ?? '',
                cpf: existingPatient.cpf ?? '',
                birth_date: existingPatient.birth_date ?? '',
                notes: existingPatient.notes ?? '',
            });
        }
    }, [editMode, existingPatient]);

    const handleSave = async () => {
        if (!form.label.trim()) {
            Alert.alert('Campo obrigatório', 'Nome do paciente é obrigatório.');
            return;
        }
        setSaving(true);
        try {
            if (editMode && existingPatient) {
                await updatePatient(existingPatient.id, {
                    label: form.label.trim(),
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                    cpf: form.cpf || undefined,
                    birth_date: form.birth_date || undefined,
                    notes: form.notes || undefined,
                });
                Alert.alert('Sucesso', 'Paciente atualizado!');
            } else {
                await createPatient({
                    label: form.label.trim(),
                    phone: form.phone || undefined,
                    email: form.email || undefined,
                    cpf: form.cpf || undefined,
                    birth_date: form.birth_date || undefined,
                    notes: form.notes || undefined,
                });
                Alert.alert('Sucesso', 'Paciente cadastrado!', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
                return;
            }
            navigation.goBack();
        } catch (e: any) {
            Alert.alert('Erro', e?.message ?? 'Falha ao salvar paciente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={primaryTeal} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: primaryTeal }]}>
                        {editMode ? 'Editar Paciente' : 'Novo Paciente'}
                    </Text>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: saving ? '#94a3b8' : primaryTeal }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {FIELDS.map(field => (
                        <View key={field.key} style={styles.fieldGroup}>
                            <Text style={[styles.label, { color: theme.mutedForeground }]}>{field.label}</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    field.multiline && styles.inputMultiline,
                                    { backgroundColor: isDark ? '#2a2d31' : '#fff', color: primaryTeal, borderColor: isDark ? '#3a3d41' : '#e2e8f0' }
                                ]}
                                placeholder={field.placeholder}
                                placeholderTextColor={theme.mutedForeground}
                                value={form[field.key]}
                                onChangeText={v => setForm(prev => ({ ...prev, [field.key]: v }))}
                                keyboardType={field.keyboardType ?? 'default'}
                                multiline={field.multiline}
                                numberOfLines={field.multiline ? 4 : 1}
                                textAlignVertical={field.multiline ? 'top' : 'center'}
                                autoCapitalize={field.key === 'email' ? 'none' : 'words'}
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
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { flex: 1, fontSize: 20, fontFamily: 'Lora', fontWeight: '700' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    saveBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
    scroll: { padding: 20, paddingBottom: 60 },
    fieldGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { borderRadius: 14, padding: 14, fontSize: 15, fontFamily: 'Inter', borderWidth: 1 },
    inputMultiline: { minHeight: 100, paddingTop: 14 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/features/patients/screens/CreatePatientScreen.tsx
git commit -m "feat(mobile): create CreatePatientScreen — form for POST /patients with edit mode"
```

---

## Task 9: Create ClinicalNoteEditorScreen

**Problem:** No dedicated screen to write a clinical note for a session. SessionHub calls `saveClinicalNote` but there's no standalone editor for creating notes outside of session flow.

**Files:**
- Create: `apps/ethos-mobile/src/features/sessions/screens/ClinicalNoteEditorScreen.tsx`

- [ ] **Step 1: Create ClinicalNoteEditorScreen.tsx**

```tsx
import React, { useState, useRef } from 'react';
import {
    View, Text, TextInput, StyleSheet, TouchableOpacity,
    useColorScheme, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { ChevronLeft, Save, FileText } from 'lucide-react-native';
import { saveClinicalNote } from '../../../shared/services/api/sessions';

const primaryTeal = '#234e5c';
const accentTeal = '#439299';

const TEMPLATES = [
    { label: 'SOAP', text: 'S (Subjetivo):\n\nO (Objetivo):\n\nA (Avaliação):\n\nP (Plano):' },
    { label: 'Livre', text: '' },
    { label: 'Evolução', text: 'Sessão:\nData:\n\nConteúdo abordado:\n\nObservações clínicas:\n\nEncaminhamentos:' },
];

export default function ClinicalNoteEditorScreen({ navigation, route }: any) {
    const { sessionId, patientName } = route.params as { sessionId?: string; patientName?: string };
    const isDark = useColorScheme() === 'dark';
    const theme = useTheme();
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(0);
    const mountedRef = useRef(true);

    const handleTemplateSelect = (index: number) => {
        setSelectedTemplate(index);
        if (TEMPLATES[index].text && !content.trim()) {
            setContent(TEMPLATES[index].text);
        }
    };

    const handleSave = async () => {
        if (!content.trim() || content.trim().length < 10) {
            Alert.alert('Nota muito curta', 'Escreva pelo menos 10 caracteres.');
            return;
        }
        if (!sessionId) {
            Alert.alert('Sessão não vinculada', 'Esta nota precisa de uma sessão associada.');
            return;
        }
        setSaving(true);
        try {
            await saveClinicalNote(sessionId, content.trim());
            Alert.alert('Nota salva', 'A nota clínica foi registrada com sucesso.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (e: any) {
            if (mountedRef.current) {
                Alert.alert('Erro', e?.message ?? 'Falha ao salvar nota.');
            }
        } finally {
            if (mountedRef.current) setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.container, { backgroundColor: isDark ? '#1a1d21' : '#f8f9fa' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={24} color={primaryTeal} />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: primaryTeal }]}>Nota Clínica</Text>
                        {patientName ? (
                            <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>{patientName}</Text>
                        ) : null}
                    </View>
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: saving ? '#94a3b8' : primaryTeal }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        <Save size={18} color="#fff" />
                        <Text style={styles.saveBtnText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Template selector */}
                <View style={styles.templateRow}>
                    <FileText size={14} color={theme.mutedForeground} />
                    <Text style={[styles.templateLabel, { color: theme.mutedForeground }]}>Modelo:</Text>
                    {TEMPLATES.map((t, i) => (
                        <TouchableOpacity
                            key={t.label}
                            style={[
                                styles.templateChip,
                                { backgroundColor: selectedTemplate === i ? primaryTeal : (isDark ? '#2a2d31' : '#fff') }
                            ]}
                            onPress={() => handleTemplateSelect(i)}
                        >
                            <Text style={[styles.templateChipText, { color: selectedTemplate === i ? '#fff' : primaryTeal }]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Editor */}
                <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    <TextInput
                        style={[
                            styles.editor,
                            { backgroundColor: isDark ? '#2a2d31' : '#fff', color: primaryTeal, borderColor: isDark ? '#3a3d41' : '#e2e8f0' }
                        ]}
                        multiline
                        placeholder="Escreva a nota clínica aqui..."
                        placeholderTextColor={theme.mutedForeground}
                        value={content}
                        onChangeText={setContent}
                        textAlignVertical="top"
                        autoFocus
                    />
                </ScrollView>

                {/* Char counter */}
                <View style={styles.footer}>
                    <Text style={[styles.charCount, { color: theme.mutedForeground }]}>
                        {content.length} caracteres
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontFamily: 'Lora', fontWeight: '700' },
    headerSub: { fontSize: 13, fontFamily: 'Inter', marginTop: 2 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    saveBtnText: { color: '#fff', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
    templateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12, flexWrap: 'wrap' },
    templateLabel: { fontSize: 12, fontFamily: 'Inter', fontWeight: '600' },
    templateChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    templateChipText: { fontSize: 13, fontFamily: 'Inter', fontWeight: '600' },
    editor: { margin: 20, borderRadius: 16, padding: 16, minHeight: 400, fontSize: 15, fontFamily: 'Inter', borderWidth: 1, lineHeight: 24 },
    footer: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'flex-end' },
    charCount: { fontSize: 12, fontFamily: 'Inter' },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/features/sessions/screens/ClinicalNoteEditorScreen.tsx
git commit -m "feat(mobile): create ClinicalNoteEditorScreen with SOAP/Evolução templates + char counter"
```

---

## Task 10: Update AppNavigator — Add Missing Routes + Finance to Tabs

**Problem:** PatientDetail, CreatePatient, ClinicalNoteEditor missing from navigator. Finance only accessible as a modal stack screen, not visible in bottom tabs.

**Files:**
- Modify: `apps/ethos-mobile/src/shared/navigation/AppNavigator.tsx`

- [ ] **Step 1: Replace AppNavigator.tsx**

```tsx
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { colors } from '../theme/colors';
import { Home, Calendar, Users, Settings, FileText, Banknote } from 'lucide-react-native';

import { useAuth } from '../hooks/useAuth';
import SplashLoading from '../components/SplashLoading';

// Auth screens
import LoginScreen from '../../features/auth/screens/LoginScreen';
import RecoverPasswordScreen from '../../features/auth/screens/RecoverPasswordScreen';
import EmailSentScreen from '../../features/auth/screens/EmailSentScreen';
import RegisterStep1Screen from '../../features/auth/screens/RegisterStep1Screen';
import RegisterStep2Screen from '../../features/auth/screens/RegisterStep2Screen';
import WelcomeOnboardingScreen from '../../features/onboarding/screens/WelcomeOnboardingScreen';

// App screens
import DashboardScreen from '../../features/dashboard/screens/DashboardScreen';
import ScheduleScreen from '../../features/sessions/screens/ScheduleScreen';
import PatientsScreen from '../../features/patients/screens/PatientsScreen';
import PatientDetailScreen from '../../features/patients/screens/PatientDetailScreen';
import CreatePatientScreen from '../../features/patients/screens/CreatePatientScreen';
import DocumentsScreen from '../../features/documents/screens/DocumentsScreen';
import SettingsScreen from '../../features/settings/screens/SettingsScreen';
import SessionHubScreen from '../../features/sessions/screens/SessionHubScreen';
import ClinicalNoteEditorScreen from '../../features/sessions/screens/ClinicalNoteEditorScreen';
import SearchScreen from '../../screens/SearchScreen';
import NotificationsScreen from '../../screens/NotificationsScreen';
import DocumentDetailScreen from '../../screens/DocumentDetailScreen';
import FinanceScreen from '../../features/finance/screens/FinanceScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

function AuthStackNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
      <AuthStack.Screen name="EmailSent" component={EmailSentScreen} />
      <AuthStack.Screen name="RegisterStep1" component={RegisterStep1Screen} />
      <AuthStack.Screen name="RegisterStep2" component={RegisterStep2Screen} />
      <AuthStack.Screen name="WelcomeOnboarding" component={WelcomeOnboardingScreen} />
    </AuthStack.Navigator>
  );
}

function BottomTabs() {
  const scheme = useColorScheme();
  const themeColors = scheme === 'dark' ? colors.dark : colors.light;
  return (
    <Tab.Navigator screenOptions={{
      tabBarStyle: { backgroundColor: themeColors.card, borderTopColor: themeColors.border },
      tabBarActiveTintColor: themeColors.primary,
      tabBarInactiveTintColor: themeColors.mutedForeground,
      headerStyle: { backgroundColor: themeColors.background },
      headerTintColor: themeColors.foreground,
    }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Hoje', headerShown: false, tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Agenda', tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} /> }} />
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: 'Pacientes', headerShown: false, tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Docs', headerShown: false, tabBarIcon: ({ color, size }) => <FileText color={color} size={size} /> }} />
      <Tab.Screen name="Finance" component={FinanceScreen} options={{ title: 'Financeiro', headerShown: false, tabBarIcon: ({ color, size }) => <Banknote color={color} size={size} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={BottomTabs} />
      <MainStack.Screen name="SessionHub" component={SessionHubScreen} />
      <MainStack.Screen name="PatientDetail" component={PatientDetailScreen} />
      <MainStack.Screen name="CreatePatient" component={CreatePatientScreen} />
      <MainStack.Screen name="ClinicalNoteEditor" component={ClinicalNoteEditorScreen} />
      <MainStack.Screen name="Search" component={SearchScreen} />
      <MainStack.Screen name="Notifications" component={NotificationsScreen} />
      <MainStack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
    </MainStack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, isLoading } = useAuth();
  const scheme = useColorScheme();

  if (isLoading) return <SplashLoading />;

  const NavigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: scheme === 'dark' ? colors.dark.background : colors.light.background,
      card: scheme === 'dark' ? colors.dark.card : colors.light.card,
      text: scheme === 'dark' ? colors.dark.foreground : colors.light.foreground,
      border: scheme === 'dark' ? colors.dark.border : colors.light.border,
      primary: colors.light.primary,
    },
  };

  return (
    <NavigationContainer theme={NavigationTheme}>
      {token ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/shared/navigation/AppNavigator.tsx
git commit -m "feat(mobile): add PatientDetail/CreatePatient/ClinicalNoteEditor routes + Finance to bottom tabs"
```

---

## Task 11: Wire FinanceScreen to Real API

**Problem:** FinanceScreen has hardcoded transactions array. Need to fetch from `GET /financial/entries`.

**Files:**
- Modify: `apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx`

- [ ] **Step 1: Add API fetch to FinanceScreen**

At the top of `FinanceScreen.tsx`, add the import:
```tsx
import { fetchFinancialEntries } from '../../../shared/services/api/sessions';
```

Replace the hardcoded `transactions` constant with state + useEffect. Add after the existing imports and before `export default function FinanceScreen()`:

Inside the component, replace:
```tsx
const transactions = [
    { id: '1', title: 'Sessão João Silva', ... },
    ...
];
```

With:
```tsx
const [entries, setEntries] = useState<any[]>([]);
const [loadingEntries, setLoadingEntries] = useState(true);

useEffect(() => {
    fetchFinancialEntries()
        .then(data => setEntries(Array.isArray(data) ? data : []))
        .catch(() => setEntries([]))
        .finally(() => setLoadingEntries(false));
}, []);

// Adapter: map backend entries to display format
const transactions = entries.map(e => ({
    id: e.id,
    title: e.notes ?? (e.category === 'session' ? 'Sessão' : 'Lançamento'),
    value: `R$ ${(e.amount / 100).toFixed(2).replace('.', ',')}`,
    date: new Date(e.created_at ?? e.date ?? Date.now()).toLocaleDateString('pt-BR'),
    type: e.type === 'payment' ? 'income' : 'expense',
    status: e.status ?? 'received',
}));
```

Also add `useState, useEffect` to the React import if not present.

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/features/finance/screens/FinanceScreen.tsx
git commit -m "feat(mobile): wire FinanceScreen to GET /financial/entries — replace hardcoded transactions"
```

---

## Task 12: Wire DocumentsScreen to Real API + Fix Filter Chips

**Problem:** DocumentsScreen shows `mockDocs` hardcoded array. Filter chips set `filter` state but filter is never applied to the rendered list.

**Files:**
- Modify: `apps/ethos-mobile/src/features/documents/screens/DocumentsScreen.tsx`

- [ ] **Step 1: Add API fetch and apply filter**

Add import:
```tsx
import { fetchDocuments } from '../../../shared/services/api/sessions';
```

Inside the component, replace `mockDocs` with state:
```tsx
const [docs, setDocs] = useState<any[]>([]);
const [loadingDocs, setLoadingDocs] = useState(true);

useEffect(() => {
    fetchDocuments()
        .then(data => setDocs(Array.isArray(data) ? data : []))
        .catch(() => setDocs([]))
        .finally(() => setLoadingDocs(false));
}, []);
```

Then add a `filteredDocs` computation after the state declarations:
```tsx
const filteredDocs = docs.filter(doc => {
    if (filter === 'Todos') return true;
    if (filter === 'Assinados') return doc.status === 'signed' || doc.status === 'validated';
    if (filter === 'Rascunhos') return doc.status === 'draft';
    if (filter === 'Modelos') return doc.type === 'template';
    return true;
});
```

Find everywhere `mockDocs` is used in the JSX and replace with `filteredDocs`.

Adapt the doc object for display (backend `ClinicalDocument` has `id`, `session_id`, `created_at`):
```tsx
// In the render, display doc.title ?? doc.type ?? 'Documento'
// doc.status comes from backend as 'draft' | 'validated'
// For patient name, show doc.patient_id or '—'
```

- [ ] **Step 2: Wire document tap to DocumentDetail**

Find the document row `TouchableOpacity` and add `onPress`:
```tsx
onPress={() => navigation.navigate('DocumentDetail', { doc })}
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-mobile/src/features/documents/screens/DocumentsScreen.tsx
git commit -m "feat(mobile): wire DocumentsScreen to GET /documents + fix filter chips + tap navigates to detail"
```

---

## Task 13: Add WhatsApp Notification Endpoint to Backend

**Problem:** No WhatsApp notification capability. Need an endpoint that accepts a message and phone number, and either calls an external API or logs the notification for manual sending.

**Files:**
- Modify: `apps/ethos-clinic/src/api/httpServer.ts`

- [ ] **Step 1: Add POST /notifications/whatsapp/send endpoint**

In `httpServer.ts`, find the notifications section and add this route:

```typescript
      if (method === "POST" && url.pathname === "/notifications/whatsapp/send") {
        const body = await readJson(req);
        if (!body.to || !body.message) {
          return error(res, requestId, 422, "VALIDATION_ERROR", "to and message are required");
        }

        const logId = uid();
        const logEntry = {
          id: logId,
          channel: "whatsapp" as const,
          recipient: String(body.to),
          message: String(body.message),
          patient_id: body.patient_id ? String(body.patient_id) : undefined,
          sent_by: auth.user.id,
          sent_at: new Date().toISOString(),
          status: "queued",
          // In production: integrate with Evolution API, Twilio, or Z-API here
          // EXPO_PUBLIC env var WHATSAPP_API_URL controls the provider
        };
        db.notificationLogs.set(logId, logEntry as any);
        addAudit(auth.user.id, "WHATSAPP_NOTIFICATION_SENT");

        // If WHATSAPP_WEBHOOK_URL is set, forward to external provider
        const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
        if (webhookUrl) {
          try {
            const http = await import("node:https");
            // Fire-and-forget: don't block response waiting for external API
            process.nextTick(async () => {
              const fetch = (await import("node:https")).request;
              // placeholder: implement actual provider call based on WHATSAPP_PROVIDER env
            });
          } catch {}
        }

        return ok(res, requestId, 201, { id: logId, status: "queued", message: "Notification queued" });
      }
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-clinic/src/api/httpServer.ts
git commit -m "feat(backend): add POST /notifications/whatsapp/send endpoint with audit log"
```

---

## Task 14: Wire ScheduleScreen to Real Sessions

**Problem:** ScheduleScreen calls `fetchSessions()` but falls back to mock data on error. Need to show real sessions + patient names.

**Files:**
- Modify: `apps/ethos-mobile/src/features/sessions/screens/ScheduleScreen.tsx`

- [ ] **Step 1: Read the current ScheduleScreen**

Read `apps/ethos-mobile/src/features/sessions/screens/ScheduleScreen.tsx` in full.

- [ ] **Step 2: Remove mock fallback**

Find any hardcoded session array (the fallback mock data). Remove it. In the catch block of the API call, set sessions to `[]` instead of the mock data.

- [ ] **Step 3: Enrich sessions with patient names**

After fetching sessions, fetch patients and join:
```tsx
const [patientMap, setPatientMap] = useState<Record<string, string>>({});

useEffect(() => {
    fetchPatients().then(patients => {
        const map: Record<string, string> = {};
        patients.forEach((p: any) => { map[p.id] = p.label ?? p.name ?? '—'; });
        setPatientMap(map);
    }).catch(() => {});
}, []);

// In the session list render:
// patientName = patientMap[session.patient_id] ?? 'Paciente'
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-mobile/src/features/sessions/screens/ScheduleScreen.tsx
git commit -m "feat(mobile): wire ScheduleScreen to real sessions + enrich with patient names, remove mock fallback"
```

---

## Task 15: Wire Settings Logout

**Problem:** Settings screen may not have a wired Logout button connected to `useAuth().handleLogout`.

**Files:**
- Modify: `apps/ethos-mobile/src/features/settings/screens/SettingsScreen.tsx`

- [ ] **Step 1: Read SettingsScreen**

Read `apps/ethos-mobile/src/features/settings/screens/SettingsScreen.tsx`.

- [ ] **Step 2: Wire logout**

Import `useAuth`:
```tsx
import { useAuth } from '../../../shared/hooks/useAuth';
```

Inside the component:
```tsx
const { handleLogout } = useAuth();
```

Find the Logout button (look for `Sair` or `Logout` text) and ensure its `onPress` calls:
```tsx
onPress={() => {
    Alert.alert('Sair', 'Tem certeza que deseja sair?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: handleLogout },
    ]);
}}
```

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-mobile/src/features/settings/screens/SettingsScreen.tsx
git commit -m "feat(mobile): wire SettingsScreen logout to useAuth().handleLogout"
```

---

## Task 16: APK Preview Build — Document and Verify Config

**Problem:** User installed a `development` APK (Expo dev client) which requires a metro server. Need a `preview` APK that is self-contained.

**Files:**
- Read: `apps/ethos-mobile/eas.json` (already has `preview` profile — no changes needed)
- Read: `apps/ethos-mobile/app.config.js` — verify EAS project ID exists

- [ ] **Step 1: Verify eas.json preview profile**

`eas.json` already has:
```json
"preview": {
  "extends": "base",
  "distribution": "internal"
}
```
This is correct. No change needed.

- [ ] **Step 2: Create env file for backend URL**

Create `apps/ethos-mobile/.env.preview`:
```
EXPO_PUBLIC_API_URL=http://YOUR_MACHINE_IP:8787
```

Document: replace `YOUR_MACHINE_IP` with the actual LAN IP of the machine running the backend (e.g. `192.168.0.15`). Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux) to find it.

- [ ] **Step 3: Document build command**

The correct command to generate a self-contained APK:
```bash
cd apps/ethos-mobile
eas build -p android --profile preview
```

For production (Google Play):
```bash
eas build -p android --profile production
```

For local build without EAS cloud (requires Android SDK):
```bash
cd apps/ethos-mobile
npx expo run:android --variant release
```

For testing immediately without building:
```bash
cd apps/ethos-mobile
EXPO_PUBLIC_API_URL=http://192.168.0.15:8787 npx expo start
# Scan QR with Expo Go app
```

- [ ] **Step 4: Commit env example**

```bash
git add apps/ethos-mobile/.env.preview
git commit -m "docs(mobile): add .env.preview example + document APK build commands (preview profile)"
```

---

## Task 17: Final TypeScript Check

**Problem:** After all changes, verify TypeScript compiles without errors.

**Files:** All modified files.

- [ ] **Step 1: Run TypeScript check on backend**

```bash
cd C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney\apps\ethos-clinic
npx tsc --noEmit
```

Expected: 0 errors. Fix any import/type errors before proceeding.

- [ ] **Step 2: Run TypeScript check on mobile**

```bash
cd C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney\apps\ethos-mobile
npx tsc --noEmit
```

Expected: 0 errors (or only pre-existing errors unrelated to our changes).

- [ ] **Step 3: Run backend tests**

```bash
cd C:\Users\gaming\Desktop\Projetos\Ethos-main\.claude\worktrees\funny-dewdney
npm --workspace ethos-clinic run test
```

Expected: 34/34 passing.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final TypeScript and test verification — all tasks complete"
```

---

## Summary

| Task | File(s) | Impact |
|------|---------|--------|
| 1 | App.js | Removes blocking master-password gate |
| 2 | types.ts, service.ts, httpServer.ts | POST /patients + richer Patient data |
| 3 | persist.ts, index.ts | Data survives backend restarts |
| 4 | sessions.ts | API helpers for all mobile screens |
| 5 | usePatients.ts | Real patient list from API |
| 6 | PatientsScreen.tsx | Navigation to PatientDetail + CreatePatient |
| 7 | PatientDetailScreen.tsx | Full patient ficha screen |
| 8 | CreatePatientScreen.tsx | Patient registration form |
| 9 | ClinicalNoteEditorScreen.tsx | Clinical note editor with templates |
| 10 | AppNavigator.tsx | All routes wired + Finance in tabs |
| 11 | FinanceScreen.tsx | Real financial data from API |
| 12 | DocumentsScreen.tsx | Real documents + working filters |
| 13 | httpServer.ts | WhatsApp notification endpoint |
| 14 | ScheduleScreen.tsx | Real sessions + patient names |
| 15 | SettingsScreen.tsx | Working logout |
| 16 | eas.json + .env.preview | APK build documented |
| 17 | All | TypeScript + tests verified |
