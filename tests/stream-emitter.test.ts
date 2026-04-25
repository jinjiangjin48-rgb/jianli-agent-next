import { describe, it, expect } from 'vitest';
import { createStreamEmitter } from '@/lib/extraction/stream-emitter';

function feedChunks(emitter: ReturnType<typeof createStreamEmitter>, chunks: string[]) {
  const all: { path: string; value: unknown }[] = [];
  for (const c of chunks) all.push(...emitter.feed(c));
  return all;
}

describe('stream-emitter', () => {
  it('emits basic only after 5 keys present', () => {
    const e = createStreamEmitter();
    const deltas = feedChunks(e, [
      '{"basic":{"name":"a","email":"b","phone":"c"',
      ',"city":"d"',                   // 4 keys,还不够
      ',"age":1},"targetRole":null',   // 5 keys + 下一个兄弟键 targetRole → emit basic + targetRole
    ]);
    const paths = deltas.map((d) => d.path);
    expect(paths).toContain('basic');
    expect(paths).toContain('targetRole');
    expect(deltas.find((d) => d.path === 'basic')?.value)
      .toEqual({ name: 'a', email: 'b', phone: 'c', city: 'd', age: 1 });
  });

  it('emits educations[i] only when sibling arrived or array length moves on', () => {
    const e = createStreamEmitter();
    const chunks = [
      '{"basic":{"name":"a","email":null,"phone":null,"city":null,"age":null},',
      '"targetRole":null,',
      '"educations":[{"school":"U1","major":null,"degree":null,"startDate":null,"endDate":null}',
      // 第一条齐了,但尚无下一条 / 尚无 works → 不 emit
    ];
    let deltas = feedChunks(e, chunks);
    expect(deltas.map((d) => d.path)).not.toContain('educations[0]');

    // 再喂第二条进来 → 第一条应当 emit
    deltas = [...deltas, ...e.feed(',{"school":"U2","major":null,"degree":null,"startDate":null,"endDate":null}')];
    expect(deltas.find((d) => d.path === 'educations[0]')?.value).toMatchObject({ school: 'U1' });
    // 第二条尚未 emit
    expect(deltas.map((d) => d.path)).not.toContain('educations[1]');

    // 关闭 educations 数组并让下一个兄弟键 works 出现
    deltas = [...deltas, ...e.feed('],"works":[')];
    expect(deltas.find((d) => d.path === 'educations[1]')?.value).toMatchObject({ school: 'U2' });
  });

  it('skills waits for summary sibling or stream end', () => {
    const e = createStreamEmitter();
    const prefix = '{"basic":{"name":null,"email":null,"phone":null,"city":null,"age":null},'
      + '"targetRole":null,"educations":[],"works":[],"projects":[],';
    let deltas = feedChunks(e, [prefix + '"skills":["A","B","C"]']);
    expect(deltas.map((d) => d.path)).not.toContain('skills');

    // 继续喂 summary 键进来 → skills emit
    deltas = [...deltas, ...e.feed(',"summary":"ok"')];
    expect(deltas.find((d) => d.path === 'skills')?.value).toEqual(['A', 'B', 'C']);
  });

  it('finalize emits summary and returns strict-parsed raw', () => {
    const e = createStreamEmitter();
    const doc = {
      basic: { name: 'a', email: null, phone: null, city: null, age: null },
      targetRole: null,
      educations: [],
      works: [],
      projects: [],
      skills: ['X'],
      summary: '一句话',
    };
    const json = JSON.stringify(doc);
    for (let i = 0; i < json.length; i += 30) e.feed(json.slice(i, i + 30));
    const { deltas, raw } = e.finalize();
    const paths = deltas.map((d) => d.path);
    expect(paths).toContain('summary');
    expect(raw).toEqual(doc);
  });

  it('finalize emits skills if stream ended before a summary key was seen', () => {
    // 防御:理论上 prompt 要求 summary 存在,但万一 LLM 只吐到 skills 就断,finalize 也要把 skills 推掉
    const e = createStreamEmitter();
    const json = '{"basic":{"name":null,"email":null,"phone":null,"city":null,"age":null},'
      + '"targetRole":null,"educations":[],"works":[],"projects":[],"skills":["X"],"summary":""}';
    for (let i = 0; i < json.length; i += 30) e.feed(json.slice(i, i + 30));
    const { deltas } = e.finalize();
    expect(deltas.map((d) => d.path)).toEqual(
      expect.arrayContaining(['skills', 'summary'])
    );
  });

  it('does NOT emit educations[0] when school anchor is missing, even if works sibling appears', () => {
    const e = createStreamEmitter();
    // 第一条 education 只有 major,没有 school
    const deltas = feedChunks(e, [
      '{"basic":{"name":null,"email":null,"phone":null,"city":null,"age":null},',
      '"targetRole":null,',
      '"educations":[{"major":"CS","degree":null,"startDate":null,"endDate":null}',
      '],"works":[',  // 下一个兄弟键 works 出现
    ]);
    expect(deltas.map((d) => d.path)).not.toContain('educations[0]');
  });

  it('each path is emitted at most once across feed+finalize', () => {
    const e = createStreamEmitter();
    const doc = {
      basic: { name: 'a', email: 'b', phone: 'c', city: 'd', age: 1 },
      targetRole: 'x',
      educations: [{ school: 'U', major: null, degree: null, startDate: null, endDate: null }],
      works: [{ company: 'C', role: null, startDate: null, endDate: null, highlights: [] }],
      projects: [{ name: 'P', url: null, role: null, techStack: [], startDate: null, endDate: null, description: null, highlights: [] }],
      skills: ['A'],
      summary: 'y',
    };
    const json = JSON.stringify(doc);
    const collected: string[] = [];
    for (let i = 0; i < json.length; i += 10) {
      for (const d of e.feed(json.slice(i, i + 10))) collected.push(d.path);
    }
    for (const d of e.finalize().deltas) collected.push(d.path);
    const counts = collected.reduce<Record<string, number>>((acc, p) => {
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    }, {});
    for (const [k, v] of Object.entries(counts)) {
      expect(v, `path ${k} emitted ${v} times`).toBe(1);
    }
  });
});
