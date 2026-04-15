import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, total_frames, total_potholes, potholes } = body;

    if (!filename || !Array.isArray(potholes)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('video_analyses')
      .insert({ filename, total_frames, total_potholes, potholes })
      .select()
      .single();

    if (error) {
      console.error('DB INSERT ERROR:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('SERVER ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
