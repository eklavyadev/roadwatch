import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DB_URI,
});

export async function POST(req: Request) {
  const { id, status } = await req.json();

  await pool.query(
    'UPDATE reports SET status = $1 WHERE id = $2',
    [status, id]
  );

  return NextResponse.json({ success: true });
}
