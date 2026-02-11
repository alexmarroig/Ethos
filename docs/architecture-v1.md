# ETHOS V1 Architecture (Control Plane + Clinical Plane)

## Serviços finais e responsáveis de deploy

| Serviço | Pasta | Ambiente alvo | Responsável de deploy |
|---|---|---|---|
| ETHOS Control Plane | `apps/ethos-control-plane` | Cloud | Time Platform/Cloud |
| ETHOS Clinic (Clinical Plane) | `apps/ethos-clinic` | Local (desktop/mobile/edge local) | Time App Clínica (deploy junto ao app cliente) |
| ETHOS Transcriber | `apps/ethos-transcriber` | Local worker | Time App Clínica |

## A) Control Plane (cloud)
Responsável por:
- Contas, convites, auth e sessões
- Billing (Stripe), webhooks e status de assinatura
- Entitlements/snapshots por usuário
- Telemetria sanitizada
- Admin global com métricas agregadas e auditoria sanitizada

Nunca recebe conteúdo clínico por padrão.

## B) Clinical Plane (local/offline)
Responsável por:
- Sessões, áudio, transcrição, prontuário, validação, relatórios
- Anamnese, escalas, forms/diários, financeiro clínico
- Exports, backup/restore/purge por usuário
- Jobs locais e webhook do transcriber

Dados clínicos ficam locais/offline por padrão.

## Integração
1. Desktop/Mobile autenticam no control plane.
2. Recebem subscription + entitlements.
3. Sincronizam snapshot no `apps/ethos-clinic`.
4. Clinical plane aplica gating com grace period offline.
