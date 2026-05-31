/**
 * generateFaq.js
 *
 * Mirrors the 10 FAQ queries from generate_faq.py but reads from
 * contracts_store.json (JSON) instead of SQLite. Writes faq_data.json
 * into the project root so the chat API can load it at runtime.
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_FILE = path.join(__dirname, '..', 'contracts_store.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'faq_data.json');

function formatInr(value) {
  if (!value) return 'N/A';
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function truncateBidder(name) {
  if (!name) return 'N/A';
  if (name.includes(',')) return name.split(',')[0].trim() + ' (and others)';
  return name;
}

// Load contracts
let contracts = [];
try {
  const raw = fs.readFileSync(CONTRACTS_FILE, 'utf8');
  contracts = JSON.parse(raw);
  console.log(`Loaded ${contracts.length} contracts from contracts_store.json`);
} catch (e) {
  console.error('Failed to read contracts_store.json:', e.message);
  process.exit(1);
}

const faqs = [];

// ── Q1: Overall Stats ──────────────────────────────────────────────────
const totalValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
const avgValue = contracts.length ? totalValue / contracts.length : 0;
faqs.push({
  id: 'overall_stats',
  question: 'What is the overall highway infrastructure investment overview?',
  keywords: ['overall', 'overview', 'investment', 'infrastructure', 'total', 'how much', 'highway spending'],
  answer: 'Here is the high-level overview of all highway contracts tracked in the database.',
  stats: {
    'Total Contracts': String(contracts.length),
    'Total Investment': formatInr(totalValue),
    'Average Contract': formatInr(avgValue),
  },
});

// ── Q2: Top 10 States ──────────────────────────────────────────────────
const stateAgg = {};
contracts.forEach((c) => {
  const st = c.state || '';
  if (!st || st === 'Other') return;
  if (!stateAgg[st]) stateAgg[st] = { count: 0, value: 0 };
  stateAgg[st].count++;
  stateAgg[st].value += c.contractValue || 0;
});
const topStates = Object.entries(stateAgg)
  .sort((a, b) => b[1].value - a[1].value)
  .slice(0, 10);
faqs.push({
  id: 'top_states',
  question: 'Show me the top 10 states by highway investment.',
  keywords: ['top states', 'states by investment', 'state ranking', 'which states', 'state spending', 'state wise'],
  answer: 'Here is the breakdown of the top 10 states receiving the highest highway infrastructure investments.',
  table: {
    columns: ['State', 'Number of Contracts', 'Total Value Awarded'],
    rows: topStates.map(([st, d]) => [st, String(d.count), formatInr(d.value)]),
  },
});

// ── Q3: Top 10 Contractors ─────────────────────────────────────────────
const bidderAgg = {};
contracts.forEach((c) => {
  const b = c.selectedBidder || '';
  if (!b) return;
  if (!bidderAgg[b]) bidderAgg[b] = { count: 0, value: 0 };
  bidderAgg[b].count++;
  bidderAgg[b].value += c.contractValue || 0;
});
const topContractors = Object.entries(bidderAgg)
  .sort((a, b) => b[1].value - a[1].value)
  .slice(0, 10);
faqs.push({
  id: 'top_contractors',
  question: 'Who are the top 10 highway contractors nationwide?',
  keywords: ['top contractors', 'biggest contractors', 'contractor ranking', 'who builds', 'largest contractors'],
  answer: 'These are the top 10 contractors based on total awarded contract value.',
  table: {
    columns: ['Contractor', 'Contracts Won', 'Total Value Awarded'],
    rows: topContractors.map(([b, d]) => [truncateBidder(b), String(d.count), formatInr(d.value)]),
  },
});

// ── Q4: Largest Contracts ──────────────────────────────────────────────
const sortedByValue = [...contracts].sort((a, b) => (b.contractValue || 0) - (a.contractValue || 0));
faqs.push({
  id: 'largest_contracts',
  question: 'What are the top 10 largest individual highway contracts?',
  keywords: ['largest contracts', 'biggest contract', 'most expensive', 'highest value', 'mega projects'],
  answer: 'Here are the 10 most massive single highway infrastructure projects awarded.',
  table: {
    columns: ['Tender Ref', 'Contractor', 'State', 'Contract Value'],
    rows: sortedByValue.slice(0, 10).map((c) => [
      (c.tenderRefNo || '').slice(0, 25) + '...',
      truncateBidder(c.selectedBidder),
      c.state || 'N/A',
      formatInr(c.contractValue),
    ]),
  },
});

// ── Q5: Most Competitive Tenders ───────────────────────────────────────
const sortedByBids = [...contracts]
  .filter((c) => c.bidsReceived > 0)
  .sort((a, b) => b.bidsReceived - a.bidsReceived);
faqs.push({
  id: 'competitive_tenders',
  question: 'Which tenders received the highest number of bids?',
  keywords: ['most bids', 'competitive', 'bidding war', 'highest bids', 'most competitive'],
  answer: 'These are the most highly competitive highway tenders, ranked by the number of bids received.',
  table: {
    columns: ['Tender Ref', 'State', 'Bids Received', 'Contract Value'],
    rows: sortedByBids.slice(0, 10).map((c) => [
      (c.tenderRefNo || '').slice(0, 25) + '...',
      c.state || 'N/A',
      String(c.bidsReceived),
      formatInr(c.contractValue),
    ]),
  },
});

// ── Q6: Uttar Pradesh Stats ────────────────────────────────────────────
function buildStateFaq(id, stateName, stateMatch, label) {
  const stateContracts = contracts.filter((c) =>
    (c.state || '').toLowerCase().includes(stateMatch)
  );
  const count = stateContracts.length;
  const total = stateContracts.reduce((s, c) => s + (c.contractValue || 0), 0);

  // top 5 contractors in this state
  const bidders = {};
  stateContracts.forEach((c) => {
    const b = c.selectedBidder || '';
    if (!b) return;
    if (!bidders[b]) bidders[b] = 0;
    bidders[b] += c.contractValue || 0;
  });
  const topBidders = Object.entries(bidders)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    id,
    question: `Detailed spending and top contractors in ${stateName}.`,
    keywords: [stateName.toLowerCase(), `spending in ${stateName.toLowerCase()}`, `contractors in ${stateName.toLowerCase()}`],
    answer: `${stateName} has ${count} contracts totaling ${formatInr(total)}. Here are the top contractors in the state:`,
    table: {
      columns: ['Contractor', `Total Awarded in ${label}`],
      rows: topBidders.map(([b, v]) => [truncateBidder(b), formatInr(v)]),
    },
  };
}
faqs.push(buildStateFaq('up_stats', 'Uttar Pradesh', 'uttar pradesh', 'UP'));
faqs.push(buildStateFaq('mh_stats', 'Maharashtra', 'maharashtra', 'MH'));

// ── Q8: Contractors by Volume ──────────────────────────────────────────
const topByVolume = Object.entries(bidderAgg)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10);
faqs.push({
  id: 'contractors_by_volume',
  question: 'Which contractors have won the most individual contracts (volume)?',
  keywords: ['most contracts won', 'contractor volume', 'number of contracts', 'most prolific'],
  answer: 'These contractors have secured the highest volume of individual highway contracts.',
  table: {
    columns: ['Contractor', 'Number of Contracts', 'Total Value'],
    rows: topByVolume.map(([b, d]) => [truncateBidder(b), String(d.count), formatInr(d.value)]),
  },
});

// ── Q9: Lowest Value Contracts ─────────────────────────────────────────
const sortedAsc = [...contracts]
  .filter((c) => c.contractValue > 0)
  .sort((a, b) => a.contractValue - b.contractValue);
faqs.push({
  id: 'lowest_contracts',
  question: 'Show me the smallest/lowest value highway contracts.',
  keywords: ['smallest contracts', 'lowest value', 'cheapest', 'minimum value'],
  answer: 'Here are the smallest recorded infrastructure contracts in the registry.',
  table: {
    columns: ['Tender Ref', 'State', 'Contractor', 'Contract Value'],
    rows: sortedAsc.slice(0, 10).map((c) => [
      (c.tenderRefNo || '').slice(0, 25) + '...',
      c.state || 'N/A',
      truncateBidder(c.selectedBidder),
      formatInr(c.contractValue),
    ]),
  },
});

// ── Q10: Contracts by Year ─────────────────────────────────────────────
const yearAgg = {};
contracts.forEach((c) => {
  const y = c.year;
  if (!y || y <= 2000) return;
  if (!yearAgg[y]) yearAgg[y] = { count: 0, value: 0 };
  yearAgg[y].count++;
  yearAgg[y].value += c.contractValue || 0;
});
const yearRows = Object.entries(yearAgg)
  .sort((a, b) => Number(b[0]) - Number(a[0]));
faqs.push({
  id: 'by_year',
  question: 'What is the breakdown of highway investments by year?',
  keywords: ['by year', 'yearly', 'year wise', 'annual', 'year breakdown', 'spending per year'],
  answer: 'This table shows the progression of highway infrastructure spending categorized by year.',
  table: {
    columns: ['Year', 'Number of Contracts', 'Total Value'],
    rows: yearRows.map(([y, d]) => [String(y), String(d.count), formatInr(d.value)]),
  },
});

// ── Write output ───────────────────────────────────────────────────────
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(faqs, null, 2), 'utf8');
console.log(`\n✅ Generated ${faqs.length} FAQ entries → ${OUTPUT_FILE}`);
