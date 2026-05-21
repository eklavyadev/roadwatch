import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { updateLocalReportStatus } from "@/lib/localDb";

const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = isSupabaseConfigured
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

export async function POST(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "Missing id or status" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return handleLocalUpdate(id, status);
    }

    try {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("SUPABASE UPDATE ERROR, FALLING BACK TO LOCAL DB:", error);
        return handleLocalUpdate(id, status);
      }

      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error("SUPABASE UPDATE FAILED, FALLING BACK TO LOCAL DB:", err);
      return handleLocalUpdate(id, status);
    }
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

function handleLocalUpdate(id: string, status: any) {
  const success = updateLocalReportStatus(id, status);
  if (!success) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}


