// app/api/candidates/[id]/stream/route.ts
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import * as bus from '@/lib/extraction/event-bus';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return new Response('not_found', { status: 404 });

  const encoder = new TextEncoder();
  let hb: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (s: string) => {
        try { controller.enqueue(encoder.encode(s)); } catch { /* stream closed */ }
      };
      const send = (event: string, data: unknown) => {
        safeEnqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };
      const closeAll = () => {
        if (hb) { clearInterval(hb); hb = null; }
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }
        try { controller.close(); } catch { /* already closed */ }
      };

      // Short-circuit: terminal states
      if (row.extractionStatus === 'parsed') {
        send('done', { candidate: row });
        closeAll();
        return;
      }
      if (row.extractionStatus === 'error') {
        send('error', { message: row.extractionError ?? '未知错误' });
        closeAll();
        return;
      }

      // Live: subscribe, then emit current buffer snapshot
      const sub = bus.subscribe(id, (event) => {
        if (event.type === 'chunk') {
          send('chunk', { text: event.text });
        } else if (event.type === 'done') {
          send('done', { candidate: event.candidate });
          closeAll();
        } else if (event.type === 'error') {
          send('error', { message: event.message });
          closeAll();
        }
      });
      unsubscribe = sub.unsubscribe;
      send('snapshot', { buffer: sub.buffer });

      hb = setInterval(() => safeEnqueue(`:hb\n\n`), 15_000);

      req.signal.addEventListener('abort', closeAll);
    },
    cancel() {
      if (hb) { clearInterval(hb); hb = null; }
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
