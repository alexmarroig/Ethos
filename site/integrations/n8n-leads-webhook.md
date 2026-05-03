# n8n webhook para leads ETHOS

Use o n8n self-hosted como `VITE_LEAD_ENDPOINT`.

## 1. Criar webhook

No n8n:

1. Crie workflow novo.
2. Adicione node `Webhook`.
3. Method: `POST`.
4. Path: `ethos-leads`.
5. Copie a Production URL.

Exemplo:

```text
https://SEU-N8N/webhook/ethos-leads
```

Use essa URL na Vercel:

```env
VITE_LEAD_ENDPOINT=https://SEU-N8N/webhook/ethos-leads
```

Depois faca redeploy do site.

## 2. Payload recebido

O site envia:

```json
{
  "name": "Nome",
  "email": "email@exemplo.com",
  "whatsapp": "(00) 00000-0000",
  "profile": "Psicologa",
  "interest": "Conhecer o ETHOS",
  "source": "ethos_site",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "software-psicologos",
  "utm_term": "software para psicologos",
  "utm_content": "landing-a",
  "user_agent": "..."
}
```

## 3. Fluxo recomendado

Webhook
> Set/Code para limpar campos
> Google Sheets append row
> Gmail/Email avisando novo lead
> Opcional: CRM/Notion/Airtable
> Respond to Webhook `{ "ok": true }`

## 4. Colunas no Google Sheets

```text
Data
Nome
Email
WhatsApp
Perfil
Interesse
Origem
UTM Source
UTM Medium
UTM Campaign
UTM Term
UTM Content
User Agent
Status
Observacoes
```

## 5. Regras

- Nao pedir dados clinicos no site publico.
- Nao enviar dados sensiveis por automacao.
- Usar `lead_submit` como conversao no GA4.
- Guardar UTMs para saber qual campanha gerou lead.
