import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getRoom, normaliseCode } from '@/lib/rooms';
import { gameName } from '@/lib/types';

/**
 * Link-preview tags, so a room link pasted into WhatsApp shows the invite
 * picture and the room code instead of a bare URL.
 */
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const code = normaliseCode(decodeURIComponent((await params).code));
  const room = getRoom(code);
  if (!room) return { title: 'Oya' };

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const base = `${proto}://${host}`;
  const hostPlayer = room.players.find((p) => p.id === room.hostId);
  const title = `Join ${hostPlayer ? `${hostPlayer.name}'s` : 'the'} room on Oya · ${code}`;
  const description = `${gameName(room.game)} is up next. Tap to take a seat.`;
  const image = { url: `${base}/api/rooms/${code}/invite.png`, width: 1200, height: 630, alt: `Oya room ${code}` };

  return {
    title,
    description,
    openGraph: { title, description, url: `${base}/room/${code}`, siteName: 'Oya', images: [image], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  };
}

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
