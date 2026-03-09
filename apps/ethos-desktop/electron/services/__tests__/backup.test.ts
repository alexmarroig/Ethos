import { describe, it, expect, vi } from 'vitest';
import { backupService } from '../backup.service';

vi.mock('../../db', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      run: vi.fn(),
    })),
  })),
}));

vi.mock('../../security', () => ({
  getVaultKey: vi.fn(() => 'test-vault-key'),
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    renameSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

describe('backupService', () => {
  it('should be defined', () => {
    expect(backupService).toBeDefined();
  });

  it('should have a create method', () => {
    expect(backupService.create).toBeDefined();
  });

  it('should have a restoreBackup method', () => {
    expect(backupService.restoreBackup).toBeDefined();
  });
});
