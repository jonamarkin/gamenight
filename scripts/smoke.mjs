// End-to-end smoke test: two simulated players play every game over the real HTTP API.
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3111';
const content = readFileSync(process.argv[3], 'utf8');

const scramble = [...content.matchAll(/\{ w: '([A-Z]+)', clue: '([^']+)' \}/g)].map((m) => ({ w: m[1], clue: m[2] }));
const trivia = [...content.matchAll(/q: '([^']+)', a: \[[^\]]+\], ok: (\d)/g)].map((m) => ({ q: m[1], ok: Number(m[2]) }));
const ladders = [...content.matchAll(/from: '([a-z]+)', to: '([a-z]+)', path: \[([^\]]+)\]/g)].map((m) => ({
  from: m[1], to: m[2], path: m[3].split(',').map((s) => s.trim().replace(/'/g, '')),
}));

let failures = 0;
const check = (cond, label) => {
  if (!cond) failures += 1;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`);
};
const post = async (path, body) => {
  const r = await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function listen(code, pid) {
  const state = { view: null, ctrl: new AbortController() };
  (async () => {
    const r = await fetch(`${BASE}/api/rooms/${code}/events${pid ? `?pid=${pid}` : ''}`, { signal: state.ctrl.signal });
    const dec = new TextDecoder();
    let buf = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) !== -1) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (line.startsWith('data: ')) state.view = JSON.parse(line.slice(6));
      }
    }
  })().catch(() => {});
  return state;
}
const until = async (fn, label, ms = 4000) => {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if (fn()) return true;
    await sleep(40);
  }
  check(false, `timed out: ${label}`);
  return false;
};

const made = await post('/api/rooms', { name: 'Ama', colour: '#FF6A5C' });
check(made.status === 200 && /^[A-Z]+-\d\d$/.test(made.data.code), `create room -> ${made.data.code}`);
const code = made.data.code;
const A = made.data.pid;
const loose = code.replace('-', '').toLowerCase();
const joined = await post(`/api/rooms/${loose}/join`, { name: 'Kojo' });
check(joined.status === 200, 'join with a sloppy code (no dash, lower case)');
const B = joined.data.pid;
check((await post(`/api/rooms/${code}/join`, { name: 'kojo' })).status === 409, 'duplicate name rejected');
check((await post('/api/rooms/NOPE-99/join', { name: 'X' })).status === 404, 'unknown room is 404');
check((await fetch(`${BASE}/api/rooms/${code}/events?pid=bogus`)).status === 403, 'unknown player cannot open the stream');

const a = listen(code, A);
const b = listen(code, B);
const tv = listen(code, null);
await until(() => a.view && b.view && tv.view, 'streams open');
await until(() => a.view.players.every((p) => p.connected), 'both players connected');
check(a.view.players.length === 2 && a.view.you === A && tv.view.you === null, 'views are personalised');

const act = (pid, type, payload) => post(`/api/rooms/${code}/action`, { pid, type, payload }).then((r) => r.data);
check(!(await act(B, 'start')).ok, 'guest cannot start');

async function startGame(game) {
  await act(A, 'config', { game, rounds: 3 });
  const r = await act(A, 'start');
  check(r.ok, `${game}: host starts`);
  await until(() => a.view.phase === 'playing' && a.view.game === game && a.view.round === 0, `${game} playing`);
}
async function next(expectPhase) {
  await act(A, 'next');
  await until(() => a.view.phase === expectPhase, `advance to ${expectPhase}`);
}
async function finish(game) {
  await next('final');
  check(a.view.phase === 'final', `${game}: reaches final`);
  await act(A, 'again');
  await until(() => a.view.phase === 'lobby', 'back to lobby');
  check(a.view.players.every((p) => p.score === 0), `${game}: scores reset for the next game`);
}

// Scramble
await startGame('scramble');
for (let round = 0; round < 3; round++) {
  await until(() => a.view.phase === 'playing' && a.view.round === round, `scramble round ${round}`);
  const item = scramble.find((s) => s.clue === a.view.pub.clue);
  check(!!item && [...a.view.pub.scrambled].sort().join('') === [...item.w].sort().join('') && a.view.pub.scrambled !== item.w, `scramble r${round}: letters are a real shuffle`);
  check(!JSON.stringify(b.view).includes(`"${item.w}"`), `scramble r${round}: answer not leaked to players`);
  check(!(await act(B, 'answer', { guess: 'ZZZZ' })).ok, `scramble r${round}: wrong guess rejected`);
  const r1 = await act(A, 'answer', { guess: item.w });
  check(r1.ok && r1.gained > 40, `scramble r${round}: correct guess scores ${r1.gained}`);
  await sleep(60);
  check(a.view.phase === 'playing' && a.view.mine.solved === true && b.view.mine.solved === false, `scramble r${round}: round continues until all solve`);
  await act(B, 'answer', { guess: item.w.toLowerCase() });
  await until(() => a.view.phase === 'reveal', 'scramble reveal');
  check(a.view.reveal.word === item.w && tv.view.reveal.word === item.w, `scramble r${round}: reveal shows the word`);
  if (round < 2) await next('playing');
}
check(a.view.players.every((p) => p.score > 120), 'scramble: both players scored across rounds');
await finish('scramble');

// Trivia
await startGame('trivia');
for (let round = 0; round < 3; round++) {
  await until(() => a.view.phase === 'playing' && a.view.round === round, `trivia round ${round}`);
  const item = trivia.find((t) => t.q === a.view.pub.q);
  check(!!item, `trivia r${round}: question found`);
  await act(A, 'answer', { choice: item.ok });
  check(!(await act(A, 'answer', { choice: 0 })).ok, `trivia r${round}: cannot answer twice`);
  await sleep(60);
  check(a.view.phase === 'playing' && a.view.players.find((p) => p.id === A).score === (round === 0 ? 0 : a.view.players.find((p) => p.id === A).score), `trivia r${round}: waits for the other player`);
  await act(B, 'answer', { choice: (item.ok + 1) % 4 });
  await until(() => a.view.phase === 'reveal', 'trivia reveal');
  const pa = a.view.players.find((p) => p.id === A);
  const pb = a.view.players.find((p) => p.id === B);
  check(a.view.reveal.ok === item.ok && pa.gained >= 60 && pb.gained === 0, `trivia r${round}: right answer scores (${pa.gained}), wrong scores 0`);
  check(a.view.reveal.counts.reduce((x, y) => x + y, 0) === 2, `trivia r${round}: pick counts add up`);
  if (round < 2) await next('playing');
}
await finish('trivia');

// Word to Word
await startGame('ladder');
{
  const item = ladders.find((l) => l.from === a.view.pub.from && l.to === a.view.pub.to);
  check(!!item, `ladder: puzzle ${a.view.pub.from} -> ${a.view.pub.to}`);
  const first = item.path[1];
  check((await act(A, 'answer', { word: 'zz' })).error?.includes('letter'), 'ladder: wrong length rejected');
  check((await act(A, 'answer', { word: item.to })).ok === false, 'ladder: cannot jump straight to the target');
  const fake = item.from.slice(0, -1) + 'q';
  const rf = await act(A, 'answer', { word: fake });
  check(!rf.ok, `ladder: non-word "${fake}" rejected (${rf.error})`);
  check((await act(A, 'answer', { word: first })).ok, `ladder: valid step ${first}`);
  check((await act(A, 'answer', { word: item.from })).ok === false, 'ladder: cannot step back to the start word');
  await act(A, 'undo');
  await sleep(60);
  check(a.view.mine.chain.length === 0 && b.view.mine.chain.length === 0, 'ladder: undo works and chains are private');
  for (const w of item.path.slice(1)) await act(A, 'answer', { word: w.toUpperCase() });
  await sleep(60);
  const pa = a.view.players.find((p) => p.id === A);
  check(pa.done && pa.gained >= 50 && a.view.phase === 'playing', `ladder: finishing scores ${pa.gained}, round waits for others`);
  for (const w of item.path.slice(1)) await act(B, 'answer', { word: w });
  await until(() => a.view.phase === 'reveal', 'ladder reveal');
  check(a.view.reveal.path.join() === item.path.join() && Object.keys(a.view.reveal.chains).length === 2, 'ladder: reveal has the solution and both chains');
  await next('playing');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'ladder skip');
  check(a.view.players.every((p) => p.gained === 0), 'ladder: host can end a round early, nobody scores');
  await next('playing');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'ladder skip 2');
}
await finish('ladder');

// Name Place Animal Thing
await startGame('npat');
{
  const L = a.view.pub.letter;
  const mk = (suffix) => ({ name: `${L}${suffix}a`, place: `${L}umasi`, animal: `${L}${suffix}b`, thing: '' });
  await act(A, 'answer', { fields: mk('x') });
  check(!(await act(A, 'stop', { fields: mk('x') })).ok, 'npat: cannot stop with a blank field');
  await act(B, 'answer', { fields: { name: `${L}yy`, place: ` ${L}UMASI `, animal: 'Zebra', thing: `${L}ettle` } });
  const full = { ...mk('x'), thing: `${L}ey` };
  check((await act(A, 'stop', { fields: full })).ok, 'npat: stop works when all four are filled');
  await until(() => a.view.phase === 'reveal', 'npat reveal');
  const t = a.view.reveal.table;
  check(t[A].name.pts === 10 && t[A].place.pts === 5 && t[B].place.pts === 5, 'npat: unique = 10, shared = 5 (case and spaces ignored)');
  check(t[B].animal.pts === 0 && t[B].thing.pts === 10, 'npat: wrong starting letter = 0');
  const pa = a.view.players.find((p) => p.id === A);
  const pb = a.view.players.find((p) => p.id === B);
  check(pa.gained === 35 && pb.gained === 25 && a.view.reveal.stopper === A, `npat: totals ${pa.gained} / ${pb.gained}, stopper recorded`);
  await next('playing');
  check(a.view.pub.letter !== L, 'npat: next round has a new letter');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'npat skip');
  await next('playing');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'npat skip 2');
}
await finish('npat');

// Act It Out
await startGame('act');
{
  check(a.view.pub.actorId === A, 'act: host acts first');
  const phrase = a.view.mine.phrase;
  check(typeof phrase === 'string' && phrase.length > 3, `act: actor sees a phrase ("${phrase}")`);
  check(b.view.mine.phrase === null && !JSON.stringify(b.view).includes(phrase) && !JSON.stringify(tv.view).includes(phrase), 'act: phrase hidden from guessers and the big screen');
  check(!(await act(B, 'got', { by: A })).ok, 'act: only the actor can mark a guess');
  check(!(await act(A, 'got', { by: A })).ok, 'act: actor cannot credit themselves');
  check((await act(A, 'got', { by: B })).ok, 'act: actor credits the guesser');
  await sleep(60);
  const pa = a.view.players.find((p) => p.id === A);
  const pb = a.view.players.find((p) => p.id === B);
  check(pa.score === 50 && pb.score === 100, 'act: guesser +100, actor +50');
  check(a.view.mine.phrase !== phrase && a.view.pub.log.length === 1, 'act: a new phrase is dealt and the guess is logged');
  await act(A, 'pass');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'act reveal');
  check(a.view.reveal.log.length === 2 && a.view.reveal.log[1].by === null, 'act: reveal lists guessed and passed phrases');
  await next('playing');
  await until(() => b.view.phase === 'playing' && b.view.round === 1, 'guest sees turn 2');
  check(a.view.pub.actorId === B && b.view.mine.phrase && a.view.mine.phrase === null, 'act: second turn goes to the other player');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'act skip');
  await next('playing');
  await act(A, 'skip');
  await until(() => a.view.phase === 'reveal', 'act skip 2');
}
await finish('act');

// Disconnect handling
b.ctrl.abort();
await until(() => a.view.players.find((p) => p.id === B).connected === false, 'disconnect is noticed');
check(true, 'disconnected player shows as away');
await act(A, 'config', { game: 'scramble', rounds: 3 });
await act(A, 'start');
await until(() => a.view.phase === 'playing', 'scramble with one player away');
const it = scramble.find((s) => s.clue === a.view.pub.clue);
await act(A, 'answer', { guess: it.w });
await until(() => a.view.phase === 'reveal', 'round ends without the away player', 2000);
check(a.view.phase === 'reveal', 'round does not wait for a disconnected player');

a.ctrl.abort();
tv.ctrl.abort();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
