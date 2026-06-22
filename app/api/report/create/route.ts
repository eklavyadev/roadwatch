import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { promises as fs } from 'fs'; 
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configure Nodemailer transporter directly inside the intake route
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

async function getAuthorityEmailByState(stateName: string): Promise<string> {
  const DEFAULT_BACKUP_EMAIL = 'aayushukla007@gmail.com';
  try {
    const filePath = path.join(process.cwd(), 'test.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const authorities = JSON.parse(fileContent);

    const match = authorities.find(
      (item: any) => item.state_ut.trim().toLowerCase() === stateName.trim().toLowerCase()
    );

    if (match && match.office_email) {
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

    // 1. Determine Jurisdiction State
    let detectedState = "Assam"; 
    if (location.includes('Lat') && location.includes('Lng')) {
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'RoadWatch-App' } }
        );
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.address && geocodeData.address.state) {
          detectedState = geocodeData.address.state;
        }
      } catch (geocodeErr) {
        console.error("Failed to reverse geocode state name backend:", geocodeErr);
      }
    } else {
      const locationParts = location.split(',');
      if (locationParts.length >= 2) {
        detectedState = locationParts[locationParts.length - 2].trim();
      }
    }

    // 2. Fetch target official destination email from root test.json array mapping
    const targetOfficialEmail = await getAuthorityEmailByState(detectedState);

    // 3. Process image array buffers for Supabase Storage uploading
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

    // 4. Save record straight to Supabase as 'approved' because it bypasses admin screening
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
          status: 'approved', // Automatically approved on submission
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Supabase Database Error:', dbError);
      return NextResponse.json({ error: 'Failed to save report record' }, { status: 500 });
    }

    // 5. 🚀 INSTANT DISPATCH: Send out the notification email immediately
    try {
      const resolvedImpactLabel = IMPACT_LABEL[parsedImpact.toString()] || 'Medium';
      
      const mailOptions = {
        from: `"RoadWatch Platform" <${process.env.EMAIL_USER}>`,
        to: targetOfficialEmail,
        bcc: 'roadwatchadmin@gmail.com', 
        subject: `Instant RoadWatch Incident Report #${reportData.id} - ${TYPE_LABEL[type] || type} [${detectedState.toUpperCase()}]`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; color: #1e293b; background-color: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0f172a; margin-bottom: 4px; font-size: 20px;">New Civic Issue Logged Electronically</h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 0;">Report Verification Token: <strong>#${reportData.id}</strong></p>
            <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
            
            <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
              <tr><th style="padding: 6px 0; color: #475569; width: 140px;">Classification:</th><td style="color: #0f172a; font-weight: 600;">${TYPE_LABEL[type] || type}</td></tr>
              <tr><th style="padding: 6px 0; color: #475569;">Severity Tier:</th><td style="color: #ef4444; font-weight: 600;">${resolvedImpactLabel}</td></tr>
              <tr><th style="padding: 6px 0; color: #475569;">Target Location:</th><td style="color: #0f172a;">${location}</td></tr>
              <tr><th style="padding: 6px 0; color: #475569;">Jurisdiction State:</th><td style="color: #0f172a; font-weight: 600;">${detectedState}</td></tr>
              <tr><th style="padding: 6px 0; color: #475569;">GPS Position:</th><td style="color: #0f172a; font-family: monospace;">${lat}, ${lng}</td></tr>
            </table>
            
            <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
            <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">The photographic evidence is attached directly to this email message as a secure asset file.</p>
          </div>
        `,
        attachments: [
          {
            filename: `roadwatch-incident-${reportData.id}.jpg`,
            content: imageBuffer, // Reuses the binary buffer created above
            contentType: 'image/jpeg'
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log(`✨ Email dispatched instantly to ${targetOfficialEmail}`);
    } catch (emailErr) {
      console.error('Nodemailer background immediate execution failure:', emailErr);
      // We don't return an error response here because the data is already successfully saved to Supabase
    }

    return NextResponse.json({
      message: "Report successfully filed and email notification dispatched.",
      report: reportData
    });

  } catch (error: any) {
    console.error('Server Handler Failure:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}