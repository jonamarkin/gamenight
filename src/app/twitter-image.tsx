import { siteCard } from '@/lib/cards';

export const alt = "Oya, let's play. Party games for wherever your people are.";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The picture shown when the Oya link is pasted into WhatsApp, X, iMessage and the rest. */
export default function Image() {
  return siteCard();
}
