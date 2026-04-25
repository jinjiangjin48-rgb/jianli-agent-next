// lib/extraction/event-bus.ts
import { EventEmitter } from 'node:events';
import type { ExtractedResume } from '../validation';
import type { Candidate } from '../db/schema';

export type StreamEvent =
  | { type: 'delta'; path: string; value: unknown }
  | { type: 'done';  candidate: Candidate }
  | { type: 'error'; message: string };

export type Listener = (event: StreamEvent) => void;

type State = {
  emitters:  Map<string, EventEmitter>;
  snapshots: Map<string, Partial<ExtractedResume>>;
};

declare global {
  // eslint-disable-next-line no-var
  var __streamEventBus: State | undefined;
}

function state(): State {
  if (!globalThis.__streamEventBus) {
    globalThis.__streamEventBus = { emitters: new Map(), snapshots: new Map() };
  }
  return globalThis.__streamEventBus;
}

function getEmitter(id: string): EventEmitter {
  const s = state();
  let e = s.emitters.get(id);
  if (!e) {
    e = new EventEmitter();
    e.setMaxListeners(0);
    s.emitters.set(id, e);
  }
  return e;
}

function applyDeltaToSnapshot(snap: any, path: string, value: unknown): void {
  const m = path.match(/^(\w+)\[(\d+)\]$/);
  if (m) {
    const key = m[1];
    const idx = Number(m[2]);
    if (!Array.isArray(snap[key])) snap[key] = [];
    snap[key][idx] = value;
    return;
  }
  snap[path] = value;
}

export function subscribe(id: string, listener: Listener): {
  snapshot: Partial<ExtractedResume>;
  unsubscribe: () => void;
} {
  const e = getEmitter(id);
  const snapshot = { ...(state().snapshots.get(id) ?? {}) };
  e.on('event', listener);
  return {
    snapshot,
    unsubscribe: () => { e.off('event', listener); },
  };
}

export function publish(id: string, event: StreamEvent): void {
  if (event.type === 'delta') {
    const snap = state().snapshots.get(id) ?? {};
    applyDeltaToSnapshot(snap, event.path, event.value);
    state().snapshots.set(id, snap);
  }
  getEmitter(id).emit('event', event);
}

export function getSnapshot(id: string): Partial<ExtractedResume> {
  return { ...(state().snapshots.get(id) ?? {}) };
}

export function clear(id: string): void {
  const s = state();
  s.emitters.delete(id);
  s.snapshots.delete(id);
}
