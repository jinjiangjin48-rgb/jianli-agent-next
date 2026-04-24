// app/api/jobs/route.ts
import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('ids')?.trim();
  if (!raw) return NextResponse.json({ items: [] });
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ items: [] });

  const rows = db.select({
    id: candidates.id,
    extractionStatus: candidates.extractionStatus,
    extractionError: candidates.extractionError,
  }).from(candidates).where(inArray(candidates.id, ids)).all();

  return NextResponse.json({ items: rows });
}
