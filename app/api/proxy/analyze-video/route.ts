import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    const aiRes = await fetch(`${process.env.AI_SERVER_URL}/analyze-video`, {
      method: 'POST',
      body: req.body,                  // stream directly — no buffering
      headers: { 'content-type': contentType },
      redirect: 'manual',
      // @ts-ignore — required for streaming request bodies in Node.js fetch
      duplex: 'half',
    });

    if (aiRes.status >= 300 && aiRes.status < 400) {
      console.error('REDIRECT FROM AI SERVER:', aiRes.status, aiRes.headers.get('location'));
      return NextResponse.json(
        { error: `Unexpected redirect from AI server (${aiRes.status})` },
        { status: 502 }
      );
    }

    if (!aiRes.ok) {
      return NextResponse.json(
        { error: 'AI server error' },
        { status: aiRes.status }
      );
    }

    const data = await aiRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('PROXY ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
