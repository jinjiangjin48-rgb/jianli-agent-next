import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import CandidateEditClient from '@/components/CandidateEditClient';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = db.select().from(candidates).where(eq(candidates.id, id)).get();
  if (!row) notFound();
  return <CandidateEditClient initial={row} />;
}
