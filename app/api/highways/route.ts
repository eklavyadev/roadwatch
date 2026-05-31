import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const INDEX_FILE = path.join(process.cwd(), 'highway_index.json');

let cachedIndex: any = null;

export async function GET() {
  try {
    if (!cachedIndex) {
      if (!fs.existsSync(INDEX_FILE)) {
        return NextResponse.json(
          { error: 'highway_index.json not found. Run: node scripts/generateHighwayIndex.js' },
          { status: 404 }
        );
      }
      cachedIndex = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    }
    return NextResponse.json(cachedIndex);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
