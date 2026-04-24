// lib/extraction/llm.ts
import OpenAI from 'openai';
import { ExtractionError } from '../errors';
import { SYSTEM_PROMPT, STUB_RESULT } from './prompt';

const USE_STUB = process.env.LLM_STUB === '1';

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
  }
  return _client;
}

export async function callDeepSeek(resumeText: string): Promise<unknown> {
  if (USE_STUB) return STUB_RESULT;

  try {
    const res = await client().chat.completions.create({
      model: 'deepseek-chat',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: resumeText.slice(0, 30_000) },
      ],
    });
    const content = res.choices[0]?.message?.content;
    if (!content) throw new ExtractionError('llm_empty');
    try {
      return JSON.parse(content);
    } catch {
      throw new ExtractionError('llm_invalid_json');
    }
  } catch (err) {
    if (err instanceof ExtractionError) throw err;
    const status = (err as { status?: number }).status;
    if (status) throw new ExtractionError('llm_http_error', undefined, status);
    throw new ExtractionError('unknown', String(err));
  }
}
