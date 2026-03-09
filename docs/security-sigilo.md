# Segurança e Sigilo

- Conteúdo clínico permanece local/offline por padrão.
- Control plane rejeita telemetria com campos proibidos (`text`, `transcript`, `patient`, `audio`, `file_path`, `content`).
- Admin global só recebe dados sanitizados e agregados.
- Prontuário nasce em DRAFT e exige validação humana explícita.
- Logs e telemetria evitam payload clínico.

## Escopo de purge de dados

Ao acionar `POST /purge`, o backend remove todos os registros vinculados ao usuário nos seguintes domínios:

- Dados clínicos e operacionais por `owner_user_id`: `patients`, `sessions`, `audioRecords`, `transcripts`, `clinicalNotes`, `reports`, `anamnesis`, `scales`, `forms`, `financial` e `jobs`.
- Telemetria e derivados por usuário: `telemetry` e `telemetryQueue` (inclusive remoção de eventos do usuário em filas compartilhadas).
- Auditoria ligada ao usuário: `audit` (quando for `actor_user_id` ou `target_user_id`).
- Sessões e autorização local: `sessionsTokens` e `localEntitlements`.

