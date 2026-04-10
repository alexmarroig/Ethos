# Como Distribuir e Testar o ETHOS Mobile

## Android interno via EAS Cloud

O fluxo oficial para teste interno no Android e o perfil `preview`.

Ele gera um APK instalavel de verdade:

- abre como app normal
- nao exige Expo Go
- nao exige development build

### Perfis oficiais

- `development`: somente dev client para desenvolvimento local
- `preview`: APK instalavel para teste interno
- `release`: AAB para Google Play

## O que ja esta configurado no repositorio

Fonte de verdade do build:

- [apps/ethos-mobile/eas.json](C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-mobile\eas.json)
- [apps/ethos-mobile/app.config.js](C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-mobile\app.config.js)

Estado atual validado:

- `preview` usa `distribution: internal`
- `preview` usa `android.buildType: apk`
- `development` e o unico perfil com `developmentClient: true`
- `expo-dev-client` so entra quando `EAS_BUILD_PROFILE=development`
- `projectId` atual: `acf7b22f-889c-4233-8f82-f1ddc71984a7`

## URLs de API usadas pelo APK `preview`

Hoje o perfil `preview` ja sai configurado com estas URLs:

- `https://ethos-clinical.onrender.com`
- `https://ethos-control.onrender.com`

Importante:

- no build cloud, so definir `$env:EXPO_PUBLIC_ETHOS_API_URL=...` no terminal NAO garante override do bundle remoto se o `eas.json` continuar fixando outras URLs
- se voce quiser trocar a API do `preview`, faca uma destas duas coisas:
  - altere temporariamente o bloco `build.preview.env` em [apps/ethos-mobile/eas.json](C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-mobile\eas.json)
  - ou mova essas variaveis para o ambiente gerenciado do EAS e pare de fixa-las no profile

<<<<<<< ours
Se o objetivo for usar Render, nao precisa mudar nada antes do build.

## Runbook operacional
=======
### Opcao 1 (recomendada): EAS cloud build

1. Faça login no Expo:
   - `npx eas-cli login`
2. Gere o APK interno:
   - `npm --workspace apps/ethos-mobile run build:android:apk`
3. Instale o APK no aparelho Android quando o build terminar.

### Opcao 2: APK local via Gradle (sem EAS)

Use essa opcao quando o ambiente nao consegue baixar/executar `eas-cli`.

1. Gere/projete o Android nativo e compile release:
   - `npm --workspace apps/ethos-mobile run build:android:apk:local`
2. O APK final ficara em:
   - `apps/ethos-mobile/android/app/build/outputs/apk/release/app-release.apk`

> Observacao: para a opcao local voce precisa ter Android SDK + Java configurados na maquina.

### Validacao rapida do APK instalado
>>>>>>> theirs

### 1. Login no Expo / EAS

No repo:

```powershell
cd C:\Users\gaming\Desktop\Projetos\Ethos-main\apps\ethos-mobile
npx eas-cli login
npx eas-cli whoami
```

### 2. Confirmar o projeto correto

```powershell
npx expo config --type public
```

Confirme:

- `extra.eas.projectId = acf7b22f-889c-4233-8f82-f1ddc71984a7`
- `expo-dev-client` nao aparece no output publico quando o profile nao e `development`

### 3. Gerar o APK interno

Na raiz do monorepo:

```powershell
npm --workspace apps/ethos-mobile run build:android:apk
```

Equivalente:

```powershell
npx eas-cli build -p android --profile preview
```

### 4. Baixar e instalar

Quando o EAS terminar:

1. abra a pagina do build
2. confirme que o artefato gerado e `APK`
3. baixe o arquivo
4. instale por sideload no Android

## Smoke test minimo no aparelho

Depois de instalar:

- o app abre como app normal
- nao pede Expo Go
- nao mostra tela de development build
- login funciona
- navegacao inicial funciona
- pelo menos uma chamada de API responde contra a URL configurada no `preview`

## Regressao esperada

Esses fluxos devem continuar disponiveis:

- Android AAB para loja:

```powershell
npm --workspace apps/ethos-mobile run build:android:aab
```

- iOS TestFlight:

```powershell
npm --workspace apps/ethos-mobile run build:ios:testflight
npm --workspace apps/ethos-mobile run submit:ios:testflight
```

- iOS simulador:

```powershell
npm --workspace apps/ethos-mobile run build:ios:simulator
```

- Web PWA:

```powershell
npm --workspace apps/ethos-mobile run build:web
```

## Se o primeiro build falhar

Nao refatore o app inteiro.

O proximo passo deve ser somente:

1. capturar o erro real do EAS
2. corrigir o bloqueador especifico
3. rodar o `preview` de novo

## Resumo pratico

Para Android interno, use sempre:

```powershell
npm --workspace apps/ethos-mobile run build:android:apk
```

<<<<<<< ours
Nao use `development` para distribuicao.
=======
Se o app "nao abrir automaticamente no celular", quase sempre o problema e usar o perfil `development`. Para app instalavel no Android, use sempre `preview` (ou o `build:android:apk:local` para gerar localmente).
>>>>>>> theirs
