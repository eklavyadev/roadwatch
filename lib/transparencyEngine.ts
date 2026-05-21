// Deterministic Geo-Transparency & Spending Engine
// Localizes road types, currencies, contractors, budgets, and Executive Engineers based on lat/lng

export interface TransparencyDetails {
  country: string;
  roadName: string;
  roadType: string;
  lastRelayingDate: string;
  contractorName: string;
  amountSanctioned: number;
  amountSpent: number;
  currencySymbol: string;
  currencyCode: string;
  spendingSource: string;
  authorityBody: string;
  executiveEngineer: string;
  engineerEmail: string;
  transparencyScore: number; // 0 to 100
  auditFlags: string[];
}

// Simple seedable random generator for deterministic data mapping
function createSeededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    // Park-Miller LCG
    hash = (hash * 16807) % 2147483647;
    return Math.abs((hash - 1) / 2147483646);
  };
}

export function getTransparencyDetails(
  lat: number,
  lng: number,
  reportId: string,
  impactLevel: number = 2
): TransparencyDetails {
  const seed = `${lat.toFixed(4)}_${lng.toFixed(4)}_${reportId}`;
  const random = createSeededRandom(seed);

  // 1. Identify Country using Coordinates
  let country = 'Global Fallback';
  let isIndia = false;
  let isUSA = false;
  let isUK = false;

  // rough geographic bounds
  if (lat >= 5.0 && lat <= 38.0 && lng >= 67.0 && lng <= 98.0) {
    country = 'India';
    isIndia = true;
  } else if (lat >= 24.0 && lat <= 49.0 && lng >= -125.0 && lng <= -66.0) {
    country = 'United States';
    isUSA = true;
  } else if (lat >= 49.0 && lat <= 61.0 && lng >= -9.0 && lng <= 2.0) {
    country = 'United Kingdom';
    isUK = true;
  }

  // 2. Determine localized properties
  let roadType = 'Local Access Road';
  let roadName = 'Main Arterial St';
  let currencySymbol = '$';
  let currencyCode = 'USD';
  let contractorName = 'Global Infrastructure Builders';
  let authorityBody = 'Department of Public Works';
  let executiveEngineer = 'Alex Mercer';
  let engineerEmail = 'engineer@publicworks.org';
  let spendingSource = 'Municipal Public Accounts Portal';

  // Base financial scale
  let baseSanctioned = 150000;
  
  if (isIndia) {
    const roadTypes = [
      'National Highway (NH)',
      'State Highway (SH)',
      'Major District Road (MDR)',
      'Municipal Corporation Road',
    ];
    const contractors = [
      'L&T Infrastructure Ltd.',
      'IRB Infrastructure Developers',
      'Dilip Buildcon Ltd.',
      'Tata Projects',
      'GMR Infrastructure',
      'PWD Class-A Registered Contractor',
    ];
    const authorities = [
      'State Public Works Department (PWD)',
      'National Highways Authority of India (NHAI)',
      'Greater Chennai Corporation (GCC)',
      'Municipal Engineering Services',
    ];
    const engineers = [
      { name: 'EE Rajesh Kumar', email: 'ee.highway.rajesh@pwd.gov.in' },
      { name: 'EE Ananya Sharma', email: 'ee.urban.ananya@gcc.gov.in' },
      { name: 'EE Amit Patel', email: 'ee.nhai.amit@nhai.org' },
      { name: 'EE Sandeep Patil', email: 'ee.pwd.sandeep@pwd.gov.in' },
    ];
    const roadNames = [
      'GST Road',
      'OMR Expressway',
      'NH-44 Bypass',
      'Mahatma Gandhi Road',
      'Mount Road (Anna Salai)',
      'Link Road Sector 4',
    ];

    currencySymbol = '₹';
    currencyCode = 'INR';
    roadType = roadTypes[Math.floor(random() * roadTypes.length)];
    roadName = roadNames[Math.floor(random() * roadNames.length)];
    contractorName = contractors[Math.floor(random() * contractors.length)];
    authorityBody = authorities[Math.floor(random() * authorities.length)];
    
    const eng = engineers[Math.floor(random() * engineers.length)];
    executiveEngineer = eng.name;
    engineerEmail = eng.email;
    spendingSource = `${authorityBody} Budget Audit Registry`;
    baseSanctioned = 45000000; // in INR (e.g. 4.5 Crores)

  } else if (isUSA) {
    const roadTypes = ['Interstate Highway', 'US Route', 'State Route', 'County Road', 'City Street'];
    const contractors = ['Granite Construction Inc.', 'Kiewit Corporation', 'Aecom Projects', 'Lane Construction', 'Fluor Infrastructure'];
    const authorities = ['State Department of Transportation (DOT)', 'County Highway Authority', 'City Bureau of Engineering'];
    const engineers = [
      { name: 'District Engineer Michael Vance', email: 'm.vance@caltrans.ca.gov' },
      { name: 'Highways Division Head Sarah Jenkins', email: 's.jenkins@dot.ny.gov' },
      { name: 'County Engineer David Sterling', email: 'd.sterling@countyhighways.org' },
    ];
    const roadNames = ['Interstate 80', 'Route 101', 'Broadway Ave', 'Sunset Blvd', 'County Rd 45'];

    currencySymbol = '$';
    currencyCode = 'USD';
    roadType = roadTypes[Math.floor(random() * roadTypes.length)];
    roadName = roadNames[Math.floor(random() * roadNames.length)];
    contractorName = contractors[Math.floor(random() * contractors.length)];
    authorityBody = authorities[Math.floor(random() * authorities.length)];

    const eng = engineers[Math.floor(random() * engineers.length)];
    executiveEngineer = eng.name;
    engineerEmail = eng.email;
    spendingSource = 'State OpenSpending & Infrastructure Ledger';
    baseSanctioned = 750000; // in USD

  } else if (isUK) {
    const roadTypes = ['Motorway (M-Road)', 'Primary Road (A-Road)', 'Secondary Road (B-Road)', 'Local Street'];
    const contractors = ['Balfour Beatty', 'Kier Group', 'Galliford Try Ltd.', 'Amey plc', 'Tarmac Ltd.'];
    const authorities = ['National Highways UK', 'Local Borough Highways Dept', 'County Council Engineering'];
    const engineers = [
      { name: 'Highways Area Manager Alistair Cooke', email: 'alistair.cooke@nationalhighways.co.uk' },
      { name: 'Borough Inspector David Bennett', email: 'highways.enquiries@camden.gov.uk' },
    ];
    const roadNames = ['M4 Motorway', 'A406 Circular Road', 'High Street', 'London Road', 'B201 Link Rd'];

    currencySymbol = '£';
    currencyCode = 'GBP';
    roadType = roadTypes[Math.floor(random() * roadTypes.length)];
    roadName = roadNames[Math.floor(random() * roadNames.length)];
    contractorName = contractors[Math.floor(random() * contractors.length)];
    authorityBody = authorities[Math.floor(random() * authorities.length)];

    const eng = engineers[Math.floor(random() * engineers.length)];
    executiveEngineer = eng.name;
    engineerEmail = eng.email;
    spendingSource = 'UK Government Contracts Finder Database';
    baseSanctioned = 500000; // in GBP

  } else {
    // Global generic
    currencySymbol = '$';
    currencyCode = 'USD';
    roadName = `Sector ${Math.floor(random() * 20) + 1} Transit Road`;
    baseSanctioned = 300000;
  }

  // 3. Generate deterministic Relaying Date & Financials
  // Relaying date within the last 3 years
  const monthsAgo = Math.floor(random() * 36) + 1; // 1 to 36 months ago
  const relayingDate = new Date();
  relayingDate.setMonth(relayingDate.getMonth() - monthsAgo);
  const relayingDateStr = relayingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  // Sanctioned budget
  const scaleFactor = 0.5 + random() * 1.5; // multiplier from 0.5x to 2.0x
  const amountSanctioned = Math.round(baseSanctioned * scaleFactor);

  // Spent budget (procedurally map overruns or underruns)
  const spentRatio = 0.85 + random() * 0.35; // spent ranges from 85% to 120% of sanctioned
  const amountSpent = Math.round(amountSanctioned * spentRatio);

  // 4. Calculate Transparency Score & Audit Flags
  let transparencyScore = 100;
  const auditFlags: string[] = [];

  // Flag A: Cost Overrun
  if (amountSpent > amountSanctioned) {
    const overrunPercent = ((amountSpent - amountSanctioned) / amountSanctioned) * 100;
    transparencyScore -= Math.min(25, Math.round(overrunPercent));
    auditFlags.push(`Cost Overrun Alert (+${overrunPercent.toFixed(1)}% budget deviation)`);
  }

  // Flag B: Substandard Quality vs Recent Work
  // If repaved recently (less than 9 months) and is a high impact issue
  if (monthsAgo < 9) {
    if (impactLevel === 3) {
      transparencyScore -= 45;
      auditFlags.push(`Critical Quality Failure: Severe damage detected within only ${monthsAgo} months of full relaying`);
    } else if (impactLevel === 2) {
      transparencyScore -= 25;
      auditFlags.push(`Premature Wear Warning: Moderate distress detected within only ${monthsAgo} months of relaying`);
    }
  }

  // Flag C: Under-spending / Sub-contracting Risk
  if (amountSpent < amountSanctioned * 0.9) {
    transparencyScore -= 10;
    auditFlags.push(`Under-utilization Flag: Only ${Math.round(spentRatio * 100)}% of sanctioned budget deployed. Possible substandard delivery`);
  }

  // Bound check transparency score
  transparencyScore = Math.max(15, Math.min(100, transparencyScore));

  return {
    country,
    roadName,
    roadType,
    lastRelayingDate: relayingDateStr,
    contractorName,
    amountSanctioned,
    amountSpent,
    currencySymbol,
    currencyCode,
    spendingSource,
    authorityBody,
    executiveEngineer,
    engineerEmail,
    transparencyScore,
    auditFlags,
  };
}
