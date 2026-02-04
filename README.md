# ETHOS

Plataforma clínica offline para Windows com fluxo de agenda, sessões, transcrição local e prontuário em rascunho. A IA é usada apenas como apoio documental, sem diagnóstico ou conduta automática.

## Estrutura do monorepo

- `apps/ethos-desktop`: Electron + React (UI). Fluxo clínico completo, com consentimento, rascunho e validação.
- `apps/ethos-transcriber`: Worker local para transcrição (faster-whisper + ffmpeg) via IPC.
- `packages/shared`: Tipos e DTOs compartilhados.

## Fluxo MVP (offline)

1. Agenda semanal simples.
2. Sessão → importar/gravar áudio (com consentimento).
3. Worker local transcreve com timestamps.
4. Gerar prontuário automático como **rascunho** (texto descritivo, sem inferências).
5. Edição manual e validação explícita.
6. Exportação DOCX/PDF.

## Execução (placeholder)

Este repositório contém a base do monorepo e pontos de integração. Scripts reais de build/electron-builder devem ser adicionados conforme o empacotamento Windows.
