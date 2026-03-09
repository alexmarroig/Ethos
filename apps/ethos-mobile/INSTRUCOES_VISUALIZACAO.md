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
