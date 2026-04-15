# ETHOS na Vercel

## Arquitetura recomendada

Para colocar o fluxo online hoje, o caminho mais seguro é:

1. `Site` em um projeto Vercel
2. `Frontend` em um projeto Vercel
3. `apps/ethos-clinic` fora da Vercel, em um host de backend dedicado

Sugestão de domínios:

- `ethos.seudominio.com` ou `www.seudominio.com` para o site
- `app.seudominio.com` para o ETHOS Web
- `api.seudominio.com` para o backend clínico

Esse desenho é o mais estável porque:

- `Site` e `Frontend` são apps Vite estáticos e funcionam muito bem na Vercel
- o backend clínico atual usa arquivo local, upload local e execução Node dedicada
- esse backend não é um bom candidato para Vercel Functions no estado atual

## Fluxo recomendado

1. usuário entra no site
2. clica em `Entrar`
3. vai para a tela de login do site
4. o site autentica no backend clínico
5. o site redireciona para o ETHOS Web com o token
6. o ETHOS Web assume a sessão e segue no app

## Projeto 1: Site

Diretório:

- `Site`

Configuração no projeto da Vercel:

- Framework Preset: `Vite`
- Root Directory: `Site`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: deixar padrão

Variáveis de ambiente:

- `VITE_API_URL=https://api.seudominio.com`
- `VITE_APP_URL=https://app.seudominio.com`

## Projeto 2: ETHOS Web

Diretório:

- `Frontend`

Configuração no projeto da Vercel:

- Framework Preset: `Vite`
- Root Directory: `Frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: deixar padrão

Variáveis de ambiente:

- `VITE_CLINICAL_BASE_URL=https://api.seudominio.com`
- `VITE_CONTROL_BASE_URL=https://control.seudominio.com`
- `VITE_APP_VERSION=1.0.0`
- `VITE_ENV=production`

Observação:

- se você ainda não tiver um `control` separado em produção, mantenha a variável apontando para o endpoint que realmente existir, ou ajuste o app para desabilitar esse consumo

## Erro `Tracker "idealTree" already exists`

Esse erro costuma acontecer quando o projeto está com `Root Directory` em um subdiretório e também foi configurado um `Install Command` manual apontando para outro nível, por exemplo:

- `npm install --prefix=../..`

No seu caso, isso está errado para a Vercel.

Use assim:

- `Root Directory`: `Site` ou `Frontend`
- `Install Command`: vazio / padrão da Vercel

Não combine:

- `Root Directory = Site`
- com `Install Command = npm install --prefix=../..`

porque isso força o npm a instalar em outro lugar e costuma gerar conflito no ambiente de build.

## Backend clínico

Hoje, para colocar em produção rápido, o melhor é usar:

- Render
- Railway
- Fly.io

Minha recomendação prática para o estado atual do projeto:

- `Render` para o backend clínico

Motivo:

- é mais simples para manter um processo Node contínuo
- funciona melhor com backend que espera rodar como servidor dedicado
- é mais natural do que adaptar esse backend inteiro para Functions

## Limite importante do backend atual

O backend atual ainda usa persistência local baseada em arquivo JSON e uploads locais.

Isso serve para:

- validação
- piloto
- uso interno pequeno

Mas não é o ideal para produção séria multiusuário.

Para produção mais confiável, o próximo passo recomendado é:

1. migrar dados para Postgres
2. migrar arquivos para storage de objeto
3. remover dependência de disco local como fonte principal de verdade

## Checklist de deploy

### Site

1. criar projeto Vercel apontando para o repositório
2. definir `Root Directory = Site`
3. remover qualquer `Install Command` customizado
4. configurar as variáveis `VITE_API_URL` e `VITE_APP_URL`
5. deploy

### ETHOS Web

1. criar segundo projeto Vercel apontando para o mesmo repositório
2. definir `Root Directory = Frontend`
3. remover qualquer `Install Command` customizado
4. configurar `VITE_CLINICAL_BASE_URL`
5. deploy

### Backend

1. publicar `apps/ethos-clinic` em um host de backend
2. apontar `api.seudominio.com` para ele
3. validar `/health`
4. testar login site -> app

## Validação pós-deploy

Depois dos 3 ambientes no ar, validar:

1. site abre corretamente
2. botão `Entrar` leva ao login
3. login autentica no backend
4. redirecionamento para o app funciona
5. o app carrega a sessão pelo token
6. chamadas para `/auth/login`, pacientes, documentos e sessões retornam `200`

## Observação final

Se você quiser colocar tudo no ar com menos risco hoje:

- suba `Site` e `Frontend` na Vercel
- suba o backend no Render

Esse é o melhor equilíbrio entre velocidade e estabilidade para o ETHOS no estado atual do código.
