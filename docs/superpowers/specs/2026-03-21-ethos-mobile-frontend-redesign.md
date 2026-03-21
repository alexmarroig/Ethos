# Ethos Mobile — Frontend Redesign Spec
**Date:** 2026-03-21
**Scope:** apps/ethos-mobile/src

---

## 1. Objetivo

Reorganizar o frontend do app mobile em três fases sequenciais:
- **A** — Organização do código (feature-based folder structure)
- **B** — Performance (hooks de dados, memoização, useTheme)
- **C** — Segurança (AuthContext em shared/, proteção de rotas, API interceptor)

Após as três fases, corrigir o EAS Build (erro Gradle) e gerar o APK de desenvolvimento.

---

## 2. Estrutura de Pastas (A)

```
src/
├── features/
│   ├── auth/
│   │   ├── screens/         LoginScreen, RegisterStep1, RegisterStep2,
│   │   │                    RecoverPasswordScreen, EmailSentScreen
│   │   └── types.ts
│   ├── onboarding/
│   │   └── screens/         WelcomeOnboardingScreen
│   ├── dashboard/
│   │   ├── screens/         DashboardScreen.tsx (só JSX)
│   │   ├── components/      AlertCard, NextSessionCard, FinanceSummaryCard
│   │   └── styles.ts
│   ├── finance/
│   │   └── screens/         FinanceScreen.tsx (existe mas não está no navigator — mantido, não deletado)
│   ├── patients/
│   │   ├── screens/         PatientsScreen
│   │   └── components/
│   ├── sessions/
│   │   ├── screens/         SessionHubScreen, ScheduleScreen
│   │   └── components/      SessionContextModal
│   ├── documents/
│   │   └── screens/         DocumentsScreen
│   └── settings/
│       └── screens/         SettingsScreen
├── shared/
│   ├── components/          GlassCard, SplashLoading
│   ├── hooks/
│   │   ├── useTheme.ts      (elimina useColorScheme repetido)
│   │   ├── useAuth.ts       (AuthContext + AuthProvider — aqui, não em features/)
│   │   ├── useDashboard.ts
│   │   ├── useSessions.ts
│   │   └── usePatients.ts
│   ├── services/
│   │   ├── api/
│   │   │   ├── httpClient.ts   (interceptor de token + substituição de localStorage)
│   │   │   ├── auth.ts         (sem module-level currentToken após Phase C)
│   │   │   └── sessions.ts     (sem module-level currentToken após Phase C)
│   │   └── db/              database.ts (movido, sem alteração de conteúdo)
│   ├── theme/               colors.ts
│   └── navigation/          AppNavigator.tsx
└── index.ts                 (re-export apenas para facilitar testes)
```

**Regra de dependência:** `features/` importa apenas de `shared/`. `shared/navigation/` pode importar de `features/` (screens). Nunca feature → feature.

---

## 3. Performance (B)

### 3.1 Hooks de dados em shared/hooks/
Cada screen delega fetch/estado ao hook correspondente. A screen renderiza apenas JSX.

```ts
// shared/hooks/useDashboard.ts
export function useDashboard() {
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { loadSessions(); }, []);
  async function loadSessions() { /* fetch + fallback demo */ }
  return { sessions, isLoading, error, reload: loadSessions };
}
```

### 3.2 Correção de violação de hooks em SessionHubScreen
`SessionHubScreen.tsx` chama `useSharedValue` dentro de `Array.map()` — violação das rules of hooks. Durante a extração para `features/sessions/screens/`, o array de valores de waveform deve ser refatorado para um único `useSharedValue<number[]>` ou via `useMemo`.

### 3.3 React.memo em sub-componentes pesados
`AlertCard`, `NextSessionCard`, `FinanceSummaryCard` — todos envolvidos em `React.memo`. Esses componentes NÃO recebem `user`/`token` como props; consomem `useAuth()` internamente quando necessário.

### 3.4 useTheme centralizado
```ts
// shared/hooks/useTheme.ts
export function useTheme() {
  const scheme = useColorScheme();
  return scheme === 'dark' ? colors.dark : colors.light;
}
```

---

## 4. Segurança (C)

### 4.1 AuthContext em shared/hooks/useAuth.ts
`AuthProvider` fica em `shared/` para que `shared/navigation/AppNavigator` possa consumi-lo sem violar a regra de dependência.

```ts
// shared/hooks/useAuth.ts
const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // gate inicial

  useEffect(() => {
    // Lê token do expo-secure-store na inicialização
    SecureStore.getItemAsync('auth_token').then(t => {
      setToken(t);
      setIsLoading(false);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

### 4.2 Proteção de rotas no Navigator — padrão de dois navigators
Evita flash-of-wrong-screen. Usa `isLoading` como gate:

```ts
// shared/navigation/AppNavigator.tsx
export default function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) return <SplashLoading />;   // aguarda SecureStore

  return (
    <NavigationContainer>
      {token ? <MainStackNavigator /> : <AuthStackNavigator />}
    </NavigationContainer>
  );
}
```
`AuthStackNavigator` contém: Login, RecoverPassword, EmailSent, RegisterStep1/2, WelcomeOnboarding.
`MainStackNavigator` contém: MainTabs (bottom tabs) + SessionHub.

### 4.3 API interceptor + remoção de module-level tokens
```ts
// shared/services/api/httpClient.ts
// Injeta Authorization header via callback — não armazena token localmente
// Se receber 401 → chama logout() do AuthContext → navigator redireciona automaticamente

// IMPORTANTE: substitui o uso de localStorage (inexistente em RN) por
// expo-file-system ou simplesmente remove o cache layer de localStorage
```

**Após Phase C:**
- `auth.ts`: remover `let currentToken` e `export function setToken`
- `sessions.ts`: remover `let currentToken` e `export function setSessionToken`
- Ambos passam a ler token via callback injetado pelo `httpClient`

---

## 5. EAS Build Fix

**Problema:** Gradle falha porque `expo-modules-core` v1 (vem com expo ~50) não tem `expo-module-gradle-plugin` exigido por expo-av 16, expo-sqlite 16 (SDK 53).

**Fix:**
- `expo: ~53.0.0`, `react-native: 0.79.2`
- Todos os `expo-*` na faixa SDK 53
- `.npmrc` raiz com `legacy-peer-deps=true`
- `package-lock.json` atualizado com `npm install --ignore-scripts`
- **Primeiro passo antes de qualquer pin manual:** rodar `npx expo install --check` para validar compatibilidade de todos os pacotes com SDK 53

**Versões confirmadas para SDK 53:**
| Pacote | Versão |
|--------|--------|
| expo | ~53.0.0 |
| react-native | 0.79.2 |
| expo-dev-client | ~6.0.20 |
| expo-av | ~16.0.0 |
| expo-sqlite | ~16.0.0 |
| expo-secure-store | ~15.0.0 |
| expo-local-authentication | ~17.0.0 |
| expo-file-system | ~18.0.0 |
| expo-blur | ~15.0.0 |
| expo-crypto | ~15.0.0 |
| expo-device | ~8.0.0 |
| expo-font | ~13.0.0 |
| expo-status-bar | ~2.2.0 |
| react-native-reanimated | ~3.17.0 |
| react-native-screens | ~4.4.0 |
| react-native-safe-area-context | 4.14.0 |

---

## 6. Ordem de Implementação

### Phase A — Estrutura
1. Criar pastas `features/` e subpastas por domínio
2. Mover screens para features correspondentes
3. Mover `SessionContextModal` para `features/sessions/components/`
4. Mover `GlassCard`, `SplashLoading` para `shared/components/`
5. Mover `services/`, `theme/` para `shared/`
6. Atualizar todos os imports
7. Corrigir `assertPathAndMethod` em `httpClient.ts` para suportar path segments dinâmicos (ex: `/sessions/:id/transcribe`) em vez de só lookup literal — remover `as any` de `sessions.ts`

### Phase B — Performance
7. Criar `shared/hooks/useTheme.ts` e substituir em todas as screens
8. Criar `shared/hooks/useDashboard.ts` e extrair lógica do DashboardScreen
9. Criar `shared/hooks/useSessions.ts` e extrair lógica do SessionHubScreen
10. Criar `shared/hooks/usePatients.ts` e extrair lógica do PatientsScreen
11. **Corrigir rules-of-hooks em SessionHubScreen** (useSharedValue fora do map)
12. Extrair sub-componentes do Dashboard com React.memo

### Phase C — Segurança
13. Criar `shared/hooks/useAuth.ts` com AuthContext + AuthProvider + SecureStore (chave: `auth_token`; sem migração necessária — tokens não eram persistidos antes)
14. Atualizar `AppNavigator.tsx`: dois navigators condicionais + SplashLoading gate
15. Atualizar `httpClient.ts`: injeção de token via callback + remover uso de `localStorage` (substituir por `expo-file-system` ou remover cache layer)
16. Remover `currentToken` de `auth.ts` e `sessions.ts`; corrigir assinatura de `login()` para `{ email, password }` (backend exige ambos)
17. Envolver `<App>` com `<AuthProvider>` em `App.tsx` (não `index.js` — evitar duplo wrap)

### EAS Build
18. Rodar `npx expo install --check` e corrigir divergências
19. Rodar `eas build --platform android --profile development`
20. Verificar APK e compartilhar link

---

## 7. Restrições

- Não alterar API do backend (ethos-clinic)
- Não quebrar navegação durante a migração (imports atualizados atomicamente)
- Não adicionar Redux/Zustand — hooks nativos suficientes
- `FinanceScreen` mantida mas fora do navigator (dead code documentado, não deletado)
- `src/index.ts` mantido apenas como barrel de re-exports para testes
