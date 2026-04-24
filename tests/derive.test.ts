// tests/derive.test.ts
import { describe, it, expect } from 'vitest';
import { deriveFlat, computeYears } from '@/lib/extraction/derive';
import type { ExtractedResume } from '@/lib/validation';

const base: ExtractedResume = {
  basic: { name: '张远哲', email: 'a@b.cn', phone: '138', city: '杭州' },
  educations: [],
  works: [],
  skills: ['React'],
  summary: 'hi',
};

describe('deriveFlat', () => {
  it('fills basic fields', () => {
    const flat = deriveFlat(base);
    expect(flat.name).toBe('张远哲');
    expect(flat.email).toBe('a@b.cn');
    expect(flat.phone).toBe('138');
    expect(flat.city).toBe('杭州');
    expect(flat.skills).toEqual(['React']);
    expect(flat.summary).toBe('hi');
  });

  it('picks newest education by endYear desc', () => {
    const e: ExtractedResume = {
      ...base,
      educations: [
        { school: '本科校', major: 'CS', degree: '本科', startYear: 2011, endYear: 2015 },
        { school: '硕士校', major: 'CS', degree: '硕士', startYear: 2015, endYear: 2018 },
      ],
    };
    const flat = deriveFlat(e);
    expect(flat.school).toBe('硕士校');
    expect(flat.degree).toBe('硕士');
    expect(flat.gradYear).toBe(2018);
  });

  it('picks newest work; "至今" treated as latest', () => {
    const w: ExtractedResume = {
      ...base,
      works: [
        { company: '前公司', role: 'A', startDate: '2018.01', endDate: '2020.06', highlights: [] },
        { company: '现公司', role: 'B', startDate: '2020.07', endDate: '至今', highlights: [] },
      ],
    };
    const flat = deriveFlat(w);
    expect(flat.company).toBe('现公司');
    expect(flat.role).toBe('B');
  });

  it('returns null flat fields when arrays empty', () => {
    const flat = deriveFlat(base);
    expect(flat.school).toBeNull();
    expect(flat.gradYear).toBeNull();
    expect(flat.company).toBeNull();
    expect(flat.years).toBeNull();
  });
});

describe('computeYears', () => {
  it('sums up work durations in years (rounded)', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2018.01', endDate: '2020.01', highlights: [] },
      { company: 'y', role: null, startDate: '2020.07', endDate: '2023.07', highlights: [] },
    ]);
    expect(years).toBe(5);
  });

  it('treats 至今 as now', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: '2020.04', endDate: '至今', highlights: [] },
    ], new Date('2026-04-24'));
    expect(years).toBe(6);
  });

  it('returns null when no parseable dates', () => {
    const years = computeYears([
      { company: 'x', role: null, startDate: null, endDate: null, highlights: [] },
    ]);
    expect(years).toBeNull();
  });

  it('returns null when array empty', () => {
    expect(computeYears([])).toBeNull();
  });
});
