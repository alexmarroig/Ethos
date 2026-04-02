# Como Visualizar o ETHOS Mobile no seu Celular

Como o ETHOS é um aplicativo offline-first focado em segurança clínica, a melhor forma de testá-lo é diretamente no seu aparelho.

## Opção 1: Expo Go (Mais Rápida)

1. Baixe o aplicativo **Expo Go** na Google Play Store (Android) ou App Store (iPhone).
2. Como eu iniciei um servidor aqui, eu posso gerar um **QR Code** para você.
3. No seu celular, abra o Expo Go e use a opção "Scan QR Code".
4. **Nota:** Para isso funcionar, seu celular e meu servidor precisam estar na mesma rede ou eu preciso criar um "túnel". Se você quiser tentar agora, me avise para eu ativar o modo túnel.

## Opção 2: Instalando no Windows (Simulador)

Você pode ver o app rodando como se fosse um site no Windows clicando no link de **Live Preview** que eu disponibilizei. Ele está configurado para se comportar como o app real, incluindo o modo de demonstração.

## Opção 3: Build Instalável (Profissional)

Se você criou sua conta no `expo.dev`, podemos gerar um arquivo `.apk` (Android) ou um link de teste via **EAS Build**.
Para isso:
1. Faça login no terminal do seu computador com `npx eas login`.
2. Rode `npx eas build -p android --profile preview`.

Eu deixei o código pronto para esse processo!

## 4. Pipeline EAS Build via GitHub Actions

1. No repositório GitHub, ví:
   - `Settings -> Secrets -> Actions`:
     - `EXPO_TOKEN` (token do `npx eas login`)
     - `EAS_PROJECT_ID` (do projeto no `expo.dev`)
2. O arquivo `\.github/workflows/eas-build.yml` já está criado.
3. A cada push em `main`, o workflow:
   - faz `npm ci`
   - faz login no EAS
   - dispara `eas build --platform android --profile preview`
   - dispara `eas build --platform android --profile release`

## 5. Configuração final de deploy
eas.json:
- development: internal APK
- preview: internal APK
- release: store AAB

## 6. EAS Update
- app.json já tem `updates.enabled: true`, e integra com EAS Update.
- publique com `npx eas update --branch main --message "Hotfix"`.

## 7. Monitoramento de crash
- INSTALADO `@sentry/react-native`.
- `App.js` inicializa Sentry em produção com DSN (use `EXPO_PUBLIC_SENTRY_DSN`).

## 8. Fluxo de usuário (senha / primeiro login)
- Teste com usuário de onboarding padrão.
- Aps login, vá em “Pacientes” > "+ Novo Paciente" > preencher e salvar.
- Verifique se a lista recarrega.

## 9. Correção de build local
- Se local travar, rode:
  - `cd apps/ethos-mobile`
  - `npx expo start --clear`
  - `npx expo run:android` (emulador ou telefone conectado)
- Se falhar com erro no EAS, agora use o workflow para descarregar o uso do plano local.

