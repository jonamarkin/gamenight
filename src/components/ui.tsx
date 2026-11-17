'use client';

import { COLOURS, initials, type PlayerView, type TeamView } from '@/lib/types';

/**
 * The Oya mark: a game tile whose "O" is also a speech bubble, because "oya"
 * is something you call out. Used alone as the app icon.
 */
export function Mark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flex: 'none', overflow: 'visible' }}>
      <g transform="rotate(-6 32 32)">
        <rect x="5" y="9" width="54" height="54" rx="16" fill="#B8900F" />
        <rect x="5" y="3" width="54" height="54" rx="16" fill="#FFD23F" />
        <circle cx="32" cy="29" r="12.5" fill="none" stroke="#15141B" strokeWidth="8.5" />
        <path d="M19 36 L13.500 49 L27 43.500 Z" fill="#15141B" />
      </g>
    </svg>
  );
}

/** Mark plus "ya": together they read "Oya". */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="row" role="img" aria-label="Oya" style={{ gap: size * 0.1 }}>
      <Mark size={size} />
      <span className="display" aria-hidden="true" style={{ fontSize: size * 0.86, letterSpacing: '-0.05em', lineHeight: 1, paddingBottom: size * 0.06 }}>ya</span>
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

export function TeamBar({ teams, big = false }: { teams: TeamView[]; big?: boolean }) {
  if (!teams.length) return null;
  const lead = Math.max(...teams.map((t) => t.score));
  return (
    <div className={big ? 'col gap-12' : 'row gap-8'} aria-label="Team scores">
      {teams.map((t) => (
        <div key={t.id} className="grow row between gap-8" style={{ background: t.colour, color: 'var(--ink)', borderRadius: big ? 32 : 22, padding: big ? '18px 24px' : '10px 14px' }}>
          <span className="col" style={{ minWidth: 0 }}>
            {lead > 0 && t.score === lead && <span style={{ fontSize: big ? 14 : 11, fontWeight: 700, letterSpacing: '0.06em' }}>IN THE LEAD</span>}
            <span className={big ? 'display' : undefined} style={{ fontSize: big ? 'clamp(18px, 1.8vw, 30px)' : 13, fontWeight: 700 }}>{t.name}</span>
          </span>
          <span className="display" style={{ fontSize: big ? 'clamp(30px, 3.2vw, 56px)' : 26 }}>{t.score}</span>
        </div>
      ))}
    </div>
  );
}

export function sortByScore(players: PlayerView[]): PlayerView[] {
  return [...players].sort((a, b) => b.score - a.score);
}
