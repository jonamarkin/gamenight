import { joinRoom } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const result = joinRoom(code, body?.name, body?.colour);
  if ('error' in result) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
