# Mobile App — Navigation Fixes + SessionHub + New Screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all dead navigation stubs, redesign SessionHub as a 3-mode session documentation tool, and add Search/Notifications/DocumentDetail screens with async transcription notification.

**Architecture:** All new screens live flat in `src/screens/`. A new `NotificationsContext` at `src/contexts/NotificationsContext.tsx` holds notifications state and background job polling — it wraps AppNavigator in `App.js`. The SessionHub gains 3 tabs (Record / Upload / Write) that all funnel into the same backend transcription pipeline.

**Tech Stack:** React Native 0.79, Expo SDK 53, React Navigation 7, expo-av (recording), expo-document-picker (file upload), TypeScript, existing `src/services/api/httpClient.ts` + `sessions.ts`

**Spec:** `docs/superpowers/specs/2026-03-26-mobile-navigation-sessionhub-design.md`

---

## File Map

**Create:**
- `src/contexts/NotificationsContext.tsx` — notifications state + job polling
- `src/screens/SearchScreen.tsx` — global search (patients, docs, sessions)
- `src/screens/NotificationsScreen.tsx` — notifications list with unread dots
- `src/screens/DocumentDetailScreen.tsx` — document viewer with sign/export stubs

**Modify:**
- `src/navigation/AppNavigator.tsx` — add 4 new routes + wrap with NotificationsProvider
- `App.js` — import NotificationsProvider and wrap AppNavigator
- `src/screens/DashboardScreen.tsx` — wire all dead elements + unread badge on bell
- `src/screens/ScheduleScreen.tsx` — wire elements, rename "AO VIVO", add calendar modal
- `src/screens/DocumentsScreen.tsx` — wire document cards, filter param, back button
- `src/screens/SessionHubScreen.tsx` — full 3-tab redesign
- `src/services/api/sessions.ts` — add `pollJob` + `postSessionNote` functions
- `apps/ethos-mobile/package.json` — add `expo-document-picker`

---

## Task 1: NotificationsContext

**Files:**
- Create: `src/contexts/NotificationsContext.tsx`

- [ ] **Step 1: Create the context file**

```tsx
// src/contexts/NotificationsContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export type DocumentItem = {
  id: string;
  title: string;
  patient: string;
  status: 'assinado' | 'rascunho';
  date: string;
  content?: string;
};

export type AppNotification = {
  id: string;
  type: 'prontuario_gerado' | 'sessao_pendente' | 'pagamento';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  document?: DocumentItem;
};

type PendingJob = {
  jobId: string;
  patientName: string;
  sessionId: string;
};

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void;
  addPendingJob: (job: PendingJob) => void;
  markAllRead: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.15.182:8787';

let authTokenRef: string | null = null;
export const setNotificationsAuthToken = (token: string | null) => {
  authTokenRef = token;
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    setNotifications((prev) => [
      { ...n, id: `${Date.now()}-${Math.random()}`, read: false, timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const addPendingJob = useCallback((job: PendingJob) => {
    if (!job.jobId) {
      // Transcription request failed — add a "sessao_pendente" notification immediately
      addNotification({ type: 'sessao_pendente', title: 'Transcrição indisponível', body: job.patientName });
      return;
    }
    setPendingJobs((prev) => [...prev, job]);
  }, [addNotification]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removePendingJob = useCallback((jobId: string) => {
    setPendingJobs((prev) => prev.filter((j) => j.jobId !== jobId));
  }, []);

  // Background job polling — lives here so it survives navigation away from SessionHub
  useEffect(() => {
    if (pendingJobs.length === 0) return;

    const interval = setInterval(async () => {
      for (const job of pendingJobs) {
        try {
          const token = authTokenRef;
          const res = await fetch(`${API_URL}/jobs/${job.jobId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) continue;
          const data: any = await res.json();
          const status = data?.data?.status ?? data?.status;

          if (status === 'completed') {
            addNotification({
              type: 'prontuario_gerado',
              title: 'Prontuário gerado',
              body: job.patientName,
              document: data?.data?.document ?? {
                id: `doc-${Date.now()}`,
                title: `Sessão — ${job.patientName}`,
                patient: job.patientName,
                status: 'rascunho',
                date: new Date().toLocaleDateString('pt-BR'),
                content: data?.data?.transcript ?? 'Transcrição concluída. Revise o prontuário.',
              },
            });
            removePendingJob(job.jobId);
          } else if (status === 'failed') {
            addNotification({ type: 'sessao_pendente', title: 'Transcrição falhou', body: job.patientName });
            removePendingJob(job.jobId);
          }
        } catch {
          // network error — try again next tick
        }
      }
    }, 10_000);

    return () => clearInterval(interval);
  }, [pendingJobs, addNotification, removePendingJob]);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, addPendingJob, markAllRead }}>
      {children}
    </NotificationsContext.Provider>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/ethos-mobile
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to the new file (other pre-existing errors are OK).

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-mobile/src/contexts/NotificationsContext.tsx
git commit -m "feat(mobile): add NotificationsContext with background job polling"
```

---

## Task 2: Wrap App with NotificationsProvider + add API jobs support

**Files:**
- Modify: `App.js`
- Modify: `src/services/api/sessions.ts`

- [ ] **Step 1: Add pollJob and postSessionNote to sessions.ts**

Open `src/services/api/sessions.ts`. The existing `sessionContract` needs two additions and two new exported functions. Replace the contract and add the functions:

```ts
// Add to sessionContract:
const sessionContract = {
    '/sessions': ['get', 'post'],
    '/sessions/{id}': ['get'],
    '/sessions/{id}/status': ['patch'],
    '/sessions/{id}/audio': ['post'],
    '/sessions/{id}/transcribe': ['post'],
    '/sessions/{id}/clinical-note': ['post'],
    '/clinical-notes/{id}/validate': ['post'],
    '/patients': ['get'],
    '/jobs/{id}': ['get'],           // ADD THIS
    '/clinical-notes': ['post'],     // ADD THIS
} as const;
```

Then add at the bottom of the file:

```ts
export const pollJob = async (jobId: string): Promise<{ status: string; document?: any; transcript?: string }> => {
    const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
    });
    if (!res.ok) throw new Error(`Job poll failed: ${res.status}`);
    const json = await res.json();
    return json?.data ?? json;
};

export const postAudioToSession = async (sessionId: string, fileUri: string): Promise<void> => {
    await apiClient.request(`/sessions/${sessionId}/audio` as any, {
        method: 'POST',
        body: { file_path: fileUri },
    });
};

export const triggerTranscription = async (sessionId: string): Promise<string> => {
    const res = await apiClient.request<{ job_id: string }>(`/sessions/${sessionId}/transcribe` as any, {
        method: 'POST',
    });
    return (res as any)?.job_id ?? '';
};

// NOTE: postSessionNote is intentionally NOT added here.
// The existing saveClinicalNote(sessionId, text) already covers this —
// use that in SessionHubScreen (imported as: import { saveClinicalNote } from '../services/api/sessions')
```

- [ ] **Step 2: Wrap AppNavigator with NotificationsProvider in App.js**

Open `App.js`. At the top, add the import:

```js
import { NotificationsProvider } from './src/contexts/NotificationsContext';
```

Find line ~163 where `role === 'psychologist'` renders `<AppNavigator />` and wrap it:

```js
// BEFORE:
{role === 'psychologist' ? (
  <AppNavigator />
) : (

// AFTER:
{role === 'psychologist' ? (
  <NotificationsProvider>
    <AppNavigator />
  </NotificationsProvider>
) : (
```

No `setSessionToken` changes needed — `NotificationsContext` reads `EXPO_PUBLIC_API_URL` directly and the token is passed to the polling fetch via `authTokenRef`. Token syncing can be wired later when real auth is added.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/ethos-mobile
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-mobile/src/services/api/sessions.ts apps/ethos-mobile/App.js
git commit -m "feat(mobile): wire NotificationsProvider into app root and add job/note API helpers"
```

---

## Task 3: AppNavigator — add 4 new routes

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Add imports for new screens**

At the top of `AppNavigator.tsx`, add:

```tsx
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
```

(These files don't exist yet — TypeScript will complain until Tasks 4-6 are done. That's OK.)

- [ ] **Step 2: Add routes to the Stack Navigator**

Find the `Stack.Navigator` that contains `Login`, `MainTabs`, `SessionHub`, etc. Add 4 new `Stack.Screen` entries:

```tsx
<Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
<Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
<Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} options={{ headerShown: false }} />
<Stack.Screen name="Finance" component={FinanceScreen} options={{ headerShown: false }} />
```

`FinanceScreen` is already imported in `AppNavigator.tsx` — verify it's there; if not, add:
```tsx
import FinanceScreen from '../screens/FinanceScreen';
```

- [ ] **Step 3: Commit (placeholder — screens created in following tasks)**

```bash
git add apps/ethos-mobile/src/navigation/AppNavigator.tsx
git commit -m "feat(mobile): register Search, Notifications, DocumentDetail, Finance routes"
```

---

## Task 4: SearchScreen

**Files:**
- Create: `src/screens/SearchScreen.tsx`

- [ ] **Step 1: Create SearchScreen**

```tsx
// src/screens/SearchScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, useColorScheme,
} from 'react-native';
import { ChevronLeft, Search, FileText, Users, Calendar } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';

// ─── Mock data (same shape used by PatientsScreen and DocumentsScreen) ──────
const MOCK_PATIENTS = [
  { id: 'p1', name: 'Beatriz Mendonça', lastSession: 'Sessão #12' },
  { id: 'p2', name: 'João Silva', lastSession: 'Sessão #8' },
  { id: 'p3', name: 'Maria Antônia', lastSession: 'Sessão #3' },
  { id: 'p4', name: 'Carlos Mendes', lastSession: 'Sessão #5' },
  { id: 'p5', name: 'Roberto Santos', lastSession: 'Sessão #15' },
  { id: 'p6', name: 'Ana Paula', lastSession: 'Sessão #20' },
  { id: 'p7', name: 'Mariana Albuquerque', lastSession: 'Sessão #7' },
];

const MOCK_DOCUMENTS = [
  { id: 'd1', title: 'Prontuário - Mariana Albuquerque', patient: 'Mariana Albuquerque', status: 'assinado' as const, date: 'Hoje, 14:50', content: '' },
  { id: 'd2', title: 'Relatório Psicológico - João Silva', patient: 'João Silva', status: 'rascunho' as const, date: 'Ontem, 16:30', content: '' },
  { id: 'd3', title: 'Anamnese - Roberto Santos', patient: 'Roberto Santos', status: 'assinado' as const, date: '02 Mar, 10:00', content: '' },
  { id: 'd4', title: 'Evolução Clínica - Ana Paula', patient: 'Ana Paula', status: 'assinado' as const, date: '28 Fev, 15:20', content: '' },
];

const MOCK_SESSIONS = [
  { id: 's1', patientName: 'Beatriz Mendonça', time: 'Agora às 14:00', status: 'pending' },
  { id: 's2', patientName: 'Maria Antônia', time: '16:30 - 17:20', status: 'live' },
  { id: 's3', patientName: 'Carlos Mendes', time: '18:00 - 18:50', status: 'completed' },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function SearchScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const timerRef = React.useRef<any>(null);

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebounced(text), 300);
  }, []);

  const q = debounced.toLowerCase().trim();

  const results = useMemo(() => {
    if (!q) return null;
    return {
      patients: MOCK_PATIENTS.filter((p) => p.name.toLowerCase().includes(q)),
      documents: MOCK_DOCUMENTS.filter((d) => d.title.toLowerCase().includes(q) || d.patient.toLowerCase().includes(q)),
      sessions: MOCK_SESSIONS.filter((s) => s.patientName.toLowerCase().includes(q)),
    };
  }, [q]);

  const hasResults = results && (results.patients.length + results.documents.length + results.sessions.length) > 0;
  const primaryTeal = '#234e5c';
  const bg = isDark ? '#15171a' : '#fcfcfb';

  const SectionHeader = ({ label }: { label: string }) => (
    <Text style={[styles.sectionHeader, { color: theme.mutedForeground }]}>{label}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#1e2126' : '#f0f4f3', borderColor: theme.border }]}>
          <Search size={18} color={theme.mutedForeground} />
          <TextInput
            autoFocus
            style={[styles.input, { color: theme.foreground }]}
            placeholder="Buscar pacientes, documentos, sessões..."
            placeholderTextColor={theme.mutedForeground}
            value={query}
            onChangeText={handleChange}
          />
        </View>
      </View>

      {/* Body */}
      {!q ? (
        <View style={styles.emptyState}>
          <Search size={48} color={theme.mutedForeground} style={{ opacity: 0.3 }} />
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Digite para buscar pacientes,{'\n'}documentos ou sessões
          </Text>
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Nenhum resultado para "{debounced}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {results!.patients.length > 0 && (
                <>
                  <SectionHeader label="PACIENTES" />
                  {results!.patients.map((p) => (
                    <TouchableOpacity key={p.id} style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate('MainTabs', { screen: 'Patients' })}>
                      <Users size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{p.name}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>{p.lastSession}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {results!.documents.length > 0 && (
                <>
                  <SectionHeader label="DOCUMENTOS" />
                  {results!.documents.map((d) => (
                    <TouchableOpacity key={d.id} style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate('DocumentDetail', { document: d })}> {/* DocumentDetail is a stack screen — direct navigate OK */}
                      <FileText size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{d.title}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>{d.date}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {results!.sessions.length > 0 && (
                <>
                  <SectionHeader label="SESSÕES" />
                  {results!.sessions.map((s) => (
                    <TouchableOpacity key={s.id} style={[styles.item, { borderColor: theme.border }]}
                      onPress={() => navigation.navigate('SessionHub', { patientName: s.patientName, time: s.time, sessionId: s.id, status: s.status })}>
                      <Calendar size={18} color={primaryTeal} />
                      <View style={styles.itemText}>
                        <Text style={[styles.itemTitle, { color: theme.foreground }]}>{s.patientName}</Text>
                        <Text style={[styles.itemSub, { color: theme.mutedForeground }]}>{s.time}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  backBtn: { padding: 4 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, height: 48, gap: 10 },
  input: { flex: 1, fontSize: 16, fontFamily: 'Inter' },
  sectionHeader: { fontSize: 11, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, gap: 14 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: '600' },
  itemSub: { fontSize: 13, fontFamily: 'Inter', marginTop: 2 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, fontFamily: 'Inter', textAlign: 'center', lineHeight: 24 },
});
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/ethos-mobile && npx tsc --noEmit 2>&1 | grep "SearchScreen" | head -10
```

Expected: no errors for SearchScreen.

- [ ] **Step 3: Commit**

```bash
git add apps/ethos-mobile/src/screens/SearchScreen.tsx
git commit -m "feat(mobile): add SearchScreen with debounced search across patients/docs/sessions"
```

---

## Task 5: NotificationsScreen

**Files:**
- Create: `src/screens/NotificationsScreen.tsx`

- [ ] **Step 1: Create NotificationsScreen**

```tsx
// src/screens/NotificationsScreen.tsx
import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, useColorScheme, Alert,
} from 'react-native';
import { ChevronLeft, CheckCircle, Clock, CreditCard } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import { useNotifications, AppNotification } from '../contexts/NotificationsContext';

const ICON_MAP = {
  prontuario_gerado: { Icon: CheckCircle, color: '#22c55e' },
  sessao_pendente: { Icon: Clock, color: '#f97316' },
  pagamento: { Icon: CreditCard, color: '#00ccdb' },
};

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  const { Icon, color } = ICON_MAP[item.type];

  return (
    <TouchableOpacity
      style={[styles.item, { backgroundColor: isDark ? '#1e2126' : '#fff', borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.iconWrapper, { backgroundColor: `${color}20` }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.foreground }]}>{item.title}</Text>
        <Text style={[styles.body, { color: theme.mutedForeground }]}>{item.body}</Text>
        <Text style={[styles.time, { color: theme.mutedForeground }]}>
          {item.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: '#00ccdb' }]} />}
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const { notifications, markAllRead } = useNotifications();
  const primaryTeal = '#234e5c';

  useEffect(() => {
    markAllRead();
  }, [markAllRead]);

  const handlePress = (n: AppNotification) => {
    if (n.type === 'prontuario_gerado' && n.document) {
      navigation.navigate('DocumentDetail', { document: n.document });
    } else {
      Alert.alert(n.title, n.body);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: primaryTeal }]}>Notificações</Text>
        <View style={{ width: 36 }} />
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.mutedForeground }]}>
            Nenhuma notificação por enquanto
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => <NotificationItem item={item} onPress={() => handlePress(item)} />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter', fontWeight: '700' },
  list: { paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 6, padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  iconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 15, fontFamily: 'Inter', fontWeight: '700', marginBottom: 2 },
  body: { fontSize: 13, fontFamily: 'Inter' },
  time: { fontSize: 12, fontFamily: 'Inter', marginTop: 4, opacity: 0.7 },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: 'Inter' },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/screens/NotificationsScreen.tsx
git commit -m "feat(mobile): add NotificationsScreen with unread dots and prontuário tap"
```

---

## Task 6: DocumentDetailScreen

**Files:**
- Create: `src/screens/DocumentDetailScreen.tsx`

- [ ] **Step 1: Create DocumentDetailScreen**

```tsx
// src/screens/DocumentDetailScreen.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, useColorScheme, Alert,
} from 'react-native';
import { ChevronLeft, FileText, Download } from 'lucide-react-native';
import { useTheme } from '../hooks/useTheme';
import type { DocumentItem } from '../contexts/NotificationsContext';

export default function DocumentDetailScreen({ navigation, route }: any) {
  const document: DocumentItem = route.params?.document;
  const isDark = useColorScheme() === 'dark';
  const theme = useTheme();
  const primaryTeal = '#234e5c';

  if (!document) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View style={styles.empty}>
          <Text style={{ color: theme.mutedForeground }}>Documento não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isRascunho = document.status === 'rascunho';
  const statusColor = isRascunho ? '#f97316' : '#22c55e';
  const statusLabel = isRascunho ? 'RASCUNHO' : 'ASSINADO';

  // Parse content into sections if it contains "##" headers; otherwise treat as plain text
  const sections = document.content?.includes('##')
    ? document.content.split(/^##\s+/m).filter(Boolean).map((block) => {
        const [heading, ...rest] = block.split('\n');
        return { heading: heading.trim(), body: rest.join('\n').trim() };
      })
    : [{ heading: 'Conteúdo', body: document.content ?? 'Sem conteúdo disponível.' }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={primaryTeal} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: primaryTeal }]} numberOfLines={1}>{document.title}</Text>
          <Text style={[styles.headerSub, { color: theme.mutedForeground }]}>{document.patient} · {document.date}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.iconRow]}>
          <FileText size={32} color={primaryTeal} />
        </View>

        {sections.map((s, i) => (
          <View key={i} style={[styles.section, { borderColor: theme.border }]}>
            <Text style={[styles.sectionHeading, { color: primaryTeal }]}>{s.heading}</Text>
            <Text style={[styles.sectionBody, { color: theme.foreground }]}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Footer actions */}
      <View style={[styles.footer, { borderColor: theme.border, backgroundColor: isDark ? '#15171a' : '#fcfcfb' }]}>
        {isRascunho && (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: primaryTeal }]}
            onPress={() => Alert.alert('Assinatura digital em breve')}
          >
            <Text style={styles.primaryBtnText}>Assinar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: theme.border }]}
          onPress={() => Alert.alert('Exportação em breve')}
        >
          <Download size={18} color={primaryTeal} />
          <Text style={[styles.secondaryBtnText, { color: primaryTeal }]}>Exportar PDF</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  headerSub: { fontSize: 12, fontFamily: 'Inter', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: 'Inter', fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  iconRow: { alignItems: 'center', paddingVertical: 24 },
  section: { borderWidth: 1, borderRadius: 16, padding: 20, marginBottom: 16 },
  sectionHeading: { fontSize: 14, fontFamily: 'Inter', fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionBody: { fontSize: 15, fontFamily: 'Inter', lineHeight: 24 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, borderTopWidth: 1, gap: 12 },
  primaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter', fontWeight: '700' },
  secondaryBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, flexDirection: 'row', gap: 8 },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Inter', fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/ethos-mobile/src/screens/DocumentDetailScreen.tsx
git commit -m "feat(mobile): add DocumentDetailScreen with section parser and sign/export stubs"
```

---

## Task 7: Wire DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add imports**

At the top of `DashboardScreen.tsx`, add:

```tsx
import { useNotifications } from '../contexts/NotificationsContext';
```

- [ ] **Step 2: Read unreadCount from context**

Inside the component function, add:

```tsx
const { unreadCount } = useNotifications();
```

- [ ] **Step 3: Wire the header icons**

Find the search icon (`TouchableOpacity` with no `onPress`) and add:
```tsx
onPress={() => navigation.navigate('Search')}
```

Find the bell icon (`TouchableOpacity` with no `onPress`) and add:
```tsx
onPress={() => navigation.navigate('Notifications')}
```

On the bell icon's `View`, add a badge overlay when `unreadCount > 0`:
```tsx
{unreadCount > 0 && (
  <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 }}>
    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
  </View>
)}
```

- [ ] **Step 4: Wire alert cards**

Find the "Laudos Atrasados" `TouchableOpacity` alert card and add:
```tsx
onPress={() => navigation.navigate('Documents', { filter: 'rascunhos' })}
```

Find the "Pagamentos" `TouchableOpacity` alert card and add:
```tsx
onPress={() => navigation.navigate('Finance')}
```

- [ ] **Step 5: Wire "Ver agenda" link**

Find the "Ver agenda" `TouchableOpacity` (in the "Próxima Sessão" section header) and add:
```tsx
// Dashboard is a tab — navigating to another tab in the same navigator works with just the tab name
onPress={() => navigation.navigate('Schedule')}
```

- [ ] **Step 6: Wire "Ver Prontuário" button**

Find the "VER PRONTUÁRIO" `TouchableOpacity` inside the session card and update its `onPress`:
```tsx
onPress={() => navigation.navigate('Documents', { showBack: true, patientId: 'p1' })}
```

- [ ] **Step 7: Commit**

```bash
git add apps/ethos-mobile/src/screens/DashboardScreen.tsx
git commit -m "feat(mobile): wire all dead elements in DashboardScreen + bell badge"
```

---

## Task 8: Wire ScheduleScreen

**Files:**
- Modify: `src/screens/ScheduleScreen.tsx`

- [ ] **Step 1: Rename "AO VIVO" to "EM ANDAMENTO"**

Search for the string `'AO VIVO'` (or `"AO VIVO"`) in `ScheduleScreen.tsx` and replace with `'EM ANDAMENTO'`.

- [ ] **Step 2: Wire search icon**

Find the header search `TouchableOpacity` (no `onPress`) and add:
```tsx
onPress={() => navigation.navigate('Search')}
```

- [ ] **Step 3: Wire bell icon**

Find the header bell `TouchableOpacity` (no `onPress`) and add:
```tsx
onPress={() => navigation.navigate('Notifications')}
```

- [ ] **Step 4: Wire "Ver Prontuário" footer links on session cards**

Find the "Ver Prontuário" footer link inside session card renders. The current code likely renders it as a `Text` or `TouchableOpacity` without `onPress`. Add:
```tsx
onPress={() => navigation.navigate('Documents', { showBack: true })}
```

- [ ] **Step 5: Add calendar icon handler**

Find the calendar icon `TouchableOpacity` in the header area of ScheduleScreen. Currently has no `onPress`. Add state for the modal and a simple month-view bottom sheet:

```tsx
// Add state at top of component:
const [showCalendar, setShowCalendar] = useState(false);

// Add onPress to calendar icon:
onPress={() => setShowCalendar(true)}

// Add modal at the end of the JSX (before closing SafeAreaView):
<Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
  <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowCalendar(false)} />
  <View style={{ backgroundColor: isDark ? '#1e2126' : '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, marginTop: -24 }}>
    <Text style={{ fontSize: 18, fontFamily: 'Inter', fontWeight: '700', color: primaryTeal, marginBottom: 16, textAlign: 'center' }}>
      Março 2024
    </Text>
    <Text style={{ fontSize: 14, fontFamily: 'Inter', color: theme.mutedForeground, textAlign: 'center', lineHeight: 22 }}>
      Calendário completo em breve.{'\n'}Por enquanto, use a barra semanal acima.
    </Text>
    <TouchableOpacity onPress={() => setShowCalendar(false)} style={{ marginTop: 24, backgroundColor: primaryTeal, borderRadius: 16, height: 52, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontFamily: 'Inter', fontWeight: '700' }}>Fechar</Text>
    </TouchableOpacity>
  </View>
</Modal>
```

Add `Modal` to the React Native imports at the top.

- [ ] **Step 6: Commit**

```bash
git add apps/ethos-mobile/src/screens/ScheduleScreen.tsx
git commit -m "feat(mobile): wire ScheduleScreen — rename badge, wire icons, add calendar modal"
```

---

## Task 9: Wire DocumentsScreen

**Files:**
- Modify: `src/screens/DocumentsScreen.tsx`

- [ ] **Step 1: Read route params on mount**

At the top of the component function, after existing state declarations, add:

```tsx
// Apply filter from navigation params (e.g. from "Laudos Atrasados" alert card)
useEffect(() => {
  const paramFilter = route.params?.filter;
  if (paramFilter) setFilter(paramFilter);
}, [route.params?.filter]);
```

Make sure `route` is destructured from props: `export default function DocumentsScreen({ navigation, route }: any)`.

- [ ] **Step 2: Add back button when showBack param is true**

Find the header section. Add a conditional back button:

```tsx
{route.params?.showBack && (
  <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginRight: 8 }}>
    <ChevronLeft size={24} color={primaryTeal} />
  </TouchableOpacity>
)}
```

Import `ChevronLeft` from `lucide-react-native` if not already imported.

- [ ] **Step 3: Wire document cards**

Find where document items are rendered (the `TouchableOpacity` or `View` for each document). Add `onPress` to navigate to `DocumentDetail`:

```tsx
onPress={() => navigation.navigate('DocumentDetail', { document: item })}
```

The `item` shape must match `DocumentItem` from `NotificationsContext`. The existing mock data in DocumentsScreen likely has `id`, `title`, `patient`/`name`, `status`, `date` fields — verify the field names match and rename if needed.

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-mobile/src/screens/DocumentsScreen.tsx
git commit -m "feat(mobile): wire DocumentsScreen — filter param, back button, document card nav"
```

---

## Task 10: SessionHubScreen — 3-tab redesign

**Files:**
- Modify: `src/screens/SessionHubScreen.tsx`

This is the largest change. Replace the existing file completely.

- [ ] **Step 1: Install expo-document-picker**

```bash
cd apps/ethos-mobile
npm install expo-document-picker@~13.0.3 --legacy-peer-deps
```

Expected: package added to `package.json`.

- [ ] **Step 2: Rewrite SessionHubScreen**

Replace the entire content of `SessionHubScreen.tsx`:

```tsx
// src/screens/SessionHubScreen.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, Alert, TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Mic, MicOff, Play, Pause, Square, Trash2, Upload, FileText, Send, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../hooks/useTheme';
import { useNotifications } from '../contexts/NotificationsContext';
import { postAudioToSession, triggerTranscription, saveClinicalNote } from '../services/api/sessions';

type Tab = 'record' | 'upload' | 'write';

// ─── Waveform dots ────────────────────────────────────────────────────────────
function Waveform({ active }: { active: boolean }) {
  const dots = Array.from({ length: 24 }, (_, i) => i);
  return (
    <View style={waveStyles.row}>
      {dots.map((i) => (
        <Animated.View
          key={i}
          style={[waveStyles.dot, {
            height: active ? 4 + Math.random() * 28 : 4,
            opacity: active ? 0.6 + Math.random() * 0.4 : 0.3,
          }]}
        />
      ))}
    </View>
  );
}
const waveStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 40 },
  dot: { width: 3, backgroundColor: '#00f2ff', borderRadius: 2 },
});

// ─── Tab: Gravar ──────────────────────────────────────────────────────────────
function RecordTab({ onReady }: { onReady: (uri: string) => void }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [doneUri, setDoneUri] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const intervalRef = useRef<any>(null);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Permissão negada', 'Habilite o microfone nas configurações.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setIsRecording(true);
      setIsPaused(false);
      setDoneUri(null);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (e) {
      Alert.alert('Erro ao iniciar gravação');
    }
  };

  const pauseResume = async () => {
    if (!recording) return;
    if (isPaused) { await recording.startAsync(); setIsPaused(false); intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000); }
    else { await recording.pauseAsync(); setIsPaused(true); clearInterval(intervalRef.current); }
  };

  const stopRecording = async () => {
    if (!recording) return;
    clearInterval(intervalRef.current);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    setIsRecording(false);
    setIsPaused(false);
    if (uri) { setDoneUri(uri); onReady(uri); }
  };

  const discard = () => {
    clearInterval(intervalRef.current);
    setRecording(null); setIsRecording(false); setIsPaused(false); setDuration(0); setDoneUri(null);
    onReady('');
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <View style={tabStyles.container}>
      <View style={[tabStyles.badge, { backgroundColor: 'rgba(0,242,255,0.1)' }]}>
        <Text style={tabStyles.badgeText}>🔒 ENCRYPTION ACTIVE</Text>
      </View>

      <Text style={tabStyles.timer}>{fmt(duration)}</Text>
      <Text style={tabStyles.timerLabel}>
        {doneUri ? 'GRAVAÇÃO CONCLUÍDA' : isRecording ? (isPaused ? 'PAUSADO' : 'GRAVANDO...') : 'PRONTO PARA INICIAR'}
      </Text>

      <Waveform active={isRecording && !isPaused} />

      <View style={tabStyles.controls}>
        <TouchableOpacity style={tabStyles.iconBtn} onPress={discard}>
          <Trash2 size={22} color={duration > 0 ? '#ef4444' : '#666'} />
        </TouchableOpacity>

        {!isRecording && !doneUri ? (
          <TouchableOpacity style={tabStyles.mainBtn} onPress={startRecording}>
            <Play size={28} color="#fff" />
          </TouchableOpacity>
        ) : isRecording ? (
          <>
            <TouchableOpacity style={tabStyles.mainBtn} onPress={pauseResume}>
              {isPaused ? <Play size={28} color="#fff" /> : <Pause size={28} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={tabStyles.iconBtn} onPress={stopRecording}>
              <Square size={22} color="#00f2ff" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={[tabStyles.mainBtn, { backgroundColor: '#22c55e' }]}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓ OK</Text>
          </View>
        )}

        <TouchableOpacity style={tabStyles.iconBtn} onPress={() => setMicEnabled((m) => !m)}>
          {micEnabled ? <Mic size={22} color="#00f2ff" /> : <MicOff size={22} color="#666" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Tab: Enviar Áudio ────────────────────────────────────────────────────────
function UploadTab({ onReady }: { onReady: (uri: string) => void }) {
  const [file, setFile] = useState<{ name: string; uri: string } | null>(null);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a'] });
    if (res.canceled) return;
    const asset = res.assets?.[0];
    if (asset) { setFile({ name: asset.name, uri: asset.uri }); onReady(asset.uri); }
  };

  return (
    <View style={tabStyles.container}>
      <TouchableOpacity style={uploadStyles.area} onPress={pick}>
        <Upload size={48} color="#00f2ff" style={{ opacity: 0.7 }} />
        <Text style={uploadStyles.label}>Toque para selecionar arquivo de áudio</Text>
        <Text style={uploadStyles.formats}>.m4a · .mp3 · .wav</Text>
      </TouchableOpacity>
      {file && (
        <View style={uploadStyles.fileRow}>
          <FileText size={18} color="#00f2ff" />
          <Text style={uploadStyles.fileName} numberOfLines={1}>{file.name}</Text>
          <TouchableOpacity onPress={() => { setFile(null); onReady(''); }}>
            <Trash2 size={16} color='#ef4444' />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const uploadStyles = StyleSheet.create({
  area: { borderWidth: 2, borderColor: '#00f2ff40', borderStyle: 'dashed', borderRadius: 24, paddingVertical: 48, alignItems: 'center', gap: 14, marginTop: 24 },
  label: { color: '#fff', fontFamily: 'Inter', fontSize: 16, textAlign: 'center', opacity: 0.8 },
  formats: { color: '#00f2ff', fontFamily: 'Inter', fontSize: 13, opacity: 0.6 },
  fileRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10, backgroundColor: 'rgba(0,242,255,0.08)', padding: 14, borderRadius: 12 },
  fileName: { flex: 1, color: '#fff', fontFamily: 'Inter', fontSize: 14 },
});

// ─── Tab: Escrever ────────────────────────────────────────────────────────────
function WriteTab({ onReady }: { onReady: (text: string) => void }) {
  const [text, setText] = useState('');
  return (
    <View style={{ flex: 1, paddingTop: 16 }}>
      <TextInput
        style={writeStyles.input}
        multiline
        placeholder="Descreva a sessão com suas próprias palavras..."
        placeholderTextColor="#666"
        value={text}
        onChangeText={(t) => { setText(t); onReady(t.length >= 20 ? t : ''); }}
        textAlignVertical="top"
      />
      <Text style={writeStyles.counter}>{text.length} caracteres{text.length < 20 && text.length > 0 ? ` (mín. 20)` : ''}</Text>
    </View>
  );
}
const writeStyles = StyleSheet.create({
  input: { flex: 1, color: '#fff', fontFamily: 'Inter', fontSize: 16, lineHeight: 26, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, minHeight: 200 },
  counter: { color: '#666', fontFamily: 'Inter', fontSize: 12, textAlign: 'right', marginTop: 8 },
});

const tabStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: 32, gap: 16 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  badgeText: { color: '#00f2ff', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 1 },
  timer: { fontSize: 72, color: '#fff', fontFamily: 'Inter', fontWeight: '200', letterSpacing: -2 },
  timerLabel: { color: '#666', fontSize: 12, fontFamily: 'Inter', fontWeight: '700', letterSpacing: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 16 },
  mainBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#234e5c', justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SessionHubScreen({ navigation, route }: any) {
  const { patientName = 'Paciente', time = '', sessionId, status } = route.params ?? {};
  const { addNotification, addPendingJob } = useNotifications();
  const [activeTab, setActiveTab] = useState<Tab>('record');
  const [payload, setPayload] = useState('');   // uri for record/upload, text for write
  const [sending, setSending] = useState(false);
  const theme = useTheme();
  const primaryTeal = '#234e5c';

  const canSend = payload.length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    try {
      if (activeTab === 'write') {
        if (sessionId) {
          try { await saveClinicalNote(sessionId, payload); } catch { Alert.alert('Erro ao salvar. Tente novamente.'); setSending(false); return; }
        }
        addNotification({ type: 'prontuario_gerado', title: 'Prontuário salvo', body: patientName,
          document: { id: `doc-${Date.now()}`, title: `Sessão — ${patientName}`, patient: patientName, status: 'rascunho', date: new Date().toLocaleDateString('pt-BR'), content: payload } });
        navigation.goBack();
        return;
      }

      // Record or Upload — post audio then transcribe
      let jobId = '';
      if (sessionId) {
        try { await postAudioToSession(sessionId, payload); }
        catch { Alert.alert('Erro ao enviar áudio. Tente novamente.'); setSending(false); return; }

        try { jobId = await triggerTranscription(sessionId); }
        catch { Alert.alert('Áudio salvo, mas transcrição falhou. Você será notificado quando disponível.'); }
      }

      addPendingJob({ jobId, patientName, sessionId: sessionId ?? '' });
      navigation.goBack();
    } finally {
      setSending(false);
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'record', label: '🎙️ Gravar' },
    { key: 'upload', label: '📁 Áudio' },
    { key: 'write', label: '✍️ Texto' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.patientName}>{patientName}</Text>
          {time ? <Text style={styles.sessionTime}>{time}</Text> : null}
        </View>
        <TouchableOpacity style={styles.moreBtn}>
          <MoreVertical size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => { setActiveTab(t.key); setPayload(''); }}>
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'record' && <RecordTab onReady={setPayload} />}
        {activeTab === 'upload' && <UploadTab onReady={setPayload} />}
        {activeTab === 'write' && <WriteTab onReady={setPayload} />}
      </View>

      {/* Send button */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={handleSend} disabled={!canSend}>
          {sending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Send size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Enviar para prontuário</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0f12' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  patientName: { color: '#fff', fontSize: 17, fontFamily: 'Inter', fontWeight: '700', textAlign: 'center' },
  sessionTime: { color: '#666', fontSize: 13, fontFamily: 'Inter', textAlign: 'center', marginTop: 2 },
  moreBtn: { padding: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#234e5c' },
  tabText: { color: '#666', fontFamily: 'Inter', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  footer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12 },
  sendBtn: { height: 64, borderRadius: 20, backgroundColor: '#234e5c', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Inter', fontWeight: '700' },
});
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/ethos-mobile && npx tsc --noEmit 2>&1 | grep "SessionHubScreen\|NotificationsContext" | head -20
```

Fix any type errors before committing.

- [ ] **Step 4: Commit**

```bash
git add apps/ethos-mobile/src/screens/SessionHubScreen.tsx apps/ethos-mobile/package.json
git commit -m "feat(mobile): redesign SessionHubScreen with 3-tab documentation modes + transcription pipeline"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd apps/ethos-mobile && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -40
```

Fix any remaining errors.

- [ ] **Step 2: Start web and verify manually**

```bash
cd apps/ethos-mobile && npx expo start --web --clear
```

Verify in browser (`localhost:8082` or `8081`):
- [ ] Dashboard bell icon navigates to Notifications screen
- [ ] Dashboard search icon navigates to Search screen
- [ ] "Laudos Atrasados" card navigates to Docs with "Rascunhos" tab pre-selected
- [ ] "Pagamentos" card navigates to Finance screen
- [ ] "Ver Prontuário" shows back button in Documents screen
- [ ] Clicking a document card opens DocumentDetailScreen
- [ ] "AO VIVO" no longer appears in Agenda — shows "EM ANDAMENTO"
- [ ] Calendar icon in Agenda opens bottom sheet modal
- [ ] SessionHub shows 3 tabs (Gravar / Áudio / Texto)
- [ ] "Enviar para prontuário" is disabled until content is ready
- [ ] After sending, navigates back and bell shows badge

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(mobile): complete navigation wiring, SessionHub redesign, new screens — all dead stubs resolved"
```
