'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomView } from './types';

export type RoomStatus = 'connecting' | 'live' | 'lost' | 'missing' | 'needs-join' | 'removed';

const key = (code: string) => `oya:pid:${code}`;

export function savePid(code: string, pid: string) {
  try {
    localStorage.setItem(key(code), pid);
  } catch {}
}

export function rememberName(name: string, colour: string) {
  try {
    localStorage.setItem('oya:me', JSON.stringify({ name, colour }));
  } catch {}
}

export function recallName(): { name: string; colour: string } | null {
  try {
    return JSON.parse(localStorage.getItem('oya:me') ?? 'null');
  } catch {
    return null;
  }
}

/**
 * Live connection to a room. Players pass `spectator = false` and are
 * identified by the id saved when they created or joined the room; the big
 * screen passes `spectator = true`.
 */
export function useRoom(code: string, spectator = false) {
  const [view, setView] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<RoomStatus>('connecting');
  const [pid, setPid] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const offset = useRef(0);

  useEffect(() => {
    let stored: string | null = null;
    if (!spectator) {
      try {
        stored = localStorage.getItem(key(code));
      } catch {}
    }
    setPid(stored);
    if (!spectator && !stored) setStatus('needs-join');
    setReady(true);
  }, [code, spectator]);

  useEffect(() => {
    if (!ready) return;
    if (!spectator && !pid) return;
    setStatus('connecting');
    const es = new EventSource(`/api/rooms/${encodeURIComponent(code)}/events${pid ? `?pid=${encodeURIComponent(pid)}` : ''}`);
    es.onmessage = (e) => {
      const raw = JSON.parse(e.data);
      if (raw.kicked) {
        es.close();
        try {
          localStorage.removeItem(key(code));
        } catch {}
        setStatus('removed');
        return;
      }
      const v = raw as RoomView;
      offset.current = v.now - Date.now();
      setView(v);
      setStatus('live');
    };
    es.onerror = () => {
      setStatus((s) => (s === 'missing' || s === 'needs-join' || s === 'removed' ? s : 'lost'));
      // EventSource retries by itself; find out whether retrying can ever work.
      fetch(`/api/rooms/${encodeURIComponent(code)}${pid ? `?pid=${encodeURIComponent(pid)}` : ''}`)
        .then(async (r) => {
          if (r.status === 404) {
            es.close();
            setStatus('missing');
          } else if (r.ok && pid) {
            const info = await r.json();
            if (!info.member) {
              es.close();
              try {
                localStorage.removeItem(key(code));
              } catch {}
              setPid(null);
              setStatus('needs-join');
            }
          }
        })
        .catch(() => {});
    };
    return () => es.close();
  }, [ready, pid, code, spectator]);

  const send = useCallback(
    async (type: string, payload?: unknown): Promise<{ ok: boolean; error?: string; [k: string]: any }> => {
      if (!pid) return { ok: false, error: 'Not in the room.' };
      try {
        const r = await fetch(`/api/rooms/${encodeURIComponent(code)}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pid, type, payload }),
        });
        return await r.json();
      } catch {
        return { ok: false, error: 'No connection. Try again.' };
      }
    },
    [code, pid],
  );

  const joined = useCallback(
    (newPid: string) => {
      savePid(code, newPid);
      setPid(newPid);
    },
    [code],
  );

  /** Server time, corrected for this device's clock. */
  const serverNow = useCallback(() => Date.now() + offset.current, []);

  return { view, status, pid, send, joined, serverNow };
}

/** Seconds left until `deadline`, ticking a few times a second. */
export function useCountdown(deadline: number | null, serverNow: () => number): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!deadline) {
      setLeft(0);
      return;
    }
    const tick = () => setLeft(Math.max(0, (deadline - serverNow()) / 1000));
    tick();
    const t = setInterval(tick, 200);
    return () => clearInterval(t);
  }, [deadline, serverNow]);
  return left;
}
