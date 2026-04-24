// tests/validation.test.ts
import { describe, it, expect } from 'vitest';
import { ExtractedResume } from '@/lib/validation';

describe('ExtractedResume zod', () => {
  it('accepts a full valid payload', () => {
    const input = {
      basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州' },
      educations: [{ school: '浙江大学', major: '计算机', degree: '本科', startYear: 2015, endYear: 2019 }],
      works: [{ company: '阿里', role: 'FE', startDate: '2021.07', endDate: '至今', highlights: ['架构升级'] }],
      skills: ['React', 'TypeScript'],
      summary: '高级前端工程师',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('accepts nulls in basic', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null },
      educations: [], works: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(input)).not.toThrow();
  });

  it('rejects missing required top-level keys', () => {
    expect(() => ExtractedResume.parse({ basic: {}, educations: [] })).toThrow();
  });

  it('rejects wrong types', () => {
    const bad = {
      basic: { name: 123, email: null, phone: null, city: null },
      educations: [], works: [], skills: [], summary: '',
    };
    expect(() => ExtractedResume.parse(bad)).toThrow();
  });

  it('defaults highlights and skills to empty arrays', () => {
    const input = {
      basic: { name: null, email: null, phone: null, city: null },
      educations: [],
      works: [{ company: 'x', role: null, startDate: null, endDate: null }],
      summary: '',
    };
    const parsed = ExtractedResume.parse(input);
    expect(parsed.works[0].highlights).toEqual([]);
    expect(parsed.skills).toEqual([]);
  });
});
