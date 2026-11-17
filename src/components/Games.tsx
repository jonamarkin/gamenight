'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerView, RoomView } from '@/lib/types';
import { Avatar } from './ui';

type Send = (type: string, payload?: unknown) => Promise<{ ok: boolean; error?: string; [k: string]: any }>;
interface GameProps {
  view: RoomView;
  send: Send;
}

const me = (view: RoomView): PlayerView | undefined => view.players.find((p) => p.id === view.you);
const byId = (view: RoomView, id: string | null | undefined): PlayerView | undefined => view.players.find((p) => p.id === id);

function Waiting({ view, title, note }: { view: RoomView; title: string; note?: string }) {
  const waitingOn = view.players.filter((p) => p.connected && !p.done).length;
  return (
    <div className="card on-mint col gap-8">
      <h2 className="display" style={{ fontSize: 34 }}>{title}</h2>
      <p style={{ fontWeight: 600 }}>{note ?? (waitingOn > 0 ? `Waiting for ${waitingOn} more…` : 'Everyone is in.')}</p>
    </div>
  );
}

function Word({ word, tone = 'yellow' }: { word: string; tone?: 'yellow' | 'soft' | 'mint' }) {
  const style =
    tone === 'yellow'
      ? undefined
      : tone === 'mint'
        ? { background: 'var(--mint)', boxShadow: 'none' }
        : { background: 'var(--s)', color: 'var(--t)', boxShadow: 'none' };
  return (
    <span className="row gap-6" role="img" aria-label={word}>
      {word.toUpperCase().split('').map((ch, i) => (
        <span key={i} className="tile tile-sm" aria-hidden="true" style={style}>{ch}</span>
      ))}
    </span>
  );
}

/* ---------- Scramble ---------- */

function ScramblePlay({ view, send }: GameProps) {
  const letters: string[] = String(view.pub.scrambled ?? '').split('');
  const [picked, setPicked] = useState<number[]>([]);
  const [msg, setMsg] = useState('Tap the letters in the right order.');

  useEffect(() => {
    setPicked([]);
    setMsg('Tap the letters in the right order.');
  }, [view.round, view.pub.scrambled]);

  if (view.mine.solved) return <Waiting view={view} title={`Got it! +${me(view)?.gained ?? 0}`} />;

  function pick(i: number) {
    if (picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    setMsg('');
    if (next.length === letters.length) {
      send('answer', { guess: next.map((j) => letters[j]).join('') }).then((r) => {
        if (!r.ok) {
          setMsg(r.error ?? 'Not quite. Try again.');
          setPicked([]);
        }
      });
    }
  }

  return (
    <div className="col gap-16" style={{ alignItems: 'center' }}>
      <div className="card panel col gap-10 center" style={{ width: '100%', alignItems: 'center' }}>
        <span className="pill pill-yellow">Clue</span>
        <h2 className="display" style={{ fontSize: 26, lineHeight: 1.1 }}>{view.pub.clue}</h2>
      </div>
      <div className="wrap-row gap-6" style={{ justifyContent: 'center' }} aria-label="Your answer">
        {letters.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`slot${i < picked.length ? ' filled' : ''}`}
            aria-label={i < picked.length ? `Remove ${letters[picked[i]]}` : 'Empty'}
            onClick={() => i < picked.length && setPicked(picked.filter((_, x) => x !== i))}
          >
            {i < picked.length ? letters[picked[i]] : ''}
          </button>
        ))}
      </div>
      <p aria-live="polite" style={{ minHeight: 22, fontWeight: 600, fontSize: 14 }}>{msg}</p>
      <div className="wrap-row gap-10" style={{ justifyContent: 'center' }} aria-label="Letters">
        {letters.map((ch, i) => (
          <button key={i} type="button" className="tile" disabled={picked.includes(i)} onClick={() => pick(i)}>{ch}</button>
        ))}
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => setPicked([])}>Clear</button>
    </div>
  );
}

function awardedText(view: RoomView): string {
  const a = view.reveal?.awarded;
  if (a?.team) return `${view.teams.find((t) => t.id === a.team)?.name ?? 'A team'} got it! +100`;
  if (a?.pid) return `${byId(view, a.pid)?.name ?? 'Someone'} got it! +100`;
  return 'Nobody got it this time.';
}

/** What players see in a host-led round: the puzzle, and a nudge to shout. */
function ShoutPlay({ view }: { view: RoomView }) {
  return (
    <div className="col gap-16" style={{ alignItems: 'center' }}>
      {view.game === 'scramble' ? (
        <>
          <div className="card panel col gap-10 center" style={{ width: '100%', alignItems: 'center' }}>
            <span className="pill pill-yellow">Clue</span>
            <h2 className="display" style={{ fontSize: 26, lineHeight: 1.1 }}>{view.pub.clue}</h2>
          </div>
          <Word word={view.pub.scrambled ?? ''} />
        </>
      ) : (
        <div className="col gap-12" style={{ width: '100%' }}>
          <div className="card on-mint col gap-12">
            <span className="pill pill-ink" style={{ alignSelf: 'flex-start' }}>{view.pub.cat}</span>
            <h2 className="display" style={{ fontSize: 26, lineHeight: 1.08 }}>{view.pub.q}</h2>
          </div>
          {(view.pub.options as string[]).map((text, i) => (
            <div key={i} className="option"><span className="badge" aria-hidden="true">{'ABCD'[i]}</span>{text}</div>
          ))}
        </div>
      )}
      <div className="card on-coral col gap-4" style={{ width: '100%' }}>
        <h2 className="display" style={{ fontSize: 30 }}>Shout it out!</h2>
        <p style={{ fontWeight: 600 }}>First to call it takes the round. The host has the final say.</p>
      </div>
    </div>
  );
}

/** The host's remote in a host-led round: the answer, and who to give the points to. */
export function HostRemote({ view, send }: GameProps) {
  const [error, setError] = useState('');
  const answer = view.game === 'scramble' ? String(view.mine.answer ?? '') : `${'ABCD'[view.mine.answer ?? 0]} · ${(view.pub.options as string[])?.[view.mine.answer ?? 0] ?? ''}`;
  const others = view.players.filter((p) => p.id !== view.you);
  const award = (payload: unknown) => send('award', payload).then((r) => setError(r.ok ? '' : r.error ?? 'That did not work.'));
  return (
    <div className="col gap-12">
      <div className="card panel col gap-12">
        <div className="col gap-4">
          <span className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>EVERYONE SEES</span>
          <span style={{ fontWeight: 600 }}>{view.game === 'scramble' ? `${view.pub.clue} · ${view.pub.scrambled}` : view.pub.q}</span>
        </div>
        <div className="col gap-4 on-mint" style={{ padding: '14px 18px', borderRadius: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>ANSWER · ONLY YOU SEE THIS</span>
          <span className="display" style={{ fontSize: view.game === 'scramble' ? 40 : 26 }}>{answer}</span>
        </div>
      </div>
      <h2 className="display" style={{ fontSize: 24 }}>Who shouted it first?</h2>
      {view.teams.length
        ? view.teams.map((t) => (
            <button key={t.id} type="button" className="btn btn-lg btn-block" style={{ background: t.colour, color: 'var(--ink)', justifyContent: 'space-between', minHeight: 72 }} onClick={() => award({ team: t.id })}>
              {t.name}
              <span className="pill pill-ink" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>+100</span>
            </button>
          ))
        : others.map((p) => (
            <button key={p.id} type="button" className="option" onClick={() => award({ pid: p.id })}>
              <Avatar name={p.name} colour={p.colour} size={42} />
              <span className="grow">{p.name}</span>
              <span style={{ fontSize: 13 }}>+100</span>
            </button>
          ))}
      <p className="error" role="alert">{error}</p>
      <button type="button" className="btn btn-ghost btn-block" onClick={() => send('nobody')}>Nobody got it</button>
    </div>
  );
}

function ScrambleReveal({ view }: { view: RoomView }) {
  if (view.mode === 'host') {
    return (
      <div className="col gap-16" style={{ alignItems: 'center' }}>
        <span className="pill pill-soft">The word was</span>
        <Word word={view.reveal?.word ?? ''} />
        <div className={`card col gap-4 ${view.reveal?.awarded ? 'on-mint' : 'panel'}`} style={{ width: '100%' }}>
          <h2 className="display" style={{ fontSize: 30 }}>{awardedText(view)}</h2>
        </div>
      </div>
    );
  }
  const solved = view.players.filter((p) => p.done).sort((a, b) => b.gained - a.gained);
  const mine = me(view);
  return (
    <div className="col gap-16" style={{ alignItems: 'center' }}>
      <span className="pill pill-soft">The word was</span>
      <Word word={view.reveal?.word ?? ''} />
      <div className={`card col gap-4 ${mine?.done ? 'on-mint' : 'panel'}`} style={{ width: '100%' }}>
        <h2 className="display" style={{ fontSize: 32 }}>{mine?.done ? `You got it! +${mine.gained}` : 'Not this time.'}</h2>
        <p style={{ fontWeight: 600 }}>
          {solved.length === 0 ? 'Nobody solved it.' : `Fastest: ${solved[0].name}. ${solved.length} of ${view.players.length} solved it.`}
        </p>
      </div>
    </div>
  );
}

/* ---------- Trivia ---------- */

function TriviaPlay({ view, send }: GameProps) {
  const choice: number | null = view.mine.choice;
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => setPending(null), [view.round]);
  const locked = choice ?? pending;

  return (
    <div className="col gap-12">
      <div className="card on-mint col gap-12">
        <span className="pill pill-ink" style={{ alignSelf: 'flex-start' }}>{view.pub.cat}</span>
        <h2 className="display" style={{ fontSize: 26, lineHeight: 1.08 }}>{view.pub.q}</h2>
      </div>
      {(view.pub.options as string[]).map((text, i) => (
        <button
          key={i}
          type="button"
          className={`option${locked === i ? ' picked' : ''}${locked !== null && locked !== i ? ' dim' : ''}`}
          disabled={locked !== null}
          onClick={() => {
            setPending(i);
            send('answer', { choice: i });
          }}
        >
          <span className="badge" aria-hidden="true">{'ABCD'[i]}</span>
          {text}
        </button>
      ))}
      <p aria-live="polite" className="center" style={{ minHeight: 22, fontWeight: 600, fontSize: 14 }}>
        {locked !== null ? 'Locked in. Waiting for the others…' : ''}
      </p>
    </div>
  );
}

function TriviaReveal({ view }: { view: RoomView }) {
  const ok: number = view.reveal?.ok;
  const counts: number[] = view.reveal?.counts ?? [];
  const choice: number | null = view.mine.choice;
  const mine = me(view);
  return (
    <div className="col gap-12">
      <p className="muted" style={{ fontWeight: 600 }}>{view.pub.q}</p>
      {(view.pub.options as string[]).map((text, i) => (
        <div key={i} className={`option${i === ok ? ' right' : choice === i ? ' wrong' : ' dim'}`}>
          <span className="badge" aria-hidden="true">{'ABCD'[i]}</span>
          <span className="grow">{text}</span>
          {view.mode !== 'host' && <span style={{ fontSize: 13, fontWeight: 600 }}>{counts[i] ?? 0}</span>}
        </div>
      ))}
      <p className="center" style={{ fontWeight: 700 }}>
        {view.mode === 'host' ? awardedText(view) : choice === null ? 'You did not answer in time.' : choice === ok ? `Correct! +${mine?.gained ?? 0}` : 'Not this time.'}
      </p>
    </div>
  );
}

/* ---------- Word to Word ---------- */

function LadderPlay({ view, send }: GameProps) {
  const chain: string[] = view.mine.chain ?? [];
  const from: string = view.pub.from;
  const to: string = view.pub.to;
  const [word, setWord] = useState('');
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWord('');
    setMsg('');
  }, [view.round]);

  if (me(view)?.done) return <Waiting view={view} title={`You made it! +${me(view)?.gained ?? 0}`} note={`${from.toUpperCase()} to ${to.toUpperCase()} in ${chain.length} steps.`} />;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!word.trim()) return;
    const r = await send('answer', { word });
    if (r.ok) {
      setWord('');
      setMsg('');
    } else setMsg(r.error ?? 'That did not work.');
    input.current?.focus();
  }

  return (
    <div className="col gap-12">
      <div className="card on-blue col gap-10">
        <span className="pill pill-ink" style={{ alignSelf: 'flex-start' }}>Change one letter at a time</span>
        <h2 className="display" style={{ fontSize: 30 }}>
          {from.toUpperCase()} <span aria-hidden="true">→</span><span className="sr-only"> to </span> {to.toUpperCase()}
        </h2>
        <p style={{ fontWeight: 600, fontSize: 14 }}>Every step must be a real word.</p>
      </div>

      <div className="col gap-8" style={{ alignItems: 'center' }}>
        <Word word={from} tone="soft" />
        {chain.map((w, i) => <Word key={i} word={w} />)}
        <span className="muted" aria-hidden="true" style={{ fontWeight: 700 }}>⋮</span>
        <Word word={to} tone="mint" />
      </div>

      <form className="row gap-8" onSubmit={add}>
        <label className="sr-only" htmlFor="ladder-word">Next word</label>
        <input
          id="ladder-word"
          ref={input}
          className="input input-code grow"
          value={word}
          maxLength={from.length}
          placeholder={`Next ${from.length}-letter word`}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z]/g, ''))}
        />
        <button type="submit" className="btn btn-yellow" disabled={word.length !== from.length}>Add</button>
      </form>
      <div className="row between gap-8">
        <p className="error" role="alert">{msg}</p>
        <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} disabled={chain.length === 0} onClick={() => send('undo')}>Undo</button>
      </div>
    </div>
  );
}

function LadderReveal({ view }: { view: RoomView }) {
  const path: string[] = view.reveal?.path ?? [];
  const chains: Record<string, string[]> = view.reveal?.chains ?? {};
  const finishers = view.players.filter((p) => chains[p.id]).sort((a, b) => b.gained - a.gained);
  const mine = me(view);
  return (
    <div className="col gap-16">
      <div className={`card col gap-4 ${mine?.done ? 'on-mint' : 'panel'}`}>
        <h2 className="display" style={{ fontSize: 30 }}>{mine?.done ? `You made it! +${mine.gained}` : 'Time ran out.'}</h2>
        <p style={{ fontWeight: 600 }}>
          {finishers.length === 0 ? 'Nobody got there this round.' : `${finishers.map((p) => `${p.name} (${chains[p.id].length} steps)`).join(', ')}.`}
        </p>
      </div>
      <div className="col gap-8" style={{ alignItems: 'center' }}>
        <span className="pill pill-soft">One way to do it</span>
        {path.map((w, i) => <Word key={i} word={w} tone={i === 0 ? 'soft' : i === path.length - 1 ? 'mint' : 'yellow'} />)}
      </div>
    </div>
  );
}

/* ---------- Name Place Animal Thing ---------- */

const CATS: [string, string, string][] = [
  ['name', 'Name', "A person's name"],
  ['place', 'Place', 'A town, city or country'],
  ['animal', 'Animal', 'Anything that walks, swims or flies'],
  ['thing', 'Thing', 'Any object'],
];

function NpatPlay({ view, send }: GameProps) {
  const letter: string = view.pub.letter;
  const [fields, setFields] = useState<Record<string, string>>({ name: '', place: '', animal: '', thing: '' });
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFields({ name: '', place: '', animal: '', thing: '' });
    setMsg('');
  }, [view.round, letter]);

  function update(cat: string, value: string) {
    const next = { ...fields, [cat]: value };
    setFields(next);
    setMsg('');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => send('answer', { fields: next }), 300);
  }

  const complete = CATS.every(([cat]) => fields[cat].trim().toLowerCase().startsWith(letter.toLowerCase()));

  return (
    <div className="col gap-12">
      <div className="card on-pink row gap-16">
        <span aria-hidden="true" className="display" style={{ width: 76, height: 86, borderRadius: 22, background: 'var(--ink)', color: 'var(--yellow)', fontSize: 54, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-5deg)', flex: 'none' }}>
          {letter}
        </span>
        <h2 className="display" style={{ fontSize: 26 }}>Everything starts with {letter}</h2>
      </div>
      {CATS.map(([cat, label, hint]) => (
        <div key={cat} className="col gap-6">
          <label className="label" htmlFor={`npat-${cat}`}>{label}</label>
          <input id={`npat-${cat}`} className="input" value={fields[cat]} maxLength={30} placeholder={hint} autoComplete="off" onChange={(e) => update(cat, e.target.value)} />
        </div>
      ))}
      <p className="error" role="alert">{msg}</p>
      <button
        type="button"
        className="btn btn-lg btn-coral btn-block"
        disabled={!complete}
        onClick={() => send('stop', { fields }).then((r) => !r.ok && setMsg(r.error ?? 'Fill all four first.'))}
      >
        Stop!
      </button>
      <p className="muted center" style={{ fontSize: 13, fontWeight: 600 }}>First to fill all four stops the round for everyone.</p>
    </div>
  );
}

function NpatReveal({ view }: { view: RoomView }) {
  const table: Record<string, Record<string, { text: string; pts: number }>> = view.reveal?.table ?? {};
  const stopper = byId(view, view.reveal?.stopper);
  const mine = me(view);
  const row = (view.you && table[view.you]) || {};
  const others = view.players.filter((p) => p.id !== view.you);
  return (
    <div className="col gap-12">
      <div className="card on-pink col gap-4">
        <p style={{ fontWeight: 700, fontSize: 14 }}>{stopper ? `${stopper.name} called Stop!` : 'Time is up.'} Letter {view.pub.letter}.</p>
        <h2 className="display" style={{ fontSize: 34 }}>+{mine?.gained ?? 0} points</h2>
      </div>
      {CATS.map(([cat, label]) => {
        const cell = row[cat] ?? { text: '', pts: 0 };
        return (
          <div key={cat} className="card panel row between gap-12" style={{ padding: '14px 16px', borderRadius: 22 }}>
            <span className="col gap-4">
              <span className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em' }}>{label.toUpperCase()}</span>
              <span className="display" style={{ fontSize: 20, fontWeight: 700 }}>{cell.text || 'Left blank'}</span>
            </span>
            <span className={`pill ${cell.pts === 10 ? 'on-mint' : cell.pts === 5 ? 'pill-yellow' : 'pill-soft'}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
              {cell.pts === 10 ? 'Only you · 10' : cell.pts === 5 ? 'Shared · 5' : '0'}
            </span>
          </div>
        );
      })}
      {others.length > 0 && (
        <div className="card panel col gap-8 table-scroll" style={{ padding: 16, borderRadius: 22 }}>
          <span className="label">Everyone else</span>
          {others.map((p) => (
            <p key={p.id} style={{ fontSize: 14 }}>
              <strong>{p.name}</strong> (+{p.gained}): {CATS.map(([cat]) => table[p.id]?.[cat]?.text || '—').join(', ')}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Act It Out ---------- */

function ActPlay({ view, send }: GameProps) {
  const actor = byId(view, view.pub.actorId);
  const acting = view.pub.actorId === view.you;
  const log: { phrase: string; by: string | null }[] = view.pub.log ?? [];
  const [choosing, setChoosing] = useState(false);
  useEffect(() => setChoosing(false), [view.mine.phrase]);
  const actorTeam = view.teams.find((t) => t.id === actor?.team);

  if (!acting) {
    return (
      <div className="col gap-12">
        <div className="card on-coral col gap-12">
          <div className="row between">
            <span className="pill pill-ink">No talking</span>
            {actor && <Avatar name={actor.name} colour={actor.colour} size={56} />}
          </div>
          <h2 className="display" style={{ fontSize: 40, lineHeight: 0.96 }}>{actor?.name ?? 'Someone'} is acting.</h2>
          <p style={{ fontWeight: 600 }}>
            {actorTeam ? (actorTeam.id === me(view)?.team ? 'Your team is guessing. Eyes up, shout it out!' : `${actorTeam.name} is guessing. Keep quiet!`) : 'Eyes up, phones down. Shout your guesses!'}
          </p>
        </div>
        <ActLog view={view} log={log} hidePassed />
      </div>
    );
  }

  const guessers = view.players.filter((p) => p.id !== view.you && !(view.mode === 'host' && p.id === view.hostId));
  return (
    <div className="col gap-12">
      <div className="card on-coral col gap-12">
        <span className="pill pill-ink" style={{ alignSelf: 'flex-start' }}>You are up. Not a word.</span>
        <p style={{ fontWeight: 700, fontSize: 14 }}>Act this out. Keep the screen to yourself.</p>
        <h2 className="display" style={{ fontSize: 44, lineHeight: 0.96 }}>{view.mine.phrase}</h2>
      </div>
      {choosing ? (
        <div className="col gap-8">
          <span className="label">Who shouted it first?</span>
          {guessers.map((p) => (
            <button key={p.id} type="button" className="option" onClick={() => send('got', { by: p.id })}>
              <Avatar name={p.name} colour={p.colour} size={42} />
              {p.name}
            </button>
          ))}
          <button type="button" className="btn btn-ghost" onClick={() => setChoosing(false)}>Back</button>
        </div>
      ) : (
        <div className="row gap-10">
          <button type="button" className="btn btn-lg btn-ghost grow" onClick={() => send('pass')}>Pass</button>
          <button type="button" className="btn btn-lg btn-mint grow" onClick={() => (actorTeam ? send('got') : setChoosing(true))}>They got it!</button>
        </div>
      )}
      <p className="muted center" style={{ fontSize: 14, fontWeight: 600 }}>{log.filter((l) => l.by).length} guessed this turn</p>
    </div>
  );
}

function ActLog({ view, log, hidePassed = false }: { view: RoomView; log: { phrase: string; by: string | null }[]; hidePassed?: boolean }) {
  const rows = hidePassed ? log.filter((l) => l.by) : log;
  if (rows.length === 0) return <p className="muted center" style={{ fontWeight: 600 }}>Nothing guessed yet.</p>;
  return (
    <div className="col gap-8">
      {rows.map((l, i) => (
        <div key={i} className="card panel row between gap-12" style={{ padding: '12px 16px', borderRadius: 20, fontWeight: 600 }}>
          <span>{l.phrase}</span>
          <span className={`pill ${l.by ? 'on-mint' : 'pill-soft'}`} style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
            {l.by ? (l.by.startsWith('team:') ? 'Got it' : byId(view, l.by)?.name ?? 'Got it') : 'Passed'}
          </span>
        </div>
      ))}
    </div>
  );
}

function ActReveal({ view }: { view: RoomView }) {
  const actor = byId(view, view.pub.actorId);
  const log: { phrase: string; by: string | null }[] = view.reveal?.log ?? [];
  return (
    <div className="col gap-12">
      <div className="card on-coral col gap-4">
        <h2 className="display" style={{ fontSize: 32 }}>Time! {actor?.name ?? 'The actor'} got {log.filter((l) => l.by).length} across.</h2>
        {view.reveal?.unfinished && <p style={{ fontWeight: 600 }}>Still on the table: {view.reveal.unfinished}</p>}
      </div>
      <ActLog view={view} log={log} />
    </div>
  );
}

/* ---------- Switchers ---------- */

export function GamePlay(props: GameProps) {
  const { view } = props;
  if (view.mode === 'host' && (view.game === 'scramble' || view.game === 'trivia')) {
    return view.you === view.hostId ? <HostRemote {...props} /> : <ShoutPlay view={view} />;
  }
  switch (props.view.game) {
    case 'scramble': return <ScramblePlay {...props} />;
    case 'trivia': return <TriviaPlay {...props} />;
    case 'ladder': return <LadderPlay {...props} />;
    case 'npat': return <NpatPlay {...props} />;
    case 'act': return <ActPlay {...props} />;
  }
}

export function GameReveal({ view }: { view: RoomView }) {
  switch (view.game) {
    case 'scramble': return <ScrambleReveal view={view} />;
    case 'trivia': return <TriviaReveal view={view} />;
    case 'ladder': return <LadderReveal view={view} />;
    case 'npat': return <NpatReveal view={view} />;
    case 'act': return <ActReveal view={view} />;
  }
}
