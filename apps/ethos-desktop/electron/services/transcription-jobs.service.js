"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptionJobsService = void 0;
const db_1 = require("../db");
exports.transcriptionJobsService = {
    create: (job) => {
        const db = (0, db_1.getDb)();
        db.prepare(`
      INSERT INTO transcription_jobs (id, sessionId, audioPath, model, status, progress, error, createdAt, updatedAt)
      VALUES (@id, @sessionId, @audioPath, @model, @status, @progress, @error, @createdAt, @updatedAt)
    `).run(job);
    },
    update: (id, updates) => {
        const db = (0, db_1.getDb)();
        const keys = Object.keys(updates);
        if (keys.length === 0)
            return;
        updates.updatedAt = new Date().toISOString();
        const setClause = keys.map(key => `${key} = @${key}`).join(', ');
        db.prepare(`UPDATE transcription_jobs SET ${setClause}, updatedAt = @updatedAt WHERE id = @id`).run({ ...updates, id });
    },
    getPending: () => {
        const db = (0, db_1.getDb)();
        return db.prepare("SELECT * FROM transcription_jobs WHERE status IN ('queued', 'running', 'interrupted')").all();
    }
};
