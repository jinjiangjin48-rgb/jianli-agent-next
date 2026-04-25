// tests/llm.test.ts
import { describe, it, expect } from 'vitest';
// vitest.setup.ts has forced LLM_STUB=1
import { callDeepSeek, callDeepSeekStream } from '@/lib/extraction/llm';
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

describe('callDeepSeekStream (stub mode)', () => {
  it('yields chunks that concatenate to a parseable JSON matching STUB_RESULT', async () => {
    const parts: string[] = [];
    for await (const c of callDeepSeekStream('irrelevant')) parts.push(c);
    const joined = parts.join('');
    const parsed = JSON.parse(joined);
    expect(parsed).toHaveProperty('basic.name');
    expect(parsed).toHaveProperty('summary');
    expect(() => ExtractedResume.parse(parsed)).not.toThrow();
  });

  it('yields more than one chunk (actually streaming, not one-shot)', async () => {
    let count = 0;
    for await (const _ of callDeepSeekStream('x')) count++;
    expect(count).toBeGreaterThan(1);
  });
});
