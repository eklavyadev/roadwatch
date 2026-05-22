'use client';

import { useState, useEffect } from 'react';
import Navbar from "@/components/navbar";

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
  category: "NH" | "SH";
  year: number;
  selectedBidderAddress?: string;
  completionPeriod?: string;
}

export default function ImpactPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Active Filter States
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Detailed Modal Record State
  const [selectedContract, setSelectedContract] = useState<ContractRecord | null>(null);

  // Statistics/aggregates derived from loaded state
  const [aggregates, setAggregates] = useState({
    totalSpend: 0,
    totalContracts: 0,
    activeBidders: 0
  });

  // Fetch contract data from the API
  const fetchContracts = async (seed = false) => {
    setLoading(true);
    try {
      const url = new URL('/api/transparency/contracts', window.location.origin);
      if (seed) url.searchParams.set("seed", "true");
      url.searchParams.set("category", selectedCategory);
      url.searchParams.set("year", selectedYear);
      if (searchQuery.trim()) url.searchParams.set("search", searchQuery.trim());

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("API responded with error code");

      const data = await res.json();
      setContracts(data.contracts || []);
      setAggregates(data.aggregates || { totalSpend: 0, totalContracts: 0, activeBidders: 0 });
    } catch (err) {
      console.error(err);
      setToast({ message: "Failed to sync contracts database from disk.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch contracts whenever filter states or search changes
  useEffect(() => {
    fetchContracts(false);
  }, [selectedCategory, selectedYear, searchQuery]);



  // Format amount to Lakhs / Crores for beautiful readability
  const formatINR = (value: number) => {
    if (value === 0) return "₹0 Cr";
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    }
    return `₹${(value / 100000).toFixed(1)} Lakhs`;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#020817] text-white px-6 py-20 mt-10">
        <div className="mx-auto max-w-7xl space-y-12 animate-[fadeIn_0.5s_ease-out]">

          {/* ---------- HERO SECTION ---------- */}
          <section className="text-center max-w-4xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 border border-cyan-800/30 text-cyan-400 text-xs font-semibold tracking-wider uppercase mb-1">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              India National Highway & State Highway Registry
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight">
              Procurement & <span className="text-cyan-400">Highway Spending</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mx-auto">
              Open spending ledger and tender accountability tracker mapping National Highway (NH) and State Highway (SH) contracts across India for 2025 & 2026.
            </p>
          </section>



          {/* ---------- SEARCH & FILTERS GATEWAY ---------- */}
          <div className="bg-[#0f172a]/60 border border-slate-800 p-6 rounded-xl space-y-5 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              
              {/* Category Tab Switcher: NH vs SH */}
              <div className="md:col-span-5 flex bg-[#020817] border border-slate-800 p-1.5 rounded-lg">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-md transition duration-200 ${
                    selectedCategory === "all" ? 'bg-cyan-500 text-[#020817]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Highways
                </button>
                <button
                  onClick={() => setSelectedCategory("NH")}
                  className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-md transition duration-200 ${
                    selectedCategory === "NH" ? 'bg-cyan-500 text-[#020817]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  NH Only
                </button>
                <button
                  onClick={() => setSelectedCategory("SH")}
                  className={`flex-1 text-center py-2 text-xs font-bold uppercase tracking-wider rounded-md transition duration-200 ${
                    selectedCategory === "SH" ? 'bg-cyan-500 text-[#020817]' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  SH Only
                </button>
              </div>

              {/* Year Filter Dropdown: 2025, 2026 */}
              <div className="md:col-span-2 relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#020817] border border-slate-800 text-xs font-bold uppercase tracking-wider py-3 px-4 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-300 appearance-none cursor-pointer"
                >
                  <option value="all">All Years</option>
                  <option value="2025">Year 2025</option>
                  <option value="2026">Year 2026</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 text-xs">
                  ▼
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="md:col-span-5 relative">
                <input
                  type="text"
                  placeholder='Search by highway (e.g. "NH-44", "SH-3", etc.) or contractor...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#020817] border border-slate-800 text-xs py-3 pl-10 pr-4 rounded-lg focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-500"
                />
                <span className="absolute left-3.5 top-3.5 text-slate-500 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* ---------- SUMMARY CARDS GRID ---------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            <StatCard
              title="Audited Spend Value"
              value={formatINR(aggregates.totalSpend)}
              desc="Total budget deployment recorded under selected filters"
              icon="🪙"
            />

            <StatCard
              title="Highway Contracts"
              value={aggregates.totalContracts}
              desc="Ingested government highway tenders currently audited"
              icon="🛡️"
            />

            <StatCard
              title="Active Bidders / Builders"
              value={aggregates.activeBidders}
              desc="Distinct construction contractors awarded contracts"
              icon="🏗️"
            />

          </div>

          {/* ---------- MAIN CONTRACT REGISTRY TABLE ---------- */}
          <section className="max-w-6xl mx-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Central Highway Contract Registry
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Audited contract schedules matching active filters</p>
              </div>
              <span className="text-[10px] bg-[#0f172a] text-cyan-400 border border-slate-800 px-3 py-1 rounded-full font-mono uppercase tracking-wider font-semibold">
                {selectedCategory === "all" ? "NH & SH Ledger" : `${selectedCategory} Ledger`}
              </span>
            </div>

            {contracts.length > 0 && (
              <div className="text-[10px] text-cyan-400/80 font-medium bg-cyan-950/10 border border-cyan-800/10 px-4 py-2 rounded-lg flex items-center gap-2 max-w-max">
                <span>💡</span>
                <span><b>Interactive Sheet enabled</b>: Click on any contract row to inspect its official <b>"Award of Contract Details"</b>.</span>
              </div>
            )}

            {loading ? (
              <div className="bg-[#0f172a]/30 border border-slate-800 rounded-xl p-16 text-center space-y-3">
                <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 text-sm">Querying secure contract records...</p>
              </div>
            ) : contracts.length === 0 ? (
              /* --- BEAUTIFUL ELEGANT EMPTY STATE CARD --- */
              <div className="bg-[#0f172a]/30 border border-dashed border-slate-800 rounded-xl p-16 text-center space-y-5 max-w-4xl mx-auto">
                <div className="text-5xl opacity-40">📭</div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Highway Registry is Currently Empty</h3>
                  <p className="text-slate-500 text-xs max-w-lg mx-auto leading-relaxed">
                    No verified Indian highway contracts are present in this view under active filters.
                  </p>
                </div>
              </div>
            ) : (
              /* --- DYNAMIC CONTRACT DATA TABLE --- */
              <div className="bg-[#0f172a]/60 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-black/40 border-b border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider font-semibold">
                        <th className="p-4">Organisation Name</th>
                        <th className="p-4">Tender Ref. No.</th>
                        <th className="p-4 text-center">Bids Received</th>
                        <th className="p-4">Selected Bidder</th>
                        <th className="p-4 text-right">Contract Value</th>
                        <th className="p-4 text-right">Contract Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {contracts.map((c) => {
                        const dateFormatted = new Date(c.contractDate).toLocaleDateString("en-IN", {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });

                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => setSelectedContract(c)}
                            className="hover:bg-slate-800/30 active:bg-slate-800/50 transition duration-150 cursor-pointer group"
                            title="Click to view full Award of Contract details"
                          >
                            <td className="p-4 font-medium text-white max-w-[240px] truncate group-hover:text-cyan-300 transition" title={c.organisationName}>
                              {c.organisationName}
                            </td>
                            <td className="p-4 font-mono font-bold tracking-wide">
                              <span className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                  c.category === "NH" ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                }`}>
                                  {c.category}
                                </span>
                                {c.tenderRefNo}
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono font-semibold text-slate-400">
                              {c.bidsReceived}
                            </td>
                            <td className="p-4 font-medium text-white max-w-[200px] truncate" title={c.selectedBidder}>
                              {c.selectedBidder}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-cyan-400 text-sm">
                              {formatINR(c.contractValue)}
                            </td>
                            <td className="p-4 text-right font-mono text-slate-400">
                              {dateFormatted}
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

        </div>
      </div>

      {/* ---------- AWARD OF CONTRACT DETAILS MODAL ---------- */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#020817] border border-slate-800 rounded-xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 px-6 py-4 bg-[#0f172a]">
              <h3 className="text-xs font-bold text-cyan-400 tracking-wider uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                Verified Procurement Registry Record
              </h3>
              <button 
                onClick={() => setSelectedContract(null)}
                className="text-slate-400 hover:text-white transition text-sm bg-[#020817] hover:bg-slate-800 p-1 rounded-full h-7 w-7 flex items-center justify-center border border-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Scrollable details container */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Award of Contract Details
              </h2>

              {/* Exact CPPP design spec table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-[#0a0f1d] shadow-2xl">
                
                {/* Header banner matching screen specs */}
                <div className="bg-[#0B256B] px-4 py-2.5 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-800">
                  Award of Contract Details :
                </div>

                {/* Vertical-horizontal structural table mapping colons & label ratios */}
                <div className="divide-y divide-slate-800 text-xs text-slate-300">
                  
                  {/* Row 1: Organisation Name */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Organisation Name
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[72%] p-3 text-white font-medium flex items-center">
                      {selectedContract.organisationName}
                    </div>
                  </div>

                  {/* Row 2: Tender Ref. No. */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Tender Ref. No.
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[72%] p-3 text-cyan-400 font-mono font-bold tracking-wide flex items-center">
                      {selectedContract.tenderRefNo}
                    </div>
                  </div>

                  {/* Row 3: Tender Description */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Tender Description
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[72%] p-3 text-slate-200 flex items-center leading-relaxed text-left">
                      {selectedContract.tenderDescription || "N/A"}
                    </div>
                  </div>

                  {/* Row 4: Tender Document */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Tender Document
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[72%] p-3 flex items-center truncate">
                      {selectedContract.tenderDocument ? (
                        <a 
                          href={selectedContract.tenderDocument} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1.5 font-medium truncate"
                        >
                          {selectedContract.tenderDocument} 🔗
                        </a>
                      ) : (
                        <span className="text-slate-500 italic">Not available</span>
                      )}
                    </div>
                  </div>

                  {/* Row 5: Tender Type & Number of Bids Received */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    {/* Left half: Tender Type */}
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Tender Type
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[22%] p-3 text-white flex items-center border-r border-slate-800">
                      {selectedContract.tenderType || "Works"}
                    </div>

                    {/* Right half: Number of bids received */}
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center md:pl-3">
                      Number of bids received
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[22%] p-3 text-white font-mono font-bold flex items-center">
                      {selectedContract.bidsReceived}
                    </div>
                  </div>

                  {/* Row 6: Selected Bidder & Contract Value */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    {/* Left half: Selected Bidder */}
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Name of the selected bidder(s)
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[22%] p-3 text-white font-medium flex items-center border-r border-slate-800 break-words max-w-full">
                      {selectedContract.selectedBidder}
                    </div>

                    {/* Right half: Contract Value */}
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center md:pl-3">
                      Contract Value *
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[22%] p-3 text-cyan-400 font-mono font-bold flex items-center gap-1.5 flex-wrap">
                      <span>{selectedContract.contractValue}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({formatINR(selectedContract.contractValue)})
                      </span>
                    </div>
                  </div>

                  {/* Row 7: Contract Value Currency Notice */}
                  <div className="p-3 bg-red-950/25">
                    <p className="text-[10px] text-slate-400 font-semibold italic flex items-center gap-1">
                      <span className="text-red-400 text-xs font-bold font-mono">*</span>
                      Currency regarding Contract Value may please be checked with the corresponding tender portals/websites.
                    </p>
                  </div>

                  {/* Row 8: Address of Selected Bidder */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Address of the selected bidder(s)
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[72%] p-3 text-slate-300 flex items-center">
                      {selectedContract.selectedBidderAddress || "Not Provided"}
                    </div>
                  </div>

                  {/* Row 9: Published Date & Contract Date */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    {/* Left half: Published Date */}
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Published Date
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[22%] p-3 text-slate-300 flex items-center border-r border-slate-800 font-mono">
                      {selectedContract.publishedDate || "N/A"}
                    </div>

                    {/* Right half: Contract Date */}
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center md:pl-3">
                      Contract Date
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[22%] p-3 text-slate-300 flex items-center font-mono">
                      {selectedContract.contractDate || "N/A"}
                    </div>
                  </div>

                  {/* Row 10: Completion Period */}
                  <div className="flex flex-col md:flex-row md:items-stretch">
                    <div className="w-full md:w-[25%] bg-[#0f172a]/40 p-3 font-semibold text-slate-400 border-r border-slate-800 flex items-center">
                      Date of Completion/Completion Period in Days
                    </div>
                    <div className="hidden md:flex w-[3%] items-center justify-center p-3 font-semibold text-slate-500 border-r border-slate-800">
                      :
                    </div>
                    <div className="w-full md:w-[72%] p-3 text-slate-300 flex items-center">
                      {selectedContract.completionPeriod || "Not Specified"}
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-[#0f172a] px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedContract(null)}
                className="bg-cyan-500 hover:bg-cyan-400 text-[#020817] px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ---------- TOAST NOTIFICATION ---------- */}
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

/* ---------- INTERNAL COMPONENT: STAT CARD ---------- */
function StatCard({
  title,
  value,
  desc,
  icon,
  valueColor = 'text-white'
}: {
  title: string;
  value: string | number;
  desc: string;
  icon: string;
  valueColor?: string;
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
      </div>
      <p className="text-slate-400 text-[11px] leading-relaxed pt-2 border-t border-slate-800/40">{desc}</p>
    </div>
  );
}
