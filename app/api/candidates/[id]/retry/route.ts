// app/api/candidates/[id]/retry/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { enqueueExtraction } from '@/lib/extraction/queue';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (row.extractionStatus !== 'error') {
    return NextResponse.json({ error: 'not_in_error_state' }, { status: 409 });
  }

  db.update(candidates).set({
    extractionStatus: 'uploaded',
    extractionError: null,
    updatedAt: new Date(),
  }).where(eq(candidates.id, id)).run();

  enqueueExtraction(id);
  return NextResponse.json({ id, extractionStatus: 'uploaded' });
}
