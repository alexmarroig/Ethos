# Playbook de aquisicao ETHOS

Este documento organiza os proximos passos para transformar o site publico em canal de SEO, Google Ads, Meta Ads e captacao comercial.

## 1. Paginas criadas

Paginas comerciais SEO:

- `/software-para-psicologos`
- `/prontuario-psicologico-online`
- `/agenda-para-psicologos`
- `/sistema-para-clinica-de-psicologia`
- `/ia-para-psicologos`
- `/app-para-psicologos`

Landing para anuncios:

- `/psicologos`

Todas foram adicionadas ao `sitemap.xml`.

## 2. Lead endpoint

Hoje o formulario publico usa `VITE_LEAD_ENDPOINT`.

Se essa variavel estiver vazia, o site usa fallback por email. Para producao, o ideal e criar um endpoint de CRM.

Contrato sugerido:

```http
POST /api/leads
Content-Type: application/json
```

Payload:

```json
{
  "name": "Nome",
  "email": "email@exemplo.com",
  "whatsapp": "(00) 00000-0000",
  "profile": "Psicologa",
  "interest": "Conhecer o ETHOS",
  "source": "ethos_site"
}
```

Regras:

- nao aceitar dados clinicos;
- salvar `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` e `utm_content` quando existirem;
- enviar alerta para email/CRM;
- responder rapido com `200` ou `201`;
- nao bloquear a navegacao do usuario.

Opcoes praticas:

- Google Sheets via Apps Script;
- HubSpot Forms/API;
- Airtable;
- Notion;
- endpoint proprio no backend ETHOS.

## 3. GA4 e eventos

Eventos enviados pelo site:

- `page_view`
- `cta_app_click`
- `biohub_click`
- `pricing_click`
- `lead_submit`
- `login_click`

Evento principal recomendado:

- `lead_submit`

Eventos de apoio:

- `pricing_click`
- `cta_app_click`
- `biohub_click`

## 4. Melhorar SEO tecnico com prerender/SSG

O site hoje e React/Vite SPA. Google consegue renderizar, mas para SEO forte o ideal e entregar HTML inicial para rotas publicas.

Opcoes:

1. Prerender com `vite-plugin-ssr`/`vite-plugin-prerender` ou ferramenta similar.
2. Migrar apenas o site publico para Astro.
3. Migrar apenas o site publico para Next.js com SSG.

Prioridade de prerender:

- `/`
- `/software-para-psicologos`
- `/prontuario-psicologico-online`
- `/agenda-para-psicologos`
- `/sistema-para-clinica-de-psicologia`
- `/ia-para-psicologos`
- `/app-para-psicologos`
- `/psicologos`
- `/blog`
- artigos do blog
- paginas legais

## 5. Calendario editorial

Objetivo: publicar conteudo que conecte busca informacional com paginas comerciais.

Primeiro ciclo de 30 dias:

1. Melhor software para psicologos em 2026
2. Prontuario psicologico online: o que nao pode faltar
3. Agenda online para psicologos: como organizar semana e faltas
4. Sistema para clinica de psicologia: como escolher
5. IA para psicologos: usos seguros e limites eticos
6. LGPD para psicologos: cuidados com dados de pacientes
7. Como organizar financeiro de consultorio psicologico
8. Como reduzir faltas e remarcacoes no consultorio

Cada artigo deve:

- linkar para uma pagina comercial;
- ter FAQ;
- ter schema `Article`;
- ter title e description unicos;
- responder uma busca real;
- evitar promessa clinica ou captura de dados sensiveis.

## 6. Rotina semanal

- Segunda: revisar Search Console.
- Terca: publicar ou atualizar um artigo.
- Quarta: revisar GA4 e eventos.
- Quinta: otimizar uma pagina comercial.
- Sexta: revisar campanhas, leads e termos de busca.

## 7. Indicadores

SEO:

- impressoes;
- cliques;
- posicao media;
- paginas indexadas;
- consultas com crescimento.

Ads:

- CTR;
- CPC;
- conversao `lead_submit`;
- custo por lead;
- termos de busca;
- qualidade da landing.

Produto:

- cliques para app;
- leads por interesse;
- visitas em paginas comerciais;
- conversao da landing `/psicologos`.
