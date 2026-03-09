# Troubleshooting - ETHOS

## Transcrição Lenta
- Verifique se outros programas pesados estão abertos.
- O ETHOS utiliza apenas CPU para garantir compatibilidade, o que pode levar alguns minutos dependendo da duração do áudio.

## Erro ao Importar Áudio
- Certifique-se de que o formato é suportado (WAV, MP3, M4A, OGG).
- Verifique se o arquivo não está corrompido.

## Banco de Dados Corrompido
- O app entrará em "Modo Seguro" se detectar corrupção.
- Utilize a função de Restaurar Backup se disponível.

## Webhook atrasado
- Sintoma: plano não atualiza imediatamente.
- Ação: reenviar evento para `/v1/webhooks/stripe`.

## Worker interrompido
- Sintoma: job de transcrição falha.
- Ação: webhook do transcriber atualiza job para `failed`; reprocessar job.

## Assinatura expirada
- Sintoma: bloqueio de criação/transcrição.
- Ação: regularizar billing e sincronizar entitlement (`/local/entitlements/sync`).

