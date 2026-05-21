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
      return handleLocalDelete(id);
    }

    try {
      /* ---------- FETCH IMAGE URL ---------- */
      const { data: report, error: fetchError } = await supabase
        .from("reports")
        .select("image_url")
        .eq("id", id)
        .single();

      if (fetchError || !report) {
        console.warn("Supabase report fetch failed, falling back to local DB deletion");
        return handleLocalDelete(id);
      }

      /* ---------- DELETE IMAGE ---------- */
      if (report.image_url?.includes("/reports/")) {
        const imagePath = report.image_url.split("/reports/")[1];
        if (imagePath) {
          try {
            await supabase.storage.from("reports").remove([imagePath]);
          } catch (e) {
            console.error("Storage delete failed, continuing with DB deletion:", e);
          }
        }
      }

      /* ---------- DELETE ROW ---------- */
      const { error: deleteError } = await supabase
        .from("reports")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Supabase row delete failed, falling back to local DB deletion:", deleteError);
        return handleLocalDelete(id);
      }

      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error("SUPABASE DELETE FAILED, FALLING BACK TO LOCAL DB:", err);
      return handleLocalDelete(id);
    }
  } catch (err) {
    console.error("DELETE ERROR:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

function handleLocalDelete(id: string) {
  const success = deleteLocalReport(id);
  if (!success) {
    return NextResponse.json(
      { error: "Report not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}


