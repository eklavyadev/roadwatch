import { NextResponse } from 'next/server';
import pwdData from '@/all_india_pwd_road_authorities.json';

export async function GET() {
  return NextResponse.json(pwdData);
}
