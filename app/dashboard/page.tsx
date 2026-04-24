// app/dashboard/page.tsx
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { candidates } from '@/lib/db/schema';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const items = db.select().from(candidates).orderBy(desc(candidates.createdAt)).all();
  return <DashboardClient initial={items} />;
}
