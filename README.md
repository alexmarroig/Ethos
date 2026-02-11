# ETHOS — Plataforma Clínica Offline-First

ETHOS é um ambiente de trabalho clínico para psicólogos, projetado com foco em privacidade absoluta, segurança de dados e produtividade via ferramentas locais de IA.

**Estado Atual:** v1.0 (Lançamento Clínico).

## 🚀 Funcionalidades Atuais (Operacionais)

- **Transcrição Offline:** Processamento local de áudio via Whisper (Faster-Whisper) rodando em CPU.
- **Registro Clínico Ético:** Geração de rascunhos de prontuário baseados na transcrição (CRP-Compliant).
- **Segurança de Dados:** SQLCipher + AES-256-GCM (OOM Safe).
- **Exportação:** PDF e DOCX para prontuários validados.
- **Gestão Financeira:** Controle de cobranças, pagamentos, pacotes e pacientes pro-bono.
- **Admin Control Plane:** Métricas sanitizadas e **Admin Test Lab** para integridade local.
- **Portal do Paciente:** Dashboard mobile completo para confirmação de presença, diários e avisos.

## 🛠 Estrutura do Projeto

- `apps/ethos-desktop`: Electron + React.
- `apps/ethos-mobile`: Expo (Android/iOS).
- `apps/ethos-transcriber`: Worker local Whisper.
- `packages/shared`: Tipos compartilhados.

## 💻 Como Executar

1. `npm install`
2. `npm run dev:electron` (Desktop)
3. `npm run dev:mobile` (Mobile)
