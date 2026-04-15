import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('video_analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('DB ERROR:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error('SERVER ERROR:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
