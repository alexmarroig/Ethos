"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioService = void 0;
const audios = new Map();
exports.audioService = {
    attach: (sessionId, filePath) => {
        const audio = {
            id: crypto.randomUUID(),
            sessionId,
            filePath,
            createdAt: new Date().toISOString(),
        };
        audios.set(audio.id, audio);
        return audio;
    },
    remove: (id) => {
        audios.delete(id);
    },
};
