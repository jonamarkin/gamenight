'use client';

import { COLOURS, initials, type PlayerView } from '@/lib/types';

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="row gap-8">
      <span
        aria-hidden="true"
        style={{ width: size, height: size, borderRadius: size / 3, background: 'var(--yellow)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
          <path
            fill="#15141B"
            d="M12 2a3 3 0 0 1 3 3c0 .9-.4 1.7-1 2.2 3 .6 6.5 2.3 6.5 4.3 0 1.2-1.6 1.5-3.5 1.2l2.5 7.3c.2.6-.2 1-.8 1H14.5l-2.5-4-2.5 4H4.8c-.6 0-1-.4-.8-1l2.5-7.3c-1.9.3-3.5 0-3.5-1.2 0-2 3.5-3.7 6.5-4.3-.6-.5-1-1.3-1-2.2a3 3 0 0 1 3-3z"
          />
        </svg>
      </span>
      <span className="display" style={{ fontSize: size * 0.56 }}>gamenight</span>
    </span>
  );
}

export function Avatar({ name, colour, size = 36 }: { name: string; colour: string; size?: number }) {
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: colour, fontSize: Math.max(10, size * 0.34) }}>
      {initials(name)}
    </span>
  );
}

export function ColourPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const names = ['Coral', 'Yellow', 'Mint', 'Pink', 'Blue', 'White'];
  return (
    <div className="row gap-8" role="group" aria-label="Your colour">
      {COLOURS.map((c, i) => (
        <button key={c} type="button" className="swatch" aria-label={names[i]} aria-pressed={c === value} style={{ background: c }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}

export function TimerBar({ left, duration, big = false }: { left: number; duration: number; big?: boolean }) {
  const pct = duration ? Math.max(0, Math.min(100, (left / duration) * 100)) : 0;
  const low = left <= 5;
  return (
    <div className="row gap-12" style={{ width: '100%' }}>
      <div className={`bar grow${low ? ' low' : ''}`} role="img" aria-label={`${Math.ceil(left)} seconds left`} style={big ? { height: 18, borderRadius: 9 } : undefined}>
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="display" style={{ fontSize: big ? 'clamp(28px, 3.4vw, 56px)' : 24, minWidth: big ? '1.6em' : 34, textAlign: 'right' }}>{Math.ceil(left)}</span>
    </div>
  );
}

export function ScoreStrip({ players, you }: { players: PlayerView[]; you: string | null }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return (
    <div className="strip" aria-label="Scores">
      {sorted.map((p) => (
        <span key={p.id} className="strip-item" style={{ opacity: p.connected ? 1 : 0.45 }}>
          <span style={{ borderRadius: '50%', boxShadow: p.id === you ? '0 0 0 3px var(--violet)' : 'none', display: 'inline-flex' }}>
            <Avatar name={p.name} colour={p.colour} />
          </span>
          <span>{p.score}</span>
        </span>
      ))}
    </div>
  );
}

export function sortByScore(players: PlayerView[]): PlayerView[] {
  return [...players].sort((a, b) => b.score - a.score);
}
