'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Avatar, StatusPill, Card, SkillTag, SchoolTierBadge, ThemeToggle } from './ui';
import JdMatchPanel from './JdMatchPanel';
import { I } from './icons';
import { useCandidateStream } from '@/hooks/useCandidateStream';
import type { Candidate, CandidateStatus, User } from '@/lib/db/schema';

export default function CandidateDetailClient({ initial, user }: { initial: Candidate; user: User }) {
  const router = useRouter();
  const { streaming, final, error } = useCandidateStream(initial);
  const [c, setC] = useState(initial);

  useEffect(() => {
    if (final.extractionStatus === 'parsed' && c.extractionStatus !== 'parsed') {
      setC(final);
    }
  }, [final, c.extractionStatus]);

  const isStreaming = streaming !== null && !error;

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

  async function onRetry() {
    const r = await fetch(`/api/candidates/${c.id}/retry`, { method: 'POST' });
    if (r.ok) window.location.reload();
  }

  const headerBasic = streaming?.basic ?? {
    name: c.name, email: c.email, phone: c.phone, city: c.city, age: c.age,
  };
  const headerTargetRole = streaming ? streaming.targetRole : c.targetRole;
  const headerRole = c.role;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" user={user} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{ height: 60, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)', flexShrink: 0 }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push('/dashboard')}>返回</Btn>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            候选人 · {isStreaming && !headerBasic.name ? '解析中…' : (headerBasic.name ?? c.id)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href={`/candidates/${c.id}/edit`}><Btn size="sm" icon={<I.Edit />}>编辑</Btn></Link>
            <Btn size="sm" variant="danger" onClick={onDelete}>删除</Btn>
            <ThemeToggle />
          </div>
        </div>

        {/* Candidate header */}
        <div style={{ padding: '20px 28px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar name={headerBasic.name ?? '?'} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minHeight: 28 }}>
              <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: 0 }}>
                {headerBasic.name || (isStreaming ? ' ' : '(未提取)')}
              </h1>
              {c.extractionStatus === 'parsed' && <StatusPill status={c.status} />}
            </div>
            {headerTargetRole && (
              <div style={{ marginTop: 4 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 4, fontSize: 12, fontWeight: 500, background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)' }}>
                  <I.Target size={12} /> {headerTargetRole}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 14, marginTop: 5, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
              {headerRole && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Briefcase size={13} />{headerRole}</span>}
              {headerBasic.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.MapPin size={13} />{headerBasic.city}</span>}
              {headerBasic.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Mail size={13} />{headerBasic.email}</span>}
              {headerBasic.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Phone size={13} />{headerBasic.phone}</span>}
              {headerBasic.age != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.User size={13} />{headerBasic.age} 岁</span>}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: '20px 28px', overflow: 'auto' }}>
          {error ? (
            <Card style={{ padding: 32 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger-700)', marginBottom: 10 }}>解析失败</div>
              <div style={{ fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>{error}</div>
              <div style={{ marginTop: 16 }}>
                <Btn variant="primary" onClick={onRetry}>重试</Btn>
              </div>
            </Card>
          ) : (
            <StreamingSections c={c} streaming={streaming} isStreaming={isStreaming} onUpdateStatus={updateStatus} />
          )}
        </div>
      </div>
    </div>
  );
}

function StreamingSections({
  c, streaming, isStreaming, onUpdateStatus,
}: {
  c: Candidate;
  streaming: ReturnType<typeof useCandidateStream>['streaming'];
  isStreaming: boolean;
  onUpdateStatus: (next: CandidateStatus) => void;
}) {
  const src: any = streaming
    ?? (c.extractedJson ?? { educations: [], works: [], projects: [], skills: [], summary: '' });

  const edus  = (src.educations ?? []).filter((e: any) => e && typeof e === 'object');
  const works = (src.works      ?? []).filter((w: any) => w && typeof w === 'object');
  const prjs  = (src.projects   ?? []).filter((p: any) => p && typeof p === 'object');
  const skills = src.skills ?? [];
  const summary = typeof src.summary === 'string' ? src.summary : '';

  const placeholder = isStreaming ? '' : '—';

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>{children}</div>
  );

  const BulletDot = ({ color = 'var(--accent-300)' }: { color?: string }) => (
    <div style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0, marginTop: 4 }} />
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, maxWidth: 1200, alignItems: 'start' }}>
      {/* ── Left column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* AI 评语 */}
        <Card style={{ padding: 20 }}>
          <SectionLabel>AI 评语</SectionLabel>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', margin: 0, minHeight: 22, whiteSpace: 'pre-wrap' }}>
            {summary || placeholder}
          </p>
        </Card>

        {/* 工作经历 */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>工作经历</div>
          {works.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{placeholder}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {works.map((w: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <BulletDot color="var(--accent-400)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {w.company || ''}{w.role ? ` · ${w.role}` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                      {w.startDate || ''}{(w.startDate || w.endDate) ? ' — ' : ''}{w.endDate || ''}
                    </div>
                    {w.description && (
                      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 5, lineHeight: 1.6, fontStyle: 'italic' }}>
                        {w.description}
                      </div>
                    )}
                    {Array.isArray(w.highlights) && w.highlights.length > 0 && (
                      <ul style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 0 0', padding: 0, listStyle: 'none', lineHeight: 1.6 }}>
                        {w.highlights.map((h: string, j: number) => (
                          <li key={j} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                            <span style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}>·</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 教育背景 */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>教育背景</div>
          {edus.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{placeholder}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {edus.map((e: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12 }}>
                  <BulletDot color="var(--info-400)" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{e.school || ''}</span>
                      <SchoolTierBadge tier={e.schoolTier} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 3 }}>
                      {e.major || ''}{e.major && e.degree ? ' · ' : ''}{e.degree || ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                      {e.startDate || ''}{(e.startDate || e.endDate) ? ' — ' : ''}{e.endDate || ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 项目经历 */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>项目经历</div>
          {prjs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{placeholder}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {prjs.map((p: any, i: number) => (
                <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name || ''}</span>
                    {p.valueTag && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: p.valueTag === '亮点项目' ? 'var(--accent-bg-subtle)' : 'var(--bg-sunken)',
                        color: p.valueTag === '亮点项目' ? 'var(--accent-700)' : 'var(--fg-subtle)',
                        border: '1px solid ' + (p.valueTag === '亮点项目' ? 'var(--accent-300)' : 'var(--border)'),
                        whiteSpace: 'nowrap', alignSelf: 'center',
                      }}>
                        {p.valueTag}
                      </span>
                    )}
                    {p.role && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>· {p.role}</span>}
                    {(p.startDate || p.endDate) && (
                      <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                        · {p.startDate || ''}{(p.startDate || p.endDate) ? ' — ' : ''}{p.endDate || ''}
                      </span>
                    )}
                    {p.url && typeof p.url === 'string' && p.url.startsWith('http') && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer"
                         style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <I.ArrowR size={12} />
                        {(() => { try { return new URL(p.url).host; } catch { return p.url; } })()}
                      </a>
                    )}
                  </div>
                  {Array.isArray(p.techStack) && p.techStack.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {p.techStack.map((t: string, j: number) => <SkillTag key={j}>{t}</SkillTag>)}
                    </div>
                  )}
                  {p.description && (
                    <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 8, lineHeight: 1.6 }}>{p.description}</div>
                  )}
                  {Array.isArray(p.highlights) && p.highlights.length > 0 && (
                    <ul style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0 0', padding: 0, listStyle: 'none', lineHeight: 1.65 }}>
                      {p.highlights.map((h: string, j: number) => (
                        <li key={j} style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                          <span style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}>·</span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.aiSummary && (
                    <div style={{
                      fontSize: 12, color: 'var(--fg-muted)', borderTop: '1px solid var(--border)',
                      paddingTop: 8, marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginTop: 1, letterSpacing: '0.02em' }}>AI</span>
                      <span style={{ lineHeight: 1.55 }}>{p.aiSummary}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Right panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* JD 匹配面板 */}
        <JdMatchPanel
          candidateId={c.id}
          extractionStatus={c.extractionStatus}
          initialMatchResults={c.matchResults ?? []}
        />

        {/* 技能 */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>技能</div>
          {skills.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>{placeholder}</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map((s: string, i: number) => <SkillTag key={i} variant="default">{s}</SkillTag>)}
            </div>
          )}
        </Card>

        {/* 状态流转 */}
        {!isStreaming && (
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>状态流转</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const).map((s) => (
                <Btn key={s} size="sm" variant={c.status === s ? 'primary' : 'secondary'} onClick={() => onUpdateStatus(s)}>{s}</Btn>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
