# Inventario SEO, Ads e Captacao - ETHOS Site

Este arquivo lista onde ver e conferir tudo que foi criado para o site publico do ETHOS.

## Dominio canonico

- Producao: https://ethos-clinic.com
- App ETHOS: https://app.ethos-clinic.com
- BioHub: https://biohub.ethos-clinic.com

## Arquivos tecnicos publicos

Depois do deploy, estes arquivos devem abrir direto no navegador:

- https://ethos-clinic.com/robots.txt
- https://ethos-clinic.com/sitemap.xml
- https://ethos-clinic.com/ads.txt
- https://ethos-clinic.com/privacy.txt
- https://ethos-clinic.com/og-image.svg

No repositorio:

- `site/public/robots.txt`
- `site/public/sitemap.xml`
- `site/public/ads.txt`
- `site/public/privacy.txt`
- `site/public/og-image.svg`

## SEO base da home

Arquivo:

- `site/index.html`

O que conferir:

- canonical para `https://ethos-clinic.com`
- Open Graph com `og:url` no dominio correto
- Twitter card
- imagem social `og-image.svg`
- JSON-LD inicial com `Organization`, `WebSite` e `SoftwareApplication`

## Rotas publicas criadas

Rotas no app React:

- `/`
- `/blog`
- `/blog/:slug`
- `/privacidade`
- `/termos`
- `/cookies`
- `/contato`
- `/obrigado`

Arquivo principal:

- `site/src/App.tsx`

Paginas:

- `site/src/pages/BlogPage.tsx`
- `site/src/pages/ArticlePage.tsx`
- `site/src/pages/LegalPage.tsx`
- `site/src/pages/ContactPage.tsx`
- `site/src/pages/ThankYouPage.tsx`

## Artigos iniciais

Arquivo:

- `site/src/data/articles.ts`

Artigos:

- `/blog/prontuario-psicologico-como-organizar-com-seguranca`
- `/blog/software-para-psicologos-o-que-avaliar`
- `/blog/agenda-para-psicologos-reduzir-faltas`
- `/blog/ia-para-psicologos-limites-eticos-usos-seguros`
- `/blog/organizar-financeiro-consultorio-psicologico`

Cada artigo tem:

- titulo
- descricao
- slug
- autor/organizacao
- data
- categoria
- tempo de leitura
- secoes de conteudo
- schema `Article`

## Schemas e metatags dinamicas

Arquivos:

- `site/src/lib/seo.ts`
- `site/src/lib/schemas.ts`

Schemas preparados:

- `Organization`
- `WebSite`
- `SoftwareApplication`
- `FAQPage`
- `BreadcrumbList`
- `Article`

## Captacao de leads

Componente:

- `site/src/components/landing/LeadCapture.tsx`

Rota:

- `/contato`

Campos:

- nome
- email
- WhatsApp
- perfil profissional
- interesse

Observacao importante:

- o formulario nao pede dados clinicos ou dados de pacientes.
- se `VITE_LEAD_ENDPOINT` existir, envia para endpoint configurado.
- se nao existir, abre fallback por email.

## Analytics, Ads e consentimento

Arquivos:

- `site/src/lib/tracking.ts`
- `site/src/components/CookieConsent.tsx`
- `site/src/components/RouteTracker.tsx`

Variaveis no `.env.example`:

- `VITE_GTM_ID`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_GOOGLE_ADS_ID`
- `VITE_GOOGLE_ADS_CONVERSION_LABEL`
- `VITE_META_PIXEL_ID`
- `VITE_LEAD_ENDPOINT`

Eventos medidos:

- `page_view`
- `cta_app_click`
- `biohub_click`
- `pricing_click`
- `lead_submit`
- `login_click`

Importante:

- tags de analytics/ads so carregam depois do consentimento do usuario.
- preferir GTM como camada principal em producao.

## BioHub no site ETHOS

Arquivos:

- `site/src/config/biohub.ts`
- `site/src/components/landing/BioHub.tsx`

URLs usadas:

- `https://biohub.ethos-clinic.com`
- `https://biohub.ethos-clinic.com/auth/register`
- `https://biohub.ethos-clinic.com/pricing`
- `https://biohub.ethos-clinic.com/auth/login`

## Como testar localmente

Build:

```bash
npm.cmd --prefix site run build
```

Dev server:

```bash
npm.cmd --prefix site run dev
```

Depois abra a URL local mostrada pelo Vite.

## Checklist pos-deploy

1. Abrir `https://ethos-clinic.com/robots.txt` e conferir `Sitemap`.
2. Abrir `https://ethos-clinic.com/sitemap.xml` e conferir as URLs absolutas.
3. Enviar o sitemap no Google Search Console.
4. Configurar `VITE_GTM_ID` ou GA4/Ads/Meta nas variaveis de producao.
5. Testar consentimento: sem aceitar, tags de marketing nao devem carregar.
6. Testar evento `lead_submit` no envio do formulario.
7. Testar CTAs para app ETHOS e BioHub.
8. Validar paginas legais: `/privacidade`, `/termos`, `/cookies`.
9. Conferir artigos no Rich Results Test / Schema Markup Validator.
10. Revisar Core Web Vitals / Lighthouse.

## Proximo passo para SEO forte

O site ja tem a base tecnica, mas para disputar topo de busca o ideal e:

- pre-render/SSG das rotas publicas, para entregar HTML inicial dos artigos;
- calendario editorial continuo, com novos artigos toda semana;
- paginas comparativas e de intencao comercial, por exemplo `software para psicologos`, `prontuario psicologico digital`, `agenda para psicologos`;
- backlinks e autoridade de dominio;
- Search Console configurado;
- conteudo assinado/revisado por profissional quando falar de pratica clinica;
- melhorias continuas de performance e conversao.
