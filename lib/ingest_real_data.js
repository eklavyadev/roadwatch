const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'cppp_tenders_full.json');
const RAW_NHAI_FILE = path.join(__dirname, '..', '..', 'nhai_tenders.json');
const TARGET_FILE = path.join(__dirname, '..', 'contracts_store.json');

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&#x0d;/gi, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function runIngestion() {
  console.log('Starting ingestion of real tenders data...');

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
          let category = 'SH';
          const searchStr = `${orgName} ${refNo} ${description}`.toUpperCase();
          if (
            searchStr.includes('NHAI') ||
            searchStr.includes('NATIONAL HIGHWAY') ||
            /\bNH[- ]?\d+/i.test(searchStr)
          ) {
            category = 'NH';
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
              completionPeriod: completion
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
          const category = 'NH'; // NHAI is always National Highway

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
              completionPeriod: completion
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

  console.log(`Ingested ${contracts.length} unique records total.`);
  console.log(`CPPP Records: ${cpppCount}`);
  console.log(`NHAI Records: ${nhaiCount}`);
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
