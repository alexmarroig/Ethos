import { describe, it, expect } from 'vitest';
import { formatPhone, unmaskPhone } from './utils';

describe('Phone utilities', () => {
  it('formats 10 digit phone numbers', () => {
    expect(formatPhone('1199998888')).toBe('(11) 9999-8888');
  });

  it('formats 11 digit phone numbers', () => {
    expect(formatPhone('11999998888')).toBe('(11) 99999-8888');
  });

  it('unmasks phone numbers', () => {
    expect(unmaskPhone('(11) 99999-8888')).toBe('11999998888');
  });
});
