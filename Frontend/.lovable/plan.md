

# Atualizar Credenciais de Teste (DEV fallback)

## O que muda

Atualizar as credenciais de fallback DEV em dois arquivos para refletir os novos usuarios de teste.

### 1. `src/contexts/AuthContext.tsx`

Substituir o mapa `DEV_USERS` e a senha:

| Campo | Antes | Depois |
|-------|-------|--------|
| Admin email | `admin@ethos.app` | `admin@admin` |
| Admin nome | Administrador | Administrador |
| Psico email | `demo.psico@ethos.app` | `camila@admin` |
| Psico nome | Dra. Marina Santos | Camila (Psicologa) |
| Paciente email | `demo.paciente@ethos.app` | `paciente@admin` |
| Paciente nome | Ana Carolina Silva | Paciente Teste |
| `DEV_PASSWORD` | `ethos2026` | `bianco256` |

### 2. `src/pages/LoginPage.tsx`

Atualizar o array `demoUsers` e a senha no `fillDemo`:

```text
demoUsers = [
  { label: "Admin",     email: "admin@admin" },
  { label: "Psicologo", email: "camila@admin" },
  { label: "Paciente",  email: "paciente@admin" },
]
```

E a senha preenchida automaticamente de `ethos2026` para `bianco256`.

## Arquivos modificados

- `src/contexts/AuthContext.tsx` -- DEV_USERS + DEV_PASSWORD
- `src/pages/LoginPage.tsx` -- demoUsers + fillDemo password

