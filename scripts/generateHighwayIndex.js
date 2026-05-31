/**
 * generateHighwayIndex.js
 *
 * Extracts all unique NH / SH identifiers and states from contracts_store.json
 * and writes them to highway_index.json for the chatbot dropdown.
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_FILE = path.join(__dirname, '..', 'contracts_store.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'highway_index.json');

let contracts = [];
try {
  contracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, 'utf8'));
  console.log(`Loaded ${contracts.length} contracts`);
} catch (e) {
  console.error('Failed to read contracts_store.json:', e.message);
  process.exit(1);
}

const nhMap = {}; // NH code → { contracts, totalValue, states }
const shMap = {};
const stateMap = {}; // state → { contracts, totalValue }

contracts.forEach((c) => {
  const desc = (c.tenderDescription || '').toUpperCase();
  const ref = (c.tenderRefNo || '').toUpperCase();
  const combined = desc + ' ' + ref;
  const val = c.contractValue || 0;
  const st = c.state || 'Other';

  // State aggregation
  if (!stateMap[st]) stateMap[st] = { contracts: 0, totalValue: 0 };
  stateMap[st].contracts++;
  stateMap[st].totalValue += val;

  // NH extraction
  const nhMatches = combined.matchAll(/\bNH[-\s]?(\d+[A-Z]*)\b/g);
  for (const m of nhMatches) {
    const code = 'NH-' + m[1];
    if (!nhMap[code]) nhMap[code] = { contracts: 0, totalValue: 0, states: new Set() };
    nhMap[code].contracts++;
    nhMap[code].totalValue += val;
    nhMap[code].states.add(st);
  }

  // SH extraction
  const shMatches = combined.matchAll(/\bSH[-\s]?(\d+[A-Z]*)\b/g);
  for (const m of shMatches) {
    const code = 'SH-' + m[1];
    if (!shMap[code]) shMap[code] = { contracts: 0, totalValue: 0, states: new Set() };
    shMap[code].contracts++;
    shMap[code].totalValue += val;
    shMap[code].states.add(st);
  }
});

function formatInr(value) {
  if (!value) return '₹0';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

// Build arrays sorted by number of contracts (descending)
const nhList = Object.entries(nhMap)
  .map(([code, d]) => ({
    code,
    contracts: d.contracts,
    totalValue: formatInr(d.totalValue),
    totalValueRaw: d.totalValue,
    states: [...d.states].sort(),
  }))
  .sort((a, b) => b.contracts - a.contracts);

const shList = Object.entries(shMap)
  .map(([code, d]) => ({
    code,
    contracts: d.contracts,
    totalValue: formatInr(d.totalValue),
    totalValueRaw: d.totalValue,
    states: [...d.states].sort(),
  }))
  .sort((a, b) => b.contracts - a.contracts);

const stateList = Object.entries(stateMap)
  .filter(([st]) => st !== 'Other')
  .map(([state, d]) => ({
    state,
    contracts: d.contracts,
    totalValue: formatInr(d.totalValue),
    totalValueRaw: d.totalValue,
  }))
  .sort((a, b) => b.totalValueRaw - a.totalValueRaw);

const output = {
  generatedAt: new Date().toISOString(),
  totalContracts: contracts.length,
  highways: {
    nh: nhList,
    sh: shList,
  },
  states: stateList,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
console.log(`\n✅ Generated highway_index.json`);
console.log(`   NH entries: ${nhList.length}`);
console.log(`   SH entries: ${shList.length}`);
console.log(`   States: ${stateList.length}`);
