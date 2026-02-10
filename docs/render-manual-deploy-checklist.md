# Render — Checklist de Deploy Manual (produção)

Use este procedimento para garantir que o deploy no Render está apontando para o commit correto do GitHub.

## 1) Confirmar branch no Render

No serviço do Render, valide em **Settings** ou no cabeçalho do deploy que a branch conectada é:

- `main`

> Se não estiver em `main`, ajuste a branch conectada antes de continuar.

## 2) Executar deploy manual

No painel do serviço:

1. Abra **Manual Deploy**.
2. Clique em **Deploy latest commit**.

## 3) Limpar cache de build (quando disponível)

Se a opção aparecer no fluxo de deploy manual, habilite:

- **Clear build cache**

Isso reduz risco de artefatos antigos mascararem mudanças recentes.

## 4) Verificar SHA do build vs. HEAD do GitHub

1. Abra os logs do novo build no Render.
2. No início do log, localize o SHA/commit usado no deploy.
3. Compare com o HEAD da branch `main` no GitHub.

### Comandos úteis para validação local

```bash
# SHA local atual
 git rev-parse HEAD

# SHA remoto da branch main
 git ls-remote origin refs/heads/main
```

O SHA do log do Render deve bater com o SHA remoto de `refs/heads/main`.

## 5) Se houver divergência de SHA

Se o SHA no Render for diferente do HEAD do GitHub:

1. Refaça o deploy manual com **Deploy latest commit**.
2. Se persistir, **reconecte o repositório** no Render.
3. Execute novo deploy manual (de preferência com **Clear build cache** habilitado).

---

## Registro rápido (preencher em incidentes)

- Serviço Render:
- Branch conectada:
- SHA no log do Render:
- SHA `origin/main`:
- Cache limpo no deploy? (sim/não):
- Ação tomada:
- Resultado:
