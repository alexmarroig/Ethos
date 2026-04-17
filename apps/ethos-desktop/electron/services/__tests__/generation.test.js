"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const generation_service_1 = require("../generation.service");
(0, vitest_1.describe)('generationService', () => {
    (0, vitest_1.it)('should generate a structured clinical note', () => {
        const patient = { id: 'p1', fullName: 'Marina Alves', createdAt: '' };
        const session = { id: 's1', patientId: 'p1', scheduledAt: '2025-02-15T10:00:00Z', status: 'scheduled' };
        const transcript = {
            sessionId: 's1',
            language: 'pt',
            fullText: 'O paciente relatou cansaço extremo.',
            segments: []
        };
        const doc = generation_service_1.generationService.generateProntuario(transcript, patient, session);
        (0, vitest_1.expect)(doc).toContain('PRONTUÁRIO DE ATENDIMENTO CLÍNICO');
        (0, vitest_1.expect)(doc).toContain('Marina Alves');
        (0, vitest_1.expect)(doc).toContain('O paciente relatou cansaço extremo.');
        (0, vitest_1.expect)(doc).toContain('OBSERVAÇÕES CLÍNICAS');
        (0, vitest_1.expect)(doc).toContain('Nota Ética');
    });
});
