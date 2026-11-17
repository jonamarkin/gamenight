import Link from 'next/link';
import { JoinBox } from '@/components/JoinBox';
import { Logo } from '@/components/ui';

type TileSpec = [ch: string, bg: string, fg: string, rotate: number, lift: number];

const INK = 'var(--ink)';
const HERO: TileSpec[][] = [
  [
    ['L', 'var(--yellow)', INK, -7, 0],
    ['E', '#fff', INK, 4, -10],
    ['T', 'var(--violet)', '#fff', -3, 0],
    ['S', 'var(--coral)', INK, 6, 8],
  ],
  [
    ['P', 'var(--mint)', INK, 5, -6],
    ['L', '#fff', INK, -6, 0],
    ['A', 'var(--pink)', INK, 3, 10],
    ['Y', 'var(--blue)', INK, -4, 0],
  ],
];

function Tiles({ tiles, size }: { tiles: TileSpec[]; size: 'hero' | 'md' | 'sm' }) {
  return (
    <span className="lp-tiles" aria-hidden="true">
      {tiles.map(([ch, bg, fg, rot, lift], i) => (
        <span key={i} className={`lp-tile lp-tile-${size}`} style={{ background: bg, color: fg, transform: `rotate(${rot}deg) translateY(${lift}px)` }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

const WORDS: [string, string, string, number][] = [
  ['kelewele', 'var(--yellow)', INK, -2],
  ['trotro', '#fff', INK, 0],
  ['azonto', 'var(--violet)', '#fff', 2],
  ['harmattan', 'var(--mint)', INK, 0],
  ['waakye', 'var(--pink)', INK, -3],
  ['chale', 'var(--coral)', INK, 0],
  ['kente', '#fff', INK, 2],
  ['jollof', 'var(--blue)', INK, 0],
  ['adinkra', 'var(--yellow)', INK, -1],
  ['highlife', 'var(--mint)', INK, 3],
];

export default function Landing() {
  return (
    <div className="lp">
      <div className="lp-inner">
        <div className="lp-top">
          <header className="lp-header">
            <Link href="/" aria-label="Oya home" style={{ textDecoration: 'none' }}><Logo size={40} /></Link>
            <nav aria-label="Main" className="lp-nav">
              <a href="#games">Games</a>
              <a href="#how">How it works</a>
              <a href="#ways">Ways to play</a>
            </nav>
            <Link href="/play" className="btn btn-yellow lp-header-cta">Play free</Link>
          </header>

          <section className="lp-hero">
            <span className="lp-eyebrow">Party games for Ghana, and the whole continent next</span>
            <h1 className="display lp-h1">Oya, let's play. Wherever your people are.</h1>
            <p className="lp-lead">Word games, trivia, charades and the games you grew up on. Put it on the big screen in the sitting room, or play together from three cities apart.</p>
            <div className="lp-actions">
              <Link href="/play" className="btn btn-lg btn-yellow lp-cta">Start a room</Link>
              <JoinBox />
            </div>
            <p className="lp-note">Free. Nothing to install and no account needed.</p>
            <div className="lp-hero-tiles">
              {HERO.map((word, i) => <Tiles key={i} tiles={word} size="hero" />)}
            </div>
          </section>
        </div>

        <section id="games" className="lp-section">
          <h2 className="display lp-h2">Games that get the whole room shouting.</h2>
          <div className="lp-grid">
            <Link href="/play" className="lp-card lp-card-wide on-yellow">
              <span className="lp-card-text">
                <span className="display lp-card-big">Scramble</span>
                <span>Unscramble kelewele before your cousin does. Fastest fingers take the points.</span>
              </span>
              <Tiles size="md" tiles={[['O', '#fff', INK, -8, 0], ['R', 'var(--violet)', '#fff', 5, -6], ['T', '#fff', INK, -3, 0], ['T', 'var(--ink)', 'var(--yellow)', 6, 6], ['R', '#fff', INK, -5, 0], ['O', 'var(--coral)', INK, 4, -4]]} />
            </Link>

            <Link href="/play" className="lp-card on-coral">
              <svg aria-hidden="true" width="96" height="96" viewBox="0 0 88 88"><circle cx="44" cy="44" r="42" fill="#fff" /><circle cx="30" cy="36" r="6" fill="#15141B" /><circle cx="58" cy="36" r="6" fill="#15141B" /><path d="M26 60h36" stroke="#15141B" strokeWidth="6" strokeLinecap="round" /><path d="M35 54v12M44 54v12M53 54v12" stroke="#15141B" strokeWidth="4" strokeLinecap="round" /></svg>
              <span className="lp-card-text">
                <span className="display lp-card-title">Act It Out</span>
                <span>No talking. Everyone else guesses.</span>
              </span>
            </Link>

            <Link href="/play" className="lp-card on-mint">
              <svg aria-hidden="true" width="88" height="88" viewBox="0 0 72 72"><rect width="72" height="72" rx="22" fill="#15141B" /><path d="M25 28a11 11 0 1 1 16 9.800c-3 1.500-5 3.200-5 7.200" fill="none" stroke="#FFD23F" strokeWidth="5.500" strokeLinecap="round" /><circle cx="36" cy="56" r="3.600" fill="#FFD23F" /></svg>
              <span className="lp-card-text">
                <span className="display lp-card-title">Trivia</span>
                <span>Ghana, Africa, music, football.</span>
              </span>
            </Link>

            <Link href="/play" className="lp-card on-blue">
              <span className="lp-ladder" aria-hidden="true">
                <Tiles size="sm" tiles={[['C', '#fff', INK, -5, 0], ['A', '#fff', INK, 3, 0], ['T', '#fff', INK, -2, 0]]} />
                <svg width="28" height="20" viewBox="0 0 28 20" fill="none" stroke="#15141B" strokeWidth="3.500" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10h22M16 3l8 7-8 7" /></svg>
                <Tiles size="sm" tiles={[['D', 'var(--ink)', '#fff', 4, 0], ['O', 'var(--ink)', '#fff', -3, 0], ['G', 'var(--ink)', '#fff', 5, 0]]} />
              </span>
              <span className="lp-card-text">
                <span className="display lp-card-title">Word to Word</span>
                <span>Turn one word into another, one letter at a time.</span>
              </span>
            </Link>

            <Link href="/play" className="lp-card on-pink">
              <Tiles size="sm" tiles={[['N', '#fff', INK, -6, 0], ['P', 'var(--ink)', '#fff', 4, 0], ['A', '#fff', INK, -3, 0], ['T', 'var(--yellow)', INK, 7, 0]]} />
              <span className="lp-card-text">
                <span className="display lp-card-title">Name Place Animal Thing</span>
                <span>One letter. Fastest pen wins.</span>
              </span>
            </Link>

            <div className="lp-card panel">
              <span aria-hidden="true" className="row gap-12">
                <svg width="120" height="64" viewBox="0 0 120 64"><rect width="120" height="64" rx="22" fill="#32313F" /><circle cx="24" cy="20" r="9" fill="#FFD23F" /><circle cx="48" cy="20" r="9" fill="#FFD23F" /><circle cx="72" cy="20" r="9" fill="#FF6A5C" /><circle cx="96" cy="20" r="9" fill="#FFD23F" /><circle cx="24" cy="44" r="9" fill="#2ED3A0" /><circle cx="48" cy="44" r="9" fill="#FFD23F" /><circle cx="72" cy="44" r="9" fill="#FFD23F" /><circle cx="96" cy="44" r="9" fill="#fff" /></svg>
                <svg width="64" height="64" viewBox="0 0 72 72"><rect width="34" height="34" rx="10" fill="#FF6A5C" /><rect x="38" width="34" height="34" rx="10" fill="#2ED3A0" /><rect y="38" width="34" height="34" rx="10" fill="#6B4DF0" /><rect x="38" y="38" width="34" height="34" rx="10" fill="#FFD23F" /></svg>
              </span>
              <span className="lp-card-text">
                <span className="pill pill-soft" style={{ alignSelf: 'flex-start' }}>Coming soon</span>
                <span className="display lp-card-title">The classics</span>
                <span className="muted">Oware, Ludo, Spar and Most Likely To are on the way.</span>
              </span>
            </div>
          </div>
        </section>

        <section id="how" className="lp-section">
          <h2 className="display lp-h2">Playing in under a minute.</h2>
          <ol className="lp-steps">
            <li className="lp-step panel">
              <span aria-hidden="true" className="display lp-num on-yellow">1</span>
              <span className="lp-card-text">
                <span className="display lp-step-title">Start a room</span>
                <span className="muted">Type your name and pick a game. No sign-up, nothing to download.</span>
              </span>
            </li>
            <li className="lp-step panel">
              <span aria-hidden="true" className="display lp-num on-violet">2</span>
              <span className="lp-card-text">
                <span className="display lp-step-title">Share the code</span>
                <span className="muted">Drop your room code or invite picture in the WhatsApp group. Friends join with one tap.</span>
              </span>
            </li>
            <li className="lp-step panel">
              <span aria-hidden="true" className="display lp-num on-mint">3</span>
              <span className="lp-card-text">
                <span className="display lp-step-title">Play together</span>
                <span className="muted">Scores update live for everyone. Share the results when it's over, and keep the bragging rights.</span>
              </span>
            </li>
          </ol>
        </section>

        <section id="ways" className="lp-section">
          <h2 className="display lp-h2">One room, three ways to play.</h2>
          <div className="lp-grid">
            <div className="lp-feature lp-feature-wide on-mint">
              <div className="lp-card-text" style={{ flex: '1 1 340px' }}>
                <h3 className="display lp-feature-big">Put it on the big screen</h3>
                <p>All in one place? Open your room on a TV, laptop or projector. The question goes up for everyone and the scores sit beside it.</p>
              </div>
              <svg aria-hidden="true" viewBox="0 0 420 240" className="lp-tv">
                <rect x="20" width="300" height="190" rx="24" fill="#15141B" />
                <rect x="56" y="68" width="48" height="56" rx="14" fill="#FFD23F" /><rect x="114" y="62" width="48" height="56" rx="14" fill="#fff" /><rect x="172" y="70" width="48" height="56" rx="14" fill="#FF6A5C" /><rect x="230" y="64" width="48" height="56" rx="14" fill="#FFD23F" />
                <rect x="56" y="146" width="222" height="10" rx="5" fill="#32313F" /><rect x="56" y="146" width="130" height="10" rx="5" fill="#2ED3A0" />
                <rect x="56" y="30" width="90" height="14" rx="7" fill="#6B4DF0" />
                <path d="M130 190v24M210 190v24M100 216h140" stroke="#15141B" strokeWidth="8" strokeLinecap="round" />
                <rect x="340" y="96" width="64" height="118" rx="16" fill="#15141B" /><rect x="350" y="150" width="44" height="50" rx="10" fill="#FFD23F" /><rect x="350" y="110" width="44" height="10" rx="5" fill="#6B4DF0" />
              </svg>
            </div>

            <div className="lp-feature on-violet">
              <span aria-hidden="true" className="lp-phones">
                <span style={{ background: 'var(--yellow)', transform: 'rotate(-8deg)' }} />
                <span style={{ background: '#fff', transform: 'translateY(-8px)' }} />
                <span style={{ background: 'var(--pink)', transform: 'rotate(6deg)' }} />
                <span style={{ background: 'var(--mint)', transform: 'rotate(-4deg) translateY(-6px)' }} />
              </span>
              <div className="lp-card-text">
                <h3 className="display lp-feature-title">Everyone on their own phone</h3>
                <p>For the big sitting-room crowd, or friends spread across Accra, Kumasi and abroad.</p>
              </div>
            </div>

            <div className="lp-feature panel">
              <span aria-hidden="true" className="row gap-12">
                <span className="lp-host-phone" />
                <svg width="72" height="24" viewBox="0 0 72 24" fill="none" stroke="#FFD23F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h64M56 3l10 9-10 9" /></svg>
                <span className="lp-team" style={{ background: 'var(--yellow)' }} />
                <span className="lp-team" style={{ background: 'var(--pink)' }} />
                <span className="lp-team" style={{ background: 'var(--blue)' }} />
              </span>
              <div className="lp-card-text">
                <h3 className="display lp-feature-title">Or let a host run the show</h3>
                <p className="muted">Split into teams and shout the answers. The host holds the phone and awards the points.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-words">
          <div className="lp-card-text" style={{ flex: '1 1 380px', gap: 16 }}>
            <h2 className="display lp-h2">Words from home.</h2>
            <p className="lp-lead" style={{ maxWidth: 460 }}>The clues, questions and in-jokes are written for us. We are starting in Ghana, with more of Africa on the way.</p>
          </div>
          <div aria-hidden="true" className="lp-chips">
            {WORDS.map(([w, bg, fg, rot]) => (
              <span key={w} className="display" style={{ background: bg, color: fg, transform: `rotate(${rot}deg)` }}>{w}</span>
            ))}
          </div>
        </section>

        <div className="lp-end">
          <section className="lp-final on-yellow">
            <h2 className="display lp-final-h">Call the crew. It's time to play.</h2>
            <Link href="/play" className="btn btn-lg btn-ink lp-cta">Play in your browser</Link>
          </section>
          <footer className="lp-footer">
            <Logo size={28} />
            <span>Made in Ghana</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
