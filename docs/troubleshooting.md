# Troubleshooting

## Webhook atrasado
- Sintoma: plano não atualiza imediatamente.
- Ação: reenviar evento para `/v1/webhooks/stripe`.

## Worker interrompido
- Sintoma: job de transcrição falha.
- Ação: webhook do transcriber atualiza job para `failed`; reprocessar job.

## Assinatura expirada
- Sintoma: bloqueio de criação/transcrição.
- Ação: regularizar billing e sincronizar entitlement (`/local/entitlements/sync`).
