# Ethos Mobile — Paridade de Funcionalidades (Sub-projeto A)

**Data:** 2026-04-20  
**Autor:** Brainstorming session  
**Escopo:** Paridade completa com Ethos Web (features profissionais) + gravador de sessão resiliente

---

## Objetivo

Trazer todas as funcionalidades do Ethos Web para o app mobile (`apps/ethos-mobile`), revisando telas existentes e adicionando as que faltam — incluindo um gravador de sessão de qualidade profissional como ferramenta auxiliar para geração de prontuários via Whisper.

O app mobile usa: **Expo ~53 · React Native 0.79 · React Navigation v6 · StyleSheet nativo · lucide-react-native · expo-audio · Zustand**

---

## Arquitetura

### Estrutura de pastas

```
apps/ethos-mobile/src/
  components/
    ui/
      Card.tsx
      Button.tsx
      EmptyState.tsx
      SectionHeader.tsx
      ListItem.tsx
      Badge.tsx
    PrivacyText.tsx          # aplica privacyMode (espelha web)
    FAB.tsx                  # floating action button
    AudioRecorder.tsx        # gravador isolado — não acoplado a telas
    SessionCard.tsx          # card de sessão reutilizável
    ConsentModal.tsx         # modal de consentimento antes de gravar

  screens/
    auth/                    # Login, Register, RecoverPassword (existem — manter)
    dashboard/
      DashboardScreen.tsx    # revisado — espelha web HomePage
    agenda/
      ScheduleScreen.tsx     # revisado — lista por dia no mobile
    patients/
      PatientsScreen.tsx     # revisado + privacidade + portal badge
      PatientDetailScreen.tsx # revisado — abas com scroll
    session/
      SessionHubScreen.tsx   # revisado + integração do gravador
      RecorderScreen.tsx     # novo — tela de gravação
      ConsentScreen.tsx      # novo — consentimento antes de gravar
    finance/
      FinanceScreen.tsx      # revisado — swipe-to-action
    documents/
      DocumentsHubScreen.tsx # novo — hub de categorias
      ProntuariosScreen.tsx  # novo — lista de prontuários
      ReportsScreen.tsx      # novo — relatórios + wizard
      AnamnesisScreen.tsx    # novo — fichas de anamnese
      ContractsScreen.tsx    # novo — contratos
      TemplateDocsScreen.tsx # novo — recibos, declarações, laudos
    forms/
      FormsScreen.tsx        # novo — formulários + diário emocional integrado
    availability/
      AvailabilityScreen.tsx # novo — configurar horários
    backup/
      BackupScreen.tsx       # novo — backup e exportação
    account/
      AccountScreen.tsx      # revisado — modo privado + info psicóloga

  stores/
    appStore.ts              # Zustand — sessionCache, privacyMode, pendingJobs, recordingState

  theme/
    colors.ts                # já existe — manter
    spacing.ts               # novo — t-shirt sizes: xs=4, sm=8, md=16, lg=24, xl=32
    typography.ts            # novo — tamanhos e pesos padronizados
```

### Navegação

**Bottom Tabs (5):**
```
Início  |  Agenda  |  Pacientes  |  Documentos  |  Mais
```

**"Mais" — Bottom Sheet (grid 3×3):**
```
Financeiro  |  Formulários  |  Disponibilidade
Backup      |  Conta        |  [futuro]
```

**Stack dentro de cada tab:** cada tab tem seu próprio StackNavigator para permitir navegação aninhada (ex: Pacientes → PatientDetail → SessionHub → Recorder).

### Estado global — Zustand (`stores/appStore.ts`)

```ts
interface AppState {
  // Sessões
  sessionCache: Session[];
  sessionCacheAt: number;           // timestamp do último fetch
  setSessionCache: (s: Session[]) => void;
  upsertSession: (s: Session) => void;
  removeSession: (id: string) => void;

  // Privacidade
  privacyMode: boolean;
  togglePrivacyMode: () => void;    // persiste em SecureStore

  // Jobs de transcrição
  pendingJobs: TranscriptionJob[];
  addJob: (j: TranscriptionJob) => void;
  updateJob: (id: string, update: Partial<TranscriptionJob>) => void;

  // Gravador — estado resiliente
  recordingState: RecordingState | null;  // null = sem gravação ativa
  setRecordingState: (s: RecordingState | null) => void;
}

interface RecordingState {
  sessionId: string;
  startedAt: string;        // ISO timestamp
  status: 'recording' | 'paused' | 'interrupted';
  chunkPaths: string[];     // caminhos de chunks no disco
  consentType: 'verbal' | 'written' | 'digital';
}
```

---

## Telas revisadas

### DashboardScreen (revisão completa)

**Atual:** lista simples de sessões do dia.  
**Novo — espelha web HomePage:**

- Cards de resumo 2×2: Sessões hoje · Próximas · Pagamentos pendentes · Aniversariantes do mês
- Seção "Sessões de hoje" com SessionCard (status, badge de prontuário)
- Seção "Próximas atividades" — inclui bloqueios com visual tracejado
- Seção "Prontuários pendentes" — excluindo bloqueios
- FAB "Registrar sessão" posicionado acima do bottom tab
- Cache Zustand (TTL 60s) — sem re-fetch ao navegar entre tabs
- Pull-to-refresh força re-fetch e atualiza cache

### ScheduleScreen (revisão)

- Vista padrão: **lista vertical por dia** (calendário semanal de 7 colunas é inutilizável no mobile)
- Swipe horizontal left/right para navegar entre semanas (ou botões ← →)
- Tap em sessão → SessionHubScreen
- Tap em horário livre → dialog de nova sessão/bloqueio
- Bloqueios: visual tracejado + badge "Bloqueio", sem opções de prontuário/pagamento
- "Remarcar sessão" no menu de contexto (long press ou botão) substitui drag-and-drop

### PatientsScreen (revisão)

- Busca com debounce 300ms
- Badge "Portal ativo" (ícone ShieldCheck verde) vs ícone KeyRound para sem acesso
- Pull-to-refresh
- PrivacyText em todos os nomes
- Tap → PatientDetailScreen

### PatientDetailScreen (revisão)

- Abas horizontais com scroll: **Resumo · Sessões · Financeiro · Formulários · Documentos**
- Scroll vertical dentro de cada aba
- FAB "Agendar sessão" fixo na ficha
- Aviso inline se `session_price` não configurado
- Gerenciamento de acesso ao portal (como no web — ShieldCheck/KeyRound)
- PrivacyText no nome do paciente

### FinanceScreen (revisão)

- Cards de resumo: Receita do mês · Pendente · A receber
- Lista de lançamentos com filtro por status (pago/pendente/isento/todos)
- Swipe-to-action: → marcar como pago / ← excluir
- Pull-to-refresh

### SessionHubScreen (revisão + gravador)

```
[ Status da sessão ]
[ Paciente · Data · Hora ]

[ 🎙 Gravar sessão ]        ← se sem áudio
[ ▶ Ouvir gravação ]        ← se áudio existe
[ 📊 Ver transcrição ]      ← se transcrição pronta
[ ✨ Gerar prontuário ]     ← se transcrição disponível

[ Prontuário / Nota clínica ]
[ Histórico de áudios ]
```

### ClinicalNoteEditorScreen (revisão)

- Scroll confortável no textarea (keyboardAvoidingView correto)
- Auto-save a cada 5s (sem spinner visível — discreto)
- Botão "Melhorar com IA" → chama aiService existente
- Indicador de status: Rascunho · Validado

### AccountScreen (revisão)

- Toggle de modo privado (Zustand + SecureStore)
- Nome, CRP, email da psicóloga
- Versão do app
- Botão logout

---

## Telas novas

### DocumentsHubScreen

Grid 2×3 de categorias com ícone, título e contagem:

```
[ 📝 Prontuários  (3) ]  [ 📋 Relatórios   (1) ]
[ 🧠 Anamnese     (5) ]  [ 📜 Contratos    (2) ]
[ 🧾 Recibos/Dec  (0) ]  [ 🏥 Laudos       (0) ]
```

Pull-to-refresh atualiza todas as contagens.

### ProntuariosScreen

- Lista por paciente/data, filtro por status (rascunho/validado)
- Tap → ClinicalNoteEditorScreen
- Badge colorido: âmbar (rascunho), verde (validado)

### ReportsScreen

- Lista de relatórios com tipo e data
- Botão "Novo relatório" → wizard 2 etapas:
  - **Etapa 1:** selecionar paciente + tipo (Relatório de sessão · Encaminhamento · Laudo · Declaração · Prontuário longitudinal)
  - **Etapa 2:** editor com template pré-preenchido + botão "Melhorar com IA"
- Exportar como PDF

### AnamnesisScreen

- Lista de fichas por paciente
- Tap → editor de ficha (queixa principal, histórico, objetivos, hipóteses diagnósticas)
- Pré-seleciona paciente se navegou de PatientDetailScreen

### ContractsScreen

- Lista de contratos com status (ativo/pendente/expirado)
- Visualização em WebView ou texto formatado
- Compartilhar via WhatsApp/email

### TemplateDocsScreen (Recibos · Declarações · Laudos)

- Lista de documentos gerados
- Botão "Gerar" → seleciona paciente + template → gera e exibe
- Compartilhar PDF

### FormsScreen

Duas abas:
- **Formulários:** lista de formulários criados, respostas por paciente, link de compartilhamento
- **Diário emocional:** integra o EmotionalDiaryScreen existente

### AvailabilityScreen

- Toggle por dia da semana (Seg–Dom)
- Horário de início/fim por dia habilitado
- Duração padrão de sessão (select: 30 · 45 · 50 · 60 · 90 min)
- Intervalo entre sessões

### BackupScreen

- Status e data do último backup
- Botão "Fazer backup agora"
- Exportar dados completos (JSON)
- Histórico de backups anteriores

---

## Gravador de sessão

### Propósito

Ferramenta auxiliar para geração de prontuários. Fluxo: **gravar sessão → transcrever via Whisper → gerar prontuário com IA**. Não é gravação contínua — é um recurso acionado pelo psicólogo com consentimento explícito do paciente.

### Fluxo completo

```
SessionHubScreen
    ↓ tap "Gravar sessão"
ConsentScreen
    ↓ confirmação obrigatória
RecorderScreen
    ↓ tap "Encerrar"
Dialog: "Enviar para transcrição?"
    ↓ sim
Upload → job criado → Whisper processa
    ↓ concluído
SessionHubScreen: "Ver transcrição" + "Gerar prontuário"
```

### ConsentScreen

- Texto legal: *"Esta sessão será gravada com fins clínicos. O paciente foi informado e deu consentimento."*
- Checkbox obrigatório: "Confirmo que obtive o consentimento do paciente"
- Tipo de consentimento: Verbal · Escrito · Digital (radio buttons)
- Botão "Iniciar gravação" — habilitado só após checkbox

### RecorderScreen — especificação técnica

**Biblioteca:** `expo-audio` (SDK 53+, substitui expo-av)  
**Formato:** AAC 44.1kHz, 128kbps — qualidade idêntica ao Voice Memos do iPhone  
**Chunks:** arquivo escrito em disco a cada 30s — recuperável em caso de crash

```tsx
// Configuração de áudio
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,    // ignora modo silencioso do iOS
  staysActiveInBackground: true, // continua com tela bloqueada
  interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
  interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
});
```

**Interface:**
```
┌──────────────────────────────────┐
│  🔴 Gravando sessão              │
│  Maria S. · 20 abr · 17:00       │
│                                  │
│   ▓▓▓▒▒▓▓▓▓▒▒▒▓▓▒▒▓▓▓▓▒▒       │ ← waveform
│                                  │
│         00:12:34                 │ ← timer
│                                  │
│  [ ⏸ Pausar ]   [ ⏹ Encerrar ] │
│                                  │
│  🔴 44.1kHz · AAC · 12.4 MB     │
└──────────────────────────────────┘
```

### Resiliência a interrupções

**Ligação telefônica (iOS):**
- `AVAudioSession` detecta interrupção → grava estado `interrupted` no Zustand
- Ao terminar a ligação → retoma automaticamente (`interruptionEnded` event)
- Se o usuário não retomar em 60s → mantém pausado com banner: *"Gravação pausada — toque para retomar"*

**Ligação telefônica (Android):**
- `Foreground Service` com notificação persistente: *"Ethos — Gravando sessão · 00:12:34"*
- Sistema operacional não mata o processo
- `AudioFocusRequest` com `AUDIOFOCUS_LOSS_TRANSIENT` → pausa e retoma

**App fechado/crash:**
- `recordingState` persistido no Zustand (AsyncStorage)
- No próximo boot do app: detecta `recordingState` com status `recording`/`paused`
- Exibe dialog: *"Havia uma gravação em andamento. Recuperar ou descartar?"*
- Se recuperar: concatena chunks do disco → arquivo final

**Disco cheio:**
- Verifica espaço disponível antes de iniciar (mínimo 500MB)
- Monitor a cada 30s — avisa com 100MB restantes
- Para automaticamente se < 50MB

### Upload e transcrição

```
POST /sessions/:id/audio
Content-Type: multipart/form-data
body: { audio: File, consent_type: 'verbal'|'written'|'digital' }
```

- Upload com retry (3 tentativas, backoff exponencial)
- Progress bar na SessionHubScreen
- Job criado em `pendingJobs` no Zustand
- Polling a cada 10s em `GET /sessions/:id/transcript`
- Quando pronto: notificação local + badge na aba Sessão

### Permissões (app.json)

```json
"ios": {
  "infoPlist": {
    "NSMicrophoneUsageDescription": "Para gravar sessões clínicas com consentimento do paciente.",
    "UIBackgroundModes": ["audio"]
  }
},
"android": {
  "permissions": [
    "android.permission.RECORD_AUDIO",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MICROPHONE"
  ]
}
```

---

## Componentes compartilhados

### PrivacyText

```tsx
// Aplica máscara de privacidade igual ao web
const PrivacyText = ({ value, style }: { value: string; style?: TextStyle }) => {
  const { privacyMode } = useAppStore();
  const masked = privacyMode ? maskName(value) : value;
  return <Text style={style}>{masked}</Text>;
};

// maskName: "João Silva" → "J.S." quando privacyMode ativo
```

### SessionCard

Card reutilizável em DashboardScreen, ScheduleScreen, PatientDetailScreen:
- Props: `patientName, date, time, status, clinicalNoteStatus, onPress`
- Status visual: âmbar (pendente), verde (confirmada), azul (concluída), vermelho (faltou)
- Badge de prontuário: "Prontuário pendente" / "Rascunho" / "Validado"

### EmptyState

```tsx
<EmptyState
  icon={<Calendar />}
  title="Nenhuma sessão hoje"
  description="Toque em + para agendar"
  action={{ label: "Agendar", onPress: () => {} }}
/>
```

### theme/spacing.ts + theme/typography.ts

```ts
// spacing.ts
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

// typography.ts
export const typography = {
  h1: { fontSize: 28, fontFamily: 'Lora_600SemiBold' },
  h2: { fontSize: 22, fontFamily: 'Lora_500Medium' },
  body: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  caption: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
};
```

---

## Telas excluídas do escopo

- **EthicsScreen** — conteúdo estático de baixo uso no mobile, removido a pedido
- **ScalesScreen** — removido a pedido; pode ser adicionado em sub-projeto futuro
- **Portal do paciente** — sub-projeto B separado
- **Gravador Sub-projeto B** (gravação direta na sessão com IA em tempo real) — sub-projeto futuro

---

## Dependências novas (package.json)

```json
"expo-audio": "~2.0.0",
"zustand": "^5.0.0",
"@react-native-async-storage/async-storage": "^2.0.0"
```

`expo-av` mantido apenas para playback de áudios existentes enquanto migração não é completa.

---

## Critérios de sucesso

1. Todas as features do Ethos Web (escopo profissional) disponíveis no mobile
2. Gravador resiste a ligações telefônicas sem perder áudio
3. Gravador resiste a crash/restart com recuperação do arquivo
4. Transcrição via Whisper aparece na sessão após processamento
5. Modo privado mascara nomes em todas as telas
6. Sessões sincronizadas via Zustand — sem re-fetch desnecessário entre tabs
7. Scroll confortável em todas as telas (sem conteúdo cortado)
8. Pull-to-refresh funcional em todas as listas
