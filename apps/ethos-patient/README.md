# Ethos Patient

Aplicação web para pacientes responderem formulários liberados pelo psicólogo. Inclui suporte a PWA para instalação em dispositivos móveis e pode ser empacotada em desktop (Electron) usando o mesmo bundle web.

## Scripts

```bash
npm --workspace apps/ethos-patient run dev
npm --workspace apps/ethos-patient run build
```

## Endpoints usados

- `POST /auth/login`
- `GET /forms`
- `POST /forms/entry`
