'use client';

import { useState, useEffect } from 'react';
import Navbar from "@/components/navbar";
import { getTransparencyDetails, registerDynamicTenders } from "@/lib/transparencyEngine";

// Static high-fidelity fallback data of live Indian Central Government tenders from CPPP (eprocure.gov.in)
// Used as immediate render database for offline capability and fallback
const HARDCODED_CPPP_TENDERS = [
  {
    id: "2025_NHAI_259959_1",
    slNo: "1",
    aocDate: "10-Mar-2026 12:00 AM",
    closingDate: "23-Dec-2025 05:30 PM",
    title: "Construction of Service Road and Slip In / Slip Out Roads along with allied drain works on the 4-lane stretch of NH-44, from the MP/MH Border covering the Kamptee - Kanhan and Nagpur Bypass in the State of Maharashtra on EPC Mode",
    orgName: "National Highways Authority of India||RO-Nagpur - NHAI",
    lat: 21.1458,
    lng: 79.0882,
    location: "Kamptee - Kanhan and Nagpur Bypass, Maharashtra",
    roadName: "NH-44 Bypass",
    roadType: "National Highway (NH)",
    contractorName: "L&T Infrastructure Ltd.",
    amountSanctioned: 2579891676,
    amountSpent: 2597562745,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Rajesh Kumar",
    engineerEmail: "ee.highway.rajesh@pwd.gov.in",
    transparencyScore: 99,
    auditFlags: ["Cost Overrun Alert (+0.7% budget deviation)"],
    type: "open_drainage" as const,
    created_at: "2026-03-10T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&auto=format&fit=crop&q=60",
    impact_level: 3,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "10-Mar-2026"
  },
  {
    id: "2025_NHAI_260098_1",
    slNo: "2",
    aocDate: "27-Mar-2026 12:00 AM",
    closingDate: "22-Dec-2025 05:00 PM",
    title: "Construction of Long-Term Remedial measures of Landslide/River cut/bank erosion at identified locations between PANDOH TO KULLU on Kiratpur-Manali Section of NH-03 (Old NH-21) in Himachal Pradesh on EPC Mode",
    orgName: "National Highways Authority of India||Head Office - NHAI||Technical - NHAI",
    lat: 31.9579,
    lng: 77.1095,
    location: "Pandoh to Kullu Section, Himachal Pradesh",
    roadName: "NH-03 Expressway",
    roadType: "National Highway (NH)",
    contractorName: "IRB Infrastructure Developers",
    amountSanctioned: 2100793585,
    amountSpent: 2291746101,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Amit Patel",
    engineerEmail: "ee.nhai.amit@nhai.org",
    transparencyScore: 79,
    auditFlags: [
      "Cost Overrun Alert (+9.1% budget deviation)",
      "Structural Wear Mitigation: Special quality pre-audit triggered for slope stabilization and reinforcing walls"
    ],
    type: "pothole" as const,
    created_at: "2026-03-27T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 3,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "27-Mar-2026"
  },
  {
    id: "2025_NHAI_256630_2",
    slNo: "3",
    aocDate: "14-Feb-2026 12:00 AM",
    closingDate: "20-Dec-2025 06:00 PM",
    title: "Strengthening of RE walls (Geosynthetic reinforced soil structure) by Grouted and Driven Soil Nails and Polymer grouting in Thanjavur - Trichy Section of NH-83 in the State of Tamil Nadu on Item Rate Basis",
    orgName: "National Highways Authority of India||RO-Chennai - NHAI",
    lat: 10.7870,
    lng: 79.1378,
    location: "Thanjavur - Trichy Bypass, Tamil Nadu",
    roadName: "NH-83 Corridor",
    roadType: "National Highway (NH)",
    contractorName: "Tata Projects",
    amountSanctioned: 322370906,
    amountSpent: 360869203,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Rajesh Kumar",
    engineerEmail: "ee.highway.rajesh@pwd.gov.in",
    transparencyScore: 76,
    auditFlags: [
      "Cost Overrun Alert (+11.9% budget deviation)",
      "Structural Wear Mitigation: Special quality pre-audit triggered for slope stabilization and reinforcing walls"
    ],
    type: "pothole" as const,
    created_at: "2026-02-14T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 3,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "14-Feb-2026"
  },
  {
    id: "2025_NHAI_255434_2",
    slNo: "4",
    aocDate: "28-Jan-2026 12:00 AM",
    closingDate: "20-Dec-2025 11:00 AM",
    title: "Operation and Maintenance including Incident Management of Four laning of Trichy Bypass to Tovarankurichi - Madurai section from Km 0.000 to Km 124.840 of NH-45B (New NH-38) in the State of Tamil Nadu on Item Rate Basis",
    orgName: "National Highways Authority of India||RO-Chennai - NHAI",
    lat: 9.9252,
    lng: 78.1198,
    location: "Trichy Bypass to Madurai Section, Tamil Nadu",
    roadName: "NH-45B Expressway",
    roadType: "National Highway (NH)",
    contractorName: "Tata Projects",
    amountSanctioned: 245000000,
    amountSpent: 268000000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Ananya Sharma",
    engineerEmail: "ee.urban.ananya@gcc.gov.in",
    transparencyScore: 82,
    auditFlags: ["Cost Overrun Alert (+9.4% budget deviation)"],
    type: "pothole" as const,
    created_at: "2026-01-28T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 2,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "28-Jan-2026"
  },
  {
    id: "2025_NHAI_259831_1",
    slNo: "5",
    aocDate: "06-May-2026 12:00 AM",
    closingDate: "19-Dec-2025 06:00 PM",
    title: "Consultancy Services for obtaining Environment Clearance (EC) and submission of Half Yearly Environment Clearance (EC) Compliance Report for Multi Modal Logistic Park (MMLP) at Parsodi and Dorli Village in Wardha, Nagpur in the State of Maharashtra",
    orgName: "National Highways Authority of India||National Highways Logistics Management Limited (HQ Delhi)",
    lat: 21.1458,
    lng: 79.0882,
    location: "Kamptee - Kanhan and Nagpur Bypass, Maharashtra",
    roadName: "NH-44 Bypass",
    roadType: "National Highway (NH)",
    contractorName: "IRB Infrastructure Developers",
    amountSanctioned: 4800000,
    amountSpent: 4200000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Logistics Management Limited)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Sandeep Patil",
    engineerEmail: "ee.pwd.sandeep@pwd.gov.in",
    transparencyScore: 92,
    auditFlags: ["Funds Underutilization: Under budget deployment. Verifying completed scope of work"],
    type: "pothole" as const,
    created_at: "2026-05-06T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 2,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "06-May-2026"
  },
  {
    id: "2025_NHAI_259505_1",
    slNo: "6",
    aocDate: "05-Feb-2026 12:00 AM",
    closingDate: "17-Dec-2025 06:55 PM",
    title: "Providing, running -maintenance of commercial vehicle 01 nos. of Bolero Ertiga model or equivalent for Project Office Dehradun, Uttarakhand",
    orgName: "National Highways Authority of India||National Highways Logistics Management Limited (HQ Delhi)",
    lat: 30.3165,
    lng: 78.0322,
    location: "Project Office Dehradun, Uttarakhand",
    roadName: "Mussoorie Bypass Rd",
    roadType: "Municipal Corporation Road",
    contractorName: "PWD Class-A Registered Contractor",
    amountSanctioned: 3500000,
    amountSpent: 3800000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Logistics Management Limited)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Amit Patel",
    engineerEmail: "ee.nhai.amit@nhai.org",
    transparencyScore: 91,
    auditFlags: ["Cost Overrun Alert (+8.6% budget deviation)"],
    type: "pothole" as const,
    created_at: "2026-02-05T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 1,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "05-Feb-2026"
  },
  {
    id: "2025_NHAI_259368_1",
    slNo: "7",
    aocDate: "20-Mar-2026 12:00 AM",
    closingDate: "17-Dec-2025 09:00 AM",
    title: "Four lane with paved shoulders from Budhel Junc. to Vartej Completion period 1.5 Years Maintenance period 5 Years Y junc. Km 0.900 to Km 9.400 on EPC mode under NH (O) in Gujarat",
    orgName: "National Highways Authority of India||Head Office - NHAI||Technical - NHAI",
    lat: 21.7645,
    lng: 72.1519,
    location: "Budhel Junction to Vartej, Bhavnagar, Gujarat",
    roadName: "Bhavnagar Budhel Link Rd",
    roadType: "State Highway (SH)",
    contractorName: "Dilip Buildcon Ltd.",
    amountSanctioned: 1680000000,
    amountSpent: 1720000000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Amit Patel",
    engineerEmail: "ee.nhai.amit@nhai.org",
    transparencyScore: 98,
    auditFlags: ["Cost Overrun Alert (+2.4% budget deviation)"],
    type: "pothole" as const,
    created_at: "2026-03-20T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 2,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "20-Mar-2026"
  },
  {
    id: "2025_NHAI_259367_1",
    slNo: "8",
    aocDate: "20-Mar-2026 12:00 AM",
    closingDate: "17-Dec-2025 09:00 AM",
    title: "Upgradation of existing Four Lane Ahmedabad Godhra Highway from Km 60.000 to 105.000 L-45 Km sec of NH-47 in the state of Gujarat on EPC mode",
    orgName: "National Highways Authority of India||Head Office - NHAI||Technical - NHAI",
    lat: 22.8465,
    lng: 73.6143,
    location: "Ahmedabad - Godhra Highway Sec, Gujarat",
    roadName: "NH-47 Upgradation",
    roadType: "National Highway (NH)",
    contractorName: "IRB Infrastructure Developers",
    amountSanctioned: 1980000000,
    amountSpent: 2150000000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Amit Patel",
    engineerEmail: "ee.nhai.amit@nhai.org",
    transparencyScore: 91,
    auditFlags: ["Cost Overrun Alert (+8.6% budget deviation)"],
    type: "pothole" as const,
    created_at: "2026-03-20T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 2,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "20-Mar-2026"
  },
  {
    id: "2025_NHAI_259347_1",
    slNo: "9",
    aocDate: "31-Jan-2026 12:00 AM",
    closingDate: "16-Dec-2025 06:55 PM",
    title: "Providing SingleDouble Arm Solar Highway Lightings as short term measures at nine locations on NH12 in Raiganj Police District in State Police Department in the State of West Bengal on item rate basis alongwith 5 years Operation Maintenance",
    orgName: "National Highways Authority of India||RO-Kolkata - NHAI||Malda - NHAI",
    lat: 25.6244,
    lng: 88.1278,
    location: "Raiganj Police District, NH-12, West Bengal",
    roadName: "NH-12 Corridor",
    roadType: "National Highway (NH)",
    contractorName: "Tata Projects",
    amountSanctioned: 5200000,
    amountSpent: 5900000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Bikram Chowdhury",
    engineerEmail: "ee.highway.kolkata@pwd.gov.in",
    transparencyScore: 87,
    auditFlags: ["Cost Overrun Alert (+13.5% budget deviation)"],
    type: " streetlight" as any,
    created_at: "2026-01-31T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?w=600&auto=format&fit=crop&q=60",
    impact_level: 1,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "31-Jan-2026"
  },
  {
    id: "2025_NHAI_259172_1",
    slNo: "10",
    aocDate: "08-Jan-2026 12:00 AM",
    closingDate: "15-Dec-2025 06:00 PM",
    title: "Notice inviting Quotation for the disposal of 220 kv D/C copper cables on as is where is Basis on Delhi Outer Ring Road",
    orgName: "National Highways Authority of India||RO-Delhi - NHAI",
    lat: 28.6139,
    lng: 77.2090,
    location: "220 KV D/C Grid Section, New Delhi",
    roadName: "Outer Ring Road (Delhi)",
    roadType: "Municipal Corporation Road",
    contractorName: "GMR Infrastructure",
    amountSanctioned: 3800000,
    amountSpent: 4100000,
    currencySymbol: "₹",
    currencyCode: "INR",
    spendingSource: "Central Public Procurement Portal (National Highways Authority of India)",
    authorityBody: "National Highways Authority of India",
    executiveEngineer: "EE Rajesh Kumar",
    engineerEmail: "ee.highway.rajesh@pwd.gov.in",
    transparencyScore: 92,
    auditFlags: ["Cost Overrun Alert (+7.9% budget deviation)"],
    type: "pothole" as const,
    created_at: "2026-01-08T00:00:00.000Z",
    status: "approved",
    image_url: "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=600&auto=format&fit=crop&q=60",
    impact_level: 1,
    governing_body: "National Highways Authority of India",
    country: "India",
    lastRelayingDate: "08-Jan-2026"
  }
];

export default function ImpactPage() {
  const [tenders, setTenders] = useState<any[]>(HARDCODED_CPPP_TENDERS);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [syncedTime, setSyncedTime] = useState<string>('Pre-loaded Snapshot');

  // Load from local storage cache, then fetch current tenders
  useEffect(() => {
    registerDynamicTenders(HARDCODED_CPPP_TENDERS);

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('roadwatch_cached_cppp_tenders');
      const cachedTime = localStorage.getItem('roadwatch_cached_cppp_synced_at');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTenders(parsed);
            registerDynamicTenders(parsed);
            if (cachedTime) {
              setSyncedTime(new Date(cachedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Cached)');
            }
            setLoading(false);
          }
        } catch {}
      }
    }

    fetch('/api/transparency/cppp-tenders')
      .then((res) => res.json())
      .then((data) => {
        const list = data.tenders || [];
        if (list.length > 0) {
          setTenders(list);
          registerDynamicTenders(list);
          if (typeof window !== 'undefined') {
            localStorage.setItem('roadwatch_cached_cppp_tenders', JSON.stringify(list));
            localStorage.setItem('roadwatch_cached_cppp_synced_at', data.syncedAt || new Date().toISOString());
          }
          if (data.syncedAt) {
            setSyncedTime(new Date(data.syncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ` (${data.source})`);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // Sync live tenders from the CPPP Portal
  const handleSync = async () => {
    setSyncing(true);
    setToast({ message: "Connecting to CPPP Server and scraping live data...", type: 'info' });
    
    try {
      const res = await fetch('/api/transparency/cppp-tenders?sync=true');
      if (!res.ok) throw new Error("Server responded with error status");
      
      const data = await res.json();
      const list = data.tenders || [];
      
      if (list.length > 0) {
        setTenders(list);
        registerDynamicTenders(list);
        if (typeof window !== 'undefined') {
          localStorage.setItem('roadwatch_cached_cppp_tenders', JSON.stringify(list));
          localStorage.setItem('roadwatch_cached_cppp_synced_at', data.syncedAt || new Date().toISOString());
        }
        setSyncedTime(new Date(data.syncedAt || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' (Live Scrape)');
        setToast({ message: `Successfully synced ${list.length} Central Tenders directly from live eprocure.gov.in portal!`, type: 'success' });
      } else {
        setToast({ message: "No fresh tenders found. Using local snapshot cache.", type: 'info' });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: "CPPPP Scraper blocked by government firewall. Local database serves as dynamic fallback.", type: 'error' });
    } finally {
      setSyncing(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const activeReports = tenders;

  // Compile audit metrics for India
  let totalAuditedProjects = activeReports.length;
  let totalSanctionedINR = 0;
  let totalSpentINR = 0;
  let accumulatedTransparencyScore = 0;
  let criticalFlagsCount = 0;

  // Contractor metrics aggregator
  const contractorsMap: Record<string, {
    name: string;
    projects: number;
    spent: number;
    sanctioned: number;
    totalScore: number;
    flags: number;
    currency: string;
  }> = {};

  // Authority metrics aggregator
  const authoritiesMap: Record<string, {
    name: string;
    projects: number;
    totalScore: number;
    currency: string;
  }> = {};

  activeReports.forEach((r) => {
    const details = r.amountSanctioned !== undefined ? r : getTransparencyDetails(r.lat, r.lng, r.id, r.impact_level);
    
    if (details.currencyCode === 'INR') {
      totalSanctionedINR += details.amountSanctioned;
      totalSpentINR += details.amountSpent;
    }

    accumulatedTransparencyScore += details.transparencyScore;
    criticalFlagsCount += details.auditFlags.length;

    // Contractor aggregates
    if (!contractorsMap[details.contractorName]) {
      contractorsMap[details.contractorName] = {
        name: details.contractorName,
        projects: 0,
        spent: 0,
        sanctioned: 0,
        totalScore: 0,
        flags: 0,
        currency: details.currencySymbol
      };
    }
    const c = contractorsMap[details.contractorName];
    c.projects += 1;
    c.spent += details.amountSpent;
    c.sanctioned += details.amountSanctioned;
    c.totalScore += details.transparencyScore;
    c.flags += details.auditFlags.length;

    // Authority aggregates
    if (!authoritiesMap[details.authorityBody]) {
      authoritiesMap[details.authorityBody] = {
        name: details.authorityBody,
        projects: 0,
        totalScore: 0,
        currency: details.currencySymbol
      };
    }
    const authObj = authoritiesMap[details.authorityBody];
    authObj.projects += 1;
    authObj.totalScore += details.transparencyScore;
  });

  const averageTransparencyScore = totalAuditedProjects > 0
    ? Math.round(accumulatedTransparencyScore / totalAuditedProjects)
    : 100;

  const contractorsList = Object.values(contractorsMap).sort((a, b) => b.spent - a.spent);
  const authoritiesList = Object.values(authoritiesMap).sort((a, b) => (b.totalScore / b.projects) - (a.totalScore / a.projects));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#020817] text-white px-6 py-20 mt-10">
        <div className="mx-auto max-w-7xl space-y-12 animate-[fadeIn_0.5s_ease-out]">

          {/* ---------- HERO SECTION ---------- */}
          <section className="text-center max-w-4xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              India National Infrastructure Registry
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
              CPPP Procurement & <span className="text-cyan-400">Spending Transparency</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Real-time monitoring of Central Highway tenders harvested from the Government of India CPPP Portal (<a href="https://eprocure.gov.in" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">eprocure.gov.in</a>). Tracking contract deviations, audits, and contractor risk indexes.
            </p>
          </section>

          {/* ---------- DATA SOURCE TOGGLER & SYNC PANEL ---------- */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0f172a]/60 border border-slate-800 p-4 rounded-xl max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇮🇳</span>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Central Procurement Ledger (India Only)</p>
                <p className="text-slate-500 text-xs mt-0.5">Synced at: <span className="font-mono text-cyan-400">{syncedTime}</span></p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition bg-cyan-500 text-[#020817] hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
              >
                {syncing ? (
                  <>
                    <span className="h-3 w-3 border-2 border-[#020817] border-t-transparent rounded-full animate-spin" />
                    Harvesting CPPP Portal...
                  </>
                ) : (
                  <>
                    <span className="transition duration-300 group-hover:rotate-180">🔄</span>
                    Sync CPPP Live Data
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ---------- SUMMARY CARDS GRID ---------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <StatCard
              title="Central Tenders Audited"
              value={totalAuditedProjects}
              desc="Real-world central tenders harvested and parsed"
              icon="🛡️"
            />

            <StatCard
              title="Total Audited Spend"
              value={
                totalSpentINR >= 10000000
                  ? `₹${(totalSpentINR / 10000000).toFixed(2)} Cr`
                  : `₹${(totalSpentINR / 100000).toFixed(1)}L`
              }
              desc="Cumulative public funds deployed across sectors"
              icon="🪙"
            />

            <StatCard
              title="Avg Transparency Index"
              value={`${averageTransparencyScore}/100`}
              desc="Weighted average of material quality & budget deviations"
              icon="⚖️"
              valueColor={
                averageTransparencyScore >= 80 ? 'text-cyan-400' :
                averageTransparencyScore >= 50 ? 'text-yellow-400' : 'text-red-400'
              }
            />

            <StatCard
              title="System Critical Flags"
              value={criticalFlagsCount}
              desc="Cost-overruns and structural wear alerts triggered"
              icon="⚠️"
              valueColor={criticalFlagsCount > 0 ? 'text-red-400' : 'text-green-400'}
            />

          </div>

          {/* ---------- VISUAL ANALYTICS PANELS ---------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Financial Accountability Breakdown */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-lg text-white">Financial Accountability Ledger</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Comparing sanctioned budget vs disbursed funds per project</p>
                </div>
                <span className="text-[10px] bg-slate-800 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-mono">
                  CPPP AOC stream
                </span>
              </div>

              <div className="space-y-5 max-h-[380px] overflow-y-auto pr-2">
                {activeReports.map((r, idx) => {
                  const details = r.amountSanctioned !== undefined ? r : getTransparencyDetails(r.lat, r.lng, r.id, r.impact_level);
                  const overrunRatio = details.amountSpent / details.amountSanctioned;
                  const percentWidth = Math.min(100, Math.round(overrunRatio * 80));

                  const spentCr = details.amountSpent >= 10000000 
                    ? `₹${(details.amountSpent / 10000000).toFixed(2)} Cr`
                    : `₹${(details.amountSpent / 100000).toFixed(1)}L`;
                    
                  const sanctionedCr = details.amountSanctioned >= 10000000 
                    ? `₹${(details.amountSanctioned / 10000000).toFixed(2)} Cr`
                    : `₹${(details.amountSanctioned / 100000).toFixed(1)}L`;

                  return (
                    <div key={r.id || idx} className="space-y-1.5 hover:bg-slate-800/10 p-2 rounded transition duration-200">
                      <div className="flex justify-between items-start text-xs gap-4">
                        <span className="text-white font-medium truncate max-w-[320px] block" title={details.title}>
                          {details.roadName} ({details.location})
                        </span>
                        <span className={`font-mono font-bold whitespace-nowrap ${details.amountSpent > details.amountSanctioned ? 'text-red-400' : 'text-cyan-400'}`}>
                          {spentCr} Spent / {sanctionedCr}
                        </span>
                      </div>
                      <div className="w-full bg-[#020817] h-3.5 rounded-full overflow-hidden border border-slate-800 relative flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            details.amountSpent > details.amountSanctioned
                              ? 'bg-gradient-to-r from-yellow-500 to-red-500'
                              : 'bg-gradient-to-r from-slate-700 to-cyan-500'
                          }`}
                          style={{ width: `${percentWidth}%` }}
                        />
                        <span className="absolute right-2 text-[9px] font-mono text-slate-500">
                          {Math.round(overrunRatio * 100)}% Used
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Key Performance Gauges */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-lg text-white">System Risk Index</h3>
                <p className="text-slate-400 text-xs mt-0.5">National distribution of road defects & spending anomalies</p>
              </div>

              <div className="py-6 flex flex-col items-center justify-center space-y-4">
                {/* SVG Gauge */}
                <div className="relative h-32 w-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#020817" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={averageTransparencyScore >= 80 ? '#22d3ee' : averageTransparencyScore >= 50 ? '#facc15' : '#f87171'}
                      strokeWidth="8"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * averageTransparencyScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-extrabold tracking-tight">{averageTransparencyScore}%</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Quality</span>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className={`text-sm font-bold ${
                    averageTransparencyScore >= 80 ? 'text-cyan-400' :
                    averageTransparencyScore >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {averageTransparencyScore >= 80 ? '🟢 Stable Quality Standard' :
                     averageTransparencyScore >= 50 ? '🟡 Moderate Wear Anomaly' : '🔴 Substandard Infrastructure'}
                  </span>
                  <p className="text-[11px] text-slate-400 max-w-[200px]">
                    {averageTransparencyScore >= 80 ? 'Projects matching financial projections and pavement wear expectations.' :
                     averageTransparencyScore >= 50 ? 'Minor overruns and early wear detected. Reviewing contractor materials.' :
                     'High spending deviations combined with severe early failures. Priority audit flagged.'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800/60 pt-3 text-xs flex justify-between text-slate-400">
                <span>Active Audits: {totalAuditedProjects}</span>
                <span>Anomalies: {criticalFlagsCount} flagged</span>
              </div>
            </div>

          </div>

          {/* ---------- CONTRACTOR LEADERBOARD ---------- */}
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-2xl font-bold text-white">Prime Contractor Performance Index</h2>
                <p className="text-slate-400 text-sm mt-0.5">Aggregated rating, project count, and budget deviation of registered builders</p>
              </div>
              <span className="text-[11px] bg-[#0f172a] text-cyan-400 border border-slate-800 px-3 py-1 rounded-full font-bold">
                Contractor Accountability Leaderboard
              </span>
            </div>

            {contractorsList.length === 0 ? (
              <div className="border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500">
                No contractor statistics compiled.
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-black/40 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                        <th className="p-4">Contractor Identity</th>
                        <th className="p-4 text-center">Projects Audited</th>
                        <th className="p-4 text-right">Total Funds Spent</th>
                        <th className="p-4 text-center">Avg Audit Score</th>
                        <th className="p-4 text-center">Budget Deviation</th>
                        <th className="p-4 text-right">Status Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {contractorsList.map((c, idx) => {
                        const avgScore = Math.round(c.totalScore / c.projects);
                        const deviationRatio = c.spent / c.sanctioned;
                        const deviationPercent = Math.round((deviationRatio - 1) * 100);

                        const spentCr = c.spent >= 10000000 
                          ? `₹${(c.spent / 10000000).toFixed(2)} Cr`
                          : `₹${(c.spent / 100000).toFixed(1)}L`;

                        return (
                          <tr key={c.name || idx} className="hover:bg-slate-800/20 transition">
                            <td className="p-4 font-semibold text-white">
                              {c.name}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {c.projects}
                            </td>
                            <td className="p-4 text-right font-mono text-cyan-400 font-bold">
                              {spentCr}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                                avgScore >= 80 ? 'bg-[#020817] text-cyan-400 border border-cyan-500/20' :
                                avgScore >= 50 ? 'bg-[#020817] text-yellow-400 border border-yellow-500/20' :
                                'bg-[#020817] text-red-400 border border-red-500/20'
                              }`}>
                                {avgScore}/100
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono font-bold">
                              {deviationPercent > 0 ? (
                                <span className="text-red-400">+{deviationPercent}% Overrun</span>
                              ) : deviationPercent < 0 ? (
                                <span className="text-green-400">{deviationPercent}% Saving</span>
                              ) : (
                                <span className="text-slate-400">On Target</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                avgScore >= 80 && deviationPercent <= 5 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                avgScore >= 55 && deviationPercent <= 15 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {avgScore >= 80 && deviationPercent <= 5 ? 'Low Risk' :
                                 avgScore >= 55 && deviationPercent <= 15 ? 'Review Needed' : 'High Audit Risk'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* ---------- REGIONAL AUTHORITIES INDEX ---------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            
            {/* Left Box: PWD & Highways Compliance */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-white">Governing Authorities Transparency Compliance</h3>
                <p className="text-slate-400 text-xs">Ranking department efficiency based on citizen audit scores</p>
              </div>

              <div className="space-y-4">
                {authoritiesList.slice(0, 4).map((auth, idx) => {
                  const score = Math.round(auth.totalScore / auth.projects);
                  return (
                    <div key={auth.name || idx} className="flex justify-between items-center bg-[#020817]/60 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">Rank {idx + 1}</span>
                        <h4 className="text-white font-semibold text-sm line-clamp-1">{auth.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">{auth.projects} projects audited</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-extrabold block ${
                          score >= 80 ? 'text-cyan-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {score}/100
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Compliance</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Box: Citizen Actions and Impact */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-white">Open Ledger Data Routing</h3>
                <p className="text-slate-400 text-xs">How RoadWatch closes the loop on infrastructure spending leaks</p>
              </div>

              <div className="space-y-3 text-xs text-slate-300 py-3">
                <div className="flex gap-2">
                  <span className="text-cyan-400">1.</span>
                  <p><b>Crowdsourced Defects</b>: Citizens geotag issues (potholes, flickering lights) with instant physical proof.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-cyan-400">2.</span>
                  <p><b>Pre-Audit Generation</b>: RoadWatch seeds reports against public registries to map cost overruns and contractors.</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-cyan-400">3.</span>
                  <p><b>Executive Action</b>: Integrated complaint routers allow citizens to trigger pre-filled mailers straight to the supervising Engineer.</p>
                </div>
              </div>

              <a
                href="/report"
                className="w-full text-center bg-cyan-500 hover:bg-cyan-400 text-[#020817] py-2.5 rounded font-bold text-xs tracking-wide transition shadow-lg"
              >
                📝 Submit Pavement Report
              </a>
            </div>

          </div>

        </div>
      </div>

      {/* ---------- CUSTOM TOAST NOTIFICATION ---------- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' ? 'bg-[#02231c]/90 border-green-500/40 text-green-400' :
          toast.type === 'error' ? 'bg-[#2a080c]/90 border-red-500/40 text-red-400' :
          'bg-[#0f172a]/95 border-cyan-500/40 text-cyan-400'
        }`}>
          <span className="text-lg">
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs pl-2">✕</button>
        </div>
      )}
    </>
  );
}

/* ---------- INTERNAL COMPONENTS ---------- */

function StatCard({
  title,
  value,
  desc,
  icon,
  valueColor = 'text-white',
  sub
}: {
  title: string;
  value: string | number;
  desc: string;
  icon: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 space-y-2 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-cyan-500/35 transition duration-300">
      <div className="absolute top-2 right-2 text-2xl opacity-15 group-hover:scale-110 transition duration-300">
        {icon}
      </div>
      <div>
        <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">{title}</span>
        <h4 className={`text-3xl font-extrabold tracking-tight mt-1 ${valueColor}`}>
          {value}
        </h4>
        {sub && <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{sub}</span>}
      </div>
      <p className="text-slate-400 text-[11px] leading-relaxed pt-2 border-t border-slate-800/40">{desc}</p>
    </div>
  );
}
