import { getRoom, isMember, subscribe } from '@/lib/rooms';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Server-sent events stream of the room state. With `?pid=` the stream is a
 * player's; without it the stream is a spectator's (the big screen).
 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const room = getRoom(code);
  if (!room) return new Response('No such room', { status: 404 });
  const pid = new URL(req.url).searchParams.get('pid');
  if (pid && !isMember(room, pid)) return new Response('Not in this room', { status: 403 });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const close = () => {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      unsubscribe = subscribe(room, pid, send);
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          close();
        }
      }, 20000);
      req.signal.addEventListener('abort', () => {
        close();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
