import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
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
