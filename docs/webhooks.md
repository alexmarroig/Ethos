# Webhooks

## Stripe webhook (Control Plane)
Endpoint: `POST /v1/webhooks/stripe`

Requisitos:
- Header `Stripe-Signature` obrigatório.

Eventos processados:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_method.attached`

## Transcriber webhook (Clinical Plane)
Endpoints:
- `POST /api/webhook`
- `POST /webhooks/transcriber`

Atualiza status de jobs e emite telemetria local sanitizada.
