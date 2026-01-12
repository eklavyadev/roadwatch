'use client';

import { useEffect, useState } from 'react';
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from '@react-google-maps/api';

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
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        const approved = data.filter(
          (r: Report) => r.status === 'approved'
        );
        setReports(approved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

            return (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="cursor-pointer bg-[#0f172a] border border-slate-700 rounded overflow-hidden hover:border-cyan-400 transition"
              >
                <div className="bg-black">
                  <img
                    src={r.image_url}
                    alt={r.type}
                    className="h-48 w-full object-cover"
                  />
                </div>

                <div className="p-4 space-y-2 text-sm text-slate-300">
                  <p className="text-white font-semibold">{r.location}</p>

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
        <div className="p-6 space-y-4">

          {/* Image */}
          <img
            src={selectedReport.image_url}
            alt={selectedReport.type}
            className="rounded w-full h-64 sm:h-72 object-cover"
          />

          {/* Location */}
          <p className="text-white font-semibold text-lg">
            {selectedReport.location}
          </p>

          {/* Issue Type */}
          <p className="text-sm text-slate-300">
            <span className="text-white font-medium">Issue Type:</span>{' '}
            {TYPE_LABEL[selectedReport.type]}
          </p>

          {/* Coordinates */}
          <p className="text-sm text-slate-300">
            <span className="text-white font-medium">Coordinates:</span>{' '}
            {selectedReport.lat.toFixed(5)}, {selectedReport.lng.toFixed(5)}
          </p>

          {/* Impact Level */}
          <p className="text-sm text-slate-300">
            <span className="text-white font-medium">Impact Level:</span>{' '}
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${
                IMPACT_BADGE_CLASS[selectedReport.impact_level]
              }`}
            >
              {IMPACT_LABEL[selectedReport.impact_level]}
            </span>
          </p>

          {/* Description */}
          <p className="text-sm text-slate-400 leading-relaxed">
            {
              IMPACT_DESCRIPTION[selectedReport.type][
                selectedReport.impact_level
              ]
            }
          </p>

          {/* Date */}
          <p className="text-xs text-slate-400">
            Reported on:{' '}
            {new Date(selectedReport.created_at).toLocaleDateString()}
          </p>

          {/* Google Maps link (KEPT) */}
          <a
            href={`https://www.google.com/maps?q=${selectedReport.lat},${selectedReport.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 text-sm underline inline-block"
          >
            View on Google Maps
          </a>
        </div>

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
