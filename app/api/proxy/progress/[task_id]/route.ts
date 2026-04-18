export const runtime  = 'nodejs';
export const maxDuration = 30;

const decoder = new TextDecoder();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ task_id: string }> }
) {
  const { task_id } = await params;

  try {
    // Connect to AI server SSE, read exactly ONE event, return it as plain JSON.
    // This avoids SSE buffering issues through Cloudflare tunnels — the browser
    // polls this endpoint every 800 ms instead of keeping a streaming connection.
    const aiRes = await fetch(
      `${process.env.AI_SERVER_URL}/progress/${task_id}`
    );

    const reader = aiRes.body!.getReader();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are "data: {...}\n\n"
      const match = buffer.match(/data:\s*(.+)\n/);
      if (match) {
        reader.cancel(); // close upstream connection
        const payload = JSON.parse(match[1]);
        return Response.json(payload);
      }
    }

    return Response.json({ status: 'error', error: 'No data from AI server' }, { status: 502 });
  } catch (err: any) {
    return Response.json({ status: 'error', error: err.message }, { status: 500 });
  }
}
