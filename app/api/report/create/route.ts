import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 🔍 Completely Overpass-Powered Classifier (Strict Validation - No Hardcoded Defaults)
async function classifyRoadDetails(lat: number, lng: number): Promise<{ authority: string; state: string | null }> {
  let detectedState: string | null = null;
  let authority = 'PWD';

  try {
    // SINGLE SUPER QUERY: OSM database se area boundary aur road tags dono ek sath nikalna
    const query = `[out:json];
      (
        way(around:25,${lat},${lng})[highway];
        is_in(${lat},${lng})->.a;
        area.a[admin_level=4];
      );
      out tags;`;
    
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const overpassRes = await fetch(url, { headers: { 'User-Agent': 'RoadWatchCivicAppV1' } });
    const overpassData = await overpassRes.json();

    if (overpassData.elements && overpassData.elements.length > 0) {
      // 1. Extract State Name from administrative boundary levels
      const stateElement = overpassData.elements.find((el: any) => el.type === 'area' || (el.tags && el.tags.admin_level === '4'));
      const roadElement = overpassData.elements.find((el: any) => el.type === 'way' && el.tags && el.tags.highway);

      if (stateElement && stateElement.tags && stateElement.tags.name) {
        detectedState = stateElement.tags.name;
        console.log(`🌍 Overpass Super-Query resolved State: ${detectedState}`);
      } else {
        // Fallback matching logic for nested geographic attributes
        for (const el of overpassData.elements) {
          if (el.tags && el.tags.boundary === 'administrative' && el.tags.admin_level === '4') {
            detectedState = el.tags.name;
            break;
          }
        }
      }

      // 2. Extract Road Governing Body Architecture
      if (roadElement && roadElement.tags) {
        const tags = roadElement.tags;
        const ref = tags.ref ? tags.ref.toUpperCase() : '';
        const highway = tags.highway || '';

        if (ref.startsWith('NH') || highway === 'motorway' || highway === 'trunk') {
          authority = 'NHAI';
        } else if (ref.startsWith('SH') || ref.includes('MDR')) {
          authority = 'STATE_HIGHWAY';
        } else if (['residential', 'tertiary', 'service', 'living_street'].includes(highway)) {
          authority = 'Municipal';
        } else {
          authority = 'PWD';
        }
      }
    }
  } catch (err) {
    console.error('Error in Overpass infrastructure profiling:', err);
  }

  // 🎯 Clean and strict return: No fake defaults like "Delhi" or "Assam"
  return { authority, state: detectedState };
}

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

    
    const { authority, state } = await classifyRoadDetails(lat, lng);


    if (!state) {
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
          governing_body: authority, 
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
      message: "Report successfully processed.",
      report: reportData,
      roadAuthority: authority 
    });

  } catch (error: any) {
    console.error('Server Intake Handler Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}