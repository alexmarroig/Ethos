# Render + Monorepo npm workspaces: falhas de TypeScript no deploy

Este guia resolve o cenário em que o deploy falha no `tsc` com erros como:

- `TS7016` (`Could not find declaration file for module 'react'`)
- `TS7026` (`JSX element implicitly has type 'any'`)
- `TS2339` (`Property 'env' does not exist on type 'ImportMeta'`)
- `TS2307` (`Cannot find module 'vitest'`)
- `TS2687`/`TS2717` (conflitos em declarações globais, ex.: `window.ethos`)

## 1) Causa raiz mais comum no Render

Em monorepo, dois pontos costumam causar esse incidente:

1. **Build command amplo demais** (executa workspaces que não deveriam participar do deploy do backend).
2. **`NODE_ENV=production` definido manualmente nas Environment Variables do serviço**.

Quando `NODE_ENV=production` entra no ambiente de build, o npm pode omitir `devDependencies` (onde normalmente ficam `typescript`, `@types/*`, `vitest`), gerando erros de tipagem.

## 2) Configuração recomendada do serviço

### Root Directory

- Para monorepo com `packages/*` compartilhados, prefira **Root Directory no root do repositório**.
- Só use `Root Directory=apps/ethos-backend` se o backend for totalmente isolado e não depender de pacotes fora desse diretório.

### Build Filters

Use Build Filters para definir **quando** o deploy automático acontece:

- `apps/ethos-backend/**`
- `packages/shared/**` (se o backend depende dele)

> Build Filters controlam gatilho de autodeploy, não o escopo real de compilação.

### Environment Variables

- **Remova `NODE_ENV` das variáveis manuais do serviço**.
- Mantenha apenas variáveis necessárias à app (ex.: `PORT`).

## 3) Comandos de build/start para backend em workspace

No Render, use comandos direcionados ao workspace do backend:

```bash
npm ci
npm run build -w apps/ethos-backend
```

Start command:

```bash
npm run start -w apps/ethos-backend
```

Se for necessário executar migração antes de virar tráfego:

```bash
npm run migrate -w apps/ethos-backend
```

## 4) Ajustes no repositório para evitar erros de TypeScript

### 4.1 React/JSX (`TS7016` e `TS7026`)

No workspace frontend afetado:

- `dependencies`: `react`, `react-dom`
- `devDependencies`: `@types/react`, `@types/react-dom`

### 4.2 Vite env (`TS2339`)

Garanta `src/vite-env.d.ts` no app Vite:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Evite `import` nesse arquivo de declaration.

### 4.3 Testes no build (`TS2307` com `vitest`)

Escolha uma estratégia:

1. Instalar `vitest` no workspace que contém os testes.
2. Ou excluir testes do `tsc` de produção com `tsconfig.build.json`.

Exemplo:

```json
{
  "extends": "./tsconfig.json",
  "exclude": [
    "**/__tests__/**",
    "**/*.test.*",
    "**/*.spec.*"
  ]
}
```

### 4.4 Merge de declarações globais (`TS2687`/`TS2717`)

- Centralize o tipo global (`window.ethos`) em **um único arquivo `.d.ts`**.
- Evite declarar o mesmo membro global com tipos diferentes em múltiplos arquivos.

## 5) Checklist rápido de validação local

No root do monorepo:

```bash
npm ci
npm run build -w apps/ethos-backend
```

Se quiser reproduzir o erro de ambiente (para confirmar diagnóstico):

```bash
NODE_ENV=production npm install
npm run build
```

Se isso quebrar com erros de tipos e o fluxo normal não quebrar, a causa é quase sempre `devDependencies` ausentes durante o build.
