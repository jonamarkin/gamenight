import { getRoom, isMember } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

/** Lightweight check: does the room exist, and is this player in it? */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return Response.json({ exists: false }, { status: 404 });
  const pid = new URL(req.url).searchParams.get('pid');
  return Response.json({ exists: true, code: room.code, member: isMember(room, pid), players: room.players.length });
}
