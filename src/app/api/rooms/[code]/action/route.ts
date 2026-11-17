import { act, getRoom } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return Response.json({ ok: false, error: 'This room has ended.' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  return Response.json(act(room, String(body?.pid ?? ''), String(body?.type ?? ''), body?.payload));
}
