# ETHOS — Plataforma Clínica Offline-First

ETHOS é um ambiente de trabalho clínico para psicólogos, projetado com foco em privacidade absoluta, segurança de dados e produtividade via ferramentas locais de IA.

**Estado Atual:** v0.x (Em desenvolvimento ativo).

## 🚀 Funcionalidades Atuais (Operacionais)

As funcionalidades abaixo estão implementadas e conectadas ao núcleo do sistema:

- **Transcrição Offline:** Processamento local de áudio via Whisper (Faster-Whisper) rodando em CPU. Suporta importação de arquivos e gravação direta.
- **Registro Clínico Ético:** Geração de rascunhos de prontuário baseados na transcrição. O sistema exige validação humana explícita antes de considerar a nota como final.
- **Foco Clínico Mobile:** App mobile (iOS/Android) com dashboard de insights terapêuticos e interface premium (Glassmorphism).
- **Registro de Sessão Mobile:** Gravação real de áudio com feedback visual pulsante e integração com o motor de transcrição.
- **Segurança de Dados:** Banco de dados SQLite criptografado via SQLCipher. Áudios e rascunhos são armazenados localmente e criptografados em repouso (AES-256-GCM).
- **Exportação:** Geração de documentos em formatos PDF e DOCX para prontuários validados.
- **Autenticação Segura:** Sistema de login com persistência via biometria/token criptografado.
- **Ficha do Paciente:** Cadastro detalhado com CPF, endereço, rede de apoio e controle financeiro.
- **Transcrição e IA:** Processamento de áudio local e transformação inteligente de transcrições em documentos (Prontuário CRP, Relatórios).
- **Diários e Formulários:** Ferramentas adicionais para acompanhamento (Diário dos Sonhos/Emoções) com histórico integrado.
- **WhatsApp Satélite:** Lembretes manuais automatizados.
- **Gestão Financeira:** Controle de cobranças, pagamentos e emissão de recibos em PDF.
- **Segurança e Backup:** Backups criptografados e controle local total.
- **Admin Control Plane:** Métricas sanitizadas e saúde do sistema.
- **Modo Seguro:** Detecção automática de corrupção de banco de dados com travamento de funcionalidades críticas para proteção de dados.

## 🛠 Estrutura do Projeto (Monorepo)

- `apps/ethos-desktop`: Interface Electron + React (Vite). Gerencia a UI, o banco de dados local e a orquestração de serviços.
- `apps/ethos-mobile`: App móvel (Expo/React Native). Focado em mobilidade clínica, gravação de sessões e insights rápidos com interface Premium.
- `apps/ethos-transcriber`: Worker em Node.js/Python que executa o motor de transcrição Whisper de forma isolada.
- `packages/shared`: Tipos, DTOs e esquemas Zod compartilhados entre a UI e os serviços de back-end.

## 💻 Como Executar (Desenvolvimento)

### Pré-requisitos
- Node.js (v18+)
- Python 3.10+ (para o transcritor)
- FFmpeg (instalado no sistema para processamento de áudio)

### Setup
1. Instale as dependências na raiz:
   ```bash
   npm install
   ```
2. Inicie o ambiente de desenvolvimento:
   ```bash
   # Inicia a UI e o processo principal do Electron
   npm run dev:electron
   ```

### Variáveis de ambiente do frontend (Loveable/produção)
No `apps/ethos-desktop`, use:
```bash
CONTROL_API_BASE_URL=https://control-api.seudominio.com
CLINICAL_API_BASE_URL=https://clinical-api.seudominio.com
```
Existe um template em `apps/ethos-desktop/.env.example`.

### Contratos OpenAPI no frontend
Para evitar divergência entre frontend e APIs:
```bash
npm --workspace apps/ethos-desktop run contracts:generate
npm --workspace apps/ethos-desktop run contracts:check
```
Os contratos gerados ficam em `apps/ethos-desktop/src/services/api/contracts/` e são extraídos de:
- `apps/ethos-control-plane/openapi.yaml`
- `apps/ethos-backend/openapi.yaml`

## ⚠️ Limitações Atuais (Mocks na UI)
Algumas seções da interface ainda utilizam dados de exemplo (mocks) enquanto a integração completa com os serviços de banco de dados está sendo finalizada:
- **Portal do Paciente:** Ainda não disponível.
