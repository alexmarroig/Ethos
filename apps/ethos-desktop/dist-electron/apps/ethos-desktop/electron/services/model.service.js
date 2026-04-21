"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelService = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const electron_1 = require("electron");
const MODELS = [
    {
        id: "ptbr-fast",
        name: "Rápido PT-BR",
        description: "Modelo large-v3 convertido para CTranslate2 (int8). Balanceado.",
        version: "1.0.0",
        checksum: "sha256:placeholder_fast"
    },
    {
        id: "ptbr-accurate",
        name: "Precisão Máxima",
        description: "distil-whisper-large-v3-ptbr. Melhor acurácia.",
        version: "1.0.0",
        checksum: "sha256:placeholder_accurate"
    }
];
exports.modelService = {
    getAvailableModels: () => MODELS,
    getModelStatus: (modelId) => {
        const modelsDir = node_path_1.default.join(electron_1.app.getPath('userData'), 'models');
        const modelPath = node_path_1.default.join(modelsDir, modelId);
        return node_fs_1.default.existsSync(modelPath);
    },
    downloadModel: async (modelId, onProgress) => {
        const modelsDir = node_path_1.default.join(electron_1.app.getPath('userData'), 'models');
        if (!node_fs_1.default.existsSync(modelsDir))
            node_fs_1.default.mkdirSync(modelsDir, { recursive: true });
        const model = MODELS.find(m => m.id === modelId);
        if (!model)
            throw new Error("Model not found");
        // In a real app, this would be a real URL to Hugging Face or similar
        // For MVP, we simulate the download logic
        const dummyUrl = `https://huggingface.co/ethos/models/resolve/main/${modelId}.zip`;
        return new Promise((resolve, reject) => {
            // Simulating download for MVP purposes as downloading GBs of models in sandbox is not feasible
            let progress = 0;
            const interval = setInterval(() => {
                progress += 0.1;
                onProgress(progress);
                if (progress >= 1) {
                    clearInterval(interval);
                    // Create a dummy file to mark as installed
                    const modelPath = node_path_1.default.join(modelsDir, modelId);
                    node_fs_1.default.writeFileSync(modelPath, "DUMMY MODEL DATA");
                    resolve();
                }
            }, 500);
        });
    },
    verifyChecksum: (modelId) => {
        // Implement SHA-256 check
        return true;
    }
};
