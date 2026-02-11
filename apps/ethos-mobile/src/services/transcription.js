import { initWhisper } from 'whisper.rn';
import { vaultService } from './vault';
import { purgeService } from './purge';
import { modelManager } from './modelManager';
import { getDb } from './db';
import * as FileSystem from 'expo-file-system';

export const transcriptionService = {
  /**
   * Main transcription pipeline for a session.
   */
  transcribeSession: async (sessionId, modelId, onProgress) => {
    let tempAudioUri = null;
    let whisperContext = null;

    try {
      // 1. Get encrypted audio from vault
      const encryptedUri = `${vaultService.getVaultDirectory()}${sessionId}.ethos`;

      // 2. Decrypt to secure cache
      tempAudioUri = await vaultService.decryptFile(encryptedUri, sessionId);

      // 3. Initialize Whisper
      const modelPath = modelManager.getModelPath(modelId);
      whisperContext = await initWhisper({ filePath: modelPath });

      // 4. Transcribe
      const { promise } = await whisperContext.transcribe(tempAudioUri, {
        language: 'pt',
        onProgress: (p) => {
          if (onProgress) onProgress(p);
        }
      });

      const result = await promise;

      // 5. Save transcript to DB (Sanitized)
      const db = getDb();
      const transcriptId = `trans-${Date.now()}`;
      await db.runAsync(`
        INSERT INTO transcripts (id, sessionId, language, fullText, segments, createdAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        transcriptId,
        sessionId,
        'pt',
        result.result,
        JSON.stringify(result.segments),
        new Date().toISOString()
      ]);

      await db.runAsync(`
        UPDATE sessions SET transcriptId = ?, status = 'transcribed' WHERE id = ?
      `, [transcriptId, sessionId]);

      return { success: true, transcriptId };
    } catch (error) {
      console.error('[Transcription] Pipeline failure:', error.message);
      throw error;
    } finally {
      // 6. Aggressive Cleanup
      if (whisperContext) {
        await whisperContext.release();
      }
      await purgeService.purgeTempData();
    }
  }
};
