'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ColourPicker, Logo } from '@/components/ui';
import { COLOURS } from '@/lib/types';
import { recallName, rememberName, savePid } from '@/lib/useRoom';

const TILES: [string, string, string, number][] = [
  ['O', 'var(--yellow)', 'var(--ink)', -7],
  ['Y', '#fff', 'var(--ink)', 4],
  ['A', 'var(--violet)', '#fff', -3],
  ['!', 'var(--coral)', 'var(--ink)', 6],
];

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [colour, setColour] = useState(COLOURS[0]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const me = recallName();
    if (me?.name) setName(me.name);
    if (me?.colour && COLOURS.includes(me.colour)) setColour(me.colour);
  }, []);

  async function go(path: string) {
    if (!name.trim()) {
      setError('Tell us your name first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, colour }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      rememberName(name.trim(), colour);
      savePid(data.code, data.pid);
      router.push(`/room/${data.code}`);
    } catch {
      setError('No connection. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');

  return (
    <main className="wrap" style={{ gap: 24 }}>
      <Logo />

      <div aria-hidden="true" className="row gap-8" style={{ justifyContent: 'center', padding: '8px 0' }}>
        {TILES.map(([ch, bg, fg, rot]) => (
          <span key={ch} className="display" style={{ width: 68, height: 78, borderRadius: 20, background: bg, color: fg, fontSize: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${rot}deg)` }}>
            {ch}
          </span>
        ))}
      </div>

      <div className="col gap-10">
        <h1 className="display" style={{ fontSize: 42, lineHeight: 0.96, letterSpacing: '-0.04em' }}>Oya, let's play. Wherever your people are.</h1>
        <p className="muted">Start a room, share the code, and play from your phones or up on the big screen.</p>
      </div>

      <div className="col gap-10">
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" className="input" value={name} maxLength={16} placeholder="What should we call you?" autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
        <ColourPicker value={colour} onChange={setColour} />
      </div>

      <p className="error" role="alert">{error}</p>

      <button type="button" className="btn btn-lg btn-yellow btn-block" disabled={busy} onClick={() => go('/api/rooms')}>
        Start a room
      </button>

      <div className="card panel col gap-10">
        <label className="label" htmlFor="code">Got a room code?</label>
        <div className="row gap-8">
          <input id="code" className="input input-code grow" value={code} placeholder="KENKEY-27" autoCapitalize="characters" autoComplete="off" onChange={(e) => setCode(e.target.value)} />
          <button type="button" className="btn btn-inverse" disabled={busy || cleanCode.length < 3} onClick={() => go(`/api/rooms/${cleanCode}/join`)}>
            Join
          </button>
        </div>
      </div>
    </main>
  );
}
