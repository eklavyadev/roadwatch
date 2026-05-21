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

// CPPP Tender static map for unified details retrieval across maps, lists, and modals
export const CPPP_TENDERS_MAP: Record<string, { slNo: string; aocDate: string; closingDate: string; title: string; orgName: string }> = {
  "2025_NHAI_259959_1": {
    slNo: "1",
    aocDate: "10-Mar-2026 12:00 AM",
    closingDate: "23-Dec-2025 05:30 PM",
    title: "Construction of Service Road and Slip In / Slip Out Roads along with allied drain works on the 4-lane stretch of NH-44, from the MP/MH Border covering the Kamptee - Kanhan and Nagpur Bypass in the State of Maharashtra on EPC Mode/ NHAI/RO-NAG/Tender/FM/25-26/39 / 2025_NHAI_259959_1",
    orgName: "National Highways Authority of India||RO-Nagpur - NHAI"
  },
  "2025_NHAI_260098_1": {
    slNo: "2",
    aocDate: "27-Mar-2026 12:00 AM",
    closingDate: "22-Dec-2025 05:00 PM",
    title: "Construction of Long-Term Remedial measures of Landslide/River cut/bank erosion at identified locations between PANDOH TO KULLU on Kiratpur-Manali Section of NH-03 (Old NH-21) in Himachal Pradesh on EPC Mode/ NH AI/ Pandoh Manali /Slope Protection work /EPC /HP/ 2025 (2nd call) / 2025_NHAI_260098_1",
    orgName: "National Highways Authority of India||Head Office - NHAI||Technical - NHAI"
  },
  "2025_NHAI_256630_2": {
    slNo: "3",
    aocDate: "14-Feb-2026 12:00 AM",
    closingDate: "20-Dec-2025 06:00 PM",
    title: "Strengthening of RE walls (Geosynthetic reinforced soil structure) by Grouted and Driven Soil Nails and Polymer grouting in Thanjavur - Trichy Section of NH-83 in the State of Tamil Nadu on Item Rate Basis (2nd Call)/ NHAI/17011/01/135/2025/RO Madurai / 2025_NHAI_256630_2",
    orgName: "National Highways Authority of India||RO-Chennai - NHAI"
  },
  "2025_NHAI_255434_2": {
    slNo: "4",
    aocDate: "28-Jan-2026 12:00 AM",
    closingDate: "20-Dec-2025 11:00 AM",
    title: "Operation and Maintenance including Incident Management of Four laning of Trichy Bypass to Tovarankurichi - Madurai section from Km 0.000 to Km 124.840 of NH-45B (New NH-38) in the State of Tamil Nadu on Item Rate Basis (2nd Call)/ NHAI/17011/01/134/2025/RO Madurai / 2025_NHAI_255434_2",
    orgName: "National Highways Authority of India||RO-Chennai - NHAI"
  },
  "2025_NHAI_259831_1": {
    slNo: "5",
    aocDate: "06-May-2026 12:00 AM",
    closingDate: "19-Dec-2025 06:00 PM",
    title: "Consultancy Services for obtaining Environment Clearance (EC) and submission of Half Yearly Environment Clearance (EC) Compliance Report for Multi Modal Logistic Park (MMLP) at Parsodi and Dorli Village in Wardha, Nagpur in the State of Maharashtra./ MMPL/MMLP/NAGPUR/EC/2025 / 2025_NHAI_259831_1",
    orgName: "National Highways Authority of India||National Highways Logistics Management Limited (HQ Delhi)"
  },
  "2025_NHAI_259505_1": {
    slNo: "6",
    aocDate: "05-Feb-2026 12:00 AM",
    closingDate: "17-Dec-2025 06:55 PM",
    title: "Providing, running -maintenance of commercial vehicle 01 nos. of Bolero Ertiga model or equivalent for Project Office Dehradun, Uttarakhand/ NHLML/PO/UK/VEH/1/2025 / 2025_NHAI_259505_1",
    orgName: "National Highways Authority of India||National Highways Logistics Management Limited (HQ Delhi)"
  },
  "2025_NHAI_259368_1": {
    slNo: "7",
    aocDate: "20-Mar-2026 12:00 AM",
    closingDate: "17-Dec-2025 09:00 AM",
    title: "Four lane with paved shoulders from Budhel Junc. to Vartej Completion period 1.5 Years Maintenance period 5 Years Y junc. Km 0.900 to Km 9.400 on EPC mode under NH (O) in Gujarat/ NHAI/ GJ/202 5/Bhav nagar/E 229230 / 2025_NHAI_259368_1",
    orgName: "National Highways Authority of India||Head Office - NHAI||Technical - NHAI"
  },
  "2025_NHAI_259367_1": {
    slNo: "8",
    aocDate: "20-Mar-2026 12:00 AM",
    closingDate: "17-Dec-2025 09:00 AM",
    title: "Upgradation of existing Four Lane Ahmedabad Godhra Highway from Km 60.000 to 105.000 L-45 Km sec of NH-47 in the state of Gujarat on EPC mode/ NIT/GUJ /2025/Ahmedabad-Godhra /E-296391 / 2025_NHAI_259367_1",
    orgName: "National Highways Authority of India||Head Office - NHAI||Technical - NHAI"
  },
  "2025_NHAI_259347_1": {
    slNo: "9",
    aocDate: "31-Jan-2026 12:00 AM",
    closingDate: "16-Dec-2025 06:55 PM",
    title: "Providing SingleDouble Arm Solar Highway Lightings as short term measures at nine locations on NH12 in Raiganj Police District in State Police Department in the State of West Bengal on item rate basis alongwith 5 years Operation Maintenance/ 02/2025/Providing Single/Double Arm Solar Highway Lightings in Raiganj Police District / 2025_NHAI_259347_1",
    orgName: "National Highways Authority of India||RO-Kolkata - NHAI||Malda - NHAI"
  },
  "2025_NHAI_259172_1": {
    slNo: "10",
    aocDate: "08-Jan-2026 12:00 AM",
    closingDate: "15-Dec-2025 06:00 PM",
    title: "Notice inviting Quotation for the disposal of 220 kv D/C copper cables on as is where is Basis/ NHAI/PIU/DWE/36/02 / 2025_NHAI_259172_1",
    orgName: "National Highways Authority of India||RO-Delhi - NHAI"
  }
};

// In-memory cache registry for dynamic CPPP tenders scraped/fetched from the server
const dynamicTendersCache: Record<string, any> = {};

export function registerDynamicTenders(tenders: any[]) {
  if (!Array.isArray(tenders)) return;
  tenders.forEach((tender) => {
    if (tender && tender.id) {
      dynamicTendersCache[tender.id] = tender;
    }
  });
}

export function getTransparencyDetails(
  lat: number,
  lng: number,
  reportId: string,
  impactLevel: number = 2
): TransparencyDetails {
  // Check memory cache of dynamically registered scraped tenders first
  if (reportId && dynamicTendersCache[reportId]) {
    const tender = dynamicTendersCache[reportId];
    return {
      country: tender.country || 'India',
      roadName: tender.roadName || 'National Highway Section',
      roadType: tender.roadType || 'National Highway (NH)',
      lastRelayingDate: tender.lastRelayingDate || 'Recently',
      contractorName: tender.contractorName || 'NHAI Empanelled Builder',
      amountSanctioned: tender.amountSanctioned || 0,
      amountSpent: tender.amountSpent || 0,
      currencySymbol: tender.currencySymbol || '₹',
      currencyCode: tender.currencyCode || 'INR',
      spendingSource: tender.spendingSource || 'Central Public Procurement Portal',
      authorityBody: tender.authorityBody || 'National Highways Authority of India',
      executiveEngineer: tender.executiveEngineer || 'Supervising Engineer',
      engineerEmail: tender.engineerEmail || 'ee.nhai.amit@nhai.org',
      transparencyScore: tender.transparencyScore || 100,
      auditFlags: tender.auditFlags || []
    };
  }

  // A. Check if the reportId belongs to a real CPPP Central Tender
  if (reportId && CPPP_TENDERS_MAP[reportId]) {
    const tender = CPPP_TENDERS_MAP[reportId];
    
    // Hash key deterministically based on ID to seed the random details
    let hash = 0;
    for (let i = 0; i < reportId.length; i++) {
      hash = reportId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rand = () => {
      hash = (hash * 16807) % 2147483647;
      return Math.abs((hash - 1) / 2147483646);
    };

    // Geocoding extraction rules
    const titleLower = tender.title.toLowerCase();
    let roadName = 'National Highway Section';
    let roadType = 'National Highway (NH)';
    
    const nhMatch = tender.title.match(/NH-\d+/i);
    if (nhMatch) {
      roadName = nhMatch[0].toUpperCase();
    }

    if (titleLower.includes('budhel') || titleLower.includes('vartej')) {
      roadName = 'Bhavnagar Budhel Link Rd';
      roadType = 'State Highway (SH)';
    } else if (titleLower.includes('dehradun')) {
      roadName = 'Mussoorie Bypass Rd';
      roadType = 'Municipal Corporation Road';
    } else if (titleLower.includes('delhi')) {
      roadName = 'Outer Ring Road (Delhi)';
      roadType = 'Municipal Corporation Road';
    }

    const contractors = [
      'L&T Infrastructure Ltd.',
      'IRB Infrastructure Developers',
      'Dilip Buildcon Ltd.',
      'Tata Projects',
      'GMR Infrastructure',
      'Ashoka Buildcon Ltd.',
      'PWD Class-A Registered Contractor',
      'NHAI Empanelled Builder'
    ];

    const engineers = [
      { name: 'EE Rajesh Kumar', email: 'ee.highway.rajesh@pwd.gov.in' },
      { name: 'EE Ananya Sharma', email: 'ee.urban.ananya@gcc.gov.in' },
      { name: 'EE Amit Patel', email: 'ee.nhai.amit@nhai.org' },
      { name: 'EE Sandeep Patil', email: 'ee.pwd.sandeep@pwd.gov.in' },
      { name: 'EE Bikram Chowdhury', email: 'ee.highway.kolkata@pwd.gov.in' },
      { name: 'EE R. K. Negi', email: 'ee.pwd.shimla@pwd.gov.in' }
    ];

    const contractorName = contractors[Math.floor(rand() * contractors.length)];
    const eng = engineers[Math.floor(rand() * engineers.length)];

    let baseSanctioned = 15000000;
    if (titleLower.includes('four lane') || titleLower.includes('upgradation') || titleLower.includes('construction of service') || titleLower.includes('kiratpur-manali')) {
      baseSanctioned = 1850000000;
    } else if (titleLower.includes('strengthening') || titleLower.includes('operation and maintenance') || titleLower.includes('remedial')) {
      baseSanctioned = 280000000;
    } else if (titleLower.includes('consultancy') || titleLower.includes('lighting') || titleLower.includes('commercial vehicle') || titleLower.includes('disposal')) {
      baseSanctioned = 4500000;
    }

    const scaleFactor = 0.7 + rand() * 0.8;
    const amountSanctioned = Math.round(baseSanctioned * scaleFactor);
    const spentRatio = 0.92 + rand() * 0.26;
    const amountSpent = Math.round(amountSanctioned * spentRatio);

    let transparencyScore = 100;
    const auditFlags: string[] = [];

    if (amountSpent > amountSanctioned) {
      const overrunPercent = ((amountSpent - amountSanctioned) / amountSanctioned) * 100;
      transparencyScore -= Math.min(25, Math.round(overrunPercent));
      auditFlags.push(`Cost Overrun Alert (+${overrunPercent.toFixed(1)}% budget deviation)`);
    }

    if (titleLower.includes('remedial') || titleLower.includes('landslide') || titleLower.includes('strengthening')) {
      transparencyScore -= 12;
      auditFlags.push(`Structural Wear Mitigation: Special quality pre-audit triggered for slope stabilization and reinforcing walls`);
    }

    if (amountSpent < amountSanctioned * 0.94) {
      transparencyScore -= 8;
      auditFlags.push(`Funds Underutilization: Under budget deployment. Verifying completed scope of work`);
    }

    transparencyScore = Math.max(25, Math.min(100, transparencyScore));
    const cleanOrg = tender.orgName.split('||')[0] || 'State Public Works Department';

    // Parse AOC Date to simpler readable month string
    let parsedMonthStr = 'Recently';
    const dateMatch = tender.aocDate.match(/([0-9]+-[A-Za-z]+-[0-9]+)/);
    if (dateMatch) {
      parsedMonthStr = dateMatch[1];
    }

    return {
      country: 'India',
      roadName,
      roadType,
      lastRelayingDate: parsedMonthStr,
      contractorName,
      amountSanctioned,
      amountSpent,
      currencySymbol: '₹',
      currencyCode: 'INR',
      spendingSource: `Central Public Procurement Portal (${cleanOrg})`,
      authorityBody: cleanOrg,
      executiveEngineer: eng.name,
      engineerEmail: eng.email,
      transparencyScore,
      auditFlags
    };
  }

  // B. Standard fallback to procedurally generated coordinate seed
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
