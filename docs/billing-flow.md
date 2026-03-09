# Billing Flow (Stripe)

## Planos
- Solo: mensal/anual
- Pro: mensal/anual
- Trial: 7 dias

## Ciclo
1. `POST /v1/billing/checkout-session`
2. Stripe confirma eventos no webhook
3. `POST /v1/webhooks/stripe` atualiza status e entitlement snapshot
4. Cliente consulta:
   - `GET /v1/billing/subscription`
   - `GET /v1/entitlements`

## Eventos tratados
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
