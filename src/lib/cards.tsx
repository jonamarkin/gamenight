// Share images, drawn on the server so a result or an invite can be sent as a
// picture instead of a line of text.

import { readFile } from 'fs/promises';
import path from 'path';
import { ImageResponse } from 'next/og';
import { gameName, initials, type RoomView } from './types';

const INK = '#15141B';
const GROUND = '#0D0C13';
const PANEL = '#16151E';
const TEXT = '#F6F5FB';
const MUTED = '#B0AEC0';
const YELLOW = '#FFD23F';
const VIOLET = '#6B4DF0';
const CORAL = '#FF6A5C';
const MINT = '#2ED3A0';
const PINK = '#FF9FCF';
const BLUE = '#8FB8FF';

type Font = { name: string; data: Buffer; weight: 600 | 700 | 800; style: 'normal' };
let fontCache: Promise<Font[]> | null = null;

function fonts(): Promise<Font[]> {
  if (!fontCache) {
    const dir = path.join(process.cwd(), 'node_modules', '@fontsource');
    const load = (file: string) => readFile(path.join(dir, file));
    fontCache = Promise.all([
      load('bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff'),
      load('inter/files/inter-latin-600-normal.woff'),
      load('inter/files/inter-latin-700-normal.woff'),
    ]).then(([display, body600, body700]) => [
      { name: 'Display', data: display, weight: 800, style: 'normal' },
      { name: 'Body', data: body600, weight: 600, style: 'normal' },
      { name: 'Body', data: body700, weight: 700, style: 'normal' },
    ]);
    fontCache.catch(() => {
      fontCache = null;
    });
  }
  return fontCache;
}

async function render(node: React.ReactElement, width: number, height: number): Promise<Response> {
  return new ImageResponse(node, {
    width,
    height,
    fonts: await fonts(),
    headers: { 'Cache-Control': 'no-store' },
  });
}

function Brand({ colour, size = 44 }: { colour: string; size?: number }) {
  const box = size * 1.5;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <svg width={box} height={box} viewBox="0 0 64 64">
        <g transform="rotate(-6 32 32)">
          <rect x="5" y="9" width="54" height="54" rx="16" fill={colour === INK ? INK : '#B8900F'} />
          <rect x="5" y="3" width="54" height="54" rx="16" fill={colour === INK ? '#FFFFFF' : YELLOW} />
          <circle cx="32" cy="29" r="12.500" fill="none" stroke={INK} strokeWidth="8.500" />
          <path d="M19 36 L13.500 49 L27 43.500 Z" fill={INK} />
        </g>
      </svg>
      <div style={{ display: 'flex', marginLeft: size * 0.14, fontFamily: 'Display', fontWeight: 800, fontSize: size * 1.3, letterSpacing: -3, lineHeight: 1, color: colour }}>ya</div>
    </div>
  );
}

function Tile({ ch, bg, fg = INK, rotate, size = 120 }: { ch: string; bg: string; fg?: string; rotate: number; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: size, height: size * 1.14, marginLeft: size * 0.1, borderRadius: size * 0.28, background: bg, color: fg, fontFamily: 'Display', fontWeight: 800, fontSize: size * 0.56, transform: `rotate(${rotate}deg)` }}>
      {ch}
    </div>
  );
}

/** Portrait card with the standings, for sharing after a game. */
export function resultCard(view: RoomView, site: string): Promise<Response> {
  const byTeam = view.teams.length > 0;
  const ranked: { id: string; name: string; colour: string; score: number }[] = byTeam
    ? [...view.teams].sort((a, b) => b.score - a.score)
    : view.players.filter((p) => !(view.mode === 'host' && p.id === view.hostId)).sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const tie = ranked.length > 1 && ranked[1].score === top.score;
  const finished = view.phase === 'final';
  const headline = !top ? 'Oya!' : tie ? 'A tie at the top!' : finished ? `${top.name} takes it!` : `${top.name} is in front.`;
  const shown = ranked.slice(0, 5);
  // With teams, the best individual players are listed under the team scores.
  const stars = byTeam && view.mode !== 'host'
    ? view.players.filter((p) => p.score > 0).sort((a, b) => b.score - a.score).slice(0, view.teams.length === 3 ? 3 : 4)
    : [];
  const more = ranked.length - shown.length;
  const rounds = `${view.total} ${view.game === 'act' ? 'TURNS' : 'ROUNDS'}`;

  return render(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: 56, background: GROUND, color: TEXT, fontFamily: 'Body', fontWeight: 600 }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 440, padding: 56, borderRadius: 64, background: YELLOW, color: INK, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 64, top: 60, width: 64, height: 64, borderRadius: 20, background: VIOLET, transform: 'rotate(-18deg)' }} />
        <div style={{ position: 'absolute', left: 250, top: 64, width: 52, height: 52, borderRadius: 26, background: CORAL }} />
        <div style={{ position: 'absolute', right: 80, top: 56, width: 76, height: 76, borderRadius: 22, background: MINT, transform: 'rotate(22deg)' }} />
        <div style={{ position: 'absolute', right: 260, top: 56, width: 44, height: 44, borderRadius: 14, background: PINK, transform: 'rotate(-12deg)' }} />
        <div style={{ position: 'absolute', right: 210, top: 100, width: 36, height: 36, borderRadius: 18, background: '#FFFFFF' }} />
        <div style={{ position: 'absolute', left: 470, top: 70, width: 40, height: 40, borderRadius: 20, background: INK }} />
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>{`${gameName(view.game).toUpperCase()} · ${rounds}`}</div>
        <div style={{ display: 'flex', marginTop: 12, fontFamily: 'Display', fontWeight: 800, fontSize: headline.length > 26 ? 74 : headline.length > 18 ? 92 : 116, lineHeight: 0.95, letterSpacing: -4 }}>{headline}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 12 }}>
        {shown.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', height: 104, marginTop: 16, padding: '0 40px 0 28px', borderRadius: 40, background: PANEL }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: 52, fontFamily: 'Display', fontWeight: 800, fontSize: 40, color: i === 0 ? YELLOW : MUTED }}>{String(i + 1)}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 68, height: 68, marginLeft: 16, borderRadius: 34, background: p.colour, color: INK, fontSize: 24, fontWeight: 700 }}>{byTeam ? '' : initials(p.name)}</div>
            <div style={{ display: 'flex', flex: 1, marginLeft: 24, fontSize: 38, fontWeight: 700 }}>{p.name}</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontWeight: 800, fontSize: 52 }}>{String(p.score)}</div>
          </div>
        ))}
        {stars.length > 0 && <div style={{ display: 'flex', marginTop: 28, marginLeft: 28, fontSize: 24, fontWeight: 700, letterSpacing: 3, color: MUTED }}>TOP PLAYERS</div>}
        {stars.map((p) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', height: 80, marginTop: 12, padding: '0 40px 0 28px', borderRadius: 32, background: PANEL }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 26, background: p.colour, color: INK, fontSize: 19, fontWeight: 700 }}>{initials(p.name)}</div>
            <div style={{ display: 'flex', flex: 1, marginLeft: 20, fontSize: 30, fontWeight: 700 }}>{p.name}</div>
            <div style={{ display: 'flex', fontFamily: 'Display', fontWeight: 800, fontSize: 38 }}>{String(p.score)}</div>
          </div>
        ))}
        {more > 0 && <div style={{ display: 'flex', marginTop: 20, marginLeft: 28, fontSize: 28, color: MUTED }}>{`and ${more} more at the table`}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <Brand colour={TEXT} />
        <div style={{ display: 'flex', fontSize: 28, color: MUTED }}>{`Play at ${site}`}</div>
      </div>
    </div>,
    1080,
    1350,
  );
}

/** Landscape card with the room code, for inviting people and for link previews. */
export function inviteCard(view: RoomView, site: string): Promise<Response> {
  const host = view.players.find((p) => p.id === view.hostId);
  return render(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 56, background: YELLOW, color: INK, fontFamily: 'Body', fontWeight: 600 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 24, background: INK, color: '#FFFFFF', fontSize: 24, fontWeight: 700, letterSpacing: 2 }}>
            {`OYA, LET'S PLAY · ${gameName(view.game).toUpperCase()}`}
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 40, fontWeight: 700 }}>{`${host?.name ?? 'Your friend'} has a seat for you.`}</div>
        </div>
        <div style={{ display: 'flex', marginTop: 8 }}>
          <Tile ch="P" bg="#FFFFFF" rotate={-7} size={84} />
          <Tile ch="L" bg={VIOLET} fg="#FFFFFF" rotate={5} size={84} />
          <Tile ch="A" bg={CORAL} rotate={-3} size={84} />
          <Tile ch="Y" bg={BLUE} rotate={7} size={84} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 30, fontWeight: 700, letterSpacing: 3 }}>JOIN WITH CODE</div>
        <div style={{ display: 'flex', fontFamily: 'Display', fontWeight: 800, fontSize: 176, lineHeight: 1, letterSpacing: -6 }}>{view.code}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand colour={INK} size={38} />
        <div style={{ display: 'flex', fontSize: 28, fontWeight: 700 }}>{`${site}/room/${view.code}`}</div>
      </div>
    </div>,
    1200,
    630,
  );
}

/** Landscape card for the site itself: the picture shown when the Oya link is shared. */
export function siteCard(): Promise<Response> {
  return render(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 56, background: GROUND, color: TEXT, fontFamily: 'Body', fontWeight: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Brand colour={TEXT} size={44} />
        <div style={{ display: 'flex', padding: '12px 26px', borderRadius: 28, background: YELLOW, color: INK, fontSize: 26, fontWeight: 700 }}>Free to play in your browser</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 620 }}>
          <div style={{ display: 'flex', fontFamily: 'Display', fontWeight: 800, fontSize: 112, lineHeight: 0.94, letterSpacing: -5 }}>{"Oya, let's play."}</div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: 34, lineHeight: 1.25, color: MUTED }}>Party games for wherever your people are.</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex' }}>
            <Tile ch="L" bg={YELLOW} rotate={-7} size={92} />
            <Tile ch="E" bg="#FFFFFF" rotate={4} size={92} />
            <Tile ch="T" bg={VIOLET} fg="#FFFFFF" rotate={-3} size={92} />
            <Tile ch="S" bg={CORAL} rotate={6} size={92} />
          </div>
          <div style={{ display: 'flex', marginTop: 22 }}>
            <Tile ch="P" bg={MINT} rotate={5} size={92} />
            <Tile ch="L" bg="#FFFFFF" rotate={-6} size={92} />
            <Tile ch="A" bg={PINK} rotate={3} size={92} />
            <Tile ch="Y" bg={BLUE} rotate={-4} size={92} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: MUTED }}>Scramble · Trivia · Word to Word · Name Place Animal Thing · Act It Out</div>
    </div>,
    1200,
    630,
  );
}
