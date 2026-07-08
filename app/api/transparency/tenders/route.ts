import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
  category: "NH" | "SH" | "PWD" | "Municipality";
  year: number;
  selectedBidderAddress?: string;
  completionPeriod?: string;
  state: string;
}

interface RawTenderRecord {
  listing_data?: string[];
  detail_url?: string;
  title?: string;
  detail_text?: string;
  structured_data?: Record<string, string>;
  attachments?: { name: string; url: string }[];
  source_file?: string;
}

const STATES_LIST = [
  'Uttar Pradesh', 'Maharashtra', 'Tamil Nadu', 'Punjab', 'Rajasthan',
  'Odisha', 'Assam', 'Kerala', 'Haryana', 'Jharkhand', 'Tripura', 'Goa',
  'Sikkim', 'Mizoram', 'Bihar', 'West Bengal', 'Karnataka', 'Gujarat',
  'Madhya Pradesh', 'Andhra Pradesh', 'Telangana', 'Chhattisgarh',
  'Uttarakhand', 'Himachal Pradesh', 'Arunachal Pradesh', 'Nagaland',
  'Manipur', 'Meghalaya'
];

function cleanText(str: string) {
  if (!str) return '';
  return str
    .replace(/&#x0d;/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyState(orgName: string, refNo: string, description: string, bidderAddress: string): string {
  const combinedText = `${orgName} ${refNo} ${description} ${bidderAddress}`.toLowerCase();
  
  for (const state of STATES_LIST) {
    if (combinedText.includes(state.toLowerCase())) {
      return state;
    }
  }
  
  if (combinedText.includes('ro-nagpur') || combinedText.includes('ro-mumbai') || combinedText.includes('panvel')) return 'Maharashtra';
  if (combinedText.includes('ro-chennai') || combinedText.includes('ro-madurai') || combinedText.includes('thanjavur')) return 'Tamil Nadu';
  if (combinedText.includes('ro-chandigarh') || combinedText.includes('jalandhar')) return 'Punjab';
  if (combinedText.includes('ro-lucknow') || combinedText.includes('ro-varanasi')) return 'Uttar Pradesh';
  if (combinedText.includes('ro-gandhinagar') || combinedText.includes('bharuch') || combinedText.includes('rajkot')) return 'Gujarat';
  if (combinedText.includes('ro-jaipur')) return 'Rajasthan';
  if (combinedText.includes('ro-hyderabad')) return 'Telangana';
  if (combinedText.includes('ro-bhopal') || combinedText.includes('jabalpur')) return 'Madhya Pradesh';
  if (combinedText.includes('ro-bangalore') || combinedText.includes('hassan')) return 'Karnataka';
  if (combinedText.includes('ro-vijayawada')) return 'Andhra Pradesh';
  if (combinedText.includes('ro-dehradun')) return 'Uttarakhand';
  if (combinedText.includes('ro-raipur')) return 'Chhattisgarh';
  
  return 'Other';
}

function parseTendersFile(filePath: string, defaultCategory: "NH" | "SH" | "PWD" | "Municipality"): ContractRecord[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found during parse: ${filePath}`);
    return [];
  }
  
  const contracts: ContractRecord[] = [];
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const groupedData = JSON.parse(fileContent);
    
    let counter = 0;
    
    for (const [stateName, records] of Object.entries(groupedData)) {
      if (!Array.isArray(records)) continue;
      
      records.forEach((item: RawTenderRecord) => {
        const s = item.structured_data || {};
        
        const orgName = cleanText(s['Organisation Name'] || '');
        const refNo = cleanText(s['Tender Ref. No.'] || '');
        const description = cleanText(s['Tender Description'] || '');
        const document = cleanText(s['Tender Document'] || '');
        const type = cleanText(s['Tender Type'] || 'Works');
        const bids = parseInt((s['Number of bids received'] || '').replace(/\D/g, ''), 10) || 0;
        const bidder = cleanText(s['Name of the selected bidder(s)'] || '');
        const valStr = (s['Contract Value'] || s['Contract Value *'] || '').replace(/[^0-9.]/g, '');
        const value = parseFloat(valStr) || 0;
        const published = cleanText(s['Award Published Date'] || s['Published Date'] || '');
        const contractDate = cleanText(s['Contract Date'] || '');
        const address = cleanText(s['Address of the selected bidder(s)'] || '');
        const completion = cleanText(s['Date of Completion/Completion Period in Days'] || '');

        let year = 2025;
        const dateStringForYear = `${contractDate} ${published} ${refNo}`;
        const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10);
        }

        // Dynamically classify NH vs SH for state_highways.json
        let category = defaultCategory;
        if (defaultCategory === "SH" || defaultCategory === "NH") {
          const orgRefStr = `${orgName} ${refNo}`.toUpperCase();
          const nh_pattern = /\bNH[- ]?\d+/i;
          const isNHAI = orgRefStr.includes('NHAI') || orgRefStr.includes('NATIONAL HIGHWAY') || nh_pattern.test(orgRefStr);
          
          if (isNHAI) {
            category = 'NH';
          } else {
            const descriptionStr = description.toUpperCase();
            const isNHProject = nh_pattern.test(descriptionStr);
            category = isNHProject ? 'NH' : 'SH';
          }
        }

        counter++;
        const filePrefix = path.basename(filePath, ".json").replace("_", "");
        contracts.push({
          id: `t_${filePrefix}_${stateName.replace(/[^a-zA-Z0-9]/g, "")}_${counter}`,
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
          category: category as "NH" | "SH" | "PWD" | "Municipality",
          year: year,
          selectedBidderAddress: address,
          completionPeriod: completion,
          state: stateName
        });
      });
    }
  } catch (e) {
    console.error(`Error reading/parsing ${filePath}:`, e);
  }
  
  return contracts;
}

// Parses cppp_tenders_full.json to find National Highway (NH) / NHAI records
function parseCpppFullForNH(filePath: string): ContractRecord[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const contracts: ContractRecord[] = [];
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    const parsedData = JSON.parse(rawData);
    if (Array.isArray(parsedData)) {
      parsedData.forEach((item: any, index: number) => {
        const s = item.structured_data || {};
        
        const orgName = cleanText(s['Organisation Name'] || '');
        const refNo = cleanText(s['Tender Ref. No.'] || '');
        const description = cleanText(s['Tender Description'] || '');
        
        // Classify Category: NH vs SH
        const orgRefStr = `${orgName} ${refNo}`.toUpperCase();
        const nh_pattern = /\bNH[- ]?\d+/i;
        const isNHAI = orgRefStr.includes('NHAI') || orgRefStr.includes('NATIONAL HIGHWAY') || nh_pattern.test(orgRefStr);
        
        let isNH = isNHAI;
        if (!isNH) {
          const descriptionStr = description.toUpperCase();
          isNH = nh_pattern.test(descriptionStr);
        }

        if (isNH) {
          const document = cleanText(s['Tender Document'] || '');
          const type = cleanText(s['Tender Type'] || 'Works');
          const bids = parseInt((s['Number of bids received'] || '').replace(/\D/g, ''), 10) || 0;
          const bidder = cleanText(s['Name of the selected bidder(s)'] || '');
          const valStr = (s['Contract Value'] || s['Contract Value *'] || '').replace(/[^0-9.]/g, '');
          const value = parseFloat(valStr) || 0;
          const published = cleanText(s['Award Published Date'] || s['Published Date'] || '');
          const contractDate = cleanText(s['Contract Date'] || '');
          const address = cleanText(s['Address of the selected bidder(s)'] || '');
          const completion = cleanText(s['Date of Completion/Completion Period in Days'] || '');

          let year = 2025;
          const dateStringForYear = `${contractDate} ${published} ${refNo}`;
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          contracts.push({
            id: `cpppfull_nh_${index + 1}`,
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
            category: "NH",
            year: year,
            selectedBidderAddress: address,
            completionPeriod: completion,
            state: classifyState(orgName, refNo, description, address)
          });
        }
      });
    }
  } catch (e) {
    console.error("Error reading cppp_tenders_full.json:", e);
  }
  return contracts;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryFilter = searchParams.get("category"); // "NH", "SH", "PWD", "Municipality", or "all"
  const yearFilter = searchParams.get("year"); // "2021" to "2026" or "all"
  const stateFilter = searchParams.get("state"); // State name or "all"
  const searchQuery = searchParams.get("search")?.toLowerCase().trim() || "";

  try {
    let contracts: ContractRecord[] = [];

    const stateHighwaysPath = path.join(process.cwd(), "state_highways.json");
    const pwdPath = path.join(process.cwd(), "pwd.json");
    const municipalityPath = path.join(process.cwd(), "municipality.json");
    const contractsStorePath = path.join(process.cwd(), "contracts_store.json");
    const cpppFullTendersPath = path.join(process.cwd(), "cppp_tenders_full.json");

    // Load files selectively to optimize response speeds
    if (categoryFilter === "NH") {
      // 1. Parse cppp_tenders_full.json for NH/NHAI tenders
      const cpppNh = parseCpppFullForNH(cpppFullTendersPath);
      
      // 2. Load NH from contracts_store.json (includes historical/NHAI-scraped tenders)
      let storeNh: ContractRecord[] = [];
      if (fs.existsSync(contractsStorePath)) {
        try {
          const fileContent = fs.readFileSync(contractsStorePath, "utf8");
          const parsed = JSON.parse(fileContent);
          if (Array.isArray(parsed)) {
            storeNh = parsed.filter((c: any) => c.category === "NH");
          }
        } catch (e) {
          console.error("Error reading contracts_store.json for NH:", e);
        }
      }
      
      // 3. Merge and deduplicate by Tender Reference Number
      const seenRefs = new Set<string>();
      contracts = [];
      
      [...cpppNh, ...storeNh].forEach(c => {
        const refNormalized = c.tenderRefNo.trim().toLowerCase();
        if (refNormalized && !seenRefs.has(refNormalized)) {
          seenRefs.add(refNormalized);
          contracts.push(c);
        }
      });

    } else if (categoryFilter === "SH") {
      contracts = parseTendersFile(stateHighwaysPath, "SH");
    } else if (categoryFilter === "PWD") {
      contracts = parseTendersFile(pwdPath, "PWD");
    } else if (categoryFilter === "Municipality") {
      contracts = parseTendersFile(municipalityPath, "Municipality");
    } else if (categoryFilter === "StateProjects") {
      const shContracts = parseTendersFile(stateHighwaysPath, "SH").filter((c: any) => c.category === "SH");
      contracts = [
        ...shContracts,
        ...parseTendersFile(pwdPath, "PWD"),
        ...parseTendersFile(municipalityPath, "Municipality")
      ];
    } else {
      // "all" or omitted - load everything
      // Load all NH data (parsed and store)
      const cpppNh = parseCpppFullForNH(cpppFullTendersPath);
      let storeNh: ContractRecord[] = [];
      if (fs.existsSync(contractsStorePath)) {
        try {
          const fileContent = fs.readFileSync(contractsStorePath, "utf8");
          const parsed = JSON.parse(fileContent);
          if (Array.isArray(parsed)) {
            storeNh = parsed.filter((c: any) => c.category === "NH");
          }
        } catch (e) {}
      }
      
      const nhContracts: ContractRecord[] = [];
      const seenRefs = new Set<string>();
      [...cpppNh, ...storeNh].forEach(c => {
        const refNormalized = c.tenderRefNo.trim().toLowerCase();
        if (refNormalized && !seenRefs.has(refNormalized)) {
          seenRefs.add(refNormalized);
          nhContracts.push(c);
        }
      });

      contracts = [
        ...nhContracts,
        ...parseTendersFile(stateHighwaysPath, "SH"),
        ...parseTendersFile(pwdPath, "PWD"),
        ...parseTendersFile(municipalityPath, "Municipality")
      ];
    }

    // Filter by Category (if not NH/SH/etc. which are pre-filtered above)
    let filtered = [...contracts];
    if (categoryFilter && categoryFilter !== "all" && categoryFilter !== "StateProjects") {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }

    // Filter by State
    if (stateFilter && stateFilter !== "all") {
      const normalizedStateFilter = stateFilter.toLowerCase().replace(/[^a-z0-9]/g, "");
      filtered = filtered.filter(c => {
        const normalizedCardState = c.state.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedCardState === normalizedStateFilter;
      });
    }

    // Filter by Year
    if (yearFilter && yearFilter !== "all") {
      const targetYear = parseInt(yearFilter, 10);
      if (!isNaN(targetYear)) {
        filtered = filtered.filter(c => c.year === targetYear);
      }
    }

    // Filter by Search Query
    if (searchQuery) {
      const normalizedQuery = searchQuery.replace(/[-\s]/g, "");
      const highwayMatch = searchQuery.match(/^(nh|sh)\s*[-_]?\s*(\d+)$/i);

      filtered = filtered.filter((c) => {
        const normalizedRef = c.tenderRefNo.toLowerCase().replace(/[-\s]/g, "");
        const bidderName = c.selectedBidder.toLowerCase();
        const orgName = c.organisationName.toLowerCase();
        const description = (c.tenderDescription || "").toLowerCase();

        if (highwayMatch) {
          const queryCategory = highwayMatch[1].toUpperCase();
          const queryNumber = highwayMatch[2];

          if (c.category !== queryCategory) {
            return false;
          }

          const labelPattern = new RegExp(`\\b${queryCategory}[-_\\s]?${queryNumber}\\b|\\b${queryCategory === 'NH' ? 'national' : 'state'}\\s+highway\\s*${queryNumber}\\b`, 'i');
          const combinedText = `${c.tenderRefNo} ${c.tenderDescription}`;
          return labelPattern.test(combinedText);
        }

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

    // Compute Aggregations
    let totalSpend = 0;
    const activeBiddersSet = new Set<string>();

    filtered.forEach((c) => {
      totalSpend += c.contractValue;
      if (c.selectedBidder) {
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
      syncedAt: new Date().toISOString()
    });
  } catch (err: any) {
    console.error("TENDERS API CRITICAL FAILURE:", err);
    return NextResponse.json(
      { message: "Failed to read tender records", error: err.message },
      { status: 500 }
    );
  }
}
