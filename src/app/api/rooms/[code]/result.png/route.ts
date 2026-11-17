import { resultCard } from '@/lib/cards';
import { getRoom, viewFor } from '@/lib/rooms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return new Response('No such room', { status: 404 });
  return resultCard(viewFor(room, null), new URL(req.url).host);
}
