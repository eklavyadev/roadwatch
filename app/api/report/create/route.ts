import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs'; 
import path from 'path';

// Initialize Supabase using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configure the Gmail SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const TYPE_LABEL: Record<string, string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  traffic_signal: 'Traffic Signal',
  open_drainage: 'Open Drainage',
};

const IMPACT_LABEL: Record<string, string> = {
  '1': 'Low',
  '2': 'Medium',
  '3': 'High',
};

// Helper function to load and search the authority email from JSON
async function getAuthorityEmailByState(stateName: string): Promise<string | string[]> {
  const DEFAULT_BACKUP_EMAIL = 'aayushukla007@gmail.com'; // Fallback backup anchor
  
  try {
    // PATH: Points directly to your root folder file layout
    const filePath = path.join(process.cwd(), 'all_india_pwd_road_authorities.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const authorities = JSON.parse(fileContent);

    // Standardize casing to avoid mismatches
    const match = authorities.find(
      (item: any) => item.state_ut.trim().toLowerCase() === stateName.trim().toLowerCase()
    );

    if (match && match.office_email) {
      console.log(`🎯 Matched Authority found for ${stateName}:`, match.office_email);
      return match.office_email;
    }
  } catch (err) {
    console.error('Error reading authorities JSON directory:', err);
  }

  console.log(`⚠️ No specific authority matched or error occurred. Falling back to default backup email.`);
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

    // If the frontend passed raw coordinates instead of an address, fetch the state using an open API
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

    // Look up the official target email from your JSON file
    const targetOfficialEmail = await getAuthorityEmailByState(detectedState);

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

    // 5. Send the Dynamic Automated Notification Email
    const mailOptions = {
      from: `"RoadWatch App" <${process.env.EMAIL_USER}>`,
      to: targetOfficialEmail, 
      bcc: 'roadwatchadmin@gmail.com', 
      subject: `RoadWatch Report #${reportData.id} - ${TYPE_LABEL[type] || type} [${detectedState.toUpperCase()}]`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; color: #1e293b; background-color: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-bottom: 4px; font-size: 20px;">New Civic Road Issue Logged</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Report Identity Key: <strong>#${reportData.id}</strong></p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          
          <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
            <tr>
              <th style="padding: 6px 0; color: #475569; width: 140px;">Classification:</th>
              <td style="color: #0f172a; font-weight: 600;">${TYPE_LABEL[type] || type}</td>
            </tr>
            <tr>
              <th style="padding: 6px 0; color: #475569;">Severity Tier:</th>
              <td style="color: #ef4444; font-weight: 600;">${IMPACT_LABEL[impactLevel] || impactLevel} (Level ${impactLevel})</td>
            </tr>
            <tr>
              <th style="padding: 6px 0; color: #475569;">Target Location:</th>
              <td style="color: #0f172a;">${location}</td>
            </tr>
            <tr>
              <th style="padding: 6px 0; color: #475569;">Jurisdiction State:</th>
              <td style="color: #0f172a; font-weight: 600;">${detectedState}</td>
            </tr>
            <tr>
              <th style="padding: 6px 0; color: #475569;">GPS Position:</th>
              <td style="color: #0f172a; font-family: monospace;">${lat.toFixed(5)}, ${lng.toFixed(5)}</td>
            </tr>
          </table>
          
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">The visual verification snapshot provided during submission is attached directly to this message.</p>
        </div>
      `,
      attachments: [
        {
          filename: imageFile.name || 'incident-snapshot.jpg',
          content: imageBuffer,
          contentType: imageFile.type,
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(reportData);

  } catch (error: any) {
    console.error('Server Handler Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}