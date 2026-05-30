import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createLocalReport, getLocalReports, saveLocalImage } from '@/lib/localDb';

const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = isSupabaseConfigured
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

const MAX_SIZE_MB = 10;
const DUPLICATE_RADIUS_METERS = 50;

/* ---------- SAFE FILE NAME ---------- */
function generateSafeFileName(file: File) {
  const ext = file.type.split('/')[1] || 'jpg';
  return `report-${Date.now()}-${crypto.randomUUID()}.${ext}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    /* ---------- EXTRACT FIELDS ---------- */
    const image = formData.get('image') as File | null;
    const location = formData.get('location') as string | null;

    const lat = Math.abs(Number(formData.get('lat')));
    const lng = Math.abs(Number(formData.get('lng')));

    const type = formData.get('type') as string | null;
    const impactLevel = Number(formData.get('impact_level'));
    const roadCategory = (formData.get('road_category') as string) || 'Municipal';

    /* ---------- BASIC VALIDATION ---------- */
    if (
      !image ||
      !location ||
      !type ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      Number.isNaN(impactLevel)
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    if (![1, 2, 3].includes(impactLevel)) {
      return NextResponse.json(
        { error: 'Invalid impact level' },
        { status: 400 }
      );
    }

    /* ---------- FILE SIZE CHECK ---------- */
    if (image.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Please upload an image smaller than 10MB' },
        { status: 413 }
      );
    }

    /* ---------- FALLBACK OR EXECUTION ---------- */
    if (!isSupabaseConfigured || !supabase) {
      return await handleLocalCreate(image, location, lat, lng, type, impactLevel, roadCategory);
    }

    try {
      /* ---------- SUPABASE EXECUTION ---------- */
      /* ---------- DUPLICATE CHECK (200m) ---------- */
      const { data: nearbyReports, error: duplicateError } =
        await supabase.rpc('check_nearby_reports', {
          input_lat: lat,
          input_lng: lng,
          radius_meters: DUPLICATE_RADIUS_METERS,
        });

      if (duplicateError) {
        console.error('DUPLICATE CHECK ERROR, FALLING BACK TO LOCAL DB:', duplicateError);
        return await handleLocalCreate(image, location, lat, lng, type, impactLevel, roadCategory);
      }

      if (nearbyReports && nearbyReports.length > 0) {
        return NextResponse.json(
          {
            error:
              'A similar issue has already been reported nearby. Please check the map for existing reports.',
          },
          { status: 409 }
        );
      }

      /* ---------- IMAGE UPLOAD ---------- */
      const fileName = generateSafeFileName(image);

      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(fileName, image, {
          contentType: image.type,
        });

      if (uploadError) {
        console.error('UPLOAD ERROR, FALLING BACK TO LOCAL DB:', uploadError);
        return await handleLocalCreate(image, location, lat, lng, type, impactLevel, roadCategory);
      }

      const { data: publicUrlData } = supabase.storage
        .from('reports')
        .getPublicUrl(fileName);

      /* ---------- INSERT REPORT ---------- */
      const { data: inserted, error: insertError } = await supabase
        .from('reports')
        .insert({
          image_url: publicUrlData.publicUrl,
          location,
          lat,
          lng,
          type,                // ✅ NEW
          impact_level: impactLevel, // ✅ NEW
          status: 'pending',
          governing_body: roadCategory,
        })
        .select()
        .single();

      if (insertError || !inserted) {
        console.error('DB ERROR, FALLING BACK TO LOCAL DB:', insertError);
        return await handleLocalCreate(image, location, lat, lng, type, impactLevel, roadCategory);
      }

      /* ---------- 🔥 AI TRIGGER (NON-BLOCKING) ---------- */
      fetch(`${process.env.AI_SERVER_URL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: inserted.id,
          imageUrl: publicUrlData.publicUrl,
          type,
          impact_level: impactLevel,
        }),
      }).catch((err) => {
        console.error('AI TRIGGER FAILED:', err);
      });

      /* ---------- FINAL RESPONSE ---------- */
      return NextResponse.json({ success: true });
    } catch (supabaseErr: any) {
      console.error('SUPABASE CREATE EXCEPTION, FALLING BACK TO LOCAL DB:', supabaseErr);
      return await handleLocalCreate(image, location, lat, lng, type, impactLevel, roadCategory);
    }
  } catch (err) {
    console.error('SERVER ERROR:', err);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}

async function handleLocalCreate(
  image: File,
  location: string,
  lat: number,
  lng: number,
  type: string,
  impactLevel: number,
  roadCategory: string
) {
  try {
    // 1. Simple local duplicate check (50 meters ~ 0.00045 deg)
    const localReports = getLocalReports();
    const isDuplicate = localReports.some((r) => {
      const dLat = r.lat - lat;
      const dLng = r.lng - lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      return dist < 0.00045; // roughly 50 meters
    });

    if (isDuplicate) {
      return NextResponse.json(
        {
          error:
            'A similar issue has already been reported nearby. Please check the map for existing reports.',
        },
        { status: 409 }
      );
    }

    // 2. Save Image locally on disk
    const imageUrl = await saveLocalImage(image);

    // 3. Create Report in local database
    const inserted = await createLocalReport({
      image_url: imageUrl,
      location,
      lat,
      lng,
      type: type as any,
      impact_level: impactLevel,
      governing_body: roadCategory,
    });

    // 4. Trigger AI Service if configured
    if (process.env.AI_SERVER_URL) {
      fetch(`${process.env.AI_SERVER_URL}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: inserted.id,
          imageUrl: imageUrl,
          type,
          impact_level: impactLevel,
        }),
      }).catch((err) => {
        console.error('AI TRIGGER FAILED:', err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('LOCAL CREATE ERROR:', err);
    return NextResponse.json(
      { error: 'Failed to create local report fallback', details: err.message },
      { status: 500 }
    );
  }
}


