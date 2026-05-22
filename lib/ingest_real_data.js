const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'cppp_tenders_full.json');
const RAW_NHAI_FILE = path.join(__dirname, '..', '..', 'nhai_tenders.json');
const TARGET_FILE = path.join(__dirname, '..', 'contracts_store.json');

const STATES_LIST = [
  'Uttar Pradesh', 'Maharashtra', 'Tamil Nadu', 'Punjab', 'Rajasthan',
  'Odisha', 'Assam', 'Kerala', 'Haryana', 'Jharkhand', 'Tripura', 'Goa',
  'Sikkim', 'Mizoram', 'Bihar', 'West Bengal', 'Karnataka', 'Gujarat',
  'Madhya Pradesh', 'Andhra Pradesh', 'Telangana', 'Chhattisgarh',
  'Uttarakhand', 'Himachal Pradesh', 'Arunachal Pradesh', 'Nagaland',
  'Manipur', 'Meghalaya'
];

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&#x0d;/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyState(orgName, refNo, description, bidderAddress) {
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

function runIngestion() {
  console.log('Starting ingestion of real tenders data with state-wise SH support...');

  const contracts = [];
  const seenKeys = new Set();
  let cpppCount = 0;
  let nhaiCount = 0;
  let duplicateCount = 0;

  // 1. Process cppp_tenders_full.json
  if (fs.existsSync(RAW_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);

      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full.json.`);
        
        parsedData.forEach((item, index) => {
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
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          // Determine Category: NH vs SH
          // Rule: If org/ref belongs to NHAI or National Highway → always NH.
          // SH only for non-NHAI orgs that genuinely manage state highways.
          const orgRefStr = `${orgName} ${refNo}`.toUpperCase();
          const isNHAI = orgRefStr.includes('NHAI') || orgRefStr.includes('NATIONAL HIGHWAY') || /\bNH[- ]?\d+/i.test(orgRefStr);
          const hasSHKeywordsInOrgRef = /\bSH[- ]?\d+/i.test(orgRefStr) || orgRefStr.includes('STATE HIGHWAY') || orgRefStr.includes('STATEROAD');

          let category;
          if (isNHAI) {
            // NHAI projects are always National Highways, even if description mentions SH numbers in passing
            category = 'NH';
          } else if (hasSHKeywordsInOrgRef) {
            category = 'SH';
          } else {
            // For non-NHAI orgs, also check the description for genuine SH classification
            const descriptionStr = description.toUpperCase();
            const hasSHInDesc = /\bSH[- ]?\d+/i.test(descriptionStr) || descriptionStr.includes('STATE HIGHWAY') || descriptionStr.includes('STATEROAD');
            const isNHProject = /\bNH[- ]?\d+/i.test(orgRefStr);
            category = (hasSHInDesc && !isNHProject) ? 'SH' : 'NH';
          }

          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (seenKeys.has(uniqueKey)) {
            duplicateCount++;
          } else {
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
            cpppCount++;
          }
        });
      }
    } catch (e) {
      console.error('Error reading/parsing cppp_tenders_full.json:', e);
    }
  } else {
    console.log(`CPPP file not found at: ${RAW_FILE}`);
  }

  // 2. Process nhai_tenders.json
  if (fs.existsSync(RAW_NHAI_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_NHAI_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);

      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in nhai_tenders.json.`);
        
        parsedData.forEach((item, index) => {
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
          
          // Determine Category: NH vs SH
          // Rule: If org/ref is NHAI or National Highway → always NH.
          // SH only if org is NOT NHAI and description/ref explicitly mentions State Highway keywords.
          const searchStr = `${orgName} ${refNo} ${description}`.toUpperCase();
          const orgRefStr = `${orgName} ${refNo}`.toUpperCase();
          const isNHAI = orgRefStr.includes('NHAI') || orgRefStr.includes('NATIONAL HIGHWAY') || /\bNH[- ]?\d+/i.test(orgRefStr);
          const hasSHKeywordsInOrgRef = /\bSH[- ]?\d+/i.test(orgRefStr) || orgRefStr.includes('STATE HIGHWAY') || orgRefStr.includes('STATEROAD');
          
          let category;
          if (isNHAI) {
            // NHAI projects are always National Highways, even if description mentions SH numbers in passing
            category = 'NH';
          } else if (hasSHKeywordsInOrgRef) {
            category = 'SH';
          } else {
            // For non-NHAI orgs, also check the description for genuine SH classification
            const descriptionStr = description.toUpperCase();
            const hasSHInDesc = /\bSH[- ]?\d+/i.test(descriptionStr) || descriptionStr.includes('STATE HIGHWAY') || descriptionStr.includes('STATEROAD');
            const isNHProject = /\bNH[- ]?\d+/i.test(orgRefStr);
            category = (hasSHInDesc && !isNHProject) ? 'SH' : 'NH';
          }

          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (seenKeys.has(uniqueKey)) {
            duplicateCount++;
          } else {
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
            nhaiCount++;
          }
        });
      }
    } catch (e) {
      console.error('Error reading/parsing nhai_tenders.json:', e);
    }
  } else {
    console.log(`NHAI file not found at: ${RAW_NHAI_FILE}`);
  }

  // Count how many are classified as SH and NH
  let dbNHCount = 0;
  let dbSHCount = 0;
  contracts.forEach(c => {
    if (c.category === 'NH') dbNHCount++;
    else dbSHCount++;
  });

  console.log(`Ingested ${contracts.length} unique records total.`);
  console.log(`CPPP Records: ${cpppCount}`);
  console.log(`NHAI Records: ${nhaiCount}`);
  console.log(`Category Breakdown - NH: ${dbNHCount}, SH: ${dbSHCount}`);
  console.log(`Duplicates Skipped: ${duplicateCount}`);

  try {
    // Write out the processed data
    fs.writeFileSync(TARGET_FILE, JSON.stringify(contracts, null, 2));
    console.log(`Successfully wrote processed contracts to: ${TARGET_FILE}`);
  } catch (error) {
    console.error('Ingestion failed with error:', error);
    process.exit(1);
  }
}

runIngestion();
