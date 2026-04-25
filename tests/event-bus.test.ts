import { describe, it, expect, beforeEach } from 'vitest';
import * as bus from '@/lib/extraction/event-bus';

beforeEach(() => {
  // 模块级 Map 通过 globalThis 持有,手动清理避免跨用例污染
  delete (globalThis as any).__streamEventBus;
});

describe('event-bus', () => {
  it('subscribe returns empty snapshot when no deltas yet', () => {
    const sub = bus.subscribe('id-a', () => {});
    expect(sub.snapshot).toEqual({});
    sub.unsubscribe();
  });

  it('publishes delta to all subscribers', () => {
    const got1: any[] = [];
    const got2: any[] = [];
    const s1 = bus.subscribe('id-b', (e) => got1.push(e));
    const s2 = bus.subscribe('id-b', (e) => got2.push(e));

    bus.publish('id-b', { type: 'delta', path: 'basic', value: { name: 'a' } });

    expect(got1).toHaveLength(1);
    expect(got2).toHaveLength(1);
    expect(got1[0]).toEqual({ type: 'delta', path: 'basic', value: { name: 'a' } });
    s1.unsubscribe(); s2.unsubscribe();
  });

  it('accumulates snapshot: top-level key overwrites, array[i] placed at index', () => {
    bus.publish('id-c', { type: 'delta', path: 'basic', value: { name: 'x' } });
    bus.publish('id-c', { type: 'delta', path: 'educations[0]', value: { school: 'U1' } });
    bus.publish('id-c', { type: 'delta', path: 'educations[1]', value: { school: 'U2' } });

    expect(bus.getSnapshot('id-c')).toEqual({
      basic: { name: 'x' },
      educations: [{ school: 'U1' }, { school: 'U2' }],
    });
  });

  it('new subscriber receives current snapshot on subscribe', () => {
    bus.publish('id-d', { type: 'delta', path: 'summary', value: 'hello' });
    const sub = bus.subscribe('id-d', () => {});
    expect(sub.snapshot).toEqual({ summary: 'hello' });
    sub.unsubscribe();
  });

  it('unsubscribe stops further events on that listener', () => {
    const got: any[] = [];
    const sub = bus.subscribe('id-e', (e) => got.push(e));
    sub.unsubscribe();
    bus.publish('id-e', { type: 'delta', path: 'basic', value: {} });
    expect(got).toHaveLength(0);
  });

  it('clear removes both snapshot and emitter', () => {
    bus.publish('id-f', { type: 'delta', path: 'summary', value: 'x' });
    bus.clear('id-f');
    expect(bus.getSnapshot('id-f')).toEqual({});
  });

  it('done and error events are forwarded without touching snapshot', () => {
    bus.publish('id-g', { type: 'delta', path: 'summary', value: 'x' });
    const got: any[] = [];
    const sub = bus.subscribe('id-g', (e) => got.push(e));
    bus.publish('id-g', { type: 'done', candidate: { id: 'id-g' } as any });
    expect(got[0].type).toBe('done');
    expect(bus.getSnapshot('id-g').summary).toBe('x'); // snapshot 仍在,直到显式 clear
    sub.unsubscribe();
    bus.clear('id-g');
  });
});
