import { createRoom } from '@/lib/rooms';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = createRoom(body?.name, body?.colour);
  if ('error' in result) return Response.json(result, { status: 400 });
  return Response.json(result);
}
