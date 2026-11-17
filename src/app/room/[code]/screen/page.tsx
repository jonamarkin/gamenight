'use client';

import { use, useEffect, useState } from 'react';
import { Avatar, Logo, TimerBar, sortByScore } from '@/components/ui';
import { gameName, type PlayerView, type RoomView } from '@/lib/types';
import { useCountdown, useRoom } from '@/lib/useRoom';

const byId = (view: RoomView, id: string | null | undefined): PlayerView | undefined => view.players.find((p) => p.id === id);

function BigWord({ word }: { word: string }) {
  return (
    <div className="wrap-row" role="img" aria-label={word} style={{ gap: 'clamp(6px, 1.1vw, 18px)', justifyContent: 'center' }}>
      {word.toUpperCase().split('').map((ch, i) => (
        <span key={i} className="screen-tile" aria-hidden="true">{ch}</span>
      ))}
    </div>
  );
}

function Scores({ view }: { view: RoomView }) {
  const ranked = sortByScore(view.players);
  return (
    <div className="card panel col gap-8 grow" style={{ borderRadius: 36 }}>
      <h2 className="display" style={{ fontSize: 'clamp(20px, 1.7vw, 28px)', fontWeight: 700 }}>Scores</h2>
      {ranked.map((p, i) => (
        <div key={p.id} className={`score-row${i === 0 && p.score > 0 ? ' lead' : ''}`} style={{ opacity: p.connected ? 1 : 0.45 }}>
          <Avatar name={p.name} colour={p.colour} size={40} />
          <span className="grow">{p.name}</span>
          {view.phase === 'playing' && p.done && <span className="pill on-mint" style={{ textTransform: 'none', letterSpacing: 0 }}>In</span>}
          <span className="display" style={{ fontSize: 'clamp(18px, 1.7vw, 30px)' }}>{p.score}</span>
        </div>
      ))}
    </div>
  );
}

function Main({ view }: { view: RoomView }) {
  const { game, phase, pub, reveal } = view;
  const playing = phase === 'playing';

  if (game === 'scramble') {
    return (
      <div className="screen-main panel center" style={{ alignItems: 'center' }}>
        <span className="pill pill-yellow">{playing ? 'Clue' : 'The word was'}</span>
        <h1 className="display" style={{ fontSize: 'clamp(26px, 4vw, 68px)', lineHeight: 1.05 }}>{pub.clue}</h1>
        <BigWord word={playing ? pub.scrambled : reveal?.word ?? ''} />
      </div>
    );
  }

  if (game === 'trivia') {
    return (
      <div className="screen-main panel">
        <span className="pill on-mint" style={{ alignSelf: 'flex-start' }}>{pub.cat}</span>
        <h1 className="display" style={{ fontSize: 'clamp(26px, 4vw, 66px)', lineHeight: 1.03 }}>{pub.q}</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 'clamp(10px, 1.3vw, 20px)' }}>
          {(pub.options as string[]).map((text, i) => (
            <div key={i} className={`screen-option${!playing ? (i === reveal?.ok ? ' right' : ' dim') : ''}`}>
              <span className="badge" aria-hidden="true">{'ABCD'[i]}</span>
              <span className="grow">{text}</span>
              {!playing && <span style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 1.3vw, 22px)', fontWeight: 600 }}>{reveal?.counts?.[i] ?? 0}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (game === 'ladder') {
    const finishers = view.players.filter((p) => p.done);
    return (
      <div className="screen-main on-blue center" style={{ alignItems: 'center' }}>
        <span className="pill pill-ink">Change one letter at a time</span>
        <h1 className="display screen-h">
          {String(pub.from).toUpperCase()} <span aria-hidden="true">→</span><span className="sr-only"> to </span> {String(pub.to).toUpperCase()}
        </h1>
        {playing ? (
          <p style={{ fontSize: 'clamp(16px, 1.9vw, 30px)', fontWeight: 700 }}>
            {finishers.length === 0 ? 'Every step must be a real word.' : `${finishers.map((p) => p.name).join(', ')} made it!`}
          </p>
        ) : (
          <div className="col gap-8" style={{ alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>One way to do it</span>
            <p className="display" style={{ fontSize: 'clamp(20px, 2.6vw, 44px)', lineHeight: 1.2 }}>{(reveal?.path ?? []).join(' → ').toUpperCase()}</p>
          </div>
        )}
      </div>
    );
  }

  if (game === 'npat') {
    const table: Record<string, Record<string, { text: string; pts: number }>> = reveal?.table ?? {};
    const stopper = byId(view, reveal?.stopper);
    if (playing) {
      return (
        <div className="screen-main on-pink center" style={{ alignItems: 'center' }}>
          <span aria-label={`The letter ${pub.letter}`} role="img" className="display" style={{ width: 'clamp(140px, 20vw, 340px)', height: 'clamp(160px, 23vw, 400px)', borderRadius: 'clamp(36px, 5vw, 80px)', background: 'var(--ink)', color: 'var(--yellow)', fontSize: 'clamp(110px, 17vw, 300px)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-5deg)' }}>
            {pub.letter}
          </span>
          <h1 className="display" style={{ fontSize: 'clamp(26px, 4vw, 72px)' }}>Name. Place. Animal. Thing.</h1>
        </div>
      );
    }
    return (
      <div className="screen-main panel" style={{ justifyContent: 'flex-start' }}>
        <h1 className="display" style={{ fontSize: 'clamp(24px, 3vw, 48px)' }}>
          {stopper ? `${stopper.name} called Stop!` : 'Time is up.'} Letter {pub.letter}.
        </h1>
        <div className="table-scroll">
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: 'clamp(14px, 1.6vw, 26px)', fontWeight: 700, textAlign: 'left' }}>
            <thead>
              <tr className="muted" style={{ fontSize: 'clamp(11px, 1vw, 16px)', letterSpacing: '0.08em' }}>
                <th scope="col">PLAYER</th><th scope="col">NAME</th><th scope="col">PLACE</th><th scope="col">ANIMAL</th><th scope="col">THING</th><th scope="col" style={{ textAlign: 'right' }}>ROUND</th>
              </tr>
            </thead>
            <tbody>
              {view.players.map((p) => (
                <tr key={p.id}>
                  <th scope="row" style={{ padding: '6px 12px 6px 0' }}>{p.name}</th>
                  {['name', 'place', 'animal', 'thing'].map((cat) => {
                    const cell = table[p.id]?.[cat] ?? { text: '', pts: 0 };
                    return (
                      <td key={cat} style={{ padding: '6px 6px 6px 0' }}>
                        <span style={{ display: 'block', padding: '10px 14px', borderRadius: 16, background: cell.pts === 10 ? 'var(--mint)' : cell.pts === 5 ? 'var(--yellow)' : 'var(--s)', color: cell.pts ? 'var(--ink)' : 'var(--m)' }}>
                          {cell.text || 'Blank'}
                        </span>
                      </td>
                    );
                  })}
                  <td className="display" style={{ textAlign: 'right' }}>+{p.gained}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Act It Out: the phrase never shows here while it is being acted.
  const actor = byId(view, pub.actorId);
  const log: { phrase: string; by: string | null }[] = (playing ? pub.log : reveal?.log) ?? [];
  const got = log.filter((l) => l.by);
  return (
    <div className="screen-main on-coral">
      <span className="pill pill-ink" style={{ alignSelf: 'flex-start' }}>No talking</span>
      <h1 className="display screen-h" style={{ lineHeight: 0.92 }}>{playing ? `${actor?.name ?? 'Someone'} is acting.` : `Time! ${got.length} guessed.`}</h1>
      <p style={{ fontSize: 'clamp(18px, 2.2vw, 36px)', fontWeight: 600 }}>
        {playing ? 'Everyone else, shout it out!' : got.length ? got.map((l) => l.phrase).join(' · ') : 'A tough crowd tonight.'}
      </p>
      {playing && got.length > 0 && <p style={{ fontSize: 'clamp(16px, 1.6vw, 26px)', fontWeight: 700 }}>{got.length} guessed so far</p>}
    </div>
  );
}

export default function ScreenPage({ params }: { params: Promise<{ code: string }> }) {
  const raw = decodeURIComponent(use(params).code).toUpperCase();
  const m = raw.replace(/[^A-Z0-9]/g, '').match(/^([A-Z]+)(\d+)$/);
  const code = m ? `${m[1]}-${m[2]}` : raw;
  const { view, status, serverNow } = useRoom(code, true);
  const left = useCountdown(view?.phase === 'playing' ? view.deadline : null, serverNow);
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.host), []);

  if (status === 'missing') {
    return (
      <main className="screen center" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <h1 className="display screen-h">No room called {code}.</h1>
      </main>
    );
  }
  if (!view) {
    return (
      <main className="screen center" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p className="muted" role="status" style={{ fontWeight: 600 }}>Connecting to {code}…</p>
      </main>
    );
  }

  const ranked = sortByScore(view.players);
  const label = view.phase === 'lobby' || view.phase === 'final' ? '' : `${view.game === 'act' ? 'Turn' : view.game === 'trivia' ? 'Question' : 'Round'} ${view.round + 1} of ${view.total}`;

  return (
    <main className="screen">
      <header className="row gap-16 wrap-row">
        <Logo size={48} />
        {view.phase !== 'lobby' && <span className="display" style={{ fontSize: 'clamp(22px, 2.5vw, 40px)' }}>{gameName(view.game)}</span>}
        <span className="muted" style={{ fontSize: 'clamp(14px, 1.4vw, 22px)', fontWeight: 600 }}>{label}</span>
        <span className="on-violet row gap-12" style={{ marginLeft: 'auto', padding: '12px 24px', borderRadius: 32, fontSize: 'clamp(14px, 1.4vw, 22px)', fontWeight: 600 }}>
          Join at {origin} with code <strong className="display" style={{ fontSize: 'clamp(20px, 1.9vw, 30px)' }}>{view.code}</strong>
        </span>
      </header>

      {status === 'lost' && <p className="banner" role="status">Connection lost. Reconnecting…</p>}

      {view.phase === 'lobby' && (
        <div className="screen-body">
          <div className="screen-main on-yellow">
            <span className="pill pill-ink" style={{ alignSelf: 'flex-start' }}>Up next · {gameName(view.game)}</span>
            <h1 className="display screen-h" style={{ lineHeight: 0.92 }}>Join with code {view.code}</h1>
            <p style={{ fontSize: 'clamp(18px, 2.2vw, 36px)', fontWeight: 600 }}>Open {origin} on your phone and type the code.</p>
          </div>
          <div className="screen-side">
            <div className="card panel col gap-12 grow" style={{ borderRadius: 36 }}>
              <h2 className="display" style={{ fontSize: 'clamp(20px, 1.7vw, 28px)', fontWeight: 700 }}>At the table · {view.players.length}</h2>
              <div className="wrap-row gap-8">
                {view.players.map((p) => (
                  <span key={p.id} className={`chip${p.connected ? '' : ' off'}`}><Avatar name={p.name} colour={p.colour} size={32} />{p.name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(view.phase === 'playing' || view.phase === 'reveal') && (
        <>
          <div className="screen-body">
            <Main view={view} />
            <div className="screen-side"><Scores view={view} /></div>
          </div>
          {view.phase === 'playing' ? <TimerBar left={left} duration={view.duration} big /> : <p className="muted" style={{ fontSize: 'clamp(14px, 1.4vw, 22px)', fontWeight: 600 }}>Waiting for the host to start the next round…</p>}
        </>
      )}

      {view.phase === 'final' && (
        <div className="screen-body">
          <div className="screen-main on-yellow" style={{ justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 'clamp(14px, 1.4vw, 22px)', fontWeight: 700, letterSpacing: '0.08em' }}>{gameName(view.game).toUpperCase()} · {view.total} ROUNDS</span>
            <h1 className="display" style={{ fontSize: 'clamp(44px, 8vw, 132px)', lineHeight: 0.9, letterSpacing: '-0.045em' }}>
              {ranked.length > 1 && ranked[0].score === ranked[1].score ? 'A tie at the top!' : `${ranked[0]?.name ?? 'Nobody'} takes it!`}
            </h1>
          </div>
          <div className="screen-side"><Scores view={view} /></div>
        </div>
      )}
    </main>
  );
}
