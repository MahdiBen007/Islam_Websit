import { describe, expect, it } from 'vitest';
import { buildRegistrationsCsv } from '@/services/exports/exportService';
import { TEST_REGISTRATIONS } from '@/test/fixtures';

describe('exportService CSV generation', () => {
  it('generates UTF-8 BOM CSV with Arabic headers and escapes formula injection', () => {
    const sample = [
      {
        ...TEST_REGISTRATIONS[0],
        firstName: '=cmd()',
      },
    ];
    const csv = buildRegistrationsCsv(sample, 'ar');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('رقم التسجيل');
    expect(csv).toContain("'=cmd()");
    expect(csv).toContain('@mohamed_dev');
  });

  it('generates English headers when language is en', () => {
    const csv = buildRegistrationsCsv([TEST_REGISTRATIONS[0]], 'en');
    expect(csv).toContain('Reference ID');
    expect(csv).toContain('Computer Science & Artificial Intelligence');
  });
});
