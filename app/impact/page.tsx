'use client';

import { useState, useEffect } from 'react';
import Navbar from "@/components/navbar";
import { getTransparencyDetails, TransparencyDetails } from "@/lib/transparencyEngine";

type Report = {
  id: string;
  image_url: string;
  location: string;
  lat: number;
  lng: number;
  type: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  impact_level: number;
  governing_body: string;
  created_at: string;
  status: string;
};

// Seed dataset representing global municipal public audits (India, US, UK)
const SIMULATED_AUDITS = [
  { lat: 13.0827, lng: 80.2707, id: 'sim-1', impact_level: 3, created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(), location: 'GST Road, Chennai, Tamil Nadu' },
  { lat: 12.9716, lng: 77.5946, id: 'sim-2', impact_level: 2, created_at: new Date(Date.now() - 12 * 24 * 3600000).toISOString(), location: 'OMR Expressway, Bengaluru, Karnataka' },
  { lat: 37.7749, lng: -122.4194, id: 'sim-3', impact_level: 3, created_at: new Date(Date.now() - 3 * 24 * 3600000).toISOString(), location: 'Broadway Ave, San Francisco, CA' },
  { lat: 40.7128, lng: -74.0060, id: 'sim-4', impact_level: 1, created_at: new Date(Date.now() - 25 * 24 * 3600000).toISOString(), location: 'Sunset Blvd, New York, NY' },
  { lat: 51.5074, lng: -0.1278, id: 'sim-5', impact_level: 3, created_at: new Date(Date.now() - 1 * 24 * 3600000).toISOString(), location: 'M4 Motorway near Heathrow, London' },
  { lat: 52.4862, lng: -1.8904, id: 'sim-6', impact_level: 2, created_at: new Date(Date.now() - 18 * 24 * 3600000).toISOString(), location: 'High Street, Birmingham, UK' },
  { lat: 19.0760, lng: 72.8777, id: 'sim-7', impact_level: 3, created_at: new Date(Date.now() - 8 * 24 * 3600000).toISOString(), location: 'NH-44 Bypass near Bandra, Mumbai' },
  { lat: 34.0522, lng: -118.2437, id: 'sim-8', impact_level: 2, created_at: new Date(Date.now() - 14 * 24 * 3600000).toISOString(), location: 'Sunset Blvd, Los Angeles, CA' },
];

export default function ImpactPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'reference'>('reference');

  // Fetch live reports
  useEffect(() => {
    // 1. Load from localStorage cache first for offline capability
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('roadwatch_cached_approved_reports');
      if (cached) {
        try {
          const approved = JSON.parse(cached);
          setReports(approved);
          if (approved.length > 0) {
            setDataSource('live');
          }
          setLoading(false);
        } catch {}
      }
    }

    // 2. Fetch fresh data
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        const approved = Array.isArray(data) ? data.filter((r: Report) => r.status === 'approved') : [];
        setReports(approved);
        if (typeof window !== 'undefined') {
          localStorage.setItem('roadwatch_cached_approved_reports', JSON.stringify(approved));
        }
        // Automatically default to live if there are approved reports present
        if (approved.length > 0) {
          setDataSource('live');
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);


  const activeReports = dataSource === 'live' ? reports : SIMULATED_AUDITS as unknown as Report[];

  // Compile audit metrics
  let totalAuditedProjects = activeReports.length;
  let totalSanctionedINR = 0;
  let totalSpentINR = 0;
  let totalSanctionedUSD = 0;
  let totalSpentUSD = 0;
  let totalSanctionedGBP = 0;
  let totalSpentGBP = 0;
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
    const details = getTransparencyDetails(r.lat, r.lng, r.id, r.impact_level);
    
    // Add to financial totals by currency
    if (details.currencyCode === 'INR') {
      totalSanctionedINR += details.amountSanctioned;
      totalSpentINR += details.amountSpent;
    } else if (details.currencyCode === 'USD') {
      totalSanctionedUSD += details.amountSanctioned;
      totalSpentUSD += details.amountSpent;
    } else {
      totalSanctionedGBP += details.amountSanctioned;
      totalSpentGBP += details.amountSpent;
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

  const contractorsList = Object.values(contractorsMap).sort((a, b) => (b.spent) - (a.spent));
  const authoritiesList = Object.values(authoritiesMap).sort((a, b) => (b.totalScore / b.projects) - (a.totalScore / a.projects));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#020817] text-white px-6 py-20 mt-10">
        <div className="mx-auto max-w-7xl space-y-12">

          {/* ---------- HERO SECTION ---------- */}
          <section className="text-center max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Civic Impact & <span className="text-cyan-400">Spending Transparency</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              Real-time monitoring of infrastructure spend, contractor accountability indices, and public pre-audits generated directly from citizen-reported road damage.
            </p>
          </section>

          {/* ---------- DATA SOURCE TOGGLER ---------- */}
          <div className="flex justify-center">
            <div className="bg-[#0f172a] p-1.5 rounded-lg border border-slate-800 flex gap-2">
              <button
                onClick={() => setDataSource('reference')}
                className={`px-4 py-2 rounded text-xs font-bold tracking-wide uppercase transition ${
                  dataSource === 'reference'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🌐 Global Reference Ledger ({SIMULATED_AUDITS.length})
              </button>
              <button
                onClick={() => setDataSource('live')}
                disabled={reports.length === 0}
                className={`px-4 py-2 rounded text-xs font-bold tracking-wide uppercase transition flex items-center gap-1.5 ${
                  dataSource === 'live'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : reports.length === 0
                      ? 'text-slate-600 cursor-not-allowed'
                      : 'text-slate-400 hover:text-white'
                }`}
              >
                🔴 Live Verified Audits ({reports.length})
                {reports.length > 0 && <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
              </button>
            </div>
          </div>

          {/* ---------- SUMMARY CARDS GRID ---------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <StatCard
              title="Infrastructure Audited"
              value={totalAuditedProjects}
              desc="Verified citizen reports with active pre-audits"
              icon="🛡️"
            />

            <StatCard
              title="Total Audited Spend"
              value={
                totalSpentINR > 0
                  ? `₹${Math.round(totalSpentINR / 100000) / 10}L`
                  : totalSpentUSD > 0
                    ? `$${totalSpentUSD.toLocaleString()}`
                    : `£${totalSpentGBP.toLocaleString()}`
              }
              desc="Total disbursed capital reviewed in current ledger"
              icon="🪙"
              sub={
                totalSpentINR > 0 && totalSpentUSD > 0
                  ? `+ $${totalSpentUSD.toLocaleString()} US / £${totalSpentGBP.toLocaleString()} UK`
                  : undefined
              }
            />

            <StatCard
              title="Avg Transparency Score"
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
              desc="High cost-overruns & premature failures detected"
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
                  Audit Stream
                </span>
              </div>

              <div className="space-y-5 max-h-[360px] overflow-y-auto pr-2">
                {activeReports.map((r, idx) => {
                  const details = getTransparencyDetails(r.lat, r.lng, r.id, r.impact_level);
                  const overrunRatio = details.amountSpent / details.amountSanctioned;
                  const percentWidth = Math.min(100, Math.round(overrunRatio * 80));

                  return (
                    <div key={r.id || idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white font-medium truncate max-w-[250px]">{details.roadName} ({details.roadType})</span>
                        <span className={`font-mono font-bold ${details.amountSpent > details.amountSanctioned ? 'text-red-400' : 'text-cyan-400'}`}>
                          {details.currencySymbol}{details.amountSpent.toLocaleString()} spent / {details.currencySymbol}{details.amountSanctioned.toLocaleString()}
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
                <p className="text-slate-400 text-xs mt-0.5">Global distribution of road defects & spending anomalies</p>
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

                        return (
                          <tr key={c.name || idx} className="hover:bg-slate-800/20 transition">
                            <td className="p-4 font-semibold text-white">
                              {c.name}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {c.projects}
                            </td>
                            <td className="p-4 text-right font-mono text-cyan-400 font-bold">
                              {c.currency}{c.spent.toLocaleString()}
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
