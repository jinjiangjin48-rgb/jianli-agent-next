// app/api/candidates/[id]/route.ts
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import { deletePdf } from '@/lib/storage';
import { PatchCandidate } from '@/lib/validation';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const parsed = PatchCandidate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', issues: parsed.error.issues }, { status: 400 });
  }

  const updated = {
    ...parsed.data,
    updatedAt: new Date(),
  };
  db.update(candidates).set(updated).where(eq(candidates.id, id)).run();

  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try { deletePdf(row.pdfPath); } catch (err) { console.error('unlink failed', err); }
  db.delete(candidates).where(eq(candidates.id, id)).run();
  return NextResponse.json({ ok: true });
}
