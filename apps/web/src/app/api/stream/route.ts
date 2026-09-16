import { getDashboardBundle } from "@/lib/bundle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        if (closed) return;
        try {
          const bundle = await getDashboardBundle();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(bundle)}\n\n`)
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`
            )
          );
        }
      };
      await send();
      const id = setInterval(send, 60_000);
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: ping\n\n`));
      }, 20_000);
      // @ts-expect-error attach for cancel
      controller._cleanup = () => {
        clearInterval(id);
        clearInterval(heartbeat);
      };
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
