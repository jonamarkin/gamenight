'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GAMES, gameName, type GameId, type RoomView } from '@/lib/types';
import { shareImage } from '@/lib/share';
import { useCountdown, type RoomStatus } from '@/lib/useRoom';
import { GamePlay, GameReveal } from './Games';
import { Avatar, ScoreStrip, TeamBar, TimerBar, sortByScore } from './ui';

type Send = (type: string, payload?: unknown) => Promise<{ ok: boolean; error?: string; [k: string]: any }>;

interface Props {
  view: RoomView;
  status: RoomStatus;
  send: Send;
  serverNow: () => number;
}

/** Games that work when the host runs the round and people shout answers. */
const HOST_LED: GameId[] = ['scramble', 'trivia', 'act'];

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

function PlayerChip({ view, id }: { view: RoomView; id: string }) {
  const p = view.players.find((x) => x.id === id);
  if (!p) return null;
  return (
    <span className={`chip${p.id === view.you ? ' me' : ''}${p.connected ? '' : ' off'}`}>
      <Avatar name={p.name} colour={p.colour} size={32} />
      {p.id === view.you ? 'You' : p.name}
      {p.id === view.hostId ? ' · host' : ''}
    </span>
  );
}

function Teams({ view, send, host }: { view: RoomView; send: Send; host: boolean }) {
  const me = view.players.find((p) => p.id === view.you);
  return (
    <div className="col gap-10">
      {view.teams.map((t, i) => {
        const members = view.players.filter((p) => p.team === t.id);
        const next = view.teams[(i + 1) % view.teams.length];
        return (
          <section key={t.id} className="card col gap-10" style={{ background: t.colour, color: 'var(--ink)', padding: 16, borderRadius: 28 }}>
            <div className="row between gap-8">
              {host ? (
                <>
                  <label className="sr-only" htmlFor={`team-${t.id}`}>Team name</label>
                  <input
                    id={`team-${t.id}`}
                    key={t.name}
                    className="display grow"
                    defaultValue={t.name}
                    maxLength={16}
                    style={{ fontSize: 22, height: 44, border: 0, borderBottom: '2px solid var(--ink)', background: 'transparent', color: 'var(--ink)', minWidth: 0 }}
                    onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== t.name && send('rename-team', { team: t.id, name: e.target.value })}
                  />
                </>
              ) : (
                <h3 className="display" style={{ fontSize: 22 }}>{t.name}</h3>
              )}
              {!host && me && me.team !== t.id && (
                <button type="button" className="btn btn-ink" style={{ minHeight: 44 }} onClick={() => send('team', { team: t.id })}>Join</button>
              )}
            </div>
            <div className="wrap-row gap-8" style={{ minHeight: 44 }}>
              {members.length === 0 && <span style={{ fontSize: 14, fontWeight: 600 }}>Nobody here yet.</span>}
              {members.map((p) =>
                host ? (
                  <button
                    key={p.id}
                    type="button"
                    className="chip"
                    style={{ border: 0, background: '#fff', color: 'var(--ink)' }}
                    aria-label={`Move ${p.name} to ${next.name}`}
                    onClick={() => send('team', { pid: p.id, team: next.id })}
                  >
                    <Avatar name={p.name} colour={p.colour} size={32} />
                    {p.id === view.you ? 'You' : p.name}
                  </button>
                ) : (
                  <span key={p.id} className="chip" style={{ background: '#fff', color: 'var(--ink)' }}>
                    <Avatar name={p.name} colour={p.colour} size={32} />
                    {p.id === view.you ? 'You' : p.name}
                  </span>
                ),
              )}
            </div>
          </section>
        );
      })}
      {host && (
        <div className="row between gap-8">
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Tap a player to move them.</span>
          <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={() => send('shuffle')}>Shuffle the teams</button>
        </div>
      )}
    </div>
  );
}

function Lobby({ view, send }: { view: RoomView; send: Send }) {
  const host = view.you === view.hostId;
  const hostPlayer = view.players.find((p) => p.id === view.hostId);
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const link = `${origin}/room/${view.code}`;
  const invite = `Oya, let's play! Join my room ${view.code}: ${link}`;
  const config = (payload: unknown) => send('config', payload).then((r) => setError(r.ok ? '' : r.error ?? 'That did not work.'));
  const unassigned = view.players.filter((p) => !p.team);

  return (
    <>
      <Header view={view} title="Your room" />
      <div className="card on-yellow col gap-12">
        <div className="col gap-4">
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>ROOM CODE</span>
          <span className="display" style={{ fontSize: 44 }}>{view.code}</span>
        </div>
        <div className="row gap-8">
          <button
            type="button"
            className="btn btn-ink grow"
            disabled={sharing}
            onClick={async () => {
              setSharing(true);
              const outcome = await shareImage(`/api/rooms/${view.code}/invite.png`, `oya-${view.code}.png`, invite);
              setSharing(false);
              setShareNote(outcome === 'saved' ? 'Invite picture saved. Attach it in WhatsApp.' : outcome === 'failed' ? 'Could not make the picture. Copy the link instead.' : '');
            }}
          >
            {sharing ? 'Making your invite…' : 'Share invite'}
          </button>
          <button type="button" className="btn btn-ghost-ink" onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true)).catch(() => {})}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        {shareNote && <p role="status" style={{ fontSize: 14, fontWeight: 700 }}>{shareNote}</p>}
        <a href={`/room/${view.code}/screen`} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700 }}>
          Open the big-screen view for a TV or projector
        </a>
      </div>

      <div className="col gap-10">
        <div className="row between">
          <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>At the table</h2>
          <span className="muted" style={{ fontSize: 13 }}>{view.players.length} joined</span>
        </div>
        {view.teams.length > 0 ? (
          <>
            <Teams view={view} send={send} host={host} />
            {unassigned.length > 0 && (
              <div className="wrap-row gap-8">{unassigned.map((p) => <PlayerChip key={p.id} view={view} id={p.id} />)}</div>
            )}
          </>
        ) : (
          <div className="wrap-row gap-8">{view.players.map((p) => <PlayerChip key={p.id} view={view} id={p.id} />)}</div>
        )}
      </div>

      {host ? (
        <>
          <div className="col gap-8">
            <span className="label">Teams</span>
            <div className="seg" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {[[0, 'Everyone solo'], [2, '2 teams'], [3, '3 teams']].map(([n, label]) => (
                <button key={n} type="button" aria-pressed={view.teams.length === n} onClick={() => config({ teams: n })}>{label}</button>
              ))}
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={view.mode === 'host'}
            className="game-pick"
            style={{ justifyContent: 'space-between' }}
            onClick={() => config({ mode: view.mode === 'host' ? 'phones' : 'host' })}
          >
            <span className="col gap-4">
              <span style={{ fontWeight: 700 }}>Host runs the game</span>
              <span className="muted" style={{ fontSize: 13 }}>People shout answers and you award the points. No phones needed.</span>
            </span>
            <span aria-hidden="true" style={{ flex: 'none', width: 50, height: 30, borderRadius: 15, padding: '0 4px', background: view.mode === 'host' ? 'var(--mint)' : 'var(--l)', display: 'flex', alignItems: 'center', justifyContent: view.mode === 'host' ? 'flex-end' : 'flex-start' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--ink)' }} />
            </span>
          </button>

          <div className="col gap-8">
            <h2 className="display" style={{ fontSize: 20, fontWeight: 700 }}>Pick the game</h2>
            {GAMES.map((g) => {
              const off = view.mode === 'host' && !HOST_LED.includes(g.id);
              return (
                <button key={g.id} type="button" className="game-pick" aria-pressed={view.game === g.id} disabled={off} style={off ? { opacity: 0.45 } : undefined} onClick={() => config({ game: g.id })}>
                  <span className="dot" aria-hidden="true" style={{ background: g.colour }}>{g.name[0]}</span>
                  <span className="col gap-4">
                    <span style={{ fontWeight: 700 }}>{g.name}</span>
                    <span className="muted" style={{ fontSize: 13 }}>{off ? 'Needs everyone on their phones.' : g.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="col gap-8">
            <span className="label">{view.game === 'act' ? 'Turns' : 'Rounds'}</span>
            <div className="seg" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {[3, 5, 10].map((n) => (
                <button key={n} type="button" aria-pressed={view.rounds === n} onClick={() => config({ rounds: n })}>{n}</button>
              ))}
            </div>
          </div>

          {view.players.length > 1 && (
            <details className="card panel" style={{ padding: 16, borderRadius: 22 }}>
              <summary style={{ fontWeight: 700, cursor: 'pointer', minHeight: 28 }}>Manage players</summary>
              <div className="col gap-8" style={{ marginTop: 12 }}>
                {view.players.filter((p) => p.id !== view.you).map((p) => (
                  <div key={p.id} className="row gap-8">
                    <Avatar name={p.name} colour={p.colour} size={36} />
                    <span className="grow" style={{ fontWeight: 700 }}>{p.name}</span>
                    <button type="button" className="btn btn-soft" style={{ minHeight: 44, padding: '0 14px', fontSize: 14 }} onClick={() => send('transfer', { pid: p.id })}>Make host</button>
                    <button type="button" className="btn btn-ghost" style={{ minHeight: 44, padding: '0 14px', fontSize: 14 }} onClick={() => send('kick', { pid: p.id })}>Remove</button>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="error" role="alert">{error}</p>
          <button type="button" className="btn btn-lg btn-mint btn-block push" onClick={() => send('start').then((r) => setError(r.ok ? '' : r.error ?? 'Could not start.'))}>
            Start {gameName(view.game)}
          </button>
        </>
      ) : (
        <div className="card on-mint col gap-8 push">
          <h2 className="display" style={{ fontSize: 30 }}>You are in.</h2>
          <p style={{ fontWeight: 600 }}>
            Waiting for {hostPlayer?.name ?? 'the host'} to start {gameName(view.game)}.
            {view.mode === 'host' ? ' The host is running this one, so get ready to shout.' : ' Keep this screen open.'}
          </p>
        </div>
      )}
    </>
  );
}

function Final({ view, send }: { view: RoomView; send: Send }) {
  const ranked = sortByScore(view.players.filter((p) => !(view.mode === 'host' && p.id === view.hostId)));
  const teams = [...view.teams].sort((a, b) => b.score - a.score);
  const byTeam = teams.length > 0;
  const top = byTeam ? teams[0] : ranked[0];
  const second = byTeam ? teams[1] : ranked[1];
  const tie = !!second && !!top && second.score === top.score;
  const myTeam = view.players.find((p) => p.id === view.you)?.team;
  const mine = byTeam ? top?.id === myTeam : top?.id === view.you;
  const host = view.you === view.hostId;
  const headline = !top ? 'Game over!' : tie ? 'It is a tie at the top!' : mine ? (byTeam ? 'Your team takes it!' : 'You take it!') : `${top.name} takes it!`;
  const summary = !top ? 'We played on Oya!' : tie ? `A tie at ${gameName(view.game)} on Oya!` : `${top.name} won ${gameName(view.game)} on Oya!`;
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState('');

  return (
    <>
      <div className="card on-yellow col gap-8" style={{ padding: '36px 24px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>{gameName(view.game).toUpperCase()} · {view.total} {view.game === 'act' ? 'TURNS' : 'ROUNDS'}</span>
        <h1 className="display" style={{ fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.04em' }}>{headline}</h1>
      </div>
      {byTeam && <TeamBar teams={teams} />}
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
        <button
          type="button"
          className="btn btn-ghost btn-block"
          disabled={sharing}
          onClick={async () => {
            setSharing(true);
            const outcome = await shareImage(`/api/rooms/${view.code}/result.png`, `oya-result-${view.code}.png`, summary);
            setSharing(false);
            setShareNote(outcome === 'saved' ? 'Result picture saved. Attach it wherever you like.' : outcome === 'failed' ? 'Could not make the picture. Try again.' : '');
          }}
        >
          {sharing ? 'Making your picture…' : 'Share the result'}
        </button>
        {shareNote && <p className="muted center" role="status" style={{ fontSize: 14, fontWeight: 600 }}>{shareNote}</p>}
      </div>
    </>
  );
}

function Scores({ view }: { view: RoomView }) {
  const players = view.players.filter((p) => !(view.mode === 'host' && p.id === view.hostId));
  return (
    <>
      <TeamBar teams={view.teams} />
      {!(view.mode === 'host' && view.teams.length > 0) && <ScoreStrip players={players} you={view.you} />}
    </>
  );
}

export default function PlayerRoom({ view, status, send, serverNow }: Props) {
  const left = useCountdown(view.phase === 'playing' ? view.deadline : null, serverNow);
  const host = view.you === view.hostId;
  const last = view.round + 1 >= view.total;
  const roundLabel = `${view.game === 'act' ? 'Turn' : view.game === 'trivia' ? 'Question' : 'Round'} ${view.round + 1} of ${view.total}`;
  const hostLedRound = view.mode === 'host' && (view.game === 'scramble' || view.game === 'trivia');

  return (
    <main className="wrap">
      {status === 'lost' && <p className="banner" role="status">Lost you for a second. Reconnecting… your seat and score are safe.</p>}

      {view.phase === 'lobby' && <Lobby view={view} send={send} />}

      {view.phase === 'playing' && (
        <>
          <Header view={view} title={host && hostLedRound ? 'Host remote' : gameName(view.game)} />
          <div className="col gap-8">
            <span className="muted center" style={{ fontSize: 13, fontWeight: 600 }}>{roundLabel}</span>
            <TimerBar left={left} duration={view.duration} />
          </div>
          <GamePlay view={view} send={send} />
          <div className="col gap-10 push">
            {host && !hostLedRound && <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={() => send('skip')}>End this round now</button>}
            <Scores view={view} />
          </div>
        </>
      )}

      {view.phase === 'reveal' && (
        <>
          <Header view={view} title={gameName(view.game)} />
          <span className="muted center" style={{ fontSize: 13, fontWeight: 600 }}>{roundLabel}</span>
          <GameReveal view={view} />
          <div className="col gap-10 push">
            <Scores view={view} />
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
