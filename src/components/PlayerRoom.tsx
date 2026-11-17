'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GAMES, gameName, type RoomView } from '@/lib/types';
import { useCountdown, type RoomStatus } from '@/lib/useRoom';
import { GamePlay, GameReveal } from './Games';
import { Avatar, ScoreStrip, TimerBar, sortByScore } from './ui';

type Send = (type: string, payload?: unknown) => Promise<{ ok: boolean; error?: string; [k: string]: any }>;

interface Props {
  view: RoomView;
  status: RoomStatus;
  send: Send;
  serverNow: () => number;
}

function Header({ view, title }: { view: RoomView; title: string }) {
  return (
    <header className="row between gap-12">
      <Link href="/" className="icon-btn" aria-label="Leave the room">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </Link>
      <span className="display" style={{ fontSize: 20 }}>{title}</span>
      <span className="pill on-violet" style={{ height: 44, borderRadius: 22, textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>{view.code}</span>
    </header>
  );
}

function Lobby({ view, send }: { view: RoomView; send: Send }) {
  const host = view.you === view.hostId;
  const hostPlayer = view.players.find((p) => p.id === view.hostId);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const link = `${origin}/room/${view.code}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Game night! Join my room ${view.code}: ${link}`)}`;

  return (
    <>
      <Header view={view} title="Your room" />
      <div className="card on-yellow col gap-12">
        <div className="col gap-4">
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>ROOM CODE</span>
          <span className="display" style={{ fontSize: 44 }}>{view.code}</span>
        </div>
        <div className="row gap-8">
          <a className="btn btn-ink grow" href={whatsapp} target="_blank" rel="noreferrer">Share on WhatsApp</a>
          <button
            type="button"
            className="btn btn-ghost-ink"
            onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => {})}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <a href={`/room/${view.code}/screen`} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700 }}>
          Open the big-screen view for a TV or projector
        </a>
      </div>

      <div className="col gap-10">
        <div className="row between">
          <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>At the table</h2>
          <span className="muted" style={{ fontSize: 13 }}>{view.players.length} joined</span>
        </div>
        <div className="wrap-row gap-8">
          {view.players.map((p) => (
            <span key={p.id} className={`chip${p.id === view.you ? ' me' : ''}${p.connected ? '' : ' off'}`}>
              <Avatar name={p.name} colour={p.colour} size={32} />
              {p.id === view.you ? 'You' : p.name}
              {p.id === view.hostId ? ' · host' : ''}
            </span>
          ))}
        </div>
      </div>

      {host ? (
        <>
          <div className="col gap-8">
            <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>Pick the game</h2>
            {GAMES.map((g) => (
              <button key={g.id} type="button" className="game-pick" aria-pressed={view.game === g.id} onClick={() => send('config', { game: g.id })}>
                <span className="dot" aria-hidden="true" style={{ background: g.colour }}>{g.name[0]}</span>
                <span className="col gap-4">
                  <span style={{ fontWeight: 700 }}>{g.name}</span>
                  <span className="muted" style={{ fontSize: 13 }}>{g.blurb}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="col gap-8">
            <span className="label">{view.game === 'act' ? 'Turns' : 'Rounds'}</span>
            <div className="seg" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {[3, 5, 10].map((n) => (
                <button key={n} type="button" aria-pressed={view.rounds === n} onClick={() => send('config', { rounds: n })}>{n}</button>
              ))}
            </div>
          </div>
          <p className="error" role="alert">{error}</p>
          <button type="button" className="btn btn-lg btn-mint btn-block push" onClick={() => send('start').then((r) => setError(r.ok ? '' : r.error ?? 'Could not start.'))}>
            Start {gameName(view.game)}
          </button>
        </>
      ) : (
        <div className="card on-mint col gap-8 push">
          <h2 className="display" style={{ fontSize: 30 }}>You are in.</h2>
          <p style={{ fontWeight: 600 }}>Waiting for {hostPlayer?.name ?? 'the host'} to start {gameName(view.game)}. Keep this screen open.</p>
        </div>
      )}
    </>
  );
}

function Final({ view, send }: { view: RoomView; send: Send }) {
  const ranked = sortByScore(view.players);
  const top = ranked[0];
  const tie = ranked.length > 1 && ranked[1].score === top.score;
  const host = view.you === view.hostId;
  const summary = `${gameName(view.game)} on GameNight: ${ranked.map((p, i) => `${i + 1}. ${p.name} ${p.score}`).join(', ')}`;
  return (
    <>
      <div className="card on-yellow col gap-8" style={{ padding: '36px 24px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>{gameName(view.game).toUpperCase()} · {view.total} ROUNDS</span>
        <h1 className="display" style={{ fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
          {tie ? 'It is a tie at the top!' : top.id === view.you ? 'You take it!' : `${top.name} takes it!`}
        </h1>
      </div>
      <ol className="col gap-8" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {ranked.map((p, i) => (
          <li key={p.id} className="card panel row gap-12" style={{ padding: '12px 18px 12px 12px', borderRadius: 24 }}>
            <span className="display" style={{ width: 36, textAlign: 'center', fontSize: 20 }}>{i + 1}</span>
            <Avatar name={p.name} colour={p.colour} size={40} />
            <span className="grow" style={{ fontWeight: 700 }}>{p.id === view.you ? `${p.name} (you)` : p.name}</span>
            <span className="display" style={{ fontSize: 24 }}>{p.score}</span>
          </li>
        ))}
      </ol>
      <div className="col gap-10 push">
        {host ? (
          <button type="button" className="btn btn-lg btn-mint btn-block" onClick={() => send('again')}>Play something else</button>
        ) : (
          <p className="muted center" style={{ fontWeight: 600 }}>Waiting for the host to pick what is next…</p>
        )}
        <a className="btn btn-ghost btn-block" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noreferrer">Share the result</a>
      </div>
    </>
  );
}

export default function PlayerRoom({ view, status, send, serverNow }: Props) {
  const left = useCountdown(view.phase === 'playing' ? view.deadline : null, serverNow);
  const host = view.you === view.hostId;
  const last = view.round + 1 >= view.total;
  const roundLabel = `${view.game === 'act' ? 'Turn' : view.game === 'trivia' ? 'Question' : 'Round'} ${view.round + 1} of ${view.total}`;

  return (
    <main className="wrap">
      {status === 'lost' && <p className="banner" role="status">Lost you for a second. Reconnecting… your seat and score are safe.</p>}

      {view.phase === 'lobby' && <Lobby view={view} send={send} />}

      {view.phase === 'playing' && (
        <>
          <Header view={view} title={gameName(view.game)} />
          <div className="col gap-8">
            <span className="muted center" style={{ fontSize: 13, fontWeight: 600 }}>{roundLabel}</span>
            <TimerBar left={left} duration={view.duration} />
          </div>
          <GamePlay view={view} send={send} />
          <div className="col gap-10 push">
            {host && <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={() => send('skip')}>End this round now</button>}
            <ScoreStrip players={view.players} you={view.you} />
          </div>
        </>
      )}

      {view.phase === 'reveal' && (
        <>
          <Header view={view} title={gameName(view.game)} />
          <span className="muted center" style={{ fontSize: 13, fontWeight: 600 }}>{roundLabel}</span>
          <GameReveal view={view} />
          <div className="col gap-10 push">
            <ScoreStrip players={view.players} you={view.you} />
            {host ? (
              <button type="button" className="btn btn-lg btn-inverse btn-block" onClick={() => send('next')}>
                {last ? 'See final results' : 'Next round'}
              </button>
            ) : (
              <p className="muted center" style={{ fontWeight: 600 }}>Waiting for the host…</p>
            )}
          </div>
        </>
      )}

      {view.phase === 'final' && <Final view={view} send={send} />}
    </main>
  );
}
