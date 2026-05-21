import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLocalReports } from "@/lib/localDb";

const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = isSupabaseConfigured
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

export async function GET() {
  if (!isSupabaseConfigured || !supabase) {
    try {
      const data = getLocalReports();
      return NextResponse.json(data);
    } catch (err: any) {
      console.error("LOCAL DB ERROR:", err);
      return NextResponse.json(
        { message: "Local database error", detail: err.message },
        { status: 500 }
      );
    }
  }

  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return NextResponse.json(
        { message: "Database error", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("UNEXPECTED ERROR:", err);
    return NextResponse.json(
      { message: "Unexpected error", detail: err.message },
      { status: 500 }
    );
  }
}

