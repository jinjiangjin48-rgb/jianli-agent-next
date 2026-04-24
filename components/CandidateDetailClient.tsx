'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Avatar, StatusPill, Card, SkillTag, ThemeToggle } from './ui';
import { I } from './icons';
import { useJobPoll } from '@/hooks/useJobPoll';
import type { Candidate, CandidateStatus } from '@/lib/db/schema';

export default function CandidateDetailClient({ initial }: { initial: Candidate }) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const pendingIds = c.extractionStatus === 'parsed' || c.extractionStatus === 'error' ? [] : [c.id];
  const polled = useJobPoll(pendingIds, pendingIds.length > 0);

  useEffect(() => {
    if (polled[c.id] && polled[c.id].extractionStatus !== c.extractionStatus) {
      fetch(`/api/candidates/${c.id}`).then((r) => r.json()).then(setC);
    }
  }, [polled, c.id, c.extractionStatus]);

  async function updateStatus(next: CandidateStatus) {
    const r = await fetch(`/api/candidates/${c.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    if (r.ok) setC(await r.json());
  }

  async function onDelete() {
    if (!confirm(`确认删除候选人「${c.name ?? c.id}」?`)) return;
    const r = await fetch(`/api/candidates/${c.id}`, { method: 'DELETE' });
    if (r.ok) router.push('/dashboard');
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)' }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push('/dashboard')}>返回</Btn>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>候选人 · {c.name ?? c.id}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href={`/candidates/${c.id}/edit`}><Btn size="sm" icon={<I.Edit />}>编辑</Btn></Link>
            <Btn size="sm" variant="danger" onClick={onDelete}>删除</Btn>
            <ThemeToggle />
          </div>
        </div>

        <div style={{ padding: '24px 32px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={c.name ?? '?'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: 0 }}>{c.name ?? '(未提取)'}</h1>
              {c.extractionStatus === 'parsed' && <StatusPill status={c.status} />}
            </div>
            {c.extractionStatus === 'parsed' && (
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
                {c.role && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Briefcase size={13} />{c.role}</span>}
                {c.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.MapPin size={13} />{c.city}</span>}
                {c.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Mail size={13} />{c.email}</span>}
                {c.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Phone size={13} />{c.phone}</span>}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          {c.extractionStatus === 'extracting' || c.extractionStatus === 'uploaded' ? (
            <Card style={{ padding: 40, textAlign: 'center', color: 'var(--fg-subtle)' }}>
              <I.Sparkles size={24} style={{ color: 'var(--accent)', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 15, color: 'var(--fg)', fontWeight: 500, marginBottom: 4 }}>AI 正在解析…</div>
              <div style={{ fontSize: 13 }}>此页面会自动刷新,无需操作</div>
            </Card>
          ) : c.extractionStatus === 'error' ? (
            <Card style={{ padding: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-700)', marginBottom: 10 }}>解析失败</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{c.extractionError ?? '未知错误'}</div>
              <div style={{ marginTop: 16 }}>
                <Btn variant="primary" onClick={async () => {
                  const r = await fetch(`/api/candidates/${c.id}/retry`, { method: 'POST' });
                  if (r.ok) {
                    const fresh = await (await fetch(`/api/candidates/${c.id}`)).json();
                    setC(fresh);
                  }
                }}>重试</Btn>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1200 }}>
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>AI 评语</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', margin: 0 }}>{c.summary ?? '无'}</p>
              </Card>
              <Card style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>工作经历(最新)</div>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent-300)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.company ?? '—'} · {c.role ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>{c.years ?? '—'} 年</div>
                </div>
              </Card>
              <Card style={{ padding: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>教育背景</div>
                <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--info-300)' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{c.school ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{c.major ?? '—'} · {c.degree ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>毕业 {c.gradYear ?? '—'}</div>
                </div>
              </Card>
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>技能</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(c.skills ?? []).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
                </div>
              </Card>
              <Card style={{ padding: 18, gridColumn: 'span 2' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>状态流转</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const).map((s) => (
                    <Btn key={s} variant={c.status === s ? 'primary' : 'secondary'} onClick={() => updateStatus(s)}>{s}</Btn>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
