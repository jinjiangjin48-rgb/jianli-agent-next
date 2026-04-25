// lib/extraction/worker.ts
import { sql, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { candidates } from '../db/schema';
import { readPdf } from '../storage';
import { parsePdf } from './pdf';
import { callDeepSeekStream } from './llm';
import { ExtractedResume } from '../validation';
import { ExtractionError, toUserMessage } from '../errors';
import { deriveFlat } from './derive';
import * as bus from './event-bus';

export async function runExtraction(id: string): Promise<void> {
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row || row.extractionStatus === 'parsed') return;

  db.update(candidates).set({
    extractionStatus: 'extracting',
    extractionAttempts: sql`extraction_attempts + 1`,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  try {
    const buf = readPdf(row.pdfPath);
    const { text, numpages } = await parsePdf(buf);
    if (!text.trim()) throw new ExtractionError('pdf_empty');

    let buffer = '';
    for await (const chunk of callDeepSeekStream(text)) {
      buffer += chunk;
      bus.publish(id, { type: 'chunk', text: chunk });
    }

    if (!buffer.trim()) throw new ExtractionError('llm_empty');
    let raw: unknown;
    try {
      raw = JSON.parse(buffer);
    } catch {
      throw new ExtractionError('llm_invalid_json');
    }

    const parsed = ExtractedResume.parse(raw);
    const flat = deriveFlat(parsed);

    db.update(candidates).set({
      ...flat,
      extractedJson: parsed,
      pdfPages: numpages,
      extractionStatus: 'parsed',
      extractionError: null,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();

    const updated = db.select().from(candidates).where(eq(candidates.id, id)).get()!;
    bus.publish(id, { type: 'done', candidate: updated });
  } catch (err) {
    const message = toUserMessage(err);
    db.update(candidates).set({
      extractionStatus: 'error',
      extractionError: message,
      updatedAt: new Date(),
    }).where(eq(candidates.id, id)).run();
    bus.publish(id, { type: 'error', message });
    console.error(`[extraction:${id}]`, err);
  } finally {
    bus.clear(id);
  }
}
