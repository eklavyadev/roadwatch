import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const aiRes = await fetch(`${process.env.AI_SERVER_URL}/analyze-video`, {
      method: 'POST',
      body: formData,
    });

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
