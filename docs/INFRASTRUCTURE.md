# Ethos — Mapa de Infraestrutura

> Atualizado em: 2026-04-19

---

## Visão geral

```
Usuário (browser/mobile)
    │
    ├─► Vercel          — Frontend React (ethos-web)
    │
    └─► Render          — Backend clínico (ethos-clinical)
             │
             ├─► Neon (PostgreSQL)   — banco do Ethos backend
             │
             └─► Fly.io             — Evolution API (WhatsApp)
                      │
                      └─► Neon (PostgreSQL)   — banco da Evolution API
```

---

## Serviços ativos

### 1. Frontend — Vercel
| Campo | Valor |
|---|---|
| **Plataforma** | Vercel |
| **URL** | https://ethos-web.vercel.app _(confirmar URL real)_ |
| **Stack** | React + Vite + Tailwind + shadcn/ui |
| **Deploy** | Automático a cada push em `main` |
| **Custo atual** | Grátis (Hobby) |
| **Limite grátis** | 100 GB bandwidth/mês, builds ilimitados |
| **Quando pagar** | Tráfego > 100 GB/mês ou SSO de time → Pro $20/mês |

---

### 2. Backend clínico — Render
| Campo | Valor |
|---|---|
| **Plataforma** | Render |
| **URL** | https://ethos-clinical.onrender.com |
| **Serviço** | Web Service (Node.js + TypeScript) |
| **Repo** | `apps/ethos-clinic` |
| **Deploy** | Automático a cada push em `main` |
| **Custo atual** | Grátis (spin down após 15 min inatividade) |
| **Limite grátis** | 750h compute/mês |
| **Quando pagar** | Quando precisar 24/7 sem spin down → Starter $7/mês |
| **Dados em memória** | `clinic-data.json` (persiste em disco no Render) |

> ⚠️ **Atenção:** no plano gratuito o backend "adormece" após 15 min sem tráfego. A primeira requisição após isso leva ~30s para responder. Para produção real, subir para o plano Starter ($7/mês).

---

### 3. WhatsApp — Evolution API no Fly.io
| Campo | Valor |
|---|---|
| **Plataforma** | Fly.io |
| **App name** | `ethos-evolution` |
| **URL** | https://ethos-evolution.fly.dev |
| **Imagem Docker** | `evoapicloud/evolution-api:latest` |
| **Region** | `gru` (São Paulo) |
| **Custo atual** | Grátis (free tier Fly.io) |
| **Limite grátis** | 3 VMs compartilhadas, 160 GB transfer/mês |
| **Volume persistente** | `evolution_instances` — 1 GB — armazena sessão WhatsApp |
| **Quando pagar** | Se precisar de mais memória/CPU → ~$1.94/mês por VM dedicada |
| **Banco** | Neon PostgreSQL (ver abaixo) |
| **Secrets configurados** | `AUTHENTICATION_API_KEY`, `DATABASE_CONNECTION_URI`, `WEBHOOK_GLOBAL_URL` |
| **Webhook destino** | https://ethos-clinical.onrender.com/webhook/whatsapp |

---

### 4. Banco de dados — Neon (PostgreSQL)
| Campo | Valor |
|---|---|
| **Plataforma** | Neon |
| **Projeto** | Ethos |
| **Region** | AWS US East 1 (N. Virginia) |
| **Host pooler** | `ep-summer-base-am1f022n-pooler.c-5.us-east-1.aws.neon.tech` |
| **Database** | `neondb` |
| **Usuário** | `neondb_owner` |
| **Custo atual** | Grátis |
| **Limite grátis** | 0.5 GB storage, 190 compute hours/mês |
| **Quem usa** | Evolution API (WhatsApp) |
| **Quando pagar** | Storage > 0.5 GB → Launch $19/mês |

> ℹ️ O backend Ethos (Render) usa armazenamento em arquivo JSON (`clinic-data.json`), **não** usa o Neon diretamente. O Neon é usado apenas pela Evolution API para persistir sessões WhatsApp.

---

## Variáveis de ambiente críticas

### Render (ethos-clinical)
| Variável | Descrição |
|---|---|
| _(padrão Node.js)_ | Backend não tem env vars externas críticas ainda |

### Fly.io (ethos-evolution)
| Variável | Descrição |
|---|---|
| `AUTHENTICATION_API_KEY` | Chave de acesso à Evolution API |
| `DATABASE_PROVIDER` | `postgresql` |
| `DATABASE_CONNECTION_URI` | Connection string do Neon |
| `WEBHOOK_GLOBAL_URL` | URL do backend Ethos para receber mensagens |
| `WEBHOOK_GLOBAL_ENABLED` | `true` |

---

## Configuração WhatsApp no Ethos

Após a Evolution API estar no ar, configurar em **AccountPage → WhatsApp**:

| Campo | Valor |
|---|---|
| URL | https://ethos-evolution.fly.dev |
| API Key | valor de `AUTHENTICATION_API_KEY` |
| Instance name | `ethos` |

---

## Custos atuais (abril 2026)

| Serviço | Plano | Custo/mês |
|---|---|---|
| Vercel | Hobby | **Grátis** |
| Render | Free | **Grátis** |
| Fly.io | Free | **Grátis** |
| Neon | Free | **Grátis** |
| **Total** | | **R$ 0** |

---

## Projeção de custos ao escalar

| Cenário | O que muda | Custo estimado/mês |
|---|---|---|
| Backend 24/7 (sem spin down) | Render Starter | ~R$ 40 |
| Mais pacientes / dados > 500 MB | Neon Launch | ~R$ 110 |
| Evolution API com mais performance | Fly.io VM dedicada | ~R$ 11 |
| Frontend com time / SSO | Vercel Pro | ~R$ 115 |
| **Produção confortável** | Render + Neon Launch | **~R$ 150/mês** |

---

## Domínios e DNS

| Serviço | Domínio atual | Domínio customizado |
|---|---|---|
| Frontend | `ethos-web.vercel.app` | — |
| Backend | `ethos-clinical.onrender.com` | — |
| WhatsApp API | `ethos-evolution.fly.dev` | — |

> Para adicionar domínio próprio: Vercel e Render suportam via painel, grátis. Fly.io requer certificado manual.

---

## Repositório

| Campo | Valor |
|---|---|
| **GitHub** | https://github.com/alexmarroig/Ethos |
| **Branch principal** | `main` |
| **Deploy automático** | Vercel + Render monitoram `main` |
| **Monorepo** | `apps/ethos-clinic` (backend), `Frontend/` (frontend) |
