# Ethos Mobile Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Ethos mobile app frontend into a feature-based structure with extracted data hooks, centralized theme, and a secure AuthContext — then fix the EAS Build Gradle error and generate a working development APK.

**Architecture:** Feature-based folders under `src/features/` with shared utilities in `src/shared/`. Data logic lives in hooks, screens render JSX only. AuthContext wraps AppNavigator for API-level auth; device-level password auth in App.js is preserved untouched.

**Tech Stack:** React Native 0.79, Expo SDK 53, expo-secure-store, react-native-reanimated 3.17, TypeScript, EAS Build

---

## File Map

### Files to CREATE
- `src/shared/hooks/useTheme.ts`
- `src/shared/hooks/useAuth.ts`
- `src/shared/hooks/useDashboard.ts`
- `src/shared/hooks/useSessions.ts`
- `src/shared/hooks/usePatients.ts`
- `src/features/dashboard/components/AlertCard.tsx`
- `src/features/dashboard/components/NextSessionCard.tsx`
- `src/features/dashboard/components/FinanceSummaryCard.tsx`
- `src/features/auth/types.ts`

### Files to MOVE (then update imports)
| From | To |
|------|----|
| `src/screens/LoginScreen.tsx` | `src/features/auth/screens/LoginScreen.tsx` |
| `src/screens/RegisterStep1Screen.tsx` | `src/features/auth/screens/RegisterStep1Screen.tsx` |
| `src/screens/RegisterStep2Screen.tsx` | `src/features/auth/screens/RegisterStep2Screen.tsx` |
| `src/screens/RecoverPasswordScreen.tsx` | `src/features/auth/screens/RecoverPasswordScreen.tsx` |
| `src/screens/EmailSentScreen.tsx` | `src/features/auth/screens/EmailSentScreen.tsx` |
| `src/screens/WelcomeOnboardingScreen.tsx` | `src/features/onboarding/screens/WelcomeOnboardingScreen.tsx` |
| `src/screens/DashboardScreen.tsx` | `src/features/dashboard/screens/DashboardScreen.tsx` |
| `src/screens/FinanceScreen.tsx` | `src/features/finance/screens/FinanceScreen.tsx` |
| `src/screens/PatientsScreen.tsx` | `src/features/patients/screens/PatientsScreen.tsx` |
| `src/screens/SessionHubScreen.tsx` | `src/features/sessions/screens/SessionHubScreen.tsx` |
| `src/screens/ScheduleScreen.tsx` | `src/features/sessions/screens/ScheduleScreen.tsx` |
| `src/screens/DocumentsScreen.tsx` | `src/features/documents/screens/DocumentsScreen.tsx` |
| `src/screens/SettingsScreen.tsx` | `src/features/settings/screens/SettingsScreen.tsx` |
| `src/components/GlassCard.tsx` | `src/shared/components/GlassCard.tsx` |
| `src/components/SplashLoading.tsx` | `src/shared/components/SplashLoading.tsx` |
| `src/components/SessionContextModal.tsx` | `src/features/sessions/components/SessionContextModal.tsx` |
| `src/services/api/httpClient.ts` | `src/shared/services/api/httpClient.ts` |
| `src/services/api/auth.ts` | `src/shared/services/api/auth.ts` |
| `src/services/api/sessions.ts` | `src/shared/services/api/sessions.ts` |
| `src/services/db/database.ts` | `src/shared/services/db/database.ts` |
| `src/theme/colors.ts` | `src/shared/theme/colors.ts` |
| `src/navigation/AppNavigator.tsx` | `src/shared/navigation/AppNavigator.tsx` |
| `src/assets/avatar_placeholder.ts` | `src/shared/assets/avatar_placeholder.ts` |

### Files to MODIFY
- `App.js` — update imports after moves; wrap `<AppNavigator />` with `<AuthProvider>`
- `src/shared/services/api/httpClient.ts` — fix `assertPathAndMethod` for dynamic paths; replace localStorage with no-op; add `setTokenProvider`/`setUnauthorizedHandler`
- `src/shared/services/api/auth.ts` — remove module-level `currentToken`; fix `login(email, password)`
- `src/shared/services/api/sessions.ts` — remove module-level `currentToken`; remove `as any`
- `src/shared/navigation/AppNavigator.tsx` — two-navigator pattern with `useAuth` + SplashLoading gate
- `src/features/sessions/screens/SessionHubScreen.tsx` — fix `useSharedValue` in map
- `src/features/dashboard/screens/DashboardScreen.tsx` — slim to JSX only, use hooks
- `apps/ethos-mobile/package.json` — align all packages to SDK 53

---

## Chunk 1: Phase A — Feature-Based Structure

### Task 1: Create folder structure

**Files:** Creates all `src/features/` and `src/shared/` directories

- [ ] **Step 1: Create all feature and shared directories**

```bash
cd apps/ethos-mobile
# features
mkdir -p src/features/auth/screens src/features/auth
mkdir -p src/features/onboarding/screens
mkdir -p src/features/dashboard/screens src/features/dashboard/components
mkdir -p src/features/finance/screens
mkdir -p src/features/patients/screens src/features/patients/components
mkdir -p src/features/sessions/screens src/features/sessions/components
mkdir -p src/features/documents/screens
mkdir -p src/features/settings/screens
# shared
mkdir -p src/shared/hooks src/shared/components src/shared/services/api src/shared/services/db src/shared/theme src/shared/navigation src/shared/assets
```

- [ ] **Step 2: Commit empty structure**

```bash
git add src/features src/shared
git commit -m "feat(mobile): create feature-based folder structure"
```

---

### Task 2: Move auth screens

**Files:**
- Move: `src/screens/Login*.tsx`, `src/screens/Register*.tsx`, `src/screens/RecoverPassword*.tsx`, `src/screens/EmailSent*.tsx`
- Create: `src/features/auth/types.ts`

- [ ] **Step 1: Copy auth screens to new location**

```bash
cp src/screens/LoginScreen.tsx         src/features/auth/screens/LoginScreen.tsx
cp src/screens/RegisterStep1Screen.tsx  src/features/auth/screens/RegisterStep1Screen.tsx
cp src/screens/RegisterStep2Screen.tsx  src/features/auth/screens/RegisterStep2Screen.tsx
cp src/screens/RecoverPasswordScreen.tsx src/features/auth/screens/RecoverPasswordScreen.tsx
cp src/screens/EmailSentScreen.tsx      src/features/auth/screens/EmailSentScreen.tsx
```

- [ ] **Step 2: Create `src/features/auth/types.ts`**

```ts
export type AuthUser = {
  id: string;
  email: string;
  role: 'psychologist' | 'admin';
};

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
```

- [ ] **Step 3: Delete old auth screen files**

```bash
rm src/screens/LoginScreen.tsx src/screens/RegisterStep1Screen.tsx src/screens/RegisterStep2Screen.tsx src/screens/RecoverPasswordScreen.tsx src/screens/EmailSentScreen.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(mobile/A): move auth screens to features/auth"
```

---

### Task 3: Move remaining screens

**Files:** All remaining screens to their feature folders

- [ ] **Step 1: Copy all remaining screens**

```bash
cp src/screens/WelcomeOnboardingScreen.tsx  src/features/onboarding/screens/WelcomeOnboardingScreen.tsx
cp src/screens/DashboardScreen.tsx          src/features/dashboard/screens/DashboardScreen.tsx
cp src/screens/FinanceScreen.tsx            src/features/finance/screens/FinanceScreen.tsx
cp src/screens/PatientsScreen.tsx           src/features/patients/screens/PatientsScreen.tsx
cp src/screens/SessionHubScreen.tsx         src/features/sessions/screens/SessionHubScreen.tsx
cp src/screens/ScheduleScreen.tsx           src/features/sessions/screens/ScheduleScreen.tsx
cp src/screens/DocumentsScreen.tsx          src/features/documents/screens/DocumentsScreen.tsx
cp src/screens/SettingsScreen.tsx           src/features/settings/screens/SettingsScreen.tsx
```

- [ ] **Step 2: Move SessionContextModal to sessions feature**

```bash
cp src/components/SessionContextModal.tsx   src/features/sessions/components/SessionContextModal.tsx
```

- [ ] **Step 3: Delete old files**

```bash
rm src/screens/WelcomeOnboardingScreen.tsx src/screens/DashboardScreen.tsx src/screens/FinanceScreen.tsx
rm src/screens/PatientsScreen.tsx src/screens/SessionHubScreen.tsx src/screens/ScheduleScreen.tsx
rm src/screens/DocumentsScreen.tsx src/screens/SettingsScreen.tsx
rm src/components/SessionContextModal.tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(mobile/A): move screens and components to feature folders"
```

---

### Task 4: Move shared files (services, theme, navigation, components)

**Files:** `src/services/`, `src/theme/`, `src/navigation/`, `src/components/GlassCard`, `src/components/SplashLoading`, `src/assets/`

- [ ] **Step 1: Copy shared files**

```bash
cp src/services/api/httpClient.ts    src/shared/services/api/httpClient.ts
cp src/services/api/auth.ts          src/shared/services/api/auth.ts
cp src/services/api/sessions.ts      src/shared/services/api/sessions.ts
cp src/services/db/database.ts       src/shared/services/db/database.ts
cp src/theme/colors.ts               src/shared/theme/colors.ts
cp src/navigation/AppNavigator.tsx   src/shared/navigation/AppNavigator.tsx
cp src/components/GlassCard.tsx      src/shared/components/GlassCard.tsx
cp src/components/SplashLoading.tsx  src/shared/components/SplashLoading.tsx
cp src/assets/avatar_placeholder.ts  src/shared/assets/avatar_placeholder.ts
```

- [ ] **Step 2: Delete old files**

```bash
rm src/services/api/httpClient.ts src/services/api/auth.ts src/services/api/sessions.ts
rm src/services/db/database.ts
rm src/theme/colors.ts
rm src/navigation/AppNavigator.tsx
rm src/components/GlassCard.tsx src/components/SplashLoading.tsx
rm src/assets/avatar_placeholder.ts
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(mobile/A): move shared services, theme, navigation to shared/"
```

---

### Task 5: Update all imports

**Files:** Every moved file + App.js + AppNavigator

- [ ] **Step 1: Update AppNavigator imports**

Edit `src/shared/navigation/AppNavigator.tsx`. Replace all import paths:

```ts
// OLD → NEW
import { colors } from '../theme/colors'
// → import { colors } from '../theme/colors'  ✓ (same dir, unchanged)

import DashboardScreen from '../screens/DashboardScreen'
// → import DashboardScreen from '../../features/dashboard/screens/DashboardScreen'

import ScheduleScreen from '../screens/ScheduleScreen'
// → import ScheduleScreen from '../../features/sessions/screens/ScheduleScreen'

import PatientsScreen from '../screens/PatientsScreen'
// → import PatientsScreen from '../../features/patients/screens/PatientsScreen'

import SettingsScreen from '../screens/SettingsScreen'
// → import SettingsScreen from '../../features/settings/screens/SettingsScreen'

import SessionHubScreen from '../screens/SessionHubScreen'
// → import SessionHubScreen from '../../features/sessions/screens/SessionHubScreen'

import DocumentsScreen from '../screens/DocumentsScreen'
// → import DocumentsScreen from '../../features/documents/screens/DocumentsScreen'

import LoginScreen from '../screens/LoginScreen'
// → import LoginScreen from '../../features/auth/screens/LoginScreen'

import RecoverPasswordScreen from '../screens/RecoverPasswordScreen'
// → import RecoverPasswordScreen from '../../features/auth/screens/RecoverPasswordScreen'

import EmailSentScreen from '../screens/EmailSentScreen'
// → import EmailSentScreen from '../../features/auth/screens/EmailSentScreen'

import RegisterStep1Screen from '../screens/RegisterStep1Screen'
// → import RegisterStep1Screen from '../../features/auth/screens/RegisterStep1Screen'

import RegisterStep2Screen from '../screens/RegisterStep2Screen'
// → import RegisterStep2Screen from '../../features/auth/screens/RegisterStep2Screen'

import WelcomeOnboardingScreen from '../screens/WelcomeOnboardingScreen'
// → import WelcomeOnboardingScreen from '../../features/onboarding/screens/WelcomeOnboardingScreen'
```

- [ ] **Step 2: Update imports in each feature screen**

For every screen in `src/features/`, update relative imports:

- `../theme/colors` → `../../shared/theme/colors` (or `../../../shared/theme/colors` if nested deeper)
- `../components/...` → `../../shared/components/...`
- `../services/api/sessions` → `../../shared/services/api/sessions`
- `../services/api/auth` → `../../shared/services/api/auth`
- `../assets/avatar_placeholder` → `../../shared/assets/avatar_placeholder`
- `../components/SessionContextModal` → `../components/SessionContextModal` (already in same feature)

For `src/shared/services/api/sessions.ts`:
- `import { createHttpClient } from './httpClient'` → unchanged (same dir)

- [ ] **Step 3: Update App.js imports**

```js
// OLD
import AppNavigator from './src/navigation/AppNavigator';
import SplashLoading from './src/components/SplashLoading';

// NEW
import AppNavigator from './src/shared/navigation/AppNavigator';
import SplashLoading from './src/shared/components/SplashLoading';
```

- [ ] **Step 4: Start metro and verify no import errors**

```bash
npx expo start --clear 2>&1 | head -50
```
Expected: Metro starts, no "Cannot resolve module" errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(mobile/A): update all imports after feature folder restructure"
```

---

### Task 6: Fix `assertPathAndMethod` for dynamic paths + remove `as any`

**Files:**
- Modify: `src/shared/services/api/httpClient.ts`
- Modify: `src/shared/services/api/sessions.ts`

- [ ] **Step 1: Replace `assertPathAndMethod` in httpClient.ts**

Find and replace the entire `assertPathAndMethod` function (lines 103–119):

```ts
function matchContractPath(
  contract: Record<string, readonly string[]>,
  path: string,
): readonly string[] | undefined {
  // Direct match
  if (contract[path]) return contract[path];

  // Pattern match: treat {param} segments as wildcards
  for (const [pattern, methods] of Object.entries(contract)) {
    const regex = new RegExp(
      '^' + pattern.replace(/\{[^}]+\}/g, '[^/]+') + '$'
    );
    if (regex.test(path)) return methods;
  }
  return undefined;
}

function assertPathAndMethod(
  clientName: string,
  contract: Record<string, readonly string[]>,
  path: string,
  method: HttpMethod,
): void {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const methods = matchContractPath(contract, normalizedPath);

  if (!methods) {
    throw new ApiError(`[${clientName}] Endpoint fora do contrato: ${normalizedPath}`);
  }

  if (!methods.includes(method.toLowerCase())) {
    throw new ApiError(`[${clientName}] Método ${method} fora do contrato para ${normalizedPath}`);
  }
}
```

- [ ] **Step 2: Remove `as any` from sessions.ts**

In `src/shared/services/api/sessions.ts`, change:

```ts
// OLD
contract: sessionContract as any,

// NEW
contract: sessionContract,
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/api/httpClient.ts src/shared/services/api/sessions.ts
git commit -m "fix(mobile/A): support dynamic path segments in httpClient contract validation"
```

---

## Chunk 2: Phase B — Performance

### Task 7: Create `useTheme` and replace pattern in all screens

**Files:**
- Create: `src/shared/hooks/useTheme.ts`
- Modify: all screens that call `useColorScheme()` + ternary

- [ ] **Step 1: Create `src/shared/hooks/useTheme.ts`**

```ts
import { useColorScheme } from 'react-native';
import { colors } from '../theme/colors';

export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}
```

- [ ] **Step 2: Replace pattern in DashboardScreen**

In `src/features/dashboard/screens/DashboardScreen.tsx`:

```ts
// REMOVE these two lines:
const isDark = useColorScheme() === 'dark';
const theme = isDark ? colors.dark : colors.light;

// ADD at top of component:
const theme = useTheme();

// ADD import:
import { useTheme } from '../../../shared/hooks/useTheme';
```

Repeat for all screens that have this pattern: `ScheduleScreen`, `PatientsScreen`, `SessionHubScreen`, `DocumentsScreen`, `SettingsScreen`, `LoginScreen`, etc.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "perf(mobile/B): centralize theme hook, remove duplicate useColorScheme pattern"
```

---

### Task 8: Extract `useDashboard` hook

**Files:**
- Create: `src/shared/hooks/useDashboard.ts`
- Modify: `src/features/dashboard/screens/DashboardScreen.tsx`

- [ ] **Step 1: Create `src/shared/hooks/useDashboard.ts`**

```ts
import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { fetchSessions } from '../services/api/sessions';
import type { Session as ApiSession } from '@ethos/shared';

const DEMO_SESSIONS: ApiSession[] = [
  { id: '1', patientId: 'Patient 1 (Demo)', scheduledAt: '14:00', status: 'pending' } as ApiSession,
  { id: '2', patientId: 'Patient 2 (Demo)', scheduledAt: '16:00', status: 'completed' } as ApiSession,
];

export function useDashboard() {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    if (Platform.OS === 'web') {
      setSessions(DEMO_SESSIONS);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSessions();
      setSessions(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar sessões.');
      setSessions(DEMO_SESSIONS.map(s => ({ ...s, patientId: s.patientId.replace('Demo', 'Fallback') })));
    } finally {
      setIsLoading(false);
    }
  }

  return { sessions, isLoading, error, reload: loadSessions };
}
```

- [ ] **Step 2: Slim down DashboardScreen to use the hook**

Remove `useState`, `useEffect`, `fetchSessions`, `Platform` imports from the screen.
Add `import { useDashboard } from '../../../shared/hooks/useDashboard';`
Replace state declarations with:

```ts
const { sessions, isLoading, error } = useDashboard();
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/useDashboard.ts src/features/dashboard/screens/DashboardScreen.tsx
git commit -m "perf(mobile/B): extract useDashboard hook from DashboardScreen"
```

---

### Task 9: Extract `usePatients` hook

**Files:**
- Create: `src/shared/hooks/usePatients.ts`
- Modify: `src/features/patients/screens/PatientsScreen.tsx`

- [ ] **Step 1: Create `src/shared/hooks/usePatients.ts`**

```ts
import { useState, useEffect } from 'react';
import { fetchPatients } from '../services/api/sessions';
import type { Patient } from '@ethos/shared';

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setIsLoading(true);
      const data = await fetchPatients();
      setPatients(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pacientes.');
    } finally {
      setIsLoading(false);
    }
  }

  return { patients, isLoading, error, reload: load };
}
```

- [ ] **Step 2: Update PatientsScreen to use the hook**

Replace inline data fetching with `const { patients, isLoading } = usePatients();`

- [ ] **Step 3: Commit**

```bash
git add src/shared/hooks/usePatients.ts src/features/patients/screens/PatientsScreen.tsx
git commit -m "perf(mobile/B): extract usePatients hook"
```

---

### Task 10: Fix `useSharedValue` in map (rules-of-hooks violation)

**Files:**
- Modify: `src/features/sessions/screens/SessionHubScreen.tsx`

- [ ] **Step 1: Replace the violation on line 26**

```ts
// REMOVE (rules-of-hooks violation — hooks inside map callback):
const waveformValues = Array.from({ length: 20 }).map(() => useSharedValue(5));

// REPLACE WITH (single SharedValue holding array):
const waveformValues = useSharedValue<number[]>(Array(20).fill(5));
```

- [ ] **Step 2: Update waveform animation references**

The `useEffect` that animates waveform currently does:
```ts
waveformValues.forEach((val, i) => {
    val.value = withRepeat(...);
});
```

Replace with:
```ts
waveformValues.value = waveformValues.value.map((_, i) =>
    withRepeat(withTiming(15 + Math.random() * 35, { duration: 300 + i * 20 }), -1, true)
);
```

For resetting:
```ts
// OLD: waveformValues.forEach(val => val.value = withTiming(5));
// NEW:
waveformValues.value = Array(20).fill(5);
```

- [ ] **Step 3: Update animated styles that read waveformValues**

Any `useAnimatedStyle` referencing `waveformValues[i].value` must now read `waveformValues.value[i]`.

- [ ] **Step 4: Verify no crash on waveform**

Run metro and navigate to SessionHub screen. Confirm waveform animates without crash.

- [ ] **Step 5: Commit**

```bash
git add src/features/sessions/screens/SessionHubScreen.tsx
git commit -m "fix(mobile/B): fix useSharedValue rules-of-hooks violation in SessionHubScreen"
```

---

### Task 11: Extract Dashboard sub-components with React.memo

**Files:**
- Create: `src/features/dashboard/components/AlertCard.tsx`
- Create: `src/features/dashboard/components/NextSessionCard.tsx`
- Create: `src/features/dashboard/components/FinanceSummaryCard.tsx`
- Modify: `src/features/dashboard/screens/DashboardScreen.tsx`

- [ ] **Step 1: Create `AlertCard.tsx`**

Extract the alerts grid from `DashboardScreen` (the two `alertCardSmall` `TouchableOpacity` components under "Alertas" section):

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { FileText, Banknote } from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

type AlertCardProps = {
  overdueDocs: number;
  pendingPaymentAmount: number;
};

export const AlertCard = React.memo(function AlertCard({ overdueDocs, pendingPaymentAmount }: AlertCardProps) {
  const theme = useTheme();
  const isDark = useColorScheme() === 'dark';
  // ... JSX extracted from DashboardScreen alerts section
  return (
    <View style={{ flexDirection: 'row', gap: 16 }}>
      {/* Laudos Atrasados card */}
      {/* Pagamentos card */}
    </View>
  );
});
```

- [ ] **Step 2: Create `NextSessionCard.tsx`**

Extract the "Próxima Sessão" card. Accepts `session` prop and `onNavigate` callback:

```tsx
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import type { Session } from '@ethos/shared';

type NextSessionCardProps = {
  session: Session | null;
  onNavigate: (params: { patientName: string; time: string; status: string }) => void;
  onViewDocs: () => void;
};

export const NextSessionCard = React.memo(function NextSessionCard({
  session, onNavigate, onViewDocs
}: NextSessionCardProps) {
  const theme = useTheme();
  // ... JSX from DashboardScreen "Próxima Sessão" section
});
```

- [ ] **Step 3: Create `FinanceSummaryCard.tsx`**

Extract the finance card. Pure display component, no auth needed:

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../../shared/hooks/useTheme';

type FinanceSummaryCardProps = {
  total: number;
  received: number;
  pending: number;
  growthPercent: number;
};

export const FinanceSummaryCard = React.memo(function FinanceSummaryCard(props: FinanceSummaryCardProps) {
  const theme = useTheme();
  // ... JSX from DashboardScreen finance section
});
```

- [ ] **Step 4: Update DashboardScreen to use components**

DashboardScreen should now be ~80 lines of JSX:

```tsx
export default function DashboardScreen() {
  const theme = useTheme();
  const { sessions } = useDashboard();
  const navigation = useNavigation<any>();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <ScrollView>
        <AlertCard overdueDocs={3} pendingPaymentAmount={450} />
        <NextSessionCard
          session={sessions[0] ?? null}
          onNavigate={(p) => navigation.navigate('SessionHub', p)}
          onViewDocs={() => navigation.navigate('Documents')}
        />
        <FinanceSummaryCard total={8420} received={6200} pending={2220} growthPercent={12} />
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/
git commit -m "perf(mobile/B): extract Dashboard sub-components with React.memo"
```

---

## Chunk 3: Phase C — Security + EAS Build

### Task 12: Create AuthContext with SecureStore

**Files:**
- Create: `src/shared/hooks/useAuth.ts`

- [ ] **Step 1: Create `src/shared/hooks/useAuth.ts`**

```ts
import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, logout as apiLogout } from '../services/api/auth';
import { setTokenProvider, setUnauthorizedHandler } from '../services/api/httpClient';
import type { AuthState, AuthUser } from '../../features/auth/types';

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Register token provider for httpClient (dependency injection — no hook import outside React)
  useEffect(() => {
    setTokenProvider(() => token);
  }, [token]);

  // Register unauthorized handler
  useEffect(() => {
    setUnauthorizedHandler(() => {
      handleLogout();
    });
  }, []);

  // Restore token from SecureStore on startup
  useEffect(() => {
    SecureStore.getItemAsync('auth_token')
      .then(stored => setToken(stored))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleLogin(email: string, password: string) {
    const response = await apiLogin(email, password);
    const newToken = response.token as string;
    await SecureStore.setItemAsync('auth_token', newToken);
    setToken(newToken);
    setUser(response.user as AuthUser);
  }

  async function handleLogout() {
    try { await apiLogout(); } catch { /* best effort */ }
    await SecureStore.deleteItemAsync('auth_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      token, user, isLoading,
      login: handleLogin,
      logout: handleLogout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/hooks/useAuth.ts
git commit -m "feat(mobile/C): add AuthContext with SecureStore persistence"
```

---

### Task 13: Update httpClient with dependency injection

**Files:**
- Modify: `src/shared/services/api/httpClient.ts`

- [ ] **Step 1: Add token/unauthorized injection at top of file (after imports)**

Add right before `const DEFAULT_TIMEOUT_MS`:

```ts
// Dependency injection — avoids importing hooks outside React
let _tokenProvider: (() => string | null) | null = null;
let _unauthorizedHandler: (() => void) | null = null;

export function setTokenProvider(fn: () => string | null): void {
  _tokenProvider = fn;
}

export function setUnauthorizedHandler(fn: () => void): void {
  _unauthorizedHandler = fn;
}
```

- [ ] **Step 2: Remove `localStorage` cache functions**

Delete `readCachedResponse` and `writeCachedResponse` functions entirely (lines 71–88).
Delete `makeCacheKey` function (line 69).
Remove all calls to these functions in the `request` function.

- [ ] **Step 3: Update `createHttpClient` to use `_tokenProvider` as fallback**

In the `request` function, change the auth token injection:

```ts
// OLD:
const authToken = getAuthToken?.();

// NEW — prefer injected global provider (from AuthContext), fall back to per-client getter:
const authToken = _tokenProvider?.() ?? getAuthToken?.();
```

Also update the 401 handler to call `_unauthorizedHandler` if set:

```ts
if ((response.status === 401 || response.status === 403) && !isLogoutPath(normalizedPath)) {
  if (_unauthorizedHandler) _unauthorizedHandler();
  else if (onSessionInvalid) await onSessionInvalid(response.status === 401 ? 'unauthorized' : 'forbidden');
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/services/api/httpClient.ts
git commit -m "feat(mobile/C): add setTokenProvider/setUnauthorizedHandler to httpClient"
```

---

### Task 14: Fix auth.ts and sessions.ts

**Files:**
- Modify: `src/shared/services/api/auth.ts`
- Modify: `src/shared/services/api/sessions.ts`

- [ ] **Step 1: Fix auth.ts**

Remove module-level token. Fix `login` signature. Remove localStorage offline settings:

```ts
import { createHttpClient } from './httpClient';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

const authContract = {
  '/auth/login': ['post'],
  '/auth/logout': ['post'],
  '/auth/invite': ['post'],
  '/auth/accept-invite': ['post'],
} as const;

const authClient = createHttpClient({
  name: 'MobileAuth',
  baseUrl: API_BASE_URL,
  contract: authContract,
  // token is injected globally via setTokenProvider in useAuth
});

export const login = async (email: string, password: string) => {
  return authClient.request<{ token: string; user: any }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
};

export const logout = async () => {
  await authClient.request('/auth/logout', { method: 'POST' });
};
```

- [ ] **Step 2: Fix sessions.ts**

Remove `currentToken` and `setSessionToken`. Remove `as any` (already fixed in Task 6):

```ts
import { createHttpClient } from './httpClient';
import type { Session, Patient } from '@ethos/shared';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

const sessionContract = {
  '/sessions': ['get', 'post'],
  '/sessions/{id}': ['get'],
  '/sessions/{id}/status': ['patch'],
  '/sessions/{id}/audio': ['post'],
  '/sessions/{id}/transcribe': ['post'],
  '/sessions/{id}/clinical-note': ['post'],
  '/clinical-notes/{id}/validate': ['post'],
  '/patients': ['get'],
} as const;

const apiClient = createHttpClient({
  name: 'MobileClinicalAPI',
  baseUrl: API_BASE_URL,
  contract: sessionContract,
  // token injected globally via setTokenProvider
});

export const fetchSessions = async (): Promise<Session[]> =>
  apiClient.request<Session[]>('/sessions', { method: 'GET' });

export const fetchPatients = async (): Promise<Patient[]> =>
  apiClient.request<Patient[]>('/patients', { method: 'GET' });

export const createSession = async (patientId: string, scheduledAt: string): Promise<Session> =>
  apiClient.request<Session>('/sessions', {
    method: 'POST',
    body: { patient_id: patientId, scheduled_at: scheduledAt },
  });

export const startTranscriptionJob = async (sessionId: string, rawText?: string) =>
  apiClient.request<{ job_id: string }>(`/sessions/${sessionId}/transcribe`, {
    method: 'POST',
    body: { raw_text: rawText },
  });

export const saveClinicalNote = async (sessionId: string, text: string) =>
  apiClient.request<any>(`/sessions/${sessionId}/clinical-note`, {
    method: 'POST',
    body: { text },
  });

export const updateSessionStatus = async (sessionId: string, status: Session['status']) =>
  apiClient.request<any>(`/sessions/${sessionId}/status`, {
    method: 'PATCH',
    body: { status },
  });
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/api/auth.ts src/shared/services/api/sessions.ts
git commit -m "fix(mobile/C): remove module-level tokens, fix login signature, clean sessions.ts"
```

---

### Task 15: Update AppNavigator with two-navigator pattern

**Files:**
- Modify: `src/shared/navigation/AppNavigator.tsx`

- [ ] **Step 1: Rewrite AppNavigator**

```tsx
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColorScheme } from 'react-native';
import { colors } from '../theme/colors';
import { Home, Calendar, Users, Settings, FileText } from 'lucide-react-native';

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
import DocumentsScreen from '../../features/documents/screens/DocumentsScreen';
import SettingsScreen from '../../features/settings/screens/SettingsScreen';
import SessionHubScreen from '../../features/sessions/screens/SessionHubScreen';

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
      <Tab.Screen name="Patients" component={PatientsScreen} options={{ title: 'Pacientes', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
      <Tab.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Docs', headerShown: false, tabBarIcon: ({ color, size }) => <FileText color={color} size={size} /> }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Settings color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function MainStackNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={BottomTabs} />
      <MainStack.Screen name="SessionHub" component={SessionHubScreen} />
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
git add src/shared/navigation/AppNavigator.tsx
git commit -m "feat(mobile/C): two-navigator pattern with AuthContext gate in AppNavigator"
```

---

### Task 16: Wrap AppNavigator with AuthProvider in App.js

**Files:**
- Modify: `App.js`

- [ ] **Step 1: Add AuthProvider import and wrap**

In `App.js`, add import:

```js
import { AuthProvider } from './src/shared/hooks/useAuth';
```

In the logged-in render block, wrap `<AppNavigator />` with `<AuthProvider>`:

```js
// OLD:
{role === 'psychologist' ? (
  <AppNavigator />
) : (
  ...
)}

// NEW:
{role === 'psychologist' ? (
  <AuthProvider>
    <AppNavigator />
  </AuthProvider>
) : (
  ...
)}
```

- [ ] **Step 2: Commit**

```bash
git add App.js
git commit -m "feat(mobile/C): wrap AppNavigator with AuthProvider in App.js"
```

---

### Task 17: EAS Build fix — align SDK 53 versions and build

**Files:**
- Modify: `apps/ethos-mobile/package.json`

- [ ] **Step 1: Run expo install --check to see SDK mismatches**

```bash
cd apps/ethos-mobile
npx expo install --check
```

Note any packages flagged as mismatched. Fix them with `npx expo install <package>@<version>`.

- [ ] **Step 2: Verify package.json has SDK 53 versions**

The package.json should already have these from the previous fix session. Verify:

```json
{
  "expo": "~53.0.0",
  "react-native": "0.79.2",
  "expo-dev-client": "~6.0.20",
  "expo-av": "~16.0.0",
  "expo-sqlite": "~16.0.0",
  "expo-secure-store": "~15.0.0",
  "expo-local-authentication": "~17.0.0",
  "expo-file-system": "~18.0.0",
  "expo-blur": "~15.0.0",
  "expo-crypto": "~15.0.0",
  "expo-device": "~8.0.0",
  "expo-font": "~13.0.0",
  "expo-status-bar": "~2.2.0",
  "react-native-reanimated": "~3.17.0",
  "react-native-screens": "~4.4.0",
  "react-native-safe-area-context": "4.14.0"
}
```

- [ ] **Step 3: Update package-lock.json**

```bash
cd ../..  # back to monorepo root
npm install --ignore-scripts
```

- [ ] **Step 4: Commit updated lock file**

```bash
git add apps/ethos-mobile/package.json package-lock.json
git commit -m "fix(mobile): align all expo-* packages to SDK 53 for EAS Build"
```

- [ ] **Step 5: Trigger EAS Build**

```bash
cd apps/ethos-mobile
eas build --platform android --profile development
```

- [ ] **Step 6: Monitor build and share APK link**

When build completes, EAS outputs a download URL. Share this URL with the user.
If build fails, fetch the Gradle logs with:
```bash
eas build:view <build-id>
```
And read the "Run gradlew" phase output.

---
