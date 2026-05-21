import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONTRACTS_FILE = path.join(process.cwd(), "contracts_store.json");

export interface ContractRecord {
  id: string;
  organisationName: string;
  tenderRefNo: string;
  bidsReceived: number;
  selectedBidder: string;
  contractValue: number;
  contractDate: string;
  category: "NH" | "SH";
  year: number;
}

// Developer seed dataset containing highly realistic NH & SH contract records for 2025 and 2026
const DEVELOPER_SEED_CONTRACTS: ContractRecord[] = [
  {
    id: "seed_1",
    organisationName: "National Highways Authority of India (NHAI)",
    tenderRefNo: "2025_NHAI_259959_1",
    bidsReceived: 4,
    selectedBidder: "L&T Infrastructure Ltd.",
    contractValue: 2579891676,
    contractDate: "2025-03-10",
    category: "NH",
    year: 2025
  },
  {
    id: "seed_2",
    organisationName: "National Highways Authority of India (NHAI)",
    tenderRefNo: "2025_NHAI_260098_1",
    bidsReceived: 5,
    selectedBidder: "IRB Infrastructure Developers",
    contractValue: 2100793585,
    contractDate: "2025-08-27",
    category: "NH",
    year: 2025
  },
  {
    id: "seed_3",
    organisationName: "National Highways Authority of India (NHAI)",
    tenderRefNo: "2026_NHAI_256630_2",
    bidsReceived: 3,
    selectedBidder: "Tata Projects",
    contractValue: 322370906,
    contractDate: "2026-02-14",
    category: "NH",
    year: 2026
  },
  {
    id: "seed_4",
    organisationName: "Gujarat State Road Development Corporation (GSRDC)",
    tenderRefNo: "2025_GSRDC_123456_1",
    bidsReceived: 6,
    selectedBidder: "Dilip Buildcon Ltd.",
    contractValue: 1680000000,
    contractDate: "2025-11-20",
    category: "SH",
    year: 2025
  },
  {
    id: "seed_5",
    organisationName: "Maharashtra Public Works Department (MPWD)",
    tenderRefNo: "2026_MPWD_889922_1",
    bidsReceived: 8,
    selectedBidder: "Ashoka Buildcon Ltd.",
    contractValue: 742000000,
    contractDate: "2026-05-06",
    category: "SH",
    year: 2026
  },
  {
    id: "seed_6",
    organisationName: "National Highways Authority of India (NHAI)",
    tenderRefNo: "2025_NHAI_259367_1",
    bidsReceived: 5,
    selectedBidder: "IRB Infrastructure Developers",
    contractValue: 1980000000,
    contractDate: "2025-04-18",
    category: "NH",
    year: 2025
  },
  {
    id: "seed_7",
    organisationName: "Uttarakhand Public Works Department (UKPWD)",
    tenderRefNo: "2026_UKPWD_345211_1",
    bidsReceived: 4,
    selectedBidder: "PWD Class-A Registered Contractor",
    contractValue: 280000000,
    contractDate: "2026-02-05",
    category: "SH",
    year: 2026
  },
  {
    id: "seed_8",
    organisationName: "National Highways Authority of India (NHAI)",
    tenderRefNo: "2025_NHAI_259347_1",
    bidsReceived: 3,
    selectedBidder: "Tata Projects",
    contractValue: 5200000,
    contractDate: "2025-10-31",
    category: "NH",
    year: 2025
  },
  {
    id: "seed_9",
    organisationName: "Tamil Nadu Road Development Company (TNRDC)",
    tenderRefNo: "2026_TNRDC_554433_1",
    bidsReceived: 6,
    selectedBidder: "GMR Infrastructure",
    contractValue: 685000000,
    contractDate: "2026-01-20",
    category: "SH",
    year: 2026
  },
  {
    id: "seed_10",
    organisationName: "Maharashtra State Road Development Corporation (MSRDC)",
    tenderRefNo: "2025_MSRDC_776655_1",
    bidsReceived: 7,
    selectedBidder: "IRB Infrastructure Developers",
    contractValue: 154000000,
    contractDate: "2025-12-15",
    category: "SH",
    year: 2025
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") === "true";
  const categoryFilter = searchParams.get("category"); // "NH" or "SH" or "all"
  const yearFilter = searchParams.get("year"); // "2025" or "2026" or "all"
  const searchQuery = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    let contracts: ContractRecord[] = [];

    // 1. Read files or load seed data
    if (seed) {
      contracts = DEVELOPER_SEED_CONTRACTS;
      // Optionally write to the file to make it stick!
      try {
        fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(DEVELOPER_SEED_CONTRACTS, null, 2));
      } catch (err) {
        console.error("Failed to write seeded contracts to local store:", err);
      }
    } else if (fs.existsSync(CONTRACTS_FILE)) {
      try {
        const fileData = fs.readFileSync(CONTRACTS_FILE, "utf8");
        const parsed = JSON.parse(fileData);
        if (Array.isArray(parsed)) {
          contracts = parsed;
        }
      } catch (cacheErr) {
        console.warn("Failed to read contracts file, serving empty array:", cacheErr);
      }
    }

    // 2. Perform Filtering
    let filtered = [...contracts];

    // Filter by NH or SH Category
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }

    // Filter by Year
    if (yearFilter && yearFilter !== "all") {
      const targetYear = parseInt(yearFilter, 10);
      if (!isNaN(targetYear)) {
        filtered = filtered.filter(c => c.year === targetYear);
      }
    }

    // Filter by Search Bar (supports "NH" followed by number, bidder name, tender ref, etc.)
    if (searchQuery) {
      // Clean query: e.g. "nh-44" -> "nh44", "sh 3" -> "sh3"
      const normalizedQuery = searchQuery.replace(/[-\s]/g, "");

      filtered = filtered.filter((c) => {
        const normalizedRef = c.tenderRefNo.toLowerCase().replace(/[-\s]/g, "");
        const bidderName = c.selectedBidder.toLowerCase();
        const orgName = c.organisationName.toLowerCase();
        
        // Also support searching standard NH/SH labels
        const categoryLabel = `${c.category.toLowerCase()}${c.tenderRefNo.toLowerCase()}`;
        const normalizedCategoryLabel = categoryLabel.replace(/[-\s_]/g, "");

        return (
          normalizedRef.includes(normalizedQuery) ||
          bidderName.includes(searchQuery) ||
          orgName.includes(searchQuery) ||
          normalizedCategoryLabel.includes(normalizedQuery)
        );
      });
    }

    // 3. Compute aggregations
    let totalSpend = 0;
    const activeBiddersSet = new Set<string>();

    filtered.forEach((c) => {
      totalSpend += c.contractValue;
      if (c.selectedBidder) {
        activeBiddersSet.add(c.selectedBidder);
      }
    });

    return NextResponse.json({
      contracts: filtered,
      aggregates: {
        totalSpend,
        totalContracts: filtered.length,
        activeBidders: activeBiddersSet.size,
      },
      source: seed ? "seed" : "disk",
      syncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("CONTRACTS API CRITICAL FAILURE:", err);
    return NextResponse.json(
      { message: "Failed to read contract records", error: err.message },
      { status: 500 }
    );
  }
}

// POST endpoint to reset database to empty state if needed
export async function POST(request: NextRequest) {
  try {
    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify([], null, 2));
    return NextResponse.json({ message: "Contracts database reset to empty successfully", status: "success" });
  } catch (err: any) {
    return NextResponse.json({ message: "Failed to reset contracts database", error: err.message }, { status: 500 });
  }
}
