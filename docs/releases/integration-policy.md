# Política de Integração e Aprovação de Branches

## Branch de integração oficial
- Branch de integração oficial: **`main`**.
- Branch de trabalho: **`work`** (ou feature branches derivadas).
- Fluxo permitido: `work/*` -> Pull Request -> `main`.

## Política de merge
1. É proibido merge direto em `main`.
2. Toda alteração deve passar por Pull Request com revisão.
3. A PR para `main` deve usar o template `work-to-main` com checklist obrigatório:
   - **control**
   - **clinical**
   - **mobile**
4. A workflow `PR Checklist Gate` deve passar antes do merge.

## Bloqueio de deploy automático de branches não aprovadas
- Deploy automático só é permitido para alterações **já revisadas e mergeadas em `main`**.
- Branches de trabalho (`work/*`, `feature/*`, etc.) não podem acionar deploy automático.
- Se houver integração com Render por auto-deploy, manter o deploy automático apontando apenas para `main`.
- Para ambientes de preview, usar deploy manual com sinalização explícita de ambiente.

## Recomendação de proteção de branch
Configurar no GitHub para `main`:
- Require a pull request before merging
- Require approvals
- Require status checks to pass (`CI`, `PR Checklist Gate`)
- Restrict who can push
