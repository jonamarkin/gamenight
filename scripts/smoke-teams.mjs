// Phase 1 smoke test: teams, host-led rounds, host controls and host hand-over.
// Start the server with OYA_HANDOVER_MS=1200 so the hand-over check is quick.
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3111';
const content = readFileSync(process.argv[3], 'utf8');
const scramble = [...content.matchAll(/\{ w: '([A-Z]+)', clue: '([^']+)' \}/g)].map((m) => ({ w: m[1], clue: m[2] }));

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
  const state = { view: null, kicked: false, ctrl: new AbortController() };
  (async () => {
    const r = await fetch(`${BASE}/api/rooms/${code}/events?pid=${pid}`, { signal: state.ctrl.signal });
    const dec = new TextDecoder();
    let buf = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      let i;
      while ((i = buf.indexOf('\n\n')) !== -1) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (!line.startsWith('data: ')) continue;
        const msg = JSON.parse(line.slice(6));
        if (msg.kicked) state.kicked = true;
        else state.view = msg;
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

const made = await post('/api/rooms', { name: 'Ama' });
const code = made.data.code;
const A = made.data.pid;
const K = (await post(`/api/rooms/${code}/join`, { name: 'Kojo' })).data.pid;
const E = (await post(`/api/rooms/${code}/join`, { name: 'Efua' })).data.pid;
const a = listen(code, A);
const k = listen(code, K);
const e = listen(code, E);
await until(() => a.view && k.view && e.view && a.view.players.every((p) => p.connected), 'three players connected');

const act = (pid, type, payload) => post(`/api/rooms/${code}/action`, { pid, type, payload }).then((r) => r.data);
/** Run an action, then wait until every open view reflects `fn`. */
const settle = async (fn, label) => until(() => fn(a.view) && fn(k.view), label);
const player = (view, pid) => view.players.find((p) => p.id === pid);
const team = (view, id) => view.teams.find((t) => t.id === id);
const word = (view) => scramble.find((s) => s.clue === view.pub.clue).w;

// ----- Teams in the lobby -----
check(a.view.teams.length === 0 && a.view.mode === 'phones', 'rooms start solo, on phones');
check(!(await act(K, 'config', { teams: 2 })).ok, 'guest cannot turn teams on');
await act(A, 'config', { teams: 2 });
await settle((v) => v.teams.length === 2, 'two teams');
check(a.view.players.every((p) => p.team) && a.view.teams.every((t) => a.view.players.some((p) => p.team === t.id)), 'everyone is dealt onto a team, none empty');

const efuaBefore = player(a.view, E).team;
const other = (id) => (id === 'a' ? 'b' : 'a');
await act(K, 'team', { pid: E, team: other(efuaBefore) });
await sleep(80);
check(player(a.view, E).team === efuaBefore, 'a guest cannot move someone else');
await act(A, 'team', { pid: E, team: other(efuaBefore) });
await settle((v) => player(v, E).team === other(efuaBefore), 'host moves a player');
check(true, 'host can move a player between teams');
await act(K, 'team', { team: 'a' });
await act(E, 'team', { team: 'b' });
await act(A, 'team', { team: 'a' });
await settle((v) => player(v, K).team === 'a' && player(v, E).team === 'b' && player(v, A).team === 'a', 'players pick their own teams');
check(true, 'players can pick their own team');

check(!(await act(K, 'rename-team', { team: 'a', name: 'Hackers' })).ok, 'guest cannot rename a team');
await act(A, 'rename-team', { team: 'b', name: '  Team   Banku ' });
await settle((v) => team(v, 'b').name === 'Team Banku', 'rename');
check(true, 'host renames a team (spaces tidied)');
check((await act(A, 'shuffle')).ok && !(await act(K, 'shuffle')).ok, 'only the host can shuffle');
await act(A, 'team', { pid: K, team: 'a' });
await act(A, 'team', { pid: A, team: 'a' });
await act(A, 'team', { pid: E, team: 'b' });
await settle((v) => player(v, K).team === 'a' && player(v, E).team === 'b' && player(v, A).team === 'a', 'teams reset after shuffle');

const late = await post(`/api/rooms/${code}/join`, { name: 'Nii' });
await settle((v) => v.players.length === 4, 'late joiner');
check(player(a.view, late.data.pid).team === 'b', 'a late joiner lands on the smaller team');
await act(A, 'kick', { pid: late.data.pid });
await settle((v) => v.players.length === 3, 'remove late joiner');

// ----- Team scoring, phones mode -----
await act(A, 'config', { game: 'scramble', rounds: 3 });
await act(A, 'start');
await settle((v) => v.phase === 'playing', 'scramble starts');
check(!(await act(K, 'team', { team: 'b' })).ok, 'teams are locked once the game starts');
const r = await act(K, 'answer', { guess: word(a.view) });
await settle((v) => team(v, 'a').score === r.gained, 'team score follows member');
check(team(a.view, 'a').score === r.gained && team(a.view, 'b').score === 0, `team score is the sum of its members (${r.gained})`);
for (let i = 0; i < 3; i++) {
  await act(A, 'skip');
  await settle((v) => v.phase === 'reveal', 'reveal');
  await act(A, 'next');
  await sleep(80);
}
await settle((v) => v.phase === 'final', 'final');
check(team(a.view, 'a').score > team(a.view, 'b').score, 'final: the scoring team is ahead');
const png = await fetch(`${BASE}/api/rooms/${code}/result.png`);
check(png.status === 200 && png.headers.get('content-type') === 'image/png', 'result picture renders with teams');
await act(A, 'again');
await settle((v) => v.phase === 'lobby' && v.teams.every((t) => t.score === 0), 'lobby, scores cleared');

// ----- Host-led mode with teams -----
await act(A, 'config', { game: 'ladder' });
check(!(await act(A, 'config', { mode: 'host' })).ok, 'host-led is refused for a phones-only game');
await act(A, 'config', { game: 'scramble' });
check((await act(A, 'config', { mode: 'host' })).ok, 'host-led turns on for Scramble');
await settle((v) => v.mode === 'host' && player(v, A).team === null, 'host sits out');
check(true, 'the host sits out of the teams in host-led mode');
check(!(await act(A, 'config', { game: 'npat' })).ok && a.view.game === 'scramble', 'phones-only games are refused while host-led');
check((await act(A, 'start')).ok, 'a host-led game starts');
await settle((v) => v.phase === 'playing', 'host-led scramble starts');
const w = word(a.view);
check(a.view.mine.answer === w, 'the host sees the answer');
check(!JSON.stringify(k.view).includes(`"${w}"`), 'players do not get the answer');
check(!(await act(K, 'answer', { guess: w })).ok, 'players cannot answer on their phones in host-led mode');
check(!(await act(K, 'award', { team: 'a' })).ok, 'only the host can award');
await act(A, 'award', { team: 'b' });
await settle((v) => v.phase === 'reveal' && team(v, 'b').score === 100, 'award');
check(a.view.reveal.awarded.team === 'b' && a.view.reveal.word === w && team(a.view, 'a').score === 0, 'awarding a team gives it 100 and reveals the word');
await act(A, 'next');
await settle((v) => v.phase === 'playing' && v.round === 1, 'round 2');
await act(A, 'nobody');
await settle((v) => v.phase === 'reveal', 'nobody');
check(a.view.reveal.awarded === null && team(a.view, 'b').score === 100, '"nobody got it" ends the round with no points');
await act(A, 'next');
await settle((v) => v.phase === 'playing' && v.round === 2, 'round 3');
await act(A, 'award', { team: 'a' });
await settle((v) => v.phase === 'reveal', 'award 2');
await act(A, 'next');
await settle((v) => v.phase === 'final', 'host-led final');
check(team(a.view, 'a').score === 100 && team(a.view, 'b').score === 100, 'host-led final: both teams on 100');
await act(A, 'again');
await settle((v) => v.phase === 'lobby', 'lobby again');

// ----- Host-led mode without teams -----
await act(A, 'config', { teams: 0 });
await act(A, 'config', { game: 'trivia' });
await settle((v) => v.teams.length === 0 && v.game === 'trivia', 'solo host-led trivia');
await act(A, 'start');
await settle((v) => v.phase === 'playing', 'host-led trivia starts');
check(typeof a.view.mine.answer === 'number' && k.view.mine.answer === undefined, 'trivia: only the host gets the answer');
check(!(await act(A, 'award', { pid: A })).ok, 'the host cannot award themselves');
await act(A, 'award', { pid: E });
await settle((v) => v.phase === 'reveal', 'solo award');
check(player(a.view, E).score === 100 && a.view.reveal.awarded.pid === E, 'solo host-led: the named player gets 100');
for (let i = 0; i < 3; i++) {
  await act(A, 'next');
  await sleep(80);
  await act(A, 'nobody');
  await sleep(80);
}
await settle((v) => v.phase === 'final', 'solo final');
await act(A, 'again');
await settle((v) => v.phase === 'lobby', 'lobby 3');

// ----- Act It Out with teams -----
await act(A, 'config', { mode: 'phones' });
await act(A, 'config', { teams: 2 });
await act(A, 'config', { game: 'act' });
await act(A, 'team', { pid: A, team: 'a' });
await act(A, 'team', { pid: K, team: 'a' });
await act(A, 'team', { pid: E, team: 'b' });
await settle((v) => v.game === 'act' && player(v, A).team === 'a' && player(v, E).team === 'b', 'act with teams');
await act(A, 'start');
await settle((v) => v.phase === 'playing', 'act starts');
check((await act(A, 'got')).ok, 'with teams the actor confirms a guess without naming a player');
await settle((v) => team(v, 'a').score === 100, 'act team score');
check(team(a.view, 'a').score === 100 && team(a.view, 'b').score === 0 && a.view.pub.log[0].by === 'team:a', "the actor's team gets the 100");
await act(A, 'skip');
await settle((v) => v.phase === 'reveal', 'act reveal');

// ----- Removing players, handing over the host -----
check(!(await act(K, 'kick', { pid: E })).ok, 'a guest cannot remove anyone');
check(!(await act(A, 'kick', { pid: A })).ok, 'the host cannot remove themselves');
await act(A, 'kick', { pid: E });
await until(() => e.kicked, 'removed player is told');
await settle((v) => v.players.length === 2, 'player removed');
check(e.kicked && !(await act(E, 'next')).ok, 'a removed player is told and can no longer act');
check((await fetch(`${BASE}/api/rooms/${code}/events?pid=${E}`)).status === 403, 'a removed player cannot reconnect with the old seat');

check(!(await act(K, 'transfer', { pid: K })).ok, 'a guest cannot take over as host');
await act(A, 'transfer', { pid: K });
await settle((v) => v.hostId === K, 'transfer');
check(!(await act(A, 'next')).ok && (await act(K, 'next')).ok, 'after a transfer only the new host controls the game');

k.ctrl.abort();
await until(() => a.view.hostId === A, 'host hand-over after the host drops', 5000);
check(a.view.hostId === A, 'when the host drops off, a connected player takes over');

a.ctrl.abort();
e.ctrl.abort();
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
