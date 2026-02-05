# Entitlements V1

## Campos retornados pelo Control Plane
- `exports_enabled`
- `backup_enabled`
- `forms_enabled`
- `scales_enabled`
- `finance_enabled`
- `transcription_minutes_per_month`
- `max_patients`
- `max_sessions_per_month`

## Perfis padrão
### SOLO
- exports_enabled=true
- backup_enabled=true
- forms_enabled=true
- scales_enabled=true
- finance_enabled=true
- transcription_minutes_per_month=600
- max_patients=200
- max_sessions_per_month=200

### PRO
- exports_enabled=true
- backup_enabled=true
- forms_enabled=true
- scales_enabled=true
- finance_enabled=true
- transcription_minutes_per_month=3000
- max_patients=2000
- max_sessions_per_month=2000

## Grace Offline
- 14 dias após `last_successful_subscription_validation_at`.
- Fora do grace: bloquear criação de novos itens premium; manter leitura e permitir export/backup.
