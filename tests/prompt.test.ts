// tests/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { SYSTEM_PROMPT, STUB_RESULT } from '@/lib/extraction/prompt';
import { ExtractedResume } from '@/lib/validation';

describe('prompt constants', () => {
  it('SYSTEM_PROMPT is a non-empty Chinese string', () => {
    expect(typeof SYSTEM_PROMPT).toBe('string');
    expect(SYSTEM_PROMPT.length).toBeGreaterThan(100);
    expect(/简历|提取|JSON/.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('SYSTEM_PROMPT forbids emoji / 夸张语气 explicitly', () => {
    expect(/不吹嘘|客观|不使用感叹号|no emoji|emoji/i.test(SYSTEM_PROMPT)).toBe(true);
  });

  it('STUB_RESULT passes ExtractedResume validation', () => {
    expect(() => ExtractedResume.parse(STUB_RESULT)).not.toThrow();
  });
});
