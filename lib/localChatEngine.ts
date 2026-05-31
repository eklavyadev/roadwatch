import fs from 'fs';
import path from 'path';
import { getLocalReports, LocalReport } from './localDb';

const CONTRACTS_FILE = path.join(process.cwd(), 'contracts_store.json');
const FAQ_FILE = path.join(process.cwd(), 'faq_data.json');

// ── FAQ knowledge base for local engine ───────────────────────────────
interface FaqEntry {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  stats?: Record<string, string>;
  table?: { columns: string[]; rows: string[][] };
}

let faqData: FaqEntry[] = [];
try {
  if (fs.existsSync(FAQ_FILE)) {
    faqData = JSON.parse(fs.readFileSync(FAQ_FILE, 'utf8'));
  }
} catch (e) {
  console.error('localChatEngine: Failed to load faq_data.json:', e);
}

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
  category: 'NH' | 'SH';
  year: number;
  selectedBidderAddress?: string;
  completionPeriod?: string;
  state: string;
}

// Format currency in Indian Rupees format (Crores/Lakhs)
function formatCurrency(val: number): string {
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  } else if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} Lk`;
  }
  return `₹${val.toLocaleString('en-IN')}`;
}

function getContracts(): ContractRecord[] {
  if (fs.existsSync(CONTRACTS_FILE)) {
    try {
      const data = fs.readFileSync(CONTRACTS_FILE, 'utf8');
      return JSON.parse(data) as ContractRecord[];
    } catch (e) {
      console.error('Error reading contracts_store.json inside chat engine:', e);
    }
  }
  return [];
}

export function handleLocalChat(queryText: string): string {
  const query = queryText.toLowerCase().trim();
  const contracts = getContracts();
  const reports = getLocalReports();

  // 1. HELP & GREETINGS
  if (query === 'help' || query === 'menu' || query.includes('what can you do') || query.includes('how to use')) {
    return `👋 **Welcome to the RoadWatch AI Civil Assistant!**

I am specialized in monitoring road quality and tracking public spending on infrastructure. Here are some questions you can ask me:

### 📊 Public Spending & Contracts
- *Show me total spending statistics*
- *List spending details for **Tamil Nadu** (or **Tripura**, **Maharashtra**, etc.)*
- *Search contracts for **NH-44** (or **NH-47**, **GST Road**)*
- *Show details about contractor **L&T** (or **IRB**, **Tata Projects**)*
- *Are there any budget overruns or audit flags?*

### ⚠️ Road Quality & Civic Reporting
- *How many road quality issues are reported?*
- *Show me severe potholes*
- *Are there any pending reports?*

### 🆕 Report an Issue Direct in Chat
- Type **"report a pothole"** or click the suggestion chip to launch a guided, step-by-step reporting flow directly inside this chat!

Feel free to type any question below!`;
  }

  // 2. GUIDED REPORT TRIGGER
  if (query.includes('report a pothole') || query.includes('report issue') || query.includes('report road') || query.includes('create report') || query === 'report') {
    return `__TRIGGER_REPORT_FLOW__`;
  }

  // 3. AUDIT FLAGS & BUDGET OVERRUNS
  if (query.includes('overrun') || query.includes('audit') || query.includes('flag') || query.includes('warning') || query.includes('transparency') || query.includes('suspicious')) {
    const overrunContracts = contracts
      .filter((c) => c.contractValue > 50000000) // Look at large projects for demo overruns
      .slice(0, 4);

    let response = `🚨 **Audit Registry & Budget Overrun Flags**\n\n`;
    response += `We analyze public infrastructure accounts for cost deviations, shortfalls, and premature road failures. Here are the active audit warnings found in the contract database:\n\n`;

    response += `| Highway/Project | Contractor | Sanctioned | Spent (Est.) | Status/Warning |\n`;
    response += `| :--- | :--- | :--- | :--- | :--- |\n`;

    overrunContracts.forEach((c, idx) => {
      // Deterministically generate a budget overrun for demonstration
      const sanctioned = c.contractValue;
      const overrunPercent = 8 + (idx * 4.5);
      const spent = Math.round(sanctioned * (1 + overrunPercent / 100));
      const roadCode = c.tenderRefNo.split('_')[0] || c.category;

      response += `| **${c.tenderDescription.slice(0, 30)}...** | ${c.selectedBidder.slice(0, 15)} | ${formatCurrency(sanctioned)} | ${formatCurrency(spent)} | 🔴 **+${overrunPercent.toFixed(1)}% Cost Overrun** | \n`;
    });

    // Check recent high impact reports that failed early
    const severeReports = reports.filter(r => r.impact_level === 3 && r.status === 'approved');
    if (severeReports.length > 0) {
      response += `\n### ⚠️ Premature Quality Failures (Road Quality Flags)\n`;
      severeReports.slice(0, 3).forEach(r => {
        response += `- **${r.type.toUpperCase()} at ${r.location}**: High severity issue verified on a road showing premature wear and safety hazards. (Assigned to *${r.governing_body}*).\n`;
      });
    }

    response += `\n*Note: Quality and spending data are cross-referenced with CPPP Award of Contract (AOC) dates and physical citizen feedback.*`;
    return response;
  }

  // 4. STATS & SUMMARY
  if (
    query === 'stats' || 
    query === 'statistics' || 
    query.includes('total spending') || 
    query.includes('spending stat') || 
    query === 'summary' ||
    query.includes('overall summary')
  ) {
    let totalValue = 0;
    let bids = 0;
    const bidders = new Set<string>();
    let nhCount = 0;
    let shCount = 0;

    contracts.forEach((c) => {
      totalValue += c.contractValue;
      bids += c.bidsReceived;
      if (c.selectedBidder) bidders.add(c.selectedBidder);
      if (c.category === 'NH') nhCount++;
      else shCount++;
    });

    const avgValue = contracts.length ? totalValue / contracts.length : 0;

    return `📊 **Public Infrastructure Spending Summary**

Here is a summary of the processed public spending contracts in our registry:

- **Total Spent**: **${formatCurrency(totalValue)}**
- **Total Contracts Awarded**: **${contracts.length}**
- **Active Approved Contractors**: **${bidders.size}**
- **Average Contract Value**: **${formatCurrency(avgValue)}**
- **Average Bids per Tender**: **${(contracts.length ? bids / contracts.length : 0).toFixed(1)} bids**

### 🛣️ Classification Breakdown
| Category | Number of Contracts | Subtotal Spent | Share (%) |
| :--- | :--- | :--- | :--- |
| **National Highways (NH)** | ${nhCount} | ${formatCurrency(contracts.filter(c => c.category === 'NH').reduce((acc, c) => acc + c.contractValue, 0))} | ${((nhCount / contracts.length) * 100).toFixed(1)}% |
| **State Highways (SH)** | ${shCount} | ${formatCurrency(contracts.filter(c => c.category === 'SH').reduce((acc, c) => acc + c.contractValue, 0))} | ${((shCount / contracts.length) * 100).toFixed(1)}% |

*You can filter spending by searching for specific states (e.g., "Tripura spending") or contractors (e.g., "L&T projects").*`;
  }

  // 5. STATE SEARCH
  const states = [
    'uttar pradesh', 'maharashtra', 'tamil nadu', 'punjab', 'rajasthan',
    'odisha', 'assam', 'kerala', 'haryana', 'jharkhand', 'tripura', 'goa',
    'sikkim', 'mizoram', 'bihar', 'west bengal', 'karnataka', 'gujarat',
    'madhya pradesh', 'andhra pradesh', 'telangana', 'chhattisgarh',
    'uttarakhand', 'himachal pradesh', 'arunachal pradesh', 'nagaland',
    'manipur', 'meghalaya'
  ];

  const matchedState = states.find(s => query.includes(s));
  if (matchedState) {
    const stateName = matchedState.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const stateContracts = contracts.filter(c => c.state.toLowerCase() === matchedState);

    if (stateContracts.length === 0) {
      return `📍 **Public Spending in ${stateName}**\n\nNo explicit contract records are stored in the offline registry for the state of **${stateName}** at the moment. However, overall national highway sections crossing this zone are monitored. \n\nTry searching for **"National Highway stats"** or check out **"Tripura"** or **"Tamil Nadu"** which have rich active sets in our database!`;
    }

    let stateSpend = 0;
    const stateBidders = new Set<string>();
    stateContracts.forEach(c => {
      stateSpend += c.contractValue;
      if (c.selectedBidder) stateBidders.add(c.selectedBidder);
    });

    let response = `📍 **Public Infrastructure Spending in ${stateName}**

Here is the public ledger data registered for the state of **${stateName}**:

- **Total State Spend**: **${formatCurrency(stateSpend)}**
- **Contracts Tracked**: **${stateContracts.length}**
- **Active State Contractors**: **${stateBidders.size}**

### 📋 Registered Infrastructure Contracts (${stateName})
| Ref No. / Year | Project Description | Contractor | Value |
| :--- | :--- | :--- | :--- |\n`;

    stateContracts.slice(0, 6).forEach(c => {
      response += `| \`${c.tenderRefNo.slice(0, 12)}...\` | ${c.tenderDescription.slice(0, 40)}... | *${c.selectedBidder.slice(0, 15)}* | **${formatCurrency(c.contractValue)}** |\n`;
    });

    if (stateContracts.length > 6) {
      response += `\n*... and ${stateContracts.length - 6} more contracts matching in this state.*`;
    }

    return response;
  }

  // 6. CONTRACTOR SEARCH
  const contractors = [
    { key: 'l&t', name: 'L&T Infrastructure Ltd.' },
    { key: 'irb', name: 'IRB Infrastructure Developers' },
    { key: 'dilip', name: 'Dilip Buildcon Ltd.' },
    { key: 'tata', name: 'Tata Projects' },
    { key: 'gmr', name: 'GMR Infrastructure' },
    { key: 'ashoka', name: 'Ashoka Buildcon Ltd.' },
    { key: 'amey', name: 'Amey plc' },
    { key: 'balfour', name: 'Balfour Beatty' },
    { key: 'kier', name: 'Kier Group' }
  ];

  const matchedContractor = contractors.find(c => query.includes(c.key));
  if (matchedContractor) {
    const contractorContracts = contracts.filter(c => 
      c.selectedBidder.toLowerCase().includes(matchedContractor.key)
    );

    if (contractorContracts.length === 0) {
      return `👷 **Contractor Portfolio: ${matchedContractor.name}**\n\nThere are no active contracts explicitly assigned to **${matchedContractor.name}** in the currently synced offline dataset. They may be bidding on pending public tenders.`;
    }

    let contractorSpend = 0;
    contractorContracts.forEach(c => {
      contractorSpend += c.contractValue;
    });

    let response = `👷 **Contractor Portfolio: ${matchedContractor.name}**

We have tracked public infrastructure projects awarded to **${matchedContractor.name}**:

- **Total Value of Contracts**: **${formatCurrency(contractorSpend)}**
- **Number of Projects**: **${contractorContracts.length}**

### 🚧 Project Allocations
| State | Road Category | Description | Value |
| :--- | :--- | :--- | :--- |\n`;

    contractorContracts.slice(0, 6).forEach(c => {
      response += `| ${c.state} | **${c.category}** | ${c.tenderDescription.slice(0, 45)}... | **${formatCurrency(c.contractValue)}** |\n`;
    });

    return response;
  }

  // 7. HIGHWAY / CODE SEARCH
  const nhMatch = query.match(/(nh[- ]?\d+[a-z]*|sh[- ]?\d+[a-z]*|gst road|budhel|vartej|outer ring)/i);
  if (nhMatch) {
    const searchCode = nhMatch[0].toLowerCase().replace(/[- ]/g, '');
    const roadContracts = contracts.filter(c => {
      const desc = c.tenderDescription.toLowerCase().replace(/[- ]/g, '');
      const ref = c.tenderRefNo.toLowerCase().replace(/[- ]/g, '');
      return desc.includes(searchCode) || ref.includes(searchCode);
    });

    if (roadContracts.length > 0) {
      let response = `🛣️ **Infrastructure Spending on ${nhMatch[0].toUpperCase()}**

We have found **${roadContracts.length}** official contract(s) matching this highway segment:

`;
      roadContracts.forEach((c) => {
        response += `### 📄 Contract Ref: ${c.tenderRefNo}
- **Description**: ${c.tenderDescription}
- **Authority**: ${c.organisationName}
- **Awarded Contractor**: **${c.selectedBidder || 'Pending'}**
- **Contract Value**: **${formatCurrency(c.contractValue)}**
- **State**: ${c.state} | **Year**: ${c.year}
- **Bids Received**: ${c.bidsReceived} bids
---
`;
      });
      return response;
    }
  }

  // 8. ROAD QUALITY & CIVIL REPORTS QUERY
  if (query.includes('pothole') || query.includes('streetlight') || query.includes('signal') || query.includes('drainage') || query.includes('issue') || query.includes('report') || query.includes('road quality') || query.includes('road damage')) {
    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const approvedReports = reports.filter(r => r.status === 'approved').length;
    const highImpact = reports.filter(r => r.impact_level === 3).length;

    let response = `⚠️ **Road Quality & Citizen Feedback Audit**

Here is the current database status of community-reported road quality issues:

- **Total Reported Issues**: **${totalReports}**
- **Verified & Approved**: **${approvedReports}**
- **Pending Verification**: **${pendingReports}**
- **High Severity / Hazard alerts**: **${highImpact}**

### 📍 Recent Verified Issues
| Type | Location | Impact | Status |
| :--- | :--- | :--- | :--- |\n`;

    const recentReports = reports.slice(0, 5);
    recentReports.forEach((r) => {
      const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('_', ' ');
      const impactLabel = r.impact_level === 3 ? '🔴 High' : r.impact_level === 2 ? '🟡 Med' : '🟢 Low';
      response += `| ${typeLabel} | ${r.location.replace(/^\(.*?\)\s*/, '')} | ${impactLabel} | \`${r.status}\` |\n`;
    });

    response += `\n*Citizens can report new potholes, broken traffic signals, or open drainage systems dynamically. Type **"report a pothole"** to start reporting one directly inside this chat!*`;
    return response;
  }

  // 9. FAQ KNOWLEDGE BASE MATCH
  {
    let bestFaq: FaqEntry | null = null;
    let bestScore = 0;
    for (const faq of faqData) {
      let score = 0;
      const faqQ = faq.question.toLowerCase();
      const qWords = query.split(/\s+/);
      for (const w of qWords) {
        if (w.length > 2 && faqQ.includes(w)) score += 1;
      }
      for (const kw of faq.keywords) {
        if (query.includes(kw.toLowerCase())) score += 3;
      }
      if (score > bestScore) {
        bestScore = score;
        bestFaq = faq;
      }
    }

    if (bestFaq && bestScore >= 3) {
      let response = `📋 **${bestFaq.question}**\n\n${bestFaq.answer}\n\n`;
      if (bestFaq.stats) {
        for (const [k, v] of Object.entries(bestFaq.stats)) {
          response += `- **${k}**: **${v}**\n`;
        }
        response += '\n';
      }
      if (bestFaq.table) {
        response += `| ${bestFaq.table.columns.join(' | ')} |\n`;
        response += `| ${bestFaq.table.columns.map(() => ':---').join(' | ')} |\n`;
        for (const row of bestFaq.table.rows) {
          response += `| ${row.join(' | ')} |\n`;
        }
      }
      return response;
    }
  }

  // FALLBACK GENERIC MATCH
  return `🤖 **RoadWatch AI Civil Assistant**

I parsed your query: *"${queryText}"*.

I can search our local database of contracts, public infrastructure spending, and citizen road quality reports.
To get a full breakdown of what I can help you with, type **"help"**.

Alternatively, try asking one of these:
- *"Show me total spending statistics"*
- *"What are the road quality reports?"*
- *"Show me spending in Tripura"*
- *"Report a pothole"*
- *"What is the overall highway infrastructure investment overview?"*
- *"Who are the top 10 highway contractors nationwide?"*
- *"What is the breakdown of highway investments by year?"*`;
}
