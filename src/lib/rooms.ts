// In-memory room store and game engine.
//
// Everything lives in this one Node process, so the app must run as a single
// long-lived server (`next dev` / `next start`), not on serverless functions.

import { randomBytes } from 'crypto';
import wordList from 'an-array-of-english-words';
import { ACT_PROMPTS, LADDERS, NPAT_LETTERS, ROOM_WORDS, SCRAMBLE_WORDS, TRIVIA } from './content';
import { COLOURS, type GameId, type Phase, type RoomView } from './types';

type Sub = { pid: string | null; send: (data: string) => void };

interface Player {
  id: string;
  name: string;
  colour: string;
  score: number;
  gained: number;
  done: boolean;
  answer: any;
}

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: Phase;
  game: GameId;
  rounds: number;
  round: number;
  total: number;
  deadline: number | null;
  duration: number;
  timer: ReturnType<typeof setTimeout> | null;
  subs: Set<Sub>;
  deck: any[];
  deckPos: number;
  secret: any;
  pub: Record<string, any>;
  reveal: Record<string, any> | null;
  touched: number;
}

export type ActionResult = { ok: boolean; error?: string; [k: string]: any };

const g = globalThis as any;
const rooms: Map<string, Room> = g.__gamenightRooms ?? (g.__gamenightRooms = new Map());

let dictionary: Set<string> | null = null;
function isWord(w: string): boolean {
  if (!dictionary) dictionary = new Set(wordList);
  return dictionary.has(w);
}

const DURATION: Record<GameId, number> = { scramble: 30, trivia: 20, ladder: 120, npat: 60, act: 60 };
const NPAT_CATS = ['name', 'place', 'animal', 'thing'] as const;
const MAX_PLAYERS = 16;
const ROOM_TTL_MS = 3 * 60 * 60 * 1000;

function shuffle<T>(list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cleanName(name: unknown): string {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

function cleanColour(colour: unknown, taken: string[]): string {
  if (typeof colour === 'string' && COLOURS.includes(colour)) return colour;
  return COLOURS.find((c) => !taken.includes(c)) ?? COLOURS[0];
}

export function normaliseCode(raw: string): string {
  const s = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = s.match(/^([A-Z]+)(\d+)$/);
  return m ? `${m[1]}-${m[2]}` : s;
}

function sweep() {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of rooms) {
    if (room.touched < cutoff && room.subs.size === 0) {
      if (room.timer) clearTimeout(room.timer);
      rooms.delete(code);
    }
  }
}

function newPlayer(name: string, colour: string): Player {
  return { id: randomBytes(9).toString('base64url'), name, colour, score: 0, gained: 0, done: false, answer: null };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(normaliseCode(code));
}

export function createRoom(name: unknown, colour: unknown): { code: string; pid: string } | { error: string } {
  sweep();
  const n = cleanName(name);
  if (!n) return { error: 'Tell us your name first.' };
  let code = '';
  for (let tries = 0; tries < 200 && (!code || rooms.has(code)); tries++) {
    code = `${ROOM_WORDS[Math.floor(Math.random() * ROOM_WORDS.length)]}-${10 + Math.floor(Math.random() * 90)}`;
  }
  if (rooms.has(code)) return { error: 'Could not make a room right now. Try again.' };
  const host = newPlayer(n, cleanColour(colour, []));
  rooms.set(code, {
    code, hostId: host.id, players: [host], phase: 'lobby', game: 'scramble', rounds: 5, round: 0, total: 5,
    deadline: null, duration: 0, timer: null, subs: new Set(), deck: [], deckPos: 0, secret: null, pub: {},
    reveal: null, touched: Date.now(),
  });
  return { code, pid: host.id };
}

export function joinRoom(code: string, name: unknown, colour: unknown): { code: string; pid: string } | { error: string; status: number } {
  const room = getRoom(code);
  if (!room) return { error: 'No room with that code.', status: 404 };
  const n = cleanName(name);
  if (!n) return { error: 'Tell us your name first.', status: 400 };
  if (room.players.length >= MAX_PLAYERS) return { error: 'That room is full.', status: 409 };
  if (room.players.some((p) => p.name.toLowerCase() === n.toLowerCase())) {
    return { error: 'Someone in the room already has that name.', status: 409 };
  }
  const player = newPlayer(n, cleanColour(colour, room.players.map((p) => p.colour)));
  room.players.push(player);
  room.touched = Date.now();
  broadcast(room);
  return { code: room.code, pid: player.id };
}

export function isMember(room: Room, pid: string | null): boolean {
  return !!pid && room.players.some((p) => p.id === pid);
}

function isConnected(room: Room, pid: string): boolean {
  for (const s of room.subs) if (s.pid === pid) return true;
  return false;
}

function mineFor(room: Room, p: Player | undefined): Record<string, any> {
  if (!p || room.phase === 'lobby' || room.phase === 'final') return {};
  switch (room.game) {
    case 'scramble': return { solved: p.done };
    case 'trivia': return { choice: p.answer?.choice ?? null };
    case 'ladder': return { chain: p.answer?.chain ?? [] };
    case 'npat': return { fields: p.answer?.fields ?? {} };
    case 'act': return { phrase: room.phase === 'playing' && room.pub.actorId === p.id ? room.secret?.phrase ?? null : null };
  }
}

export function viewFor(room: Room, pid: string | null): RoomView {
  const me = room.players.find((p) => p.id === pid);
  return {
    code: room.code,
    hostId: room.hostId,
    you: me ? me.id : null,
    phase: room.phase,
    game: room.game,
    rounds: room.rounds,
    round: room.round,
    total: room.total,
    deadline: room.deadline,
    duration: room.duration,
    now: Date.now(),
    players: room.players.map((p) => ({
      id: p.id, name: p.name, colour: p.colour, score: p.score, gained: p.gained, done: p.done,
      connected: isConnected(room, p.id),
    })),
    pub: room.pub,
    mine: mineFor(room, me),
    reveal: room.reveal,
  };
}

export function broadcast(room: Room) {
  for (const sub of room.subs) {
    try {
      sub.send(JSON.stringify(viewFor(room, sub.pid)));
    } catch {
      room.subs.delete(sub);
    }
  }
}

export function subscribe(room: Room, pid: string | null, send: (data: string) => void): () => void {
  const sub: Sub = { pid, send };
  room.subs.add(sub);
  room.touched = Date.now();
  broadcast(room);
  return () => {
    room.subs.delete(sub);
    room.touched = Date.now();
    broadcast(room);
  };
}

/** Fraction of the round's time still left, 0..1. */
function timeLeft(room: Room): number {
  if (!room.deadline || !room.duration) return 0;
  return Math.max(0, Math.min(1, (room.deadline - Date.now()) / (room.duration * 1000)));
}

function everyoneDone(room: Room): boolean {
  const active = room.players.filter((p) => isConnected(room, p.id));
  return active.length > 0 && active.every((p) => p.done);
}

function scrambleWord(w: string): string {
  for (let i = 0; i < 20; i++) {
    const s = shuffle(w.split('')).join('');
    if (s !== w) return s;
  }
  return w.split('').reverse().join('');
}

function nextActPhrase(room: Room) {
  room.secret = { phrase: room.deck[room.deckPos % room.deck.length] };
  room.deckPos += 1;
}

function startGame(room: Room) {
  for (const p of room.players) p.score = 0;
  room.round = 0;
  room.deckPos = 0;
  switch (room.game) {
    case 'scramble': room.deck = shuffle(SCRAMBLE_WORDS); break;
    case 'trivia': room.deck = shuffle(TRIVIA); break;
    case 'ladder': room.deck = shuffle(LADDERS); break;
    case 'npat': room.deck = shuffle(NPAT_LETTERS); break;
    case 'act': room.deck = shuffle(ACT_PROMPTS); break;
  }
  room.total = room.game === 'act' ? room.rounds : Math.min(room.rounds, room.deck.length);
  startRound(room);
}

function startRound(room: Room) {
  for (const p of room.players) {
    p.done = false;
    p.gained = 0;
    p.answer = null;
  }
  room.reveal = null;
  room.duration = DURATION[room.game];
  const item = room.deck[room.round % room.deck.length];
  switch (room.game) {
    case 'scramble':
      room.secret = { word: item.w };
      room.pub = { scrambled: scrambleWord(item.w), clue: item.clue };
      break;
    case 'trivia':
      room.secret = { ok: item.ok };
      room.pub = { cat: item.cat, q: item.q, options: item.a };
      break;
    case 'ladder':
      room.secret = { path: item.path };
      room.pub = { from: item.from, to: item.to };
      break;
    case 'npat':
      room.secret = {};
      room.pub = { letter: item };
      break;
    case 'act': {
      const actor = room.players[room.round % room.players.length];
      room.pub = { actorId: actor.id, log: [] };
      nextActPhrase(room);
      break;
    }
  }
  room.phase = 'playing';
  room.deadline = Date.now() + room.duration * 1000;
  if (room.timer) clearTimeout(room.timer);
  room.timer = setTimeout(() => endRound(room), room.duration * 1000 + 250);
  broadcast(room);
}

function endRound(room: Room) {
  if (room.phase !== 'playing') return;
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
  switch (room.game) {
    case 'scramble':
      room.reveal = { word: room.secret.word };
      break;
    case 'trivia': {
      const counts = [0, 0, 0, 0];
      for (const p of room.players) {
        const c = p.answer?.choice;
        if (typeof c !== 'number') continue;
        counts[c] += 1;
        if (c === room.secret.ok) {
          p.gained = 60 + Math.round(40 * (p.answer.left ?? 0));
          p.score += p.gained;
        }
      }
      room.reveal = { ok: room.secret.ok, counts };
      break;
    }
    case 'ladder': {
      const chains: Record<string, string[]> = {};
      for (const p of room.players) if (p.done) chains[p.id] = p.answer.chain;
      room.reveal = { path: room.secret.path, chains };
      break;
    }
    case 'npat': {
      const letter = String(room.pub.letter).toLowerCase();
      const norm = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
      const table: Record<string, Record<string, { text: string; pts: number }>> = {};
      for (const p of room.players) table[p.id] = {};
      for (const cat of NPAT_CATS) {
        const seen = new Map<string, number>();
        for (const p of room.players) {
          const t = norm(p.answer?.fields?.[cat]);
          if (t && t[0] === letter) seen.set(t, (seen.get(t) ?? 0) + 1);
        }
        for (const p of room.players) {
          const raw = String(p.answer?.fields?.[cat] ?? '').trim();
          const t = norm(raw);
          const valid = !!t && t[0] === letter;
          const pts = !valid ? 0 : seen.get(t) === 1 ? 10 : 5;
          table[p.id][cat] = { text: raw, pts };
          p.gained += pts;
        }
      }
      for (const p of room.players) p.score += p.gained;
      room.reveal = { table, stopper: room.secret.stopper ?? null };
      break;
    }
    case 'act':
      room.reveal = { log: room.pub.log, unfinished: room.secret?.phrase ?? null };
      break;
  }
  room.phase = 'reveal';
  room.deadline = null;
  broadcast(room);
}

function cleanFields(input: any): Record<string, string> {
  const out: Record<string, string> = {};
  for (const cat of NPAT_CATS) out[cat] = String(input?.[cat] ?? '').slice(0, 30);
  return out;
}

export function act(room: Room, pid: string, type: string, payload: any): ActionResult {
  const me = room.players.find((p) => p.id === pid);
  if (!me) return { ok: false, error: 'You are not in this room.' };
  const host = pid === room.hostId;
  room.touched = Date.now();

  switch (type) {
    case 'config': {
      if (!host || room.phase !== 'lobby') return { ok: false, error: 'Only the host can change the game.' };
      if (['scramble', 'trivia', 'ladder', 'npat', 'act'].includes(payload?.game)) room.game = payload.game;
      if ([3, 5, 10].includes(payload?.rounds)) room.rounds = payload.rounds;
      broadcast(room);
      return { ok: true };
    }
    case 'start': {
      if (!host || room.phase !== 'lobby') return { ok: false, error: 'Only the host can start.' };
      if (room.game === 'act' && room.players.length < 2) return { ok: false, error: 'Act It Out needs at least two players.' };
      startGame(room);
      return { ok: true };
    }
    case 'skip': {
      if (!host || room.phase !== 'playing') return { ok: false };
      endRound(room);
      return { ok: true };
    }
    case 'next': {
      if (!host || room.phase !== 'reveal') return { ok: false };
      if (room.round + 1 < room.total) {
        room.round += 1;
        startRound(room);
      } else {
        room.phase = 'final';
        room.pub = {};
        room.reveal = null;
        broadcast(room);
      }
      return { ok: true };
    }
    case 'again': {
      if (!host || room.phase !== 'final') return { ok: false };
      room.phase = 'lobby';
      for (const p of room.players) {
        p.score = 0;
        p.gained = 0;
        p.done = false;
      }
      broadcast(room);
      return { ok: true };
    }
  }

  if (room.phase !== 'playing') return { ok: false, error: 'The round is over.' };

  switch (`${room.game}:${type}`) {
    case 'scramble:answer': {
      if (me.done) return { ok: true };
      const guess = String(payload?.guess ?? '').toUpperCase().replace(/[^A-Z]/g, '');
      if (guess !== room.secret.word) return { ok: false, error: 'Not quite. Try again.' };
      me.done = true;
      me.gained = 40 + Math.round(60 * timeLeft(room));
      me.score += me.gained;
      if (everyoneDone(room)) endRound(room);
      else broadcast(room);
      return { ok: true, gained: me.gained };
    }
    case 'trivia:answer': {
      if (me.done) return { ok: false, error: 'You already answered.' };
      const choice = Number(payload?.choice);
      if (![0, 1, 2, 3].includes(choice)) return { ok: false };
      me.answer = { choice, left: timeLeft(room) };
      me.done = true;
      if (everyoneDone(room)) endRound(room);
      else broadcast(room);
      return { ok: true };
    }
    case 'ladder:answer': {
      if (me.done) return { ok: true };
      const chain: string[] = me.answer?.chain ?? [];
      const from: string = room.pub.from;
      const last = chain.length ? chain[chain.length - 1] : from;
      const w = String(payload?.word ?? '').trim().toLowerCase();
      if (!/^[a-z]+$/.test(w) || w.length !== last.length) return { ok: false, error: `Use a ${last.length}-letter word.` };
      let diff = 0;
      for (let i = 0; i < w.length; i++) if (w[i] !== last[i]) diff += 1;
      if (diff !== 1) return { ok: false, error: 'Change exactly one letter.' };
      if (w === from || chain.includes(w)) return { ok: false, error: 'You already used that word.' };
      if (!isWord(w)) return { ok: false, error: `"${w.toUpperCase()}" is not a word we know.` };
      if (chain.length >= 20) return { ok: false, error: 'That is a long road. Undo a few steps.' };
      me.answer = { chain: [...chain, w] };
      if (w === room.pub.to) {
        me.done = true;
        me.gained = 50 + Math.round(50 * timeLeft(room));
        me.score += me.gained;
        if (everyoneDone(room)) {
          endRound(room);
          return { ok: true, gained: me.gained };
        }
      }
      broadcast(room);
      return { ok: true };
    }
    case 'ladder:undo': {
      if (me.done) return { ok: false };
      const chain: string[] = me.answer?.chain ?? [];
      me.answer = { chain: chain.slice(0, -1) };
      broadcast(room);
      return { ok: true };
    }
    case 'npat:answer': {
      me.answer = { fields: cleanFields(payload?.fields) };
      return { ok: true };
    }
    case 'npat:stop': {
      const fields = cleanFields(payload?.fields);
      const letter = String(room.pub.letter).toLowerCase();
      const allGood = NPAT_CATS.every((c) => fields[c].trim().toLowerCase().startsWith(letter));
      if (!allGood) return { ok: false, error: `Fill all four with words starting with ${room.pub.letter}.` };
      me.answer = { fields };
      room.secret.stopper = me.id;
      endRound(room);
      return { ok: true };
    }
    case 'act:got': {
      if (room.pub.actorId !== pid) return { ok: false };
      const guesser = room.players.find((p) => p.id === payload?.by && p.id !== pid);
      if (!guesser) return { ok: false, error: 'Pick who guessed it.' };
      guesser.score += 100;
      guesser.gained += 100;
      me.score += 50;
      me.gained += 50;
      room.pub = { ...room.pub, log: [...room.pub.log, { phrase: room.secret.phrase, by: guesser.id }] };
      nextActPhrase(room);
      broadcast(room);
      return { ok: true };
    }
    case 'act:pass': {
      if (room.pub.actorId !== pid) return { ok: false };
      room.pub = { ...room.pub, log: [...room.pub.log, { phrase: room.secret.phrase, by: null }] };
      nextActPhrase(room);
      broadcast(room);
      return { ok: true };
    }
  }
  return { ok: false, error: 'That did not work.' };
}
