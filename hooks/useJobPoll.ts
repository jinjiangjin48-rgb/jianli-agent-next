// hooks/useJobPoll.ts
'use client';
import { useEffect, useState } from 'react';
import type { ExtractionStatus } from '@/lib/db/schema';

export interface JobState {
  id: string;
  extractionStatus: ExtractionStatus;
  extractionError?: string | null;
}

export function useJobPoll(ids: string[], enabled = true, intervalMs = 2000) {
  const [states, setStates] = useState<Record<string, JobState>>({});

  useEffect(() => {
    if (!enabled || ids.length === 0) return;
    let alive = true;

    const tick = async () => {
      try {
        const r = await fetch(`/api/jobs?ids=${ids.join(',')}`);
        if (!r.ok) return;
        const body = (await r.json()) as { items: JobState[] };
        if (!alive) return;
        setStates((prev) => {
          const next = { ...prev };
          for (const it of body.items) next[it.id] = it;
          return next;
        });
      } catch {
        // polling failure shouldn't block
      }
    };

    tick();
    const t = setInterval(tick, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [enabled, ids.join(','), intervalMs]);

  return states;
}
