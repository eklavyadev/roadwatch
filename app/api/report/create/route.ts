import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs'; 
import path from 'path';

// Initialize Supabase using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to load and verify the state exists within test.json structure
async function getAuthorityEmailByState(stateName: string): Promise<string | string[]> {
  const DEFAULT_BACKUP_EMAIL = 'aayushukla007@gmail.com';
  
  try {
    const filePath = path.join(process.cwd(), 'test.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const authorities = JSON.parse(fileContent);

    const match = authorities.find(
      (item: any) => item.state_ut.trim().toLowerCase() === stateName.trim().toLowerCase()
    );

    if (match && match.office_email) {
      console.log(`🎯 Checked test.json registry context for ${stateName}`);
      return match.office_email;
    }
  } catch (err) {
    console.error('Error verifying metadata against test.json registry:', err);
  }

  return DEFAULT_BACKUP_EMAIL;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    // 1. Extract values sent from the frontend form
    const imageFile = formData.get('image') as File | null;
    const location = formData.get('location') as string;

    console.log("🔍 RAW LOCATION STRING RECEIVED:", location);

    const latStr = formData.get('lat') as string;
    const lngStr = formData.get('lng') as string;
    const type = formData.get('type') as string;
    const impactLevel = formData.get('impact_level') as string;

    if (!imageFile || !location || !latStr || !lngStr || !type || !impactLevel) {
      return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    // 2. Extract State Name from Location String safely
    let detectedState = "Assam"; // Smart default fallback

    // If the frontend passed raw coordinates instead of an address, fetch the state using Nominatim
    if (location.includes('Lat') && location.includes('Lng')) {
      try {
        console.log("🔄 Location string contains raw coordinates. Fetching state name via Nominatim...");
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'RoadWatch-App' } }
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.address && geocodeData.address.state) {
          detectedState = geocodeData.address.state;
          console.log(`🗺️ Geocoder successfully detected state: ${detectedState}`);
        }
      } catch (geocodeErr) {
        console.error("Failed to reverse geocode state name backend:", geocodeErr);
      }
    } else {
      // Traditional text splitter fallback if an address string is present
      const locationParts = location.split(',');
      if (locationParts.length >= 2) {
        detectedState = locationParts[locationParts.length - 2].trim();
      }
    }

    // Verify registry exists in your test.json file ahead of database save operations
    await getAuthorityEmailByState(detectedState);

    // 3. Upload the Image to Supabase Storage Bucket
    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;
    const imageArrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);

    const { data: storageData, error: storageError } = await supabase.storage
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

    // 4. Insert the Record into the Supabase Database Table
    // 🎯 Stored with status 'pending'. ZERO emails can escape this route file!
    const { data: reportData, error: dbError } = await supabase
      .from('reports')
      .insert([
        {
          type,
          impact_level: parseInt(impactLevel, 10),
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

    // 5. 🛡️ Safe Quarantine Return 
    // This file returns immediately after updating your Supabase tracking tables.
    return NextResponse.json({
      message: "Report successfully queued for admin screening verification.",
      report: reportData
    });

  } catch (error: any) {
    console.error('Server Handler Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}