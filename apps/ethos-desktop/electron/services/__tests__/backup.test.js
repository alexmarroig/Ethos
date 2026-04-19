"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const backup_service_1 = require("../backup.service");
vitest_1.vi.mock('../../db', () => ({
    getDb: vitest_1.vi.fn(() => ({
        prepare: vitest_1.vi.fn(() => ({
            run: vitest_1.vi.fn(),
        })),
    })),
}));
vitest_1.vi.mock('../../security', () => ({
    getVaultKey: vitest_1.vi.fn(() => 'test-vault-key'),
}));
vitest_1.vi.mock('electron', () => ({
    app: {
        getPath: vitest_1.vi.fn(() => '/tmp'),
    },
}));
vitest_1.vi.mock('node:fs', () => ({
    default: {
        existsSync: vitest_1.vi.fn(() => false),
        mkdirSync: vitest_1.vi.fn(),
        unlinkSync: vitest_1.vi.fn(),
        renameSync: vitest_1.vi.fn(),
        readFileSync: vitest_1.vi.fn(),
        writeFileSync: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('backupService', () => {
    (0, vitest_1.it)('should be defined', () => {
        (0, vitest_1.expect)(backup_service_1.backupService).toBeDefined();
    });
    (0, vitest_1.it)('should have a create method', () => {
        (0, vitest_1.expect)(backup_service_1.backupService.create).toBeDefined();
    });
    (0, vitest_1.it)('should have a restoreBackup method', () => {
        (0, vitest_1.expect)(backup_service_1.backupService.restoreBackup).toBeDefined();
    });
});
