'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import PlayerRoom from '@/components/PlayerRoom';
import { ColourPicker, Logo } from '@/components/ui';
import { COLOURS } from '@/lib/types';
import { recallName, rememberName, useRoom } from '@/lib/useRoom';

function JoinForm({ code, onJoined, onMissing }: { code: string; onJoined: (pid: string) => void; onMissing: () => void }) {
  const [name, setName] = useState('');
  const [colour, setColour] = useState(COLOURS[2]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const me = recallName();
    if (me?.name) setName(me.name);
    if (me?.colour && COLOURS.includes(me.colour)) setColour(me.colour);
    fetch(`/api/rooms/${encodeURIComponent(code)}`).then((r) => r.status === 404 && onMissing()).catch(() => {});
  }, [code, onMissing]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tell us your name first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colour }),
      });
      const data = await r.json();
      if (r.status === 404) return onMissing();
      if (!r.ok) return setError(data.error ?? 'Could not join.');
      rememberName(name.trim(), colour);
      onJoined(data.pid);
    } catch {
      setError('No connection. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="wrap" style={{ gap: 20 }}>
      <Logo />
      <div className="card on-violet col gap-8">
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>YOU ARE JOINING</span>
        <h1 className="display" style={{ fontSize: 40 }}>{code}</h1>
      </div>
      <form className="col gap-16" onSubmit={join}>
        <div className="col gap-8">
          <label className="label" htmlFor="join-name">Your name</label>
          <input id="join-name" className="input" value={name} maxLength={16} placeholder="What should we call you?" autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col gap-8">
          <span className="label">Pick your colour</span>
          <ColourPicker value={colour} onChange={setColour} />
        </div>
        <p className="error" role="alert">{error}</p>
        <button type="submit" className="btn btn-lg btn-mint btn-block" disabled={busy}>Take a seat</button>
      </form>
    </main>
  );
}

function Missing({ code }: { code: string }) {
  return (
    <main className="wrap" style={{ gap: 20 }}>
      <Logo />
      <div className="card on-coral col gap-12">
        <span className="pill pill-ink" style={{ alignSelf: 'flex-start', textDecoration: 'line-through' }}>{code}</span>
        <h1 className="display" style={{ fontSize: 40, lineHeight: 0.96 }}>No room with that code.</h1>
        <p style={{ fontWeight: 600 }}>It may have a typo, or the game may have ended.</p>
      </div>
      <p className="muted">Ask the host to share the room again. The link drops you straight in.</p>
      <Link href="/" className="btn btn-lg btn-yellow btn-block">Back to the start</Link>
    </main>
  );
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const raw = decodeURIComponent(use(params).code).toUpperCase();
  const m = raw.replace(/[^A-Z0-9]/g, '').match(/^([A-Z]+)(\d+)$/);
  const code = m ? `${m[1]}-${m[2]}` : raw;
  const { view, status, send, joined, serverNow } = useRoom(code);
  const [gone, setGone] = useState(false);
  const onMissing = useCallback(() => setGone(true), []);

  if (status === 'removed') {
    return (
      <main className="wrap" style={{ gap: 20 }}>
        <Logo />
        <div className="card on-coral col gap-12">
          <h1 className="display" style={{ fontSize: 40, lineHeight: 0.96 }}>The host removed you from {code}.</h1>
          <p style={{ fontWeight: 600 }}>If that was a mistake, ask them to share the room again.</p>
        </div>
        <Link href="/" className="btn btn-lg btn-yellow btn-block">Back to the start</Link>
      </main>
    );
  }
  if (gone || status === 'missing') return <Missing code={code} />;
  if (status === 'needs-join') return <JoinForm code={code} onJoined={joined} onMissing={onMissing} />;
  if (!view) {
    return (
      <main className="wrap" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted" role="status" style={{ fontWeight: 600 }}>{status === 'lost' ? 'Reconnecting…' : 'Finding your room…'}</p>
      </main>
    );
  }
  return <PlayerRoom view={view} status={status} send={send} serverNow={serverNow} />;
}
