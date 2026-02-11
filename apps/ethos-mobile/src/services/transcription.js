import * as FileSystem from 'expo-file-system';
import { vaultService } from './vault';
import { purgeService } from './purge';
import { getPersistedTranscriptionPolicyDecision } from './device';

const TEMP_TRANSCRIPTION_DIR = `${FileSystem.cacheDirectory}ethos-transcription-temp/`;
const TEMP_TRANSCRIPTION_DIR = `${FileSystem.documentDirectory}ethos-transcription-temp/`;
const TECHNICAL_EVENT_PATH = `${FileSystem.documentDirectory}ethos-transcription-events.json`;

const MODEL_CHAIN = ['large-v3-turbo', 'small', 'base'];
const MEMORY_ERROR_PATTERN = /(out\s*of\s*memory|oom|insufficient\s*memory|memory\s*limit)/i;
const TIMEOUT_ERROR_PATTERN = /(timeout|timed\s*out|deadline\s*exceeded|etimedout)/i;

const ensureTempDir = async () => {
  const dirInfo = await FileSystem.getInfoAsync(TEMP_TRANSCRIPTION_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(TEMP_TRANSCRIPTION_DIR, { recursive: true });
  }
};

const sanitizeError = (error) => {
  const message = String(error?.message || 'unknown').slice(0, 180);
  const name = String(error?.name || 'Error').slice(0, 60);

  return {
    name,
    message,
    classification: MEMORY_ERROR_PATTERN.test(message)
      ? 'memory'
      : TIMEOUT_ERROR_PATTERN.test(message)
      ? 'timeout'
      : 'generic',
  };
};

const readTechnicalEvents = async () => {
  const info = await FileSystem.getInfoAsync(TECHNICAL_EVENT_PATH);
  if (!info.exists) return [];

  try {
    const raw = await FileSystem.readAsStringAsync(TECHNICAL_EVENT_PATH);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const appendTechnicalEvent = async (event) => {
  const existing = await readTechnicalEvents();
  const updated = [...existing.slice(-29), event];
  await FileSystem.writeAsStringAsync(TECHNICAL_EVENT_PATH, JSON.stringify(updated));
};

export const getLastTranscriptionTechnicalEvent = async () => {
  const events = await readTechnicalEvents();
  return events[events.length - 1] || null;
};

const getInitialModelFromPolicy = async () => {
  const persistedDecision = await getPersistedTranscriptionPolicyDecision();
  return persistedDecision?.model_id || MODEL_CHAIN[0];
};

const buildModelAttemptChain = (initialModel) => {
  const ordered = [initialModel, ...MODEL_CHAIN.filter((modelId) => modelId !== initialModel)];
  const seen = new Set();
  return ordered.filter((modelId) => {
    if (seen.has(modelId)) return false;
    seen.add(modelId);
    return true;
  });
};

export const transcriptionService = {
  transcribeEncryptedAudio: async ({
    encryptedUri,
    transcribe,
    maxAttempts = 3,
    onTechnicalEvent,
  }) => {
    await ensureTempDir();
    let decryptedUri;

    try {
      decryptedUri = await vaultService.decryptFile(encryptedUri);
      const initialModel = await getInitialModelFromPolicy();
      const modelAttemptChain = buildModelAttemptChain(initialModel).slice(0, maxAttempts);
      let lastError;

      for (let index = 0; index < modelAttemptChain.length; index += 1) {
        const modelId = modelAttemptChain[index];
        const startedAt = Date.now();

        try {
          const text = await transcribe({
            audioUri: decryptedUri,
            modelId,
            timeoutMs: 20000,
            attempt: index + 1,
          });

          const event = {
            event_type: index === 0 ? 'transcription_success' : 'transcription_fallback_success',
            timestamp: new Date().toISOString(),
            model_id: modelId,
            fallback_used: index > 0,
            latency_ms: Date.now() - startedAt,
            attempts: index + 1,
          };

          await appendTechnicalEvent(event);
          if (onTechnicalEvent) onTechnicalEvent(event);

          return {
            text,
            modelId,
            attempts: index + 1,
            fallbackUsed: index > 0,
            fallbackMessage:
              index > 0
                ? 'A transcrição foi concluída com um modelo alternativo para garantir estabilidade no dispositivo.'
                : null,
          };
        } catch (error) {
          const sanitizedError = sanitizeError(error);
          const shouldDowngrade =
            sanitizedError.classification === 'memory' || sanitizedError.classification === 'timeout';
          const nextModel = modelAttemptChain[index + 1];

          const event = {
            event_type: shouldDowngrade ? 'transcription_model_downgrade' : 'transcription_failure',
            timestamp: new Date().toISOString(),
            from_model_id: modelId,
            to_model_id: shouldDowngrade ? nextModel || null : null,
            error_class: sanitizedError.classification,
            error_name: sanitizedError.name,
            attempt: index + 1,
          };

          await appendTechnicalEvent(event);
          if (onTechnicalEvent) onTechnicalEvent(event);

          if (!shouldDowngrade || !nextModel) {
            throw error;
          }

          lastError = error;
        }
      }

      throw lastError || new Error('Falha ao transcrever áudio após tentativas de fallback.');
    } finally {
      if (decryptedUri) {
        await FileSystem.deleteAsync(decryptedUri, { idempotent: true });
      }
      await purgeService.purgeTempData();
    }
  },
};
