'use client';
import { useEffect, useState } from 'react';
import type { Candidate } from '@/lib/db/schema';
import type { ExtractedResume } from '@/lib/validation';

export type StreamingResume = {
  basic?:      Partial<ExtractedResume['basic']>;
  targetRole?: string | null;
  educations:  ExtractedResume['educations'];
  works:       ExtractedResume['works'];
  projects:    ExtractedResume['projects'];
  skills?:     string[];
  summary?:    string;
};

function emptyStreaming(): StreamingResume {
  return { educations: [], works: [], projects: [] };
}

function setByPath(s: StreamingResume, path: string, value: any): StreamingResume {
  const next: StreamingResume = { ...s };
  const m = path.match(/^(educations|works|projects)\[(\d+)\]$/);
  if (m) {
    const key = m[1] as 'educations' | 'works' | 'projects';
    const i = Number(m[2]);
    const arr = [...(next[key] as any[])];
    arr[i] = value;
    (next as any)[key] = arr;
    return next;
  }
  (next as any)[path] = value;
  return next;
}

function applyPartial(s: StreamingResume, partial: Partial<ExtractedResume>): StreamingResume {
  let next = s;
  for (const [k, v] of Object.entries(partial)) {
    if (Array.isArray(v) && (k === 'educations' || k === 'works' || k === 'projects')) {
      v.forEach((item, i) => { next = setByPath(next, `${k}[${i}]`, item); });
    } else {
      next = setByPath(next, k, v);
    }
  }
  return next;
}

export function useCandidateStream(initial: Candidate): {
  streaming: StreamingResume | null;
  final: Candidate;
  error: string | null;
} {
  const [final, setFinal] = useState<Candidate>(initial);
  const [streaming, setStreaming] = useState<StreamingResume | null>(
    initial.extractionStatus === 'parsed' || initial.extractionStatus === 'error'
      ? null
      : emptyStreaming()
  );
  const [error, setError] = useState<string | null>(
    initial.extractionStatus === 'error' ? initial.extractionError ?? '未知错误' : null
  );

  useEffect(() => {
    if (final.extractionStatus === 'parsed' || final.extractionStatus === 'error') return;

    const es = new EventSource(`/api/candidates/${final.id}/stream`);

    const onSnapshot = (e: MessageEvent) => {
      try {
        const { partial } = JSON.parse(e.data);
        setStreaming((s) => applyPartial(s ?? emptyStreaming(), partial));
      } catch { /* ignore malformed frame */ }
    };
    const onDelta = (e: MessageEvent) => {
      try {
        const { path, value } = JSON.parse(e.data);
        setStreaming((s) => setByPath(s ?? emptyStreaming(), path, value));
      } catch { /* ignore */ }
    };
    const onDone = (e: MessageEvent) => {
      try {
        const { candidate } = JSON.parse(e.data);
        setFinal(candidate);
        setStreaming(null);
      } catch { /* ignore */ }
      es.close();
    };
    const onServerError = (e: MessageEvent) => {
      // 服务端发的 event:error 有 data;浏览器网络 error 没有 data
      const data = (e as any).data;
      if (typeof data === 'string' && data.length > 0) {
        try {
          const { message } = JSON.parse(data);
          setError(message);
          setStreaming(null);
          es.close();
        } catch { /* malformed; keep streaming */ }
      }
      // 无 data 的网络 error:交给浏览器自动重连,不做事
    };

    es.addEventListener('snapshot', onSnapshot as EventListener);
    es.addEventListener('delta',    onDelta    as EventListener);
    es.addEventListener('done',     onDone     as EventListener);
    es.addEventListener('error',    onServerError as EventListener);

    return () => { es.close(); };
  }, [final.id, final.extractionStatus]);

  return { streaming, final, error };
}
