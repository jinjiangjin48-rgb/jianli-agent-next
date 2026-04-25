// lib/extraction/stream-emitter.ts
import { parse as bestEffort } from 'best-effort-json-parser';

export type Delta = { path: string; value: unknown };

export function createStreamEmitter(): {
  feed: (chunk: string) => Delta[];
  finalize: () => { deltas: Delta[]; raw: unknown };
  getBuffer: () => string;
} {
  let buffer = '';
  const emitted = new Set<string>();

  function arrLen(x: unknown): number {
    return Array.isArray(x) ? x.length : 0;
  }

  function keyCount(x: unknown): number {
    return x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x as object).length : 0;
  }

  function checkOrder(partial: any): string[] {
    const order = ['basic', 'targetRole'];
    for (let i = 0; i < arrLen(partial.educations); i++) order.push(`educations[${i}]`);
    for (let i = 0; i < arrLen(partial.works);      i++) order.push(`works[${i}]`);
    for (let i = 0; i < arrLen(partial.projects);   i++) order.push(`projects[${i}]`);
    order.push('skills', 'summary');
    return order;
  }

  function valueAt(partial: any, path: string): unknown {
    const m = path.match(/^(\w+)\[(\d+)\]$/);
    if (m) return partial[m[1]][Number(m[2])];
    return partial[path];
  }

  function shouldEmit(path: string, partial: any, streamEnded: boolean): boolean {
    if (emitted.has(path)) return false;

    if (path === 'basic') {
      return keyCount(partial.basic) >= 5;
    }
    if (path === 'targetRole') {
      return Object.prototype.hasOwnProperty.call(partial, 'targetRole');
    }

    const arrMatch = path.match(/^(educations|works|projects)\[(\d+)\]$/);
    if (arrMatch) {
      const key = arrMatch[1];
      const i   = Number(arrMatch[2]);
      const arr = partial[key];
      if (!Array.isArray(arr) || arr.length <= i) return false;
      const item = arr[i];
      if (!item || typeof item !== 'object') return false;
      const anchor = key === 'educations' ? 'school' : key === 'works' ? 'company' : 'name';
      if (!(item as any)[anchor]) return false;
      const nextSibling = key === 'educations' ? 'works' : key === 'works' ? 'projects' : 'skills';
      return arr.length > i + 1 || Object.prototype.hasOwnProperty.call(partial, nextSibling);
    }

    if (path === 'skills') {
      if (!Array.isArray(partial.skills)) return false;
      // Emit when a non-empty summary sibling is present, or at stream end (handles empty/missing summary)
      const hasSummarySibling = typeof partial.summary === 'string' && partial.summary.length > 0;
      return hasSummarySibling || streamEnded;
    }
    if (path === 'summary') {
      if (typeof partial.summary !== 'string') return false;
      return streamEnded;
    }
    return false;
  }

  function collectDeltas(streamEnded: boolean): Delta[] {
    let partial: any;
    try {
      partial = bestEffort(buffer) ?? {};
    } catch {
      return [];
    }
    if (!partial || typeof partial !== 'object') return [];
    const out: Delta[] = [];
    for (const p of checkOrder(partial)) {
      if (shouldEmit(p, partial, streamEnded)) {
        emitted.add(p);
        out.push({ path: p, value: valueAt(partial, p) });
      }
    }
    return out;
  }

  return {
    feed(chunk: string): Delta[] {
      buffer += chunk;
      return collectDeltas(false);
    },
    finalize(): { deltas: Delta[]; raw: unknown } {
      const deltas = collectDeltas(true);
      const raw = JSON.parse(buffer);
      return { deltas, raw };
    },
    getBuffer(): string { return buffer; },
  };
}
