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

## 8. Automacao editorial com n8n

Fluxo recomendado:

1. Cron semanal no n8n.
2. Buscar assuntos em fontes:
   - Google Search Console;
   - Google Trends;
   - termos de busca do Google Ads;
   - perguntas frequentes de leads;
   - concorrentes e SERP manual revisada.
3. Gerar pauta com:
   - palavra-chave principal;
   - intencao de busca;
   - titulo;
   - meta description;
   - H2s;
   - links internos;
   - CTA;
   - pagina comercial relacionada.
4. Salvar pauta em uma base editorial.
5. Revisao humana obrigatoria.
6. Publicar no site.

Nunca automatizar publicacao sem revisao em temas clinicos, eticos ou regulados.

## 9. Painel para editar conteudo

Opcoes:

1. Simples agora: editar `site/src/data/articles.ts` e abrir PR.
2. Painel leve: Decap CMS/Netlify CMS com arquivos no Git.
3. CMS externo: Sanity, Strapi ou Contentful.
4. Painel proprio ETHOS Admin: criar CRUD de artigos, categorias, drafts e publicacao.

Recomendacao:

- curto prazo: manter artigos versionados em Git;
- medio prazo: Decap CMS ou Sanity;
- longo prazo: painel proprio no admin ETHOS se o marketing virar rotina diaria.

Campos minimos de um painel:

- titulo;
- slug;
- description;
- categoria;
- palavras-chave;
- data;
- tempo de leitura;
- secoes;
- FAQ;
- status: draft/revisao/publicado;
- pagina comercial relacionada.
