# Mobile App — Navigation Fixes + SessionHub Redesign + New Screens
**Date:** 2026-03-26
**Status:** Approved
**Scope:** ethos-mobile (`apps/ethos-mobile/src`)

---

## Problem

The mobile app was built as a UI mockup. Most interactive elements (alert cards, icons, document cards, patient cards, calendar icon) have no handlers. The SessionHub recording screen exists but cannot produce prontuários. Users cannot navigate to Search, Notifications, or document details.

---

## Goals

1. Wire up all dead navigation stubs
2. Redesign SessionHub as a 3-mode session documentation tool
3. Add three new screens: Search, Notifications, DocumentDetail
4. Connect recording/upload/text flow to backend transcription pipeline
5. Async notification when prontuário is generated

---

## Section 1: Navigation & Routing Changes

### AppNavigator additions
New stack routes added alongside existing ones:
- `SearchScreen` — global search across patients, documents, sessions
- `NotificationsScreen` — list of system notifications with unread badge
- `DocumentDetailScreen` — full document viewer with sign/export actions
- `FinanceScreen` — already exists as a component, now reachable via routing

### Dead element fixes

| Element | Location | Fix |
|---|---|---|
| "Laudos Atrasados" alert card | DashboardScreen | `navigation.navigate('Documents', { filter: 'rascunhos' })` and DocumentsScreen reads `route.params?.filter` on mount to set active filter |
| "Pagamentos" alert card | DashboardScreen | `navigation.navigate('Finance')` |
| 🔍 Search icon (header) | DashboardScreen, AgendaScreen | `navigation.navigate('Search')` |
| 🔔 Bell icon (header) | DashboardScreen, AgendaScreen | `navigation.navigate('Notifications')` |
| "Ver Prontuário" (session card) | DashboardScreen | `navigation.navigate('Documents', { patientId, showBack: true })` |
| "Ver agenda" link | DashboardScreen | `navigation.navigate('Schedule')` via tab |
| Document cards | DocumentsScreen | `navigation.navigate('DocumentDetail', { document })` |
| Back button in Documents | DocumentsScreen | Show `navigation.goBack()` button when `route.params?.showBack` is true |
| 📅 Calendar icon | ScheduleScreen | Open inline month-view bottom sheet modal |
| "AO VIVO" badge | ScheduleScreen | Renamed to "EM ANDAMENTO" |
| "Ver Prontuário" footer | ScheduleScreen session cards | `navigation.navigate('Documents', { patientId, showBack: true })` |
| "Ver agenda" in dashboard header | DashboardScreen | Navigate to Schedule tab |

### DocumentsScreen filter behaviour
`DocumentsScreen` already has local `filter` state (`'todos' | 'assinados' | 'rascunhos' | 'modelos'`). On mount, read `route.params?.filter` and call `setFilter(route.params.filter)` if present. This makes the Laudos Atrasados shortcut pre-select the correct tab.

---

## Section 2: SessionHub Redesign

### Route params contract
`SessionHubScreen` receives `route.params`:
```ts
{
  patientName: string;
  time: string;
  sessionId?: string;   // present when navigated from real session; used for API calls
  status?: string;
}
```
When `sessionId` is absent (mock/demo flow), API calls are skipped and the flow goes directly to adding a local notification.

### Layout
Full-screen dark modal with 3 tabs at top and a shared "Enviar para prontuário" CTA at the bottom.

```
┌─────────────────────────────────────────┐
│  ← [Patient Name]   [Session #]     ⋮  │
├─────────────────────────────────────────┤
│  [ 🎙️ Gravar ]  [ 📁 Áudio ]  [ ✍️ Texto ]  │
├─────────────────────────────────────────┤
│              TAB CONTENT                │
├─────────────────────────────────────────┤
│      [ Enviar para prontuário ]         │
└─────────────────────────────────────────┘
```

### Tab 1 — Gravar (Record)
- Keep existing dark timer + waveform UI
- Fix mic toggle handler (`setIsMicEnabled` state)
- Play/Pause, Stop, Delete buttons already partially implemented — complete them
- "Enviar" activates after Stop is pressed and recording duration > 0
- Audio stored locally via `expo-av`, URI passed to backend

### Tab 2 — Enviar Áudio (Upload)
- Large tap target: "Toque para selecionar arquivo de áudio"
- Accepted formats: `.m4a`, `.mp3`, `.wav` (`.ogg` excluded — not supported on iOS by AVFoundation)
- Uses `expo-document-picker`
- After pick: shows filename
- "Enviar" activates after file is selected

### Tab 3 — Escrever (Write)
- Multiline `TextInput`, placeholder: "Descreva a sessão com suas próprias palavras..."
- Character counter bottom-right
- No transcription step — text goes directly to report template
- "Enviar" activates when text length > 20 characters

### "Enviar para prontuário" flow (Tabs 1 and 2)
1. Show loading state on "Enviar" button ("Enviando...")
2. If `sessionId` present: `POST /sessions/:sessionId/audio` with `{ file_path: localUri }`
   - On failure: show Alert "Erro ao enviar áudio. Tente novamente." — **do not proceed to step 3**
3. If `sessionId` present: `POST /sessions/:sessionId/transcribe`
   - On failure: show Alert "Áudio salvo, mas transcrição falhou. Tente novamente mais tarde." — proceed to step 4 with `job_id = null`
4. Call `addPendingJob({ jobId, patientName, sessionId })` on `NotificationsContext`
5. `navigation.goBack()`

### "Enviar para prontuário" flow (Tab 3 — text)
1. If `sessionId` present: `POST /sessions/:sessionId/notes` with `{ content: text }`
   - On failure: show Alert "Erro ao salvar. Tente novamente." — do not navigate
2. Call `addNotification({ type: 'prontuario_gerado', title: 'Prontuário salvo', body: patientName, document: mockDocument })`
3. `navigation.goBack()`

---

## Section 3: New Screens

### SearchScreen
**Route:** `Search`
**Entry:** Header 🔍 icon on Dashboard and Agenda

- Full-screen with auto-focused `TextInput` at top + back button (`navigation.goBack()`)
- Search triggered on each keystroke with 300ms debounce
- Searches 3 categories: Pacientes, Documentos, Sessões
- Results grouped by category with section headers
- Empty state shown when query ≥ 1 character and no results found: "Nenhum resultado para '[query]'"
- Initial state (empty query): show "Digite para buscar pacientes, documentos ou sessões"
- Tap patient → `Alert.alert('Em breve')` (future)
- Tap document → `navigation.navigate('DocumentDetail', { document })`
- Tap session → `navigation.navigate('SessionHub', { ...session })` — passes `sessionId` from session object
- Data: filters from same mock arrays used by PatientsScreen and DocumentsScreen

### NotificationsScreen
**Route:** `Notifications`
**Entry:** Header 🔔 icon on Dashboard and Agenda

- List of notification items, newest first
- Each item: icon + title + body + timestamp + unread dot
- Notification types:
  - `prontuario_gerado` — ✅ green — "Prontuário gerado — [Patient Name]"
  - `sessao_pendente` — 🕐 orange — "Sessão pendente de documentação"
  - `pagamento` — 💰 teal — "Pagamento pendente — [amount]"
- On screen open: `markAllRead()` from context — clears badge count
- Tap `prontuario_gerado` → `navigation.navigate('DocumentDetail', { document: notification.document })` — the full `DocumentItem` object is stored on the notification (not just an ID)
- Tap other types → `Alert.alert('Em breve')` for now
- Empty state: "Nenhuma notificação por enquanto"
- State managed via `NotificationsContext` (React Context, no persistence needed for MVP)

### DocumentDetailScreen
**Route:** `DocumentDetail`
**Entry:** Document cards in DocumentsScreen, `prontuario_gerado` notification taps
**Params:** `{ document: DocumentItem }`

- Header: document title + patient name + status badge
- Back button: `navigation.goBack()`
- Scrollable body: formatted content sections (Queixa Principal, Evolução, Conduta)
  - If document has no structured content, show the raw `content` string in a styled block
- Footer actions:
  - "Assinar" button — shown only when `status === 'rascunho'` — `Alert.alert('Assinatura digital em breve')`
  - "Exportar PDF" — `Alert.alert('Exportação em breve')`
- Data: uses `document` param passed from DocumentsScreen or NotificationsScreen

---

## Architecture Notes

### NotificationsContext
New React Context at `src/shared/contexts/NotificationsContext.tsx`:

```ts
type DocumentItem = {
  id: string;
  title: string;
  patient: string;
  status: 'assinado' | 'rascunho';
  date: string;
  content?: string;
};

type Notification = {
  id: string;
  type: 'prontuario_gerado' | 'sessao_pendente' | 'pagamento';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  document?: DocumentItem;   // full object, not just ID — avoids lookup at nav time
};

type PendingJob = {
  jobId: string;
  patientName: string;
  sessionId: string;
};

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  addPendingJob: (job: PendingJob) => void;
  markAllRead: () => void;
};
```

Wrap `AppNavigator` with `NotificationsProvider` in `App.tsx`.

### Job Polling
Polling lives inside `NotificationsContext`, not in `SessionHubScreen`, so it survives navigation.

```ts
// Inside NotificationsProvider:
useEffect(() => {
  if (pendingJobs.length === 0) return;
  const interval = setInterval(async () => {
    for (const job of pendingJobs) {
      const res = await fetch(`${API_URL}/jobs/${job.jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.status === 'completed') {
        addNotification({
          type: 'prontuario_gerado',
          title: 'Prontuário gerado',
          body: job.patientName,
          document: data.document ?? mockDocument(job.patientName),
        });
        removePendingJob(job.jobId);
      } else if (data.status === 'failed') {
        addNotification({ type: 'sessao_pendente', title: 'Transcrição falhou', body: job.patientName });
        removePendingJob(job.jobId);
      }
    }
  }, 10_000);
  return () => clearInterval(interval);
}, [pendingJobs]);
```

### expo-document-picker
Add to `apps/ethos-mobile/package.json`:
```json
"expo-document-picker": "~13.0.3"
```
(SDK 53 compatible version)

---

## Files to Create
- `src/features/search/screens/SearchScreen.tsx`
- `src/features/notifications/screens/NotificationsScreen.tsx`
- `src/features/documents/screens/DocumentDetailScreen.tsx`
- `src/shared/contexts/NotificationsContext.tsx`

## Files to Modify
- `src/navigation/AppNavigator.tsx` — add 4 new routes + wrap with NotificationsProvider
- `src/App.tsx` — wrap with NotificationsProvider
- `src/features/home/screens/DashboardScreen.tsx` — wire all dead elements, show unread badge on bell
- `src/features/agenda/screens/ScheduleScreen.tsx` — wire dead elements, rename badge, add calendar modal
- `src/features/documents/screens/DocumentsScreen.tsx` — wire document cards, add back button logic, read `route.params?.filter` on mount
- `src/features/sessions/screens/SessionHubScreen.tsx` — full redesign with 3 tabs
- `apps/ethos-mobile/package.json` — add `expo-document-picker`

---

## Out of Scope (future)
- Real patient detail screen
- PDF export implementation
- Sign document with digital signature
- Finance screen interactivity
- Backend persistence for notifications
- Whisper model local installation guide
