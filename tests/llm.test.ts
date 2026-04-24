// tests/llm.test.ts
import { describe, it, expect } from 'vitest';
// vitest.setup.ts has forced LLM_STUB=1
import { callDeepSeek } from '@/lib/extraction/llm';
import { ExtractedResume } from '@/lib/validation';

describe('callDeepSeek (stub mode)', () => {
  it('returns STUB_RESULT that validates', async () => {
    const res = await callDeepSeek('任何简历文本');
    expect(() => ExtractedResume.parse(res)).not.toThrow();
  });

  it('is deterministic across calls', async () => {
    const a = await callDeepSeek('x');
    const b = await callDeepSeek('y');
    expect(a).toEqual(b);
  });
});
