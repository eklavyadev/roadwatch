import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { lat, lng } = body;

    if (!lat || !lng) {
      return NextResponse.json({ error: 'Missing lat or lng' }, { status: 400 });
    }

    const query = `
      [out:json];
      way(around:20, ${lat}, ${lng})["highway"];
      out tags;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RoadwatchApp/1.0',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    let category = 'PWD'; // Default

    if (data && data.elements && data.elements.length > 0) {
      // Find the first way (nearest road)
      const element = data.elements[0];
      const tags = element.tags || {};
      
      const ref = tags.ref || '';
      const highway = tags.highway || '';

      if (ref.includes('NH')) {
        category = 'NH';
      } else if (ref.includes('SH')) {
        category = 'SH';
      } else if (highway === 'trunk' || highway === 'primary') {
        category = 'NH/SH (Review)';
      }
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error classifying road:', error);
    // Return a default rather than failing the whole report process
    return NextResponse.json({ category: 'PWD', error: 'Classification failed' }, { status: 500 });
  }
}
