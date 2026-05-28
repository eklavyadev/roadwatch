const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '..', 'cppp_tenders_full.json');
const RAW_TRIPURA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Tripura.json');
const RAW_MEGHALAYA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_24_Meghalaya.json');
const RAW_MIZORAM_FILE = path.join(__dirname, '..', 'cppp_tenders_full_24_Mizoram.json');
const RAW_ARUNACHAL_FILE = path.join(__dirname, '..', 'cppp_tenders_full_25_ARUNACHAL_PRADESH.json');
const RAW_MANIPUR_FILE = path.join(__dirname, '..', 'cppp_tenders_full_25_MANIPUR.json');
const RAW_NAGALAND_FILE = path.join(__dirname, '..', 'cppp_tenders_full_25_Nagaland.json');
const RAW_ANDHRA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_AAndhra_Pradesh.json');
const RAW_ASSAM_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Assam.json');
const RAW_GOA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Goa.json');
const RAW_HIMACHAL_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Himachal_Pradesh.json');
const RAW_KERALA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Kerala.json');
const RAW_MP_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_MadhyaPradesh.json');
const RAW_MAHARASHTRA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Maharashtra.json');
const RAW_ODISHA_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Odisha.json');
const RAW_PUNJAB_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Punjab.json');
const RAW_RAJASTHAN_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Rajasthan.json');
const RAW_TN_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Tamil.Nadu.json');
const RAW_UTTARAKHAND_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_Uttarakhand.json');
const RAW_WB_FILE = path.join(__dirname, '..', 'cppp_tenders_full_26_West_Bengal.json');
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

  // 1.5. Process cppp_tenders_full_26_Tripura.json
  let tripuraCount = 0;
  if (fs.existsSync(RAW_TRIPURA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_TRIPURA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);

      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_26_Tripura.json.`);
        
        parsedData.forEach((item, index) => {
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

          // Determine year from contractDate, published date, or refNo
          let year = 2025;
          const dateStringForYear = `${contractDate} ${published} ${refNo}`;
          const yearMatch = dateStringForYear.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) {
            year = parseInt(yearMatch[1], 10);
          }

          // Force category to 'SH' (State Highway) as requested
          const category = 'SH';

          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (seenKeys.has(uniqueKey)) {
            duplicateCount++;
          } else {
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
            tripuraCount++;
          }
        });
      }
    } catch (e) {
      console.error('Error reading/parsing cppp_tenders_full_26_Tripura.json:', e);
    }
  } else {
    console.log(`Tripura file not found at: ${RAW_TRIPURA_FILE}`);
  }

  // 1.6. Process cppp_tenders_full_24_Meghalaya.json
  let meghalayaCount = 0;
  if (fs.existsSync(RAW_MEGHALAYA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MEGHALAYA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);

      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_24_Meghalaya.json.`);
        
        parsedData.forEach((item, index) => {
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

          const category = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (seenKeys.has(uniqueKey)) {
            duplicateCount++;
          } else {
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
            meghalayaCount++;
          }
        });
      }
    } catch (e) {
      console.error('Error reading/parsing cppp_tenders_full_24_Meghalaya.json:', e);
    }
  } else {
    console.log(`Meghalaya file not found at: ${RAW_MEGHALAYA_FILE}`);
  }

  // 1.7. Process cppp_tenders_full_24_Mizoram.json
  let mizoramCount = 0;
  if (fs.existsSync(RAW_MIZORAM_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MIZORAM_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);

      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_24_Mizoram.json.`);
        
        parsedData.forEach((item, index) => {
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

          const category = 'SH';
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');

          if (seenKeys.has(uniqueKey)) {
            duplicateCount++;
          } else {
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
            mizoramCount++;
          }
        });
      }
    } catch (e) {
      console.error('Error reading/parsing cppp_tenders_full_24_Mizoram.json:', e);
    }
  } else {
    console.log(`Mizoram file not found at: ${RAW_MIZORAM_FILE}`);
  }

  // 1.8. Process cppp_tenders_full_25_ARUNACHAL_PRADESH.json
  let arunachalCount = 0;
  if (fs.existsSync(RAW_ARUNACHAL_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_ARUNACHAL_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_25_ARUNACHAL_PRADESH.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `arunachal_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Arunachal Pradesh'
            });
            arunachalCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_25_ARUNACHAL_PRADESH.json:', e); }
  } else { console.log(`Arunachal file not found at: ${RAW_ARUNACHAL_FILE}`); }

  // 1.9. Process cppp_tenders_full_25_MANIPUR.json
  let manipurCount = 0;
  if (fs.existsSync(RAW_MANIPUR_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MANIPUR_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_25_MANIPUR.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `manipur_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Manipur'
            });
            manipurCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_25_MANIPUR.json:', e); }
  } else { console.log(`Manipur file not found at: ${RAW_MANIPUR_FILE}`); }

  // 1.10. Process cppp_tenders_full_25_Nagaland.json
  let nagalandCount = 0;
  if (fs.existsSync(RAW_NAGALAND_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_NAGALAND_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_25_Nagaland.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `nagaland_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Nagaland'
            });
            nagalandCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_25_Nagaland.json:', e); }
  } else { console.log(`Nagaland file not found at: ${RAW_NAGALAND_FILE}`); }

  // 1.11. Process cppp_tenders_full_26_AAndhra_Pradesh.json
  let andhraCount = 0;
  if (fs.existsSync(RAW_ANDHRA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_ANDHRA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_26_AAndhra_Pradesh.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `andhra_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Andhra Pradesh'
            });
            andhraCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_26_AAndhra_Pradesh.json:', e); }
  } else { console.log(`Andhra file not found at: ${RAW_ANDHRA_FILE}`); }

  // 1.12. Process cppp_tenders_full_26_Assam.json
  let assamCount = 0;
  if (fs.existsSync(RAW_ASSAM_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_ASSAM_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_26_Assam.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `assam_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Assam'
            });
            assamCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_26_Assam.json:', e); }
  } else { console.log(`Assam file not found at: ${RAW_ASSAM_FILE}`); }

  // 1.13. Process cppp_tenders_full_26_Goa.json
  let goaCount = 0;
  if (fs.existsSync(RAW_GOA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_GOA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_26_Goa.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `goa_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Goa'
            });
            goaCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_26_Goa.json:', e); }
  } else { console.log(`Goa file not found at: ${RAW_GOA_FILE}`); }

  // 1.14. Process cppp_tenders_full_26_Himachal_Pradesh.json
  let himachalCount = 0;
  if (fs.existsSync(RAW_HIMACHAL_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_HIMACHAL_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_26_Himachal_Pradesh.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `himachal_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Himachal Pradesh'
            });
            himachalCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_26_Himachal_Pradesh.json:', e); }
  } else { console.log(`Himachal file not found at: ${RAW_HIMACHAL_FILE}`); }

  // 1.15. Process cppp_tenders_full_26_Kerala.json
  let keralaCount = 0;
  if (fs.existsSync(RAW_KERALA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_KERALA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in cppp_tenders_full_26_Kerala.json.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `kerala_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Kerala'
            });
            keralaCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing cppp_tenders_full_26_Kerala.json:', e); }
  } else { console.log(`Kerala file not found at: ${RAW_KERALA_FILE}`); }

  // 1.16. Process Madhya Pradesh
  let mpCount = 0;
  if (fs.existsSync(RAW_MP_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MP_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in MP.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `mp_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Madhya Pradesh'
            });
            mpCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing MP:', e); }
  } else { console.log(`MP file not found`); }

  // 1.17. Process Maharashtra
  let maharashtraCount = 0;
  if (fs.existsSync(RAW_MAHARASHTRA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_MAHARASHTRA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in Maharashtra.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `maharashtra_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Maharashtra'
            });
            maharashtraCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing Maharashtra:', e); }
  } else { console.log(`Maharashtra file not found`); }

  // 1.18. Process Odisha
  let odishaCount = 0;
  if (fs.existsSync(RAW_ODISHA_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_ODISHA_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in Odisha.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `odisha_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Odisha'
            });
            odishaCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing Odisha:', e); }
  } else { console.log(`Odisha file not found`); }

  // 1.19. Process Punjab
  let punjabCount = 0;
  if (fs.existsSync(RAW_PUNJAB_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_PUNJAB_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in Punjab.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `punjab_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Punjab'
            });
            punjabCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing Punjab:', e); }
  } else { console.log(`Punjab file not found`); }

  // 1.20. Process Rajasthan
  let rajasthanCount = 0;
  if (fs.existsSync(RAW_RAJASTHAN_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_RAJASTHAN_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in Rajasthan.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `rajasthan_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Rajasthan'
            });
            rajasthanCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing Rajasthan:', e); }
  } else { console.log(`Rajasthan file not found`); }

  // 1.21. Process Tamil Nadu
  let tnCount = 0;
  if (fs.existsSync(RAW_TN_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_TN_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in TN.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `tn_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Tamil Nadu'
            });
            tnCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing TN:', e); }
  } else { console.log(`TN file not found`); }

  // 1.22. Process Uttarakhand
  let uttarakhandCount = 0;
  if (fs.existsSync(RAW_UTTARAKHAND_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_UTTARAKHAND_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in Uttarakhand.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `uttarakhand_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'Uttarakhand'
            });
            uttarakhandCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing Uttarakhand:', e); }
  } else { console.log(`Uttarakhand file not found`); }

  // 1.23. Process West Bengal
  let wbCount = 0;
  if (fs.existsSync(RAW_WB_FILE)) {
    try {
      const rawData = fs.readFileSync(RAW_WB_FILE, 'utf8');
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        console.log(`Found ${parsedData.length} raw tenders in WB.`);
        parsedData.forEach((item, index) => {
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
          const yearMatch = `${contractDate} ${published} ${refNo}`.match(/\b(2021|2022|2023|2024|2025|2026)\b/);
          if (yearMatch) year = parseInt(yearMatch[1], 10);
          
          const uniqueKey = `${refNo}_${bidder}_${value}`.toLowerCase().replace(/\s+/g, '');
          if (seenKeys.has(uniqueKey)) { duplicateCount++; } else {
            seenKeys.add(uniqueKey);
            contracts.push({
              id: `wb_${index + 1}`, organisationName: orgName, tenderRefNo: refNo, tenderDescription: description,
              tenderDocument: document, tenderType: type, bidsReceived: bids, selectedBidder: bidder,
              contractValue: value, publishedDate: published, contractDate: contractDate, category: 'SH',
              year: year, selectedBidderAddress: address, completionPeriod: completion, state: 'West Bengal'
            });
            wbCount++;
          }
        });
      }
    } catch (e) { console.error('Error reading/parsing WB:', e); }
  } else { console.log(`WB file not found`); }

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
  console.log(`Tripura Records: ${tripuraCount}`);
  console.log(`Meghalaya Records: ${meghalayaCount}`);
  console.log(`Mizoram Records: ${mizoramCount}`);
  console.log(`Arunachal Pradesh Records: ${arunachalCount}`);
  console.log(`Manipur Records: ${manipurCount}`);
  console.log(`Nagaland Records: ${nagalandCount}`);
  console.log(`Andhra Pradesh Records: ${andhraCount}`);
  console.log(`Assam Records: ${assamCount}`);
  console.log(`Goa Records: ${goaCount}`);
  console.log(`Himachal Pradesh Records: ${himachalCount}`);
  console.log(`Kerala Records: ${keralaCount}`);
  console.log(`Madhya Pradesh Records: ${mpCount}`);
  console.log(`Maharashtra Records: ${maharashtraCount}`);
  console.log(`Odisha Records: ${odishaCount}`);
  console.log(`Punjab Records: ${punjabCount}`);
  console.log(`Rajasthan Records: ${rajasthanCount}`);
  console.log(`Tamil Nadu Records: ${tnCount}`);
  console.log(`Uttarakhand Records: ${uttarakhandCount}`);
  console.log(`West Bengal Records: ${wbCount}`);
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
