"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptionService = void 0;
class TranscriptionService {
    listeners = [];
    constructor() {
        window.ethos?.onTranscriptionMessage((message) => {
            try {
                const payload = JSON.parse(message);
                if (payload.type === "job_update") {
                    this.listeners.forEach((listener) => listener(payload.payload));
                }
            }
            catch {
                // ignore malformed messages
            }
        });
    }
    onJobUpdate(handler) {
        this.listeners.push(handler);
    }
    async pickAudio() {
        return window.ethos?.openAudioDialog();
    }
    async enqueueTranscription(sessionId, audioPath, model) {
        return window.ethos?.enqueueTranscription({ sessionId, audioPath, model });
    }
}
exports.TranscriptionService = TranscriptionService;
