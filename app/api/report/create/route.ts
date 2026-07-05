import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const imageFile = formData.get('image') as File | null;
    const location = formData.get('location') as string;
    const latStr = formData.get('lat') as string;
    const lngStr = formData.get('lng') as string;
    const type = formData.get('type') as string;
    const impactLevelStr = formData.get('impact_level') as string;

    if (!imageFile || !location || !latStr || !lngStr || !type || !impactLevelStr) {
      return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const parsedImpact = parseInt(impactLevelStr, 10) || 2;

    // 🎯 STRICT STATE DETECTION: Resolve directly from coordinates only
    let detectedState: string | null = null;

    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'RoadWatch-App' } }
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.address && geocodeData.address.state) {
          detectedState = geocodeData.address.state;
          console.log(`🌍 Geocoder successfully resolved State: ${detectedState}`);
        }
      } catch (geocodeErr) {
        console.error("Failed to reverse geocode state name backend:", geocodeErr);
      }
    }

    // Reject processing if the state could not be extracted via GPS
    if (!detectedState) {
      return NextResponse.json(
        { error: 'Could not accurately identify jurisdiction state from GPS coordinates.' },
        { status: 422 }
      );
    }

    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;
    const imageArrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    const { error: storageError } = await supabase.storage
      .from('reports') 
      .upload(fileName, imageBuffer, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (storageError) {
      console.error('Supabase Storage Error:', storageError);
      return NextResponse.json({ error: 'Failed to upload image asset' }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from('reports') 
      .getPublicUrl(fileName);

    const imageUrl = publicUrlData.publicUrl;

    const { data: reportData, error: dbError } = await supabase
      .from('reports')
      .insert([
        {
          type,
          impact_level: parsedImpact,
          severity: parsedImpact, 
          location,
          lat,
          lng,
          image_url: imageUrl,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase Database Error:', dbError);
      return NextResponse.json({ error: 'Failed to save report record' }, { status: 500 });
    }

    return NextResponse.json({
      message: "Report successfully queued for admin screening verification.",
      report: reportData
    });

  } catch (error: any) {
    console.error('Server Intake Handler Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}