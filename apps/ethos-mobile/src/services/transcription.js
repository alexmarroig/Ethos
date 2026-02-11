import { initWhisper } from 'whisper.rn';
import { vaultService } from './vault';
import { purgeService } from './purge';
import { modelManager } from './modelManager';
import { getDb } from './db';

export const transcriptionService = {
  transcribeSession: async (sessionId, modelId, onProgress) => {
    let tempUri = null, ctx = null;
    try {
      tempUri = await vaultService.decryptFile(`${vaultService.getVaultDirectory()}${sessionId}.ethos`, sessionId);
      ctx = await initWhisper({ filePath: modelManager.getModelPath(modelId) });
      const { promise } = await ctx.transcribe(tempUri, { language: 'pt', onProgress: (p) => onProgress && onProgress(p) });
      const result = await promise;
      const db = getDb(), id = `trans-${Date.now()}`;
      await db.runAsync('INSERT INTO transcripts (id, sessionId, language, fullText, segments, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [id, sessionId, 'pt', result.result, JSON.stringify(result.segments), new Date().toISOString()]);
      await db.runAsync('UPDATE sessions SET transcriptId = ?, status = "completed" WHERE id = ?', [id, sessionId]);
      return { success: true };
    } finally {
      if (ctx) await ctx.release();
      await purgeService.purgeTempData();
    }
  }
};
