import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteLocalReport, getLocalReports } from "@/lib/localDb";

const isSupabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = isSupabaseConfigured
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  : null;

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ MUST await params
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid report id" },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      const success = deleteLocalReport(id);
      if (!success) {
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true });
    }

    /* ---------- FETCH IMAGE URL ---------- */
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("image_url")
      .eq("id", id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    /* ---------- DELETE IMAGE ---------- */
    if (report.image_url?.includes("/reports/")) {
      const imagePath = report.image_url.split("/reports/")[1];
      if (imagePath) {
        await supabase.storage.from("reports").remove([imagePath]);
      }
    }

    /* ---------- DELETE ROW ---------- */
    const { error: deleteError } = await supabase
      .from("reports")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

