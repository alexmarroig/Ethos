# Como Distribuir e Testar o ETHOS Mobile

## Android instalavel no celular

Use o perfil `preview` para gerar um APK instalavel de verdade. Esse e o fluxo certo quando voce quer abrir o app como aplicativo normal no Android, sem Expo Go e sem development build.

1. Faça login no Expo:
   - `npx eas-cli login`
2. Gere o APK interno:
   - `npm --workspace apps/ethos-mobile run build:android:apk`
3. Instale o APK no aparelho Android quando o build terminar.

### Perfis Android

- `development`: development build para desenvolvimento local
- `preview`: APK instalavel direto no aparelho
- `release`: AAB para Google Play

## iPhone real / TestFlight

Nao existe APK para iPhone. O artefato correto e um `IPA`, normalmente distribuido pelo TestFlight.

O projeto ja esta preparado com o perfil `ios-production`, mas o build real continua dependendo de uma conta Apple Developer ativa.

### Quando a conta Apple Developer estiver pronta

1. Gere o build iOS:
   - `npm --workspace apps/ethos-mobile run build:ios:testflight`
2. Envie para o TestFlight:
   - `npm --workspace apps/ethos-mobile run submit:ios:testflight`

### Simulador iOS

Se voce estiver em um Mac, tambem existe um perfil para app standalone no simulador:

- `npm --workspace apps/ethos-mobile run build:ios:simulator`

## Web standalone (PWA)

O app agora exporta uma versao web standalone instalavel como PWA, sem depender de `expo start`.

1. Gere a versao web:
   - `npm --workspace apps/ethos-mobile run build:web`
2. O resultado sera salvo em:
   - `apps/ethos-mobile/dist`
3. Sirva a pasta `dist` em qualquer host estatico.

### O que a exportacao web inclui

- `manifest.webmanifest`
- icones PWA
- registro de service worker
- cache apenas de shell e assets da aplicacao

## Desenvolvimento local

Se voce estiver apenas iterando no app:

- `npm --workspace apps/ethos-mobile run start`

Se o bundler local travar:

- `cd apps/ethos-mobile`
- `npx expo start --clear`

## Observacao importante

Se o app "nao abrir automaticamente no celular", quase sempre o problema e usar o perfil `development`. Para app instalavel no Android, use sempre `preview`.
