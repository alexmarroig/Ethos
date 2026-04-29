import { describe, it, expect } from 'vitest';
import {
  getPackage,
  getScales,
  getHomework,
  getNoteTemplate,
  getDiaryConfig,
  getPsychoeducational,
  getApproachesForPsychologist,
} from './packageService';

describe('packageService', () => {
  it('getPackage retorna o pacote correto para TCC', () => {
    const pkg = getPackage('tcc');
    expect(pkg.approach).toBe('tcc');
    expect(pkg.scales.length).toBeGreaterThan(0);
    expect(pkg.homework.length).toBeGreaterThan(0);
  });

  it('getScales retorna escalas da abordagem', () => {
    const scales = getScales('dbt');
    expect(scales.map(s => s.abbreviation)).toContain('DERS');
    expect(scales.map(s => s.abbreviation)).toContain('BSL-23');
  });

  it('getHomework retorna fichas da abordagem', () => {
    const hw = getHomework('dbt');
    const ids = hw.map(h => h.id);
    expect(ids).toContain('diary_card');
    expect(ids).toContain('dear_man');
  });

  it('getNoteTemplate retorna template com seções', () => {
    const tpl = getNoteTemplate('tcc');
    expect(tpl.sections.length).toBeGreaterThan(0);
    expect(tpl.sections[0]).toHaveProperty('id');
    expect(tpl.sections[0]).toHaveProperty('label');
    expect(tpl.sections[0]).toHaveProperty('placeholder');
  });

  it('getDiaryConfig retorna config de diário', () => {
    const config = getDiaryConfig('analitica');
    expect(config.title).toBeTruthy();
    expect(config.entryLabel).toBeTruthy();
  });

  it('getPsychoeducational retorna materiais', () => {
    const materials = getPsychoeducational('act');
    expect(materials.length).toBeGreaterThan(0);
    expect(materials[0]).toHaveProperty('title');
    expect(materials[0]).toHaveProperty('summary');
  });

  it('getApproachesForPsychologist filtra da lista global', () => {
    const filtered = getApproachesForPsychologist(['tcc', 'dbt']);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(a => a.approach)).toContain('tcc');
    expect(filtered.map(a => a.approach)).toContain('dbt');
  });

  it('getPackage cobre todas as 11 abordagens', () => {
    const approaches = ['tcc','dbt','act','psicanalitica','analitica','gestalt','emdr','esquema','humanista','sistemica','logoterapia'] as const;
    for (const a of approaches) {
      expect(() => getPackage(a)).not.toThrow();
    }
  });
});
