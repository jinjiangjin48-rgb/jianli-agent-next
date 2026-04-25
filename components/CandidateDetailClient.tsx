'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sidebar, Btn, Avatar, StatusPill, Card, SkillTag, ThemeToggle } from './ui';
import { I } from './icons';
import { Skeleton } from './Skeleton';
import { useCandidateStream } from '@/hooks/useCandidateStream';
import type { Candidate, CandidateStatus } from '@/lib/db/schema';
import type { ExtractedResume } from '@/lib/validation';

export default function CandidateDetailClient({ initial }: { initial: Candidate }) {
  const router = useRouter();
  const { streaming, final, error } = useCandidateStream(initial);
  const [c, setC] = useState(initial);

  // hook 的 final 在 done 事件时会更新为 parsed 态的完整 Candidate;
  // 仅在 c 还是非终态时把它 adopt 过来,避免 PATCH 后的本地新数据被回滚。
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
    if (r.ok) {
      // hook 的 initial 在组件生命周期内锁定,重试后最简单是硬刷新一次
      // 让页面 SSR 重新拿到 uploaded 态的 Candidate,触发 hook 建新 SSE。
      window.location.reload();
    }
  }

  // 头部数据优先从 streaming.basic 取,否则从 c(DB) 取
  const headerBasic = streaming?.basic ?? {
    name: c.name, email: c.email, phone: c.phone, city: c.city, age: c.age,
  };
  const headerTargetRole = streaming ? streaming.targetRole : c.targetRole;
  const headerRole = c.role;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', background: 'var(--bg-sunken)' }}>
      <Sidebar active="dashboard" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, background: 'var(--bg)' }}>
          <Btn size="sm" icon={<I.ChevL />} variant="ghost" onClick={() => router.push('/dashboard')}>返回</Btn>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            候选人 · {isStreaming && !headerBasic.name ? '解析中' : (headerBasic.name ?? c.id)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <Link href={`/candidates/${c.id}/edit`}><Btn size="sm" icon={<I.Edit />}>编辑</Btn></Link>
            <Btn size="sm" variant="danger" onClick={onDelete}>删除</Btn>
            <ThemeToggle />
          </div>
        </div>

        <div style={{ padding: '24px 32px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center' }}>
          <Avatar name={headerBasic.name ?? '?'} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              {headerBasic.name ? (
                <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.015em', color: 'var(--fg)', margin: 0 }}>{headerBasic.name}</h1>
              ) : isStreaming ? (
                <Skeleton.Line w={120} h={26} />
              ) : (
                <h1 style={{ fontSize: 26, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>(未提取)</h1>
              )}
              {c.extractionStatus === 'parsed' && <StatusPill status={c.status} />}
            </div>

            {headerTargetRole === undefined && isStreaming ? (
              <div style={{ marginTop: 6 }}><Skeleton.Badge w={120} h={22} /></div>
            ) : headerTargetRole ? (
              <div style={{ marginTop: 6 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 4,
                  fontSize: 12, fontWeight: 500,
                  background: 'var(--accent-bg-subtle)', color: 'var(--accent-700)',
                }}>🎯 {headerTargetRole}</span>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 13, color: 'var(--fg-muted)', flexWrap: 'wrap' }}>
              {isStreaming && !streaming?.basic ? (
                <>
                  <Skeleton.Line w={90} /><Skeleton.Line w={70} /><Skeleton.Line w={120} /><Skeleton.Line w={100} />
                </>
              ) : (
                <>
                  {headerRole && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Briefcase size={13} />{headerRole}</span>}
                  {headerBasic.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.MapPin size={13} />{headerBasic.city}</span>}
                  {headerBasic.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Mail size={13} />{headerBasic.email}</span>}
                  {headerBasic.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><I.Phone size={13} />{headerBasic.phone}</span>}
                  {headerBasic.age != null && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>🎂 {headerBasic.age} 岁</span>}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
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
  // 数据源:流式中用 streaming,最终用 c.extractedJson
  const src: Partial<ExtractedResume> = streaming
    ? {
        educations: streaming.educations,
        works:      streaming.works,
        projects:   streaming.projects,
        skills:     streaming.skills,
        summary:    streaming.summary,
      }
    : (c.extractedJson ?? { educations: [], works: [], projects: [], skills: [], summary: '' });

  const summaryPending = isStreaming && streaming?.summary === undefined;
  const skillsPending  = isStreaming && streaming?.skills  === undefined;
  // 数组:length=0 且流未完 → 骨架;流结束 length=0 → "—"
  const edus  = src.educations ?? [];
  const works = src.works      ?? [];
  const prjs  = src.projects   ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1200 }}>
      {/* AI 评语 */}
      <Card style={{ padding: 18, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>AI 评语</div>
        {summaryPending ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton.Line w="100%" /><Skeleton.Line w="95%" /><Skeleton.Line w="60%" />
          </div>
        ) : (
          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', margin: 0 }}>{src.summary || '—'}</p>
        )}
      </Card>

      {/* 工作经历 */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>工作经历</div>
        {works.length === 0 && isStreaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton.Line w="70%" h={13} /><Skeleton.Line w="40%" h={11} /><Skeleton.Line w="85%" h={11} />
              </div>
            ))}
          </div>
        ) : works.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {works.map((w, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent-300)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{w.company} · {w.role ?? '—'}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                  {(w.startDate ?? '—')} — {(w.endDate ?? '—')}
                </div>
                {w.highlights.length > 0 && (
                  <ul style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '6px 0 0 14px', padding: 0, lineHeight: 1.6 }}>
                    {w.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 教育背景 */}
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>教育背景</div>
        {edus.length === 0 && isStreaming ? (
          <div style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skeleton.Line w="70%" h={13} /><Skeleton.Line w="50%" h={11} /><Skeleton.Line w="40%" h={11} />
          </div>
        ) : edus.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {edus.map((e, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--info-300)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.school}</div>
                <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>
                  {e.major ?? '—'} · {e.degree ?? '—'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-subtle)', marginTop: 2 }}>
                  {(e.startDate ?? '—')} — {(e.endDate ?? '—')}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 项目经历 */}
      <Card style={{ padding: 18, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>项目经历</div>
        {prjs.length === 0 && isStreaming ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skeleton.Line w="40%" h={14} /><Skeleton.Line w="90%" h={12} /><Skeleton.Line w="75%" h={12} />
              </div>
            ))}
          </div>
        ) : prjs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--fg-subtle)' }}>—</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {prjs.map((p, i) => (
              <div key={i} style={{ paddingLeft: 12, borderLeft: '2px solid var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                  {p.role && <span style={{ fontSize: 12, color: 'var(--fg-muted)' }}>· {p.role}</span>}
                  {(p.startDate || p.endDate) && (
                    <span style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                      · {(p.startDate ?? '—')} — {(p.endDate ?? '—')}
                    </span>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                       style={{ fontSize: 12, color: 'var(--accent)', marginLeft: 'auto' }}>
                      🔗 {new URL(p.url).host}
                    </a>
                  )}
                </div>
                {p.techStack.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {p.techStack.map((t, j) => <SkillTag key={j}>{t}</SkillTag>)}
                  </div>
                )}
                {p.description && (
                  <div style={{ fontSize: 13, color: 'var(--fg)', marginTop: 8, lineHeight: 1.6 }}>{p.description}</div>
                )}
                {p.highlights.length > 0 && (
                  <ul style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '8px 0 0 14px', padding: 0, lineHeight: 1.65 }}>
                    {p.highlights.map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 技能 */}
      <Card style={{ padding: 18, gridColumn: 'span 2' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>技能</div>
        {skillsPending ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[60, 80, 70, 90, 55, 75].map((w, i) => (
              <Skeleton.Badge key={i} w={w} h={22} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(src.skills ?? []).map((s) => <SkillTag key={s}>{s}</SkillTag>)}
          </div>
        )}
      </Card>

      {/* 状态流转 — 流式期间不渲染 */}
      {!isStreaming && (
        <Card style={{ padding: 18, gridColumn: 'span 2' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', marginBottom: 12 }}>状态流转</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['待筛选', '初筛通过', '面试中', '已录用', '已淘汰'] as const).map((s) => (
              <Btn key={s} variant={c.status === s ? 'primary' : 'secondary'} onClick={() => onUpdateStatus(s)}>{s}</Btn>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
