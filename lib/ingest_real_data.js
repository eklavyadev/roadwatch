const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'cppp_tenders_full.json');
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

  if (!fs.existsSync(RAW_FILE)) {
    console.error(`Raw data file not found at: ${RAW_FILE}`);
    process.exit(1);
  }

  try {
    const rawData = fs.readFileSync(RAW_FILE, 'utf8');
    const parsedData = JSON.parse(rawData);

    if (!Array.isArray(parsedData)) {
      console.error('Expected an array of tenders in JSON.');
      process.exit(1);
    }

    console.log(`Found ${parsedData.length} raw tenders in source file.`);

    const contracts = [];

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
      const yearMatch = dateStringForYear.match(/\b(2025|2026)\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[1], 10);
      }

      // Determine Category: NH vs SH
      // Standard rule: NH if Organisation contains NHAI or National Highways, or Ref No / Description contains NHAI, NH-, National Highway
      let category = 'SH';
      const searchStr = `${orgName} ${refNo} ${description}`.toUpperCase();
      if (
        searchStr.includes('NHAI') ||
        searchStr.includes('NATIONAL HIGHWAY') ||
        /\bNH[- ]?\d+/i.test(searchStr)
      ) {
        category = 'NH';
      }

      // We only store the data for years 2025 and 2026
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

    console.log(`Ingested ${contracts.length} high-fidelity contracts for years 2025 and 2026.`);
    
    // Write out the processed data
    fs.writeFileSync(TARGET_FILE, JSON.stringify(contracts, null, 2));
    console.log(`Successfully wrote processed contracts to: ${TARGET_FILE}`);

  } catch (error) {
    console.error('Ingestion failed with error:', error);
    process.exit(1);
  }
}

runIngestion();
