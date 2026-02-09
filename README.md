# ETHOS — Plataforma Clínica Offline-First

ETHOS é um ambiente de trabalho clínico para psicólogos, projetado com foco em privacidade absoluta, segurança de dados e produtividade via ferramentas locais de IA.

**Estado Atual:** v0.x (Em desenvolvimento ativo).

## 🚀 Funcionalidades Atuais (Operacionais)

As funcionalidades abaixo estão implementadas e conectadas ao núcleo do sistema:

- **Transcrição Offline:** Processamento local de áudio via Whisper (Faster-Whisper) rodando em CPU. Suporta importação de arquivos e gravação direta.
- **Registro Clínico Ético:** Geração de rascunhos de prontuário baseados na transcrição. O sistema exige validação humana explícita antes de considerar a nota como final.
- **Segurança de Dados:** Banco de dados SQLite criptografado via SQLCipher. Áudios e rascunhos são armazenados localmente e criptografados em repouso (AES-256-GCM).
- **Exportação:** Geração de documentos em formatos PDF e DOCX para prontuários validados.
- **Agenda e Pacientes:** Gestão completa de cadastro de pacientes e agendamento de sessões com persistência local.
- **WhatsApp Satélite:** Geração de lembretes manuais com templates customizáveis.
- **Financeiro Clínico:** Registro de cobranças e pagamentos com controle de saldo por paciente.
- **Documentos e Relatórios:** Geração automática de declarações de comparecimento e relatórios psicológicos em PDF.
- **Segurança e Backup:** Ferramentas integradas para criação de backups criptografados, restauração de dados e expurgo total (purge).
- **Admin Control Plane:** Interface para monitoramento sanitizado de métricas de uso e saúde do sistema (sem acesso a dados clínicos).
- **Modo Seguro:** Detecção automática de corrupção de banco de dados com travamento de funcionalidades críticas para proteção de dados.

## 🛠 Estrutura do Projeto (Monorepo)

- `apps/ethos-desktop`: Interface Electron + React (Vite). Gerencia a UI, o banco de dados local e a orquestração de serviços.
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

## ⚠️ Limitações Atuais (Mocks na UI)
Algumas seções da interface ainda utilizam dados de exemplo (mocks) enquanto a integração completa com os serviços de banco de dados está sendo finalizada:
- **Portal do Paciente:** Ainda não disponível.
