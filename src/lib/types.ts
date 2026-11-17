export type GameId = 'scramble' | 'trivia' | 'ladder' | 'npat' | 'act';
export type Phase = 'lobby' | 'playing' | 'reveal' | 'final';

export interface PlayerView {
  id: string;
  name: string;
  colour: string;
  score: number;
  /** Points gained in the current or just-finished round. */
  gained: number;
  done: boolean;
  connected: boolean;
}

/** What the server sends each client. `mine` holds that player's private data. */
export interface RoomView {
  code: string;
  hostId: string;
  you: string | null;
  phase: Phase;
  game: GameId;
  rounds: number;
  round: number;
  total: number;
  deadline: number | null;
  duration: number;
  now: number;
  players: PlayerView[];
  pub: Record<string, any>;
  mine: Record<string, any>;
  reveal: Record<string, any> | null;
}

export const GAMES: { id: GameId; name: string; blurb: string; colour: string }[] = [
  { id: 'scramble', name: 'Scramble', blurb: 'Unscramble the word before your crew does.', colour: '#FFD23F' },
  { id: 'trivia', name: 'Trivia', blurb: 'Ghana, Africa, music, football.', colour: '#2ED3A0' },
  { id: 'ladder', name: 'Word to Word', blurb: 'Turn one word into another, one letter at a time.', colour: '#8FB8FF' },
  { id: 'npat', name: 'Name Place Animal Thing', blurb: 'One letter. Fastest pen wins.', colour: '#FF9FCF' },
  { id: 'act', name: 'Act It Out', blurb: 'No talking. Everyone else guesses.', colour: '#FF6A5C' },
];

export const COLOURS = ['#FF6A5C', '#FFD23F', '#2ED3A0', '#FF9FCF', '#8FB8FF', '#FFFFFF'];

export function gameName(id: GameId): string {
  return GAMES.find((g) => g.id === id)?.name ?? id;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
