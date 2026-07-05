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

export async function POST(request: Request) {
  try {
    const { reportId } = await request.json();
    
    if (!reportId) {
      return NextResponse.json({ error: 'Missing target reportId identifier' }, { status: 400 });
    }

    // Pull the specific incident metadata out of your database
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Report entry not found in database' }, { status: 404 });
    }

    if (report.status === 'approved') {
      return NextResponse.json({ error: 'This report has already been approved and processed' }, { status: 400 });
    }

    // 🎯 STRICT STATE DETECTION: Resolve from coordinates via reverse geocoding first
    let detectedState: string | null = null;
    const lat = parseFloat(report.lat);
    const lng = parseFloat(report.lng);

    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      try {
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          { headers: { 'User-Agent': 'RoadWatch-App' } }
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.address && geocodeData.address.state) {
          detectedState = geocodeData.address.state;
          console.log(`🌍 Approval Geocoder resolved State: ${detectedState}`);
        }
      } catch (geocodeErr) {
        console.error("Failed to reverse geocode state name during approval:", geocodeErr);
      }
    }

    // Fallback parsing from text location if the coordinates fetch failed
    if (!detectedState && report.location) {
      const locationParts = report.location.split(',');
      if (locationParts.length >= 2) {
        detectedState = locationParts[locationParts.length - 2].trim();
        console.log(`📍 Text Parser fallback resolved State: ${detectedState}`);
      }
    }

    // ❌ CRITICAL DROP: No hardcoded defaults. Halt processing if the state is unidentifiable.
    if (!detectedState) {
      return NextResponse.json(
        { error: 'Could not accurately identify jurisdiction state from available report metadata.' },
        { status: 422 }
      );
    }

    // Query authorities map array directly at the outermost root of the folder
    let targetOfficialEmail = 'aayushukla007@gmail.com'; 
    try {
      const filePath = path.join(process.cwd(), 'test.json');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const authorities = JSON.parse(fileContent);

      const match = authorities.find(
        (item: any) => item.state_ut.trim().toLowerCase() === detectedState!.trim().toLowerCase()
      );

      if (match && match.office_email) {
        targetOfficialEmail = match.office_email;
        console.log(`🎯 Matched Authority Email for ${detectedState}: ${targetOfficialEmail}`);
      } else {
        console.warn(`⚠️ State "${detectedState}" found, but no matching email mapping exists in test.json.`);
      }
    } catch (jsonErr) {
      console.error('Failed to look up root test.json routing dataset:', jsonErr);
    }

    // Stream the binary asset straight into an attached buffer array
    const imageResponse = await fetch(report.image_url);
    if (!imageResponse.ok) {
      throw new Error('Could not download image asset stream from storage bucket');
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const rawImpact = report.impact_level ?? report.severity ?? 2;
    const resolvedImpactLabel = IMPACT_LABEL[rawImpact.toString()] || 'Medium';

    // Dispatch the payload package
    const mailOptions = {
      from: `"RoadWatch Platform" <${process.env.EMAIL_USER}>`,
      to: targetOfficialEmail,
      bcc: 'roadwatchadmin@gmail.com', 
      subject: `Verified RoadWatch Report #${report.id} - ${TYPE_LABEL[report.type] || report.type} [${detectedState.toUpperCase()}]`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; color: #1e293b; background-color: #f8fafc; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0f172a; margin-bottom: 4px; font-size: 20px;">Official Verified Civic Issue Logged</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 0;">Report Verification Token: <strong>#${report.id}</strong></p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          
          <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 14px; line-height: 1.6;">
            <tr><th style="padding: 6px 0; color: #475569; width: 140px;">Classification:</th><td style="color: #0f172a; font-weight: 600;">${TYPE_LABEL[report.type] || report.type}</td></tr>
            <tr><th style="padding: 6px 0; color: #475569;">Severity Tier:</th><td style="color: #ef4444; font-weight: 600;">${resolvedImpactLabel}</td></tr>
            <tr><th style="padding: 6px 0; color: #475569;">Target Location:</th><td style="color: #0f172a;">${report.location}</td></tr>
            <tr><th style="padding: 6px 0; color: #475569;">Jurisdiction State:</th><td style="color: #0f172a; font-weight: 600;">${detectedState}</td></tr>
            <tr><th style="padding: 6px 0; color: #475569;">GPS Position:</th><td style="color: #0f172a; font-family: monospace;">${report.lat}, ${report.lng}</td></tr>
          </table>
          
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">The officially verified photographic evidence is attached directly to this email message as a secure asset file.</p>
        </div>
      `,
      attachments: [
        {
          filename: `roadwatch-incident-${report.id}.jpg`,
          content: imageBuffer,
          contentType: 'image/jpeg'
        }
      ]
    };

    await transporter.sendMail(mailOptions);

    // Promote row token to 'approved' inside your Supabase table
    const { error: updateError } = await supabase
      .from('reports')
      .update({ status: 'approved' })
      .eq('id', report.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: "Incident verified and email dispatched with binary payload." });

  } catch (error: any) {
    console.error('Admin approval backend service crashed:', error);
    return NextResponse.json({ error: error.message || 'Internal Routing Engine Error' }, { status: 500 });
  }
}