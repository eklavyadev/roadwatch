export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const { task_id } = await params;

  const aiRes = await fetch(
    `${process.env.AI_SERVER_URL}/progress/${task_id}`
  );

  // Explicitly pump each chunk so events are flushed to the browser immediately
  // instead of being buffered by the Node.js response stream
  const stream = new ReadableStream({
    async start(controller) {
      const reader = aiRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (e) {
        console.error('SSE PROXY ERROR:', e);
      } finally {
        controller.close();
      }
    },
    cancel() {
      // browser disconnected — nothing to clean up on this side
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
