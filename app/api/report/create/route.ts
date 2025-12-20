import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const image = formData.get('image') as File | null;
    const location = formData.get('location') as string | null;
    const lat = Number(formData.get('lat'));
    const lng = Number(formData.get('lng'));
    const severity = Number(formData.get('severity'));

    if (!image || !location || !lat || !lng || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    /* ---------- UPLOAD IMAGE ---------- */
    const fileName = `${Date.now()}-${image.name}`;

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, image);

    if (uploadError) {
      console.error(uploadError);
      return NextResponse.json(
        { error: 'Image upload failed' },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from('reports')
      .getPublicUrl(fileName);

    /* ---------- INSERT ROW ---------- */
    const { error: insertError } = await supabase
      .from('reports')
      .insert({
        image_url: data.publicUrl,
        location,
        lat,
        lng,
        severity,
        status: 'pending',
        governing_body: 'Municipal',
      });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        { error: 'Database insert failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
