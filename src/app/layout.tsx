import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import { siteBase } from '@/lib/site';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-display' });
const body = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

const TITLE = 'Oya · Party games for wherever your people are';
const DESCRIPTION = 'Scramble, Trivia, Word to Word, Name Place Animal Thing and Act It Out. Start a room, share the code, and play from your phones or up on the big screen.';

/** Site-wide tags. The picture for link previews comes from opengraph-image.tsx. */
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await siteBase()),
    title: { default: TITLE, template: '%s · Oya' },
    description: DESCRIPTION,
    applicationName: 'Oya',
    openGraph: { title: TITLE, description: DESCRIPTION, siteName: 'Oya', type: 'website', url: '/' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0c13',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
