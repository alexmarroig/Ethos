# ETHOS SYSTEM AUDIT & FINOPS ANALYSIS

## 1. Executive Summary

ETHOS is a hybrid, local-first SaaS platform designed for clinical psychologists. Unlike traditional "Cloud-Native" SaaS, ETHOS minimizes infrastructure costs and maximizes privacy by performing heavy operations (Audio Transcription, Storage) directly on the user's hardware.

**Key Findings:**
- **Profitability:** The architecture is exceptionally cost-efficient. The baseline infrastructure cost per user is near-zero (approx. R$ 0.08/mo for average users) when using local transcription and metadata-only sync.
- **Break-even:** On the current R$ 89/mo plan, the system reaches a net-profit state with just 4 active users, even after upgrading to paid tiers for backend and database stability.
- **Scaling Moat:** The "Local-First" approach acts as a natural scaling buffer. Unlike competitors who pay per minute of audio processed in the cloud, ETHOS's margins actually *improve* as users perform more local transcriptions.
- **Primary Risk:** The "Heavy User" profile using premium cloud fallback for AI (GPT-4o + Cloud Transcription) is the only scenario that could potentially erode margins if not governed by usage credits.

---

## 2. Cost Table (BRL)

*Conversion Rate: 1 USD = R$ 5.50*

| Component | Usage | Tier | Cost (Monthly) | Scaling Logic |
| :--- | :--- | :--- | :--- | :--- |
| **Vercel** | Frontend Hosting | Hobby (Free) | R$ 0.00 | Pay R$ 110 (Pro) after 100GB BW |
| **Render** | Clinical Backend | Free | R$ 0.00 | Pay R$ 40 (Starter) for 24/7 uptime |
| **Neon** | Metadata Postgres | Free | R$ 0.00 | Pay R$ 105 (Launch) > 500MB storage |
| **Fly.io** | Evolution API / Workers | Free | R$ 0.00 | Pay ~R$ 15-30 for dedicated instances |
| **OpenRouter** | LLM (DeepSeek/Mini) | On-demand | R$ 0.006 / session | Per 1k tokens (Input + Output) |
| **Cloud Trans.** | Whisper Fallback | On-demand | R$ 2.00 / session | CPU compute time on Fly.io |

### Cost per User Profile (Estimated)

| Profile | AI Sessions | Infra Cost | AI Cost (GPT-4o-mini) | Total Cost / mo |
| :--- | :--- | :--- | :--- | :--- |
| **Light** | 5 | R$ 0.02 | R$ 0.03 | **R$ 0.05** |
| **Average** | 20 | R$ 0.02 | R$ 0.13 | **R$ 0.15** |
| **Heavy (Optimized)** | 80 | R$ 0.02 | R$ 0.53 | **R$ 0.55** |
| **Heavy (Premium Fallback)**| 80 | R$ 0.02 | R$ 160.00 | **R$ 160.00** |

---

## 3. Scaling Model

| Stage | Users | Annual Revenue (R$ 89/mo) | Infrastructure Required | OpEx (Monthly) | Margin |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MVP** | 1-5 | R$ 5,340 | All Free Tiers | R$ 2.00 | 99% |
| **Growth** | 50 | R$ 53,400 | Render Starter + Neon Free | R$ 50.00 | 98% |
| **Professional** | 100 | R$ 106,800 | Render Starter + Neon Launch | R$ 150.00 | 98% |
| **Scale** | 500 | R$ 534,000 | Vercel Pro + Render Pro | R$ 450.00 | 98% |
| **Enterprise** | 1000 | R$ 1,068,000 | Dedicated Cluster | R$ 1,200.00 | 97% |

---

## 4. Critical Risks

1.  **Clinical Note Timeout (Architecture):** The `clinicalNoteGenerator.ts` has a hardcoded 20s timeout. Heavy sessions (12k+ chars) might consistently fail on slower LLM models, driving users toward expensive "Premium" models.
2.  **Shared Multi-tenant WhatsApp (Scalability):** Running Evolution API for 500+ users on a single shared Fly.io instance will cause significant message lag and potential IP banning by Meta.
3.  **In-Memory Persistence (Reliability):** `apps/ethos-clinic` currently uses an in-memory Map (`db.json` sync). While fast, this risks data loss on container crashes before persistence triggers.
4.  **Token Inflation:** The current prompts are verbose. Since ETHOS sends the full transcription (up to 12k chars) for every note edit/generation, a "Heavy User" can easily consume 500k tokens in a single day of re-processing.

---

## 5. Recommended Architecture Changes

1.  **Credit-Based AI Governance:** Implement a "Soft Limit" on AI session generations. Light/Average users are 100% profitable, but a "Heavy" user on GPT-4o fallback is a loss-maker.
2.  **S3-Compatible Blob Storage:** Move encrypted clinical backups from the backend's local disk to Cloudflare R2 or AWS S3. This allows the Render backend to be truly stateless and cheaper to scale.
3.  **Client-Side "Pre-Summarization":** Before sending data to the LLM, perform a local regex-based "Clinical Data Extraction" to reduce the token count of the raw transcription by ~30%.
4.  **Decentralized Evolution API:** For "Pro" users, offer a "Bring your own API Key" or a dedicated sidecar container for WhatsApp to ensure zero interference between accounts.
