# ETHOS - Documentação do Desenvolvedor

## Arquitetura
O ETHOS é construído como um monorepo:
- `/apps/ethos-desktop`: Interface Electron + React (Vite).
- `/apps/ethos-transcriber`: Worker local para transcrição (Faster-Whisper).
- `/packages/shared`: Tipos e DTOs compartilhados.

## Setup Local
1. `npm install`
2. `npm run build` (para compilar o transcritor e a UI)
3. `npm run dev:electron` (para rodar o app em modo dev)

## Transcrição
O worker utiliza `faster-whisper` rodando em CPU. Certifique-se de ter o `ffmpeg` instalado ou presente na pasta `/bin`.

## Segurança
- Banco de dados SQLite criptografado com SQLCipher via `better-sqlite3-multiple-ciphers`.
- Áudios criptografados em repouso (AES-256-GCM).
- Chave do vault protegida pelo `safeStorage` do Electron.

## Governança de integração e releases
- Política de integração (branch `main`, fluxo via PR e bloqueios): `docs/releases/integration-policy.md`.
- Checklist operacional de release: `docs/releases/release-checklist.md`.
- Registro de tags e changelog por deploy: `docs/releases/deploy-changelog.md`.
