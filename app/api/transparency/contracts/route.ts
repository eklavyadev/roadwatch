import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONTRACTS_FILE = path.join(process.cwd(), "contracts_store.json");
const RAW_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full.json");

export interface ContractRecord {
  id: string;
  organisationName: string;
  tenderRefNo: string;
  tenderDescription: string;
  tenderDocument: string;
  tenderType: string;
  bidsReceived: number;
  selectedBidder: string;
  contractValue: number;
  publishedDate: string;
  contractDate: string;
  category: "NH" | "SH";
  year: number;
  selectedBidderAddress?: string;
  completionPeriod?: string;
}

/**
 * Parses and processes raw tenders from cppp_tenders_full.json and stores them in contracts_store.json.
 * Automatically classifies categories (NH vs. SH) and years (2025/2026).
 */
function parseAndStoreRealTenders(force = false): ContractRecord[] {
  if (!force && fs.existsSync(CONTRACTS_FILE)) {
    try {
      const data = fs.readFileSync(CONTRACTS_FILE, "utf8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error("Error reading contracts_store.json:", e);
    }
  }

  if (!fs.existsSync(RAW_TENDERS_FILE)) {
    console.error("RAW Tenders file not found at path:", RAW_TENDERS_FILE);
    return [];
  }

  try {
    const rawData = fs.readFileSync(RAW_TENDERS_FILE, "utf8");
    const parsedData = JSON.parse(rawData);
    if (!Array.isArray(parsedData)) {
      throw new Error("Expected array of raw tenders");
    }

    const cleanText = (str: string) => {
      if (!str) return '';
      return str
        .replace(/&#x0d;/gi, '')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const contracts: ContractRecord[] = [];

    parsedData.forEach((item: any, index: number) => {
      const s = item.structured_data || {};
      
      const orgName = cleanText(s['Organisation Name'] || '');
      const refNo = cleanText(s['Tender Ref. No.'] || '');
      const description = cleanText(s['Tender Description'] || '');
      const document = cleanText(s['Tender Document'] || '');
      const type = cleanText(s['Tender Type'] || 'Works');
      const bids = parseInt((s['Number of bids received'] || '').replace(/\D/g, ''), 10) || 0;
      const bidder = cleanText(s['Name of the selected bidder(s)'] || '');
      const valStr = (s['Contract Value *'] || '').replace(/[^0-9.]/g, '');
      const value = parseFloat(valStr) || 0;
      const published = cleanText(s['Published Date'] || '');
      const contractDate = cleanText(s['Contract Date'] || '');
      const address = cleanText(s['Address of the selected bidder(s)'] || '');
      const completion = cleanText(s['Date of Completion/Completion Period in Days'] || '');

      // Determine year from contractDate, published date, or refNo
      let year = 2025;
      const dateStringForYear = `${contractDate} ${published} ${refNo}`;
      const yearMatch = dateStringForYear.match(/\b(2025|2026)\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }

      // Determine Category: NH vs SH
      let category: "NH" | "SH" = 'SH';
      const searchStr = `${orgName} ${refNo} ${description}`.toUpperCase();
      if (
        searchStr.includes('NHAI') ||
        searchStr.includes('NATIONAL HIGHWAY') ||
        /\bNH[- ]?\d+/i.test(searchStr)
      ) {
        category = 'NH';
      }

      if (year === 2025 || year === 2026) {
        contracts.push({
          id: `real_${index + 1}`,
          organisationName: orgName,
          tenderRefNo: refNo,
          tenderDescription: description,
          tenderDocument: document,
          tenderType: type,
          bidsReceived: bids,
          selectedBidder: bidder,
          contractValue: value,
          publishedDate: published,
          contractDate: contractDate,
          category: category,
          year: year,
          selectedBidderAddress: address,
          completionPeriod: completion
        });
      }
    });

    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contracts, null, 2), "utf8");
    return contracts;
  } catch (error) {
    console.error("Failed to parse and store raw CPPP tenders:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") === "true";
  const categoryFilter = searchParams.get("category"); // "NH" or "SH" or "all"
  const yearFilter = searchParams.get("year"); // "2025" or "2026" or "all"
  const searchQuery = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    let contracts: ContractRecord[] = [];

    // Load real parsed tenders (and re-parse if seed=true is passed)
    contracts = parseAndStoreRealTenders(seed);

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

    // Filter by Search Bar (supports highway codes, descriptions, organisations, or bidder names)
    if (searchQuery) {
      const normalizedQuery = searchQuery.replace(/[-\s]/g, "");

      filtered = filtered.filter((c) => {
        const normalizedRef = c.tenderRefNo.toLowerCase().replace(/[-\s]/g, "");
        const bidderName = c.selectedBidder.toLowerCase();
        const orgName = c.organisationName.toLowerCase();
        const description = (c.tenderDescription || "").toLowerCase();
        
        // Also support searching standard NH/SH labels
        const categoryLabel = `${c.category.toLowerCase()}${c.tenderRefNo.toLowerCase()}`;
        const normalizedCategoryLabel = categoryLabel.replace(/[-\s_]/g, "");

        return (
          normalizedRef.includes(normalizedQuery) ||
          bidderName.includes(searchQuery) ||
          orgName.includes(searchQuery) ||
          description.includes(searchQuery) ||
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
        // Multi-bidder string splits
        c.selectedBidder.split(",").forEach(b => {
          const trimmed = b.trim();
          if (trimmed) activeBiddersSet.add(trimmed);
        });
      }
    });

    return NextResponse.json({
      contracts: filtered,
      aggregates: {
        totalSpend,
        totalContracts: filtered.length,
        activeBidders: activeBiddersSet.size,
      },
      source: "disk",
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
    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify([], null, 2), "utf8");
    return NextResponse.json({ message: "Contracts database reset to empty successfully", status: "success" });
  } catch (err: any) {
    return NextResponse.json({ message: "Failed to reset contracts database", error: err.message }, { status: 500 });
  }
}
