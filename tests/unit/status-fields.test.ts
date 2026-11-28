import { describe, expect, it } from 'vitest';
import { statusFields } from '../../src/lib/discovery/status-fields.ts';

describe('statusFields', () => {
  it('should keep every field on a card page', () => {
    expect(statusFields('card', { domain: '05 distributed-data', file: 'saga.md', status: 'adopt', read: 0, total: 3 })).toEqual({
      mode: 'READ',
      domain: '05 distributed-data',
      file: 'saga.md',
      status: 'adopt',
      progress: 'domain 0/3',
    });
  });

  it('should show mode catalog and only the domain on a domain page', () => {
    expect(statusFields('domain', { domain: '06 storage' })).toEqual({ mode: 'catalog', domain: '06 storage' });
  });

  it.each(['home', 'catalog', 'path', 'radar'] as const)('should show only the mode label %s on that page', (kind) => {
    expect(statusFields(kind)).toEqual({ mode: kind });
  });

  it('should leave file, status and progress out of non-card pages instead of setting them empty', () => {
    const fields = statusFields('domain', { domain: '06 storage' });
    expect(Object.keys(fields).sort()).toEqual(['domain', 'mode']);
  });
});
