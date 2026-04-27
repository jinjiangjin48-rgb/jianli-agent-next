'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, ScoreRing, Btn } from './ui';
import type { JobDescription, MatchResult } from '@/lib/db/schema';

type Props = {
  candidateId: string;
  extractionStatus: string;
  initialMatchResults: MatchResult[];
};

function ScoreBar({ label, score, comment }: { label: string; score: number; comment: string }) {
  const color = score >= 80 ? 'var(--score-100)' : score >= 65 ? 'var(--score-80)' : score >= 50 ? 'var(--score-60)' : score >= 30 ? 'var(--score-40)' : 'var(--score-0)';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--fg-muted)', marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)', fontWeight: 600 }}>{score}</span>
      </div>
      <div style={{ height: 4, background: 'var(--bg-sunken)', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
        <div style={{ height: '100%', width: score + '%', background: color, borderRadius: 2, transition: 'width 0.4s var(--ease-sift)' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>{comment}</div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="var(--accent-300)" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function JdMatchPanel({ candidateId, extractionStatus, initialMatchResults }: Props) {
  const [jdList, setJdList] = useState<JobDescription[] | null>(null);
  const [selectedJdId, setSelectedJdId] = useState('');
  const [matching, setMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>(initialMatchResults);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/jd').then(r => r.json()).then(({ items }) => {
      setJdList(items);
      if (items.length > 0 && !selectedJdId) setSelectedJdId(items[0].id);
    });
  }, []);

  const currentResult = matchResults.find(r => r.jdId === selectedJdId) ?? null;

  async function runMatch() {
    setMatching(true);
    setError(null);
    try {
      const r = await fetch(`/api/candidates/${candidateId}/match`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jdId: selectedJdId }),
      });
      if (!r.ok) {
        const e = await r.json();
        setError(e.message ?? '匹配失败，请重试');
        return;
      }
      const result: MatchResult = await r.json();
      setMatchResults(prev => [result, ...prev.filter(x => x.jdId !== selectedJdId)]);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setMatching(false);
    }
  }

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontSize: 11, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, marginBottom: 10 }}>{children}</div>
  );

  if (extractionStatus !== 'parsed') {
    return (
      <Card style={{ padding: 20 }}>
        <SectionLabel>JD 匹配</SectionLabel>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center', padding: '20px 0' }}>
          简历解析完成后方可匹配
        </div>
      </Card>
    );
  }

  if (jdList === null) {
    return (
      <Card style={{ padding: 20 }}>
        <SectionLabel>JD 匹配</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[70, 50, 40].map(w => (
            <div key={w} style={{ height: 12, borderRadius: 4, background: 'var(--bg-sunken)', width: `${w}%`, animation: 'sift-pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </Card>
    );
  }

  if (jdList.length === 0) {
    return (
      <Card style={{ padding: 20 }}>
        <SectionLabel>JD 匹配</SectionLabel>
        <div style={{ fontSize: 12, color: 'var(--fg-subtle)', textAlign: 'center', padding: '16px 0', lineHeight: 1.6 }}>
          尚未配置岗位 JD<br />
          前往<Link href="/jd" style={{ color: 'var(--accent)', textDecoration: 'none', margin: '0 4px' }}>岗位 JD</Link>创建后开始匹配
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SectionLabel>JD 匹配</SectionLabel>

      {/* JD 选择器 */}
      <select
        value={selectedJdId}
        onChange={e => setSelectedJdId(e.target.value)}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-elevated)', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--fg)', outline: 'none', cursor: 'pointer' }}
      >
        {jdList.map(jd => (
          <option key={jd.id} value={jd.id}>{jd.title}</option>
        ))}
      </select>

      {currentResult ? (
        <>
          {/* Score ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <ScoreRing score={currentResult.overall} size={120} label="综合" />
            {currentResult.weights && (
              <div style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'var(--font-mono)' }}>
                技能×{currentResult.weights.skill}% · 经验×{currentResult.weights.experience}% · 学历×{currentResult.weights.education}%
              </div>
            )}
          </div>

          {/* 三维度 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ScoreBar label="技能匹配" score={currentResult.skill.score} comment={currentResult.skill.comment} />
            <ScoreBar label="经验匹配" score={currentResult.experience.score} comment={currentResult.experience.comment} />
            <ScoreBar label="教育背景" score={currentResult.education.score} comment={currentResult.education.comment} />
          </div>

          {/* AI 综合评价 */}
          <div style={{ fontSize: 12, color: 'var(--fg-muted)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--bg-sunken)', borderRadius: 8 }}>
            {currentResult.summary}
          </div>

          {/* 匹配时间 + 重新匹配 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>
              {new Date(currentResult.matchedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
            <Btn size="sm" variant="ghost" onClick={runMatch} disabled={matching}>
              {matching ? <><Spinner /> 匹配中…</> : '重新匹配'}
            </Btn>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '16px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>尚未对该岗位进行匹配</div>
          <Btn variant="primary" onClick={runMatch} disabled={matching || !selectedJdId}>
            {matching ? <><Spinner /> AI 匹配中…</> : '开始匹配'}
          </Btn>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--danger-700)' }}>{error}</div>}
    </Card>
  );
}
