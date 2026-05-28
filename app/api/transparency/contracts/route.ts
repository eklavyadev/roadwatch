import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const CONTRACTS_FILE = path.join(process.cwd(), "contracts_store.json");
const RAW_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full.json");
const RAW_TRIPURA_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_26_Tripura.json");
const RAW_MEGHALAYA_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_24_Meghalaya.json");
const RAW_MIZORAM_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_24_Mizoram.json");
const RAW_ARUNACHAL_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_25_ARUNACHAL_PRADESH.json");
const RAW_MANIPUR_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_25_MANIPUR.json");
const RAW_NAGALAND_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_25_Nagaland.json");
const RAW_ANDHRA_TENDERS_FILE = path.join(process.cwd(), "cppp_tenders_full_26_AAndhra_Pradesh.json");
const RAW_NHAI_TENDERS_FILE = path.join(process.cwd(), "..", "nhai_tenders.json");

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
  state: string;
}

const STATES_LIST = [
  'Uttar Pradesh', 'Maharashtra', 'Tamil Nadu', 'Punjab', 'Rajasthan',
  'Odisha', 'Assam', 'Kerala', 'Haryana', 'Jharkhand', 'Tripura', 'Goa',
  'Sikkim', 'Mizoram', 'Bihar', 'West Bengal', 'Karnataka', 'Gujarat',
  'Madhya Pradesh', 'Andhra Pradesh', 'Telangana', 'Chhattisgarh',
  'Uttarakhand', 'Himachal Pradesh', 'Arunachal Pradesh', 'Nagaland',
  'Manipur', 'Meghalaya'
];

function classifyState(orgName: string, refNo: string, description: string, bidderAddress: string): string {
  const combinedText = `${orgName} ${refNo} ${description} ${bidderAddress}`.toLowerCase();
  
  for (const state of STATES_LIST) {
    if (combinedText.includes(state.toLowerCase())) {
      return state;
    }
  }
  
  // Specific mappings for RO (Regional Office) names if no state match in description
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

/**
 * Parses and processes raw tenders from cppp_tenders_full.json and nhai_tenders.json,
 * then stores them in contracts_store.json with advanced deduplication.
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

  const contracts: ContractRecord[] = [];
  const seenKeys = new Set<string>();

  const cleanText = (str: string) => {
    if (!str) return '';
    return str
      .replace(/&#x0d;/gi, '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 1. Process cppp_tenders_full.json
  if (fs.existsSync(RAW_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
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

          let year = 2025;
          const dateStringForYear = `${contractDate} ${published} ${refNo}`;
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          let category: "NH" | "SH";
          const orgRefStr = `${orgName} ${refNo}`.toUpperCase();
          const isNHAI = orgRefStr.includes('NHAI') || orgRefStr.includes('NATIONAL HIGHWAY') || /\bNH[- ]?\d+/i.test(orgRefStr);
          const hasSHKeywordsInOrgRef = /\bSH[- ]?\d+/i.test(orgRefStr) || orgRefStr.includes('STATE HIGHWAY') || orgRefStr.includes('STATEROAD');

          if (isNHAI) {
            category = 'NH';
          } else if (hasSHKeywordsInOrgRef) {
            category = 'SH';
          } else {
            const descriptionStr = description.toUpperCase();
            const hasSHInDesc = /\bSH[- ]?\d+/i.test(descriptionStr) || descriptionStr.includes('STATE HIGHWAY') || descriptionStr.includes('STATEROAD');
            const isNHProject = /\bNH[- ]?\d+/i.test(orgRefStr);
            category = (hasSHInDesc && !isNHProject) ? 'SH' : 'NH';
          }

          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `cppp_${index + 1}`,
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
              completionPeriod: completion,
              state: classifyState(orgName, refNo, description, address)
            });
          }
        });
      }
    } catch (e) {
      console.error("Error reading/parsing RAW_TENDERS_FILE:", e);
    }
  }

  // 1.5. Process cppp_tenders_full_26_Tripura.json (always classified as state highway 'SH')
  if (fs.existsSync(RAW_TRIPURA_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_TRIPURA_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          const category: "NH" | "SH" = 'SH';

          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `tripura_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Tripura'
            });
          }
        });
      }
    } catch (e) {
      console.error("Error reading/parsing RAW_TRIPURA_TENDERS_FILE:", e);
    }
  }

  // 1.6. Process cppp_tenders_full_24_Meghalaya.json (always classified as state highway 'SH')
  if (fs.existsSync(RAW_MEGHALAYA_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MEGHALAYA_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          let year = 2024;
          const dateStringForYear = `${contractDate} ${published} ${refNo}`;
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          const category: "NH" | "SH" = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `meghalaya_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Meghalaya'
            });
          }
        });
      }
    } catch (e) {
      console.error("Error reading/parsing RAW_MEGHALAYA_TENDERS_FILE:", e);
    }
  }

  // 1.7. Process cppp_tenders_full_24_Mizoram.json (always classified as state highway 'SH')
  if (fs.existsSync(RAW_MIZORAM_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MIZORAM_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          let year = 2024;
          const dateStringForYear = `${contractDate} ${published} ${refNo}`;
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          const category: "NH" | "SH" = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `mizoram_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Mizoram'
            });
          }
        });
      }
    } catch (e) {
      console.error("Error reading/parsing RAW_MIZORAM_TENDERS_FILE:", e);
    }
  }

  // 1.8. Process cppp_tenders_full_25_ARUNACHAL_PRADESH.json
  if (fs.existsSync(RAW_ARUNACHAL_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_ARUNACHAL_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          const category: "NH" | "SH" = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `arunachal_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Arunachal Pradesh'
            });
          }
        });
      }
    } catch (e) { console.error("Error reading/parsing RAW_ARUNACHAL_TENDERS_FILE:", e); }
  }

  // 1.9. Process cppp_tenders_full_25_MANIPUR.json
  if (fs.existsSync(RAW_MANIPUR_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MANIPUR_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          const category: "NH" | "SH" = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `manipur_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Manipur'
            });
          }
        });
      }
    } catch (e) { console.error("Error reading/parsing RAW_MANIPUR_TENDERS_FILE:", e); }
  }

  // 1.10. Process cppp_tenders_full_25_Nagaland.json
  if (fs.existsSync(RAW_NAGALAND_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_NAGALAND_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          const category: "NH" | "SH" = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `nagaland_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Nagaland'
            });
          }
        });
      }
    } catch (e) { console.error("Error reading/parsing RAW_NAGALAND_TENDERS_FILE:", e); }
  }

  // 1.11. Process cppp_tenders_full_26_AAndhra_Pradesh.json
  if (fs.existsSync(RAW_ANDHRA_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_ANDHRA_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
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

          let year = 2026;
          const dateStringForYear = `${contractDate} ${published} ${refNo}`;
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          const category: "NH" | "SH" = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `andhra_${index + 1}`,
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
              completionPeriod: completion,
              state: 'Andhra Pradesh'
            });
          }
        });
      }
    } catch (e) { console.error("Error reading/parsing RAW_ANDHRA_TENDERS_FILE:", e); }
  }

  // 2. Process nhai_tenders.json
  if (fs.existsSync(RAW_NHAI_TENDERS_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_NHAI_TENDERS_FILE, "utf8");
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        parsedData.forEach((item: any, index: number) => {
          const orgName = cleanText(item.organisation_name || '');
          const refNo = cleanText(item.tender_ref_no || '');
          const description = cleanText(item.tender_description || '');
          const document = cleanText(item.tender_document || '');
          const type = cleanText(item.tender_type || 'Works');
          const bids = parseInt((item.num_bids_received || '').replace(/\D/g, ''), 10) || 0;
          const bidder = cleanText(item.selected_bidder_name || '');
          const valStr = (item.contract_value || '').replace(/[^0-9.]/g, '');
          const value = parseFloat(valStr) || 0;
          const published = cleanText(item.published_date || '');
          const contractDate = cleanText(item.contract_date || '');
          const address = cleanText(item.selected_bidder_address || '');
          const completion = cleanText(item.completion_period_days || '');
          const year = parseInt(item.scraped_year || '2025', 10);
          
          let category: "NH" | "SH";
          const orgRefStr = `${orgName} ${refNo}`.toUpperCase();
          const isNHAI = orgRefStr.includes('NHAI') || orgRefStr.includes('NATIONAL HIGHWAY') || /\bNH[- ]?\d+/i.test(orgRefStr);
          const hasSHKeywordsInOrgRef = /\bSH[- ]?\d+/i.test(orgRefStr) || orgRefStr.includes('STATE HIGHWAY') || orgRefStr.includes('STATEROAD');

          if (isNHAI) {
            category = 'NH';
          } else if (hasSHKeywordsInOrgRef) {
            category = 'SH';
          } else {
            const descriptionStr = description.toUpperCase();
            const hasSHInDesc = /\bSH[- ]?\d+/i.test(descriptionStr) || descriptionStr.includes('STATE HIGHWAY') || descriptionStr.includes('STATEROAD');
            const isNHProject = /\bNH[- ]?\d+/i.test(orgRefStr);
            category = (hasSHInDesc && !isNHProject) ? 'SH' : 'NH';
          }

          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (!seenKeys.has(uniqueKey)) {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `nhai_${index + 1}`,
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
              completionPeriod: completion,
              state: classifyState(orgName, refNo, description, address)
            });
          }
        });
      }
    } catch (e) {
      console.error("Error reading/parsing RAW_NHAI_TENDERS_FILE:", e);
    }
  }

  try {
    fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contracts, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write merged contracts database:", error);
  }

  return contracts;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seed = searchParams.get("seed") === "true";
  const categoryFilter = searchParams.get("category"); // "NH" or "SH" or "all"
  const yearFilter = searchParams.get("year"); // "2021" to "2026" or "all"
  const stateFilter = searchParams.get("state"); // State name or "all"
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

    // Filter by State ONLY when selected category is State Highways (SH)
    if (categoryFilter === "SH" && stateFilter && stateFilter !== "all") {
      filtered = filtered.filter(c => c.state === stateFilter);
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
