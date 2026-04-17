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

  return new Response(aiRes.body, {
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
}
