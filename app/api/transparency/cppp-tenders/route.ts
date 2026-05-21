import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { harvestCpppTenders } from "@/lib/cpppScraper";

const CACHE_FILE = path.join(process.cwd(), "cppp_cache.json");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const forceSync = searchParams.get("sync") === "true";

  try {
    // 1. If not forcing sync, check if we have a valid cached copy first
    if (!forceSync && fs.existsSync(CACHE_FILE)) {
      try {
        console.log("Serving CPPP Tenders from local JSON cache...");
        const cachedData = fs.readFileSync(CACHE_FILE, "utf8");
        const parsed = JSON.parse(cachedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return NextResponse.json({
            tenders: parsed,
            source: "cache",
            syncedAt: fs.statSync(CACHE_FILE).mtime.toISOString(),
          });
        }
      } catch (cacheErr) {
        console.warn("Failed to read CPPP cache, falling back to scraper:", cacheErr);
      }
    }

    // 2. Fetch fresh CPPP tenders (using forceSync trigger)
    console.log(`Executing CPPP harvesting (forceSync = ${forceSync})...`);
    const tenders = await harvestCpppTenders(forceSync);

    // 3. Write to the local cache file to preserve data offline
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(tenders, null, 2));
      console.log(`Saved ${tenders.length} tenders to local cache cppp_cache.json`);
    } catch (writeErr) {
      console.error("Failed to write CPPP cache file:", writeErr);
    }

    return NextResponse.json({
      tenders,
      source: forceSync ? "live" : "fallback",
      syncedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("CPPP ENDPOINT FAILURE:", err);
    return NextResponse.json(
      { message: "Failed to load tenders", error: err.message },
      { status: 500 }
    );
  }
}
