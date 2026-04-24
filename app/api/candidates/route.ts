// app/api/candidates/route.ts
import { NextResponse } from 'next/server';
import { and, desc, asc, eq, like, or, SQL } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates, CANDIDATE_STATUS } from '@/lib/db/schema';

const VALID_SORTS = ['recent', 'oldest', 'name'] as const;
type SortOpt = typeof VALID_SORTS[number];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const q = url.searchParams.get('q')?.trim();
  const sortRaw = (url.searchParams.get('sort') ?? 'recent') as SortOpt;
  const sort: SortOpt = (VALID_SORTS as readonly string[]).includes(sortRaw) ? sortRaw : 'recent';

  const wheres: SQL[] = [];
  if (status && (CANDIDATE_STATUS as readonly string[]).includes(status)) {
    wheres.push(eq(candidates.status, status as any));
  }
  if (q) {
    const pat = `%${q}%`;
    wheres.push(or(
      like(candidates.name, pat),
      like(candidates.school, pat),
      like(candidates.role, pat),
    )!);
  }

  const orderBy =
    sort === 'oldest' ? asc(candidates.createdAt) :
    sort === 'name'   ? asc(candidates.name) :
                        desc(candidates.createdAt);

  const items = db.select().from(candidates)
    .where(wheres.length ? and(...wheres) : undefined)
    .orderBy(orderBy)
    .all();

  return NextResponse.json({ items });
}
