# Relatório de Validação: Trilha B (Whisper + Performance)

## 1. Download do Modelo
- **Modelo Alvo:** `large-v3-turbo-q5_0` (GGUF/GML)
- **Tamanho:** ~550MB
- **Tempo Estimado:** 2-5 minutos (dependendo da conexão).
- **Verificação:** Implementado check de espaço livre (2x tamanho) e integridade de download (resumable).

## 2. Benchmark & DCS (Device Capability Score)
- **Método:** Inferência de 1 segundo de silêncio (PCM 16kHz).
- **DCS Policy:**
  - **DCS > 80:** Turbo Q5_0 (Liberado para iPhones 13+ e Androids >= 8GB RAM).
  - **DCS 40-80:** Modelo `Small` (Equilíbrio para dispositivos médios).
  - **DCS < 40:** Modelo `Base` (Garantia de não travamento em dispositivos de entrada).

## 3. Performance (RTF - Real Time Factor)
*Valores estimados baseados em benchmarks de hardware similares:*

| Dispositivo | Modelo Recomendado | RTF Est. (5 min áudio) | Tempo Total |
| :--- | :--- | :--- | :--- |
| iPhone 13 Pro (6GB) | Turbo Q5_0 | ~0.08 | ~24s |
| Android High (8GB) | Turbo Q5_0 | ~0.15 | ~45s |
| Android Mid (4GB) | Small | ~0.40 | ~2min |
| Dispositivo Legacy | Base | ~0.70 | ~3.5min |

## 4. Segurança e Estabilidade
- **Cleanup:** Implementada limpeza agressiva no `finally` (deleta áudio decodificado do cache).
- **OOM Prevention:** O gate de DCS impede o carregamento de modelos pesados em RAM insuficiente.
- **Vazamento:** Logs PHI desativados. Nenhuma string de transcrição é enviada para `console.log`.

## 5. Limitações e Fallbacks
- **iOS Background:** A transcrição é mantida em foreground com `expo-keep-awake`. Se minimizado, o iOS pode suspender o processo (usuário avisado via UI).
- **Android Background:** Suporte via canal de notificação (Foreground Service placeholder).
- **Fallback Crítico:** Em caso de erro na transcrição, o app sugere o downgrade automático do DCS.
