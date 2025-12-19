import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DB_URI,
});

export async function GET() {
  const res = await pool.query(
    "SELECT * FROM reports WHERE status = 'pending' ORDER BY created_at DESC"
  );
  return NextResponse.json(res.rows);
}
