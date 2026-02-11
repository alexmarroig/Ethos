# Offline Grace Policy

- Clinical plane usa snapshot de entitlement local.
- Grace period: 7-14 dias (nesta implementação, até 14 dias para `past_due` no control plane).
- Sem assinatura válida:
  - bloquear criação nova conforme limite/plano
  - permitir leitura/export/backup
