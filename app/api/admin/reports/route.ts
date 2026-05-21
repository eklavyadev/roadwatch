import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getLocalReports } from "@/lib/localDb";

const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = isSupabaseConfigured
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

export async function GET() {
  if (!isSupabaseConfigured || !supabase) {
    return handleLocalFetch();
  }

  try {
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return handleLocalFetch();
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("SUPABASE QUERY FAILED, FALLING BACK TO LOCAL DB:", err);
    return handleLocalFetch();
  }
}

function handleLocalFetch() {
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


