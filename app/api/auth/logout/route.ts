import { NextResponse } from 'next/server';
import { getUserFromRequest, deleteSession, clearSessionCookie, SESSION_COOKIE } from '@/lib/auth/session';

export async function POST(req: Request) {
  const raw = req.headers.get('cookie') ?? '';
  const sid = raw.split(';').map(s => s.trim()).find(s => s.startsWith(SESSION_COOKIE + '='))?.split('=')[1];
  if (sid) deleteSession(sid);
  return NextResponse.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
