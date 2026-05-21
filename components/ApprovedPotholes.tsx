'use client';

import { useEffect, useState } from 'react';
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from '@react-google-maps/api';
import { getTransparencyDetails } from '@/lib/transparencyEngine';

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

const PAGE_SIZE = 6;

/* ---------- LABEL + COLOR HELPERS ---------- */
const IMPACT_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

const IMPACT_BADGE_CLASS: Record<number, string> = {
  1: 'bg-green-600 text-white',
  2: 'bg-yellow-500 text-black',
  3: 'bg-red-600 text-white',
};

const TYPE_LABEL: Record<Report['type'], string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  traffic_signal: 'Traffic Signal',
  open_drainage: 'Open Drainage',
};

/* ---------- PUBLIC DESCRIPTION ---------- */
const IMPACT_DESCRIPTION: Record<
  Report['type'],
  Record<number, string>
> = {
  pothole: {
    1: '🕳️ Minor surface damage',
    2: '🕳️ Moderate dip / uneven road',
    3: '🕳️ Severe accident‑prone pothole',
  },
  streetlight: {
    1: '💡 Streetlight flickering occasionally',
    2: '💡 Streetlight often off or unstable',
    3: '💡 Streetlight completely not working',
  },
  traffic_signal: {
    1: '🚦 Signal responding with delay',
    2: '🚦 Signal stuck on one color',
    3: '🚦 Traffic signal not functioning',
  },
  open_drainage: {
    1: '🚧 Drain partially open',
    2: '🚧 Drain fully open',
    3: '🚧 Deep open drain posing danger',
  },
};

export function ApprovedReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  useEffect(() => {
    // 1. Try to load from localStorage first for instant paint/offline support
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('roadwatch_cached_approved_reports');
      if (cached) {
        try {
          setReports(JSON.parse(cached));
          setLoading(false);
        } catch {}
      }
    }

    // 2. Fetch fresh data from the server
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        const approved = data.filter(
          (r: Report) => r.status === 'approved'
        );
        setReports(approved);
        if (typeof window !== 'undefined') {
          localStorage.setItem('roadwatch_cached_approved_reports', JSON.stringify(approved));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to fetch fresh reports, using cached reports:', err);
        setLoading(false);
      });
  }, []);


  if (loading) {
    return <p className="text-gray-400 text-sm">Loading verified reports…</p>;
  }

  if (reports.length === 0) {
    return (
      <div className="border border-dashed border-slate-700 rounded p-8 text-center">
        <p className="text-gray-400">No verified reports yet.</p>
      </div>
    );
  }

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleReports = reports.slice(start, end);
  const totalPages = Math.ceil(reports.length / PAGE_SIZE);

  return (
    <>
      {/* ---------- CARDS ---------- */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleReports.map((r) => {
            const level = Number(r.impact_level);
            const details = getTransparencyDetails(r.lat, r.lng, r.id, level);

            return (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="cursor-pointer bg-[#0f172a] border border-slate-700 rounded overflow-hidden hover:border-cyan-400 transition"
              >
                <div className="bg-black relative">
                  <img
                    src={r.image_url}
                    alt={r.type}
                    className="h-48 w-full object-cover"
                  />
                  {/* Floating Transparency Audit Score Badge */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold shadow-md border ${
                      details.transparencyScore >= 80 ? 'bg-[#0f172a] text-cyan-400 border-cyan-500/30' :
                      details.transparencyScore >= 50 ? 'bg-[#0f172a] text-yellow-400 border-yellow-500/30' :
                      'bg-[#0f172a] text-red-400 border-red-500/30'
                    }`}>
                      Audit: {details.transparencyScore}/100
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2 text-sm text-slate-300">
                  <p className="text-white font-semibold line-clamp-1">{r.location}</p>

                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Road: {details.roadName}</span>
                    <span className="font-mono text-cyan-500/80">{details.currencySymbol}{details.amountSpent.toLocaleString()} spent</span>
                  </div>

                  <p>
                    <span className="text-white font-medium">Issue Type:</span>{' '}
                    {TYPE_LABEL[r.type]}
                  </p>

                  <p>
                    <span className="text-white font-medium">Coordinates:</span>{' '}
                    {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                  </p>

                  <p>
                    <span className="text-white font-medium">Impact Level:</span>{' '}
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        IMPACT_BADGE_CLASS[level]
                      }`}
                    >
                      {IMPACT_LABEL[level]}
                    </span>
                  </p>

                  <p className="text-xs text-slate-400">
                    {IMPACT_DESCRIPTION[r.type][level]}
                  </p>

                  <p className="text-xs text-slate-400">
                    Reported on:{' '}
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>

                  <a
                    href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 text-xs underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on Google Maps
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {reports.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="px-4 py-2 rounded bg-slate-700 text-white text-sm"
            >
              ← Previous
            </button>

            <span className="text-sm text-gray-400">
              Page {page + 1} of {totalPages}
            </span>

            <button
              onClick={() =>
                setPage((p) => Math.min(p + 1, totalPages - 1))
              }
              disabled={page === totalPages - 1}
              className="px-4 py-2 rounded bg-slate-700 text-white text-sm"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ---------- MODAL ---------- */}
      {/* ---------- MODAL ---------- */}
{selectedReport && (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 sm:p-6">
    <div className="relative bg-[#020817] border border-slate-700 rounded-lg w-full max-w-6xl overflow-hidden">

      {/* ---------- HEADER (CLOSE BUTTON SAFE AREA) ---------- */}
      <div className="absolute top-0 right-0 z-50 p-3">
        <button
          onClick={() => setSelectedReport(null)}
          className="h-10 w-10 flex items-center justify-center rounded-full
                     bg-black/80 text-white hover:bg-black
                     border border-slate-600 text-lg"
          aria-label="Close modal"
        >
          ✕
        </button>
      </div>

      {/* ---------- CONTENT ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[90vh] overflow-y-auto">

        {/* ---------- LEFT : DETAILS ---------- */}
        {(() => {
          const details = getTransparencyDetails(
            selectedReport.lat,
            selectedReport.lng,
            selectedReport.id,
            selectedReport.impact_level
          );

          // Create mailto link
          const complaintSubject = encodeURIComponent(`[RoadWatch] Road Quality Issue Reported - ${details.roadName}`);
          const complaintBody = encodeURIComponent(
            `Dear ${details.executiveEngineer},\n\n` +
            `I am writing to report a verified infrastructure issue via the RoadWatch Transparency Portal.\n\n` +
            `Location: ${selectedReport.location}\n` +
            `Coordinates: ${selectedReport.lat.toFixed(5)}, ${selectedReport.lng.toFixed(5)}\n` +
            `Issue Type: ${TYPE_LABEL[selectedReport.type]}\n` +
            `Impact Level: ${IMPACT_LABEL[selectedReport.impact_level]}\n` +
            `Reported on: ${new Date(selectedReport.created_at).toLocaleDateString()}\n\n` +
            `--- PUBLIC SPENDING AUDIT DETAILS ---\n` +
            `As per public records (Source: ${details.spendingSource}):\n` +
            `- Road Name: ${details.roadName} (${details.roadType})\n` +
            `- Contractor: ${details.contractorName}\n` +
            `- Last Relayed: ${details.lastRelayingDate}\n` +
            `- Sanctioned Budget: ${details.currencySymbol}${details.amountSanctioned.toLocaleString()} ${details.currencyCode}\n` +
            `- Total Disbursed: ${details.currencySymbol}${details.amountSpent.toLocaleString()} ${details.currencyCode}\n` +
            `- Calculated Transparency Index Score: ${details.transparencyScore}/100\n\n` +
            `The presence of severe road defects shortly after high public fund spending warrants immediate engineering inspection, accountability audit, and rectification.\n\n` +
            `Sincerely,\n` +
            `Concerned Citizen (Via RoadWatch Gateway)`
          );
          const mailtoUrl = `mailto:${details.engineerEmail}?subject=${complaintSubject}&body=${complaintBody}`;

          return (
            <div className="p-6 space-y-5">
              {/* Image */}
              <div className="relative">
                <img
                  src={selectedReport.image_url}
                  alt={selectedReport.type}
                  className="rounded w-full h-64 sm:h-72 object-cover border border-slate-700/50"
                />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg border backdrop-blur-md ${
                    details.transparencyScore >= 80 ? 'bg-[#0f172a]/95 text-cyan-400 border-cyan-500/30' :
                    details.transparencyScore >= 50 ? 'bg-[#0f172a]/95 text-yellow-400 border-yellow-500/30' :
                    'bg-[#0f172a]/95 text-red-400 border-red-500/30'
                  }`}>
                    Transparency Index: {details.transparencyScore}/100
                  </span>
                </div>
              </div>

              {/* Basic Issue Card */}
              <div className="bg-[#0f172a]/45 border border-slate-800 rounded-lg p-4 space-y-2">
                <p className="text-white font-semibold text-lg line-clamp-2">
                  {selectedReport.location}
                </p>

                <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                  <p>
                    <span className="text-slate-400 font-medium">Issue Type:</span>{' '}
                    <span className="text-white font-semibold">{TYPE_LABEL[selectedReport.type]}</span>
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Impact Level:</span>{' '}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        IMPACT_BADGE_CLASS[selectedReport.impact_level]
                      }`}
                    >
                      {IMPACT_LABEL[selectedReport.impact_level]}
                    </span>
                  </p>
                </div>

                <p className="text-xs text-slate-400 italic bg-[#020817]/40 p-2 rounded border border-slate-800/40">
                  {IMPACT_DESCRIPTION[selectedReport.type][selectedReport.impact_level]}
                </p>

                <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                  <span>Reported: {new Date(selectedReport.created_at).toLocaleDateString()}</span>
                  <span>Coordinates: {selectedReport.lat.toFixed(5)}, {selectedReport.lng.toFixed(5)}</span>
                </div>
              </div>

              {/* Public Spending & Transparency Portal */}
              <div className="bg-[#0f172a]/80 border border-cyan-500/15 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h3 className="text-cyan-400 font-semibold text-sm tracking-wider uppercase flex items-center gap-1.5">
                    🪙 Public Spending Audit
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                    {details.country} Standards
                  </span>
                </div>

                {/* Audit Warnings */}
                {details.auditFlags.length > 0 && (
                  <div className="space-y-1.5">
                    {details.auditFlags.map((flag, idx) => (
                      <div key={idx} className="bg-red-500/10 border border-red-500/25 rounded p-2 text-xs text-red-400 flex items-start gap-1">
                        <span>⚠️</span>
                        <span>{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-800/40 pb-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Asset / Road Section</span>
                    <span className="text-white font-medium block">{details.roadName}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{details.roadType}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Prime Contractor</span>
                    <span className="text-white font-medium block">{details.contractorName}</span>
                    <span className="text-[10px] text-slate-400 block">Relayed: {details.lastRelayingDate}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-800/40 pb-3">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Sanctioned Budget</span>
                    <span className="text-white font-bold block text-sm">
                      {details.currencySymbol}{details.amountSanctioned.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono block">{details.currencyCode} Allocation</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Spent / Disbursed</span>
                    <span className="text-white font-bold block text-sm flex items-center gap-1">
                      {details.currencySymbol}{details.amountSpent.toLocaleString()}
                      {details.amountSpent > details.amountSanctioned && (
                        <span className="text-[10px] text-red-400 font-normal">(Overrun)</span>
                      )}
                    </span>
                    <span className="text-[9px] text-slate-400 block font-mono">Source: OpenSpending Ledger</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Governing Authority</span>
                    <span className="text-white font-semibold block">{details.authorityBody}</span>
                  </div>
                  <div className="flex justify-between items-center bg-[#020817]/60 p-2.5 rounded border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Supervising Engineer</span>
                      <span className="text-white font-medium block">{details.executiveEngineer}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{details.engineerEmail}</span>
                    </div>
                    <a
                      href={mailtoUrl}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1.5 rounded font-bold text-[10px] tracking-wide transition flex items-center gap-1 shadow-md"
                    >
                      ✉️ Route Complaint
                    </a>
                  </div>
                </div>
              </div>

              {/* External Links */}
              <div className="flex gap-4 pt-1">
                <a
                  href={`https://www.google.com/maps?q=${selectedReport.lat},${selectedReport.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 text-xs hover:text-cyan-300 underline inline-block"
                >
                  📍 View on Google Maps
                </a>
                <span className="text-slate-700">|</span>
                <span className="text-slate-500 text-xs font-mono">ID: {selectedReport.id.substring(0, 8)}...</span>
              </div>
            </div>
          );
        })()}

        {/* ---------- RIGHT : MAP ---------- */}
        {isLoaded && (
          <div className="h-64 md:h-auto min-h-[300px]">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              zoom={16}
              center={{
                lat: selectedReport.lat,
                lng: selectedReport.lng,
              }}
            >
              <Marker
                position={{
                  lat: selectedReport.lat,
                  lng: selectedReport.lng,
                }}
              />
            </GoogleMap>
          </div>
        )}
      </div>
    </div>
  </div>
)}

    </>
  );
}
