'use client';

import { useEffect, useState } from 'react';

type Report = {
  id: string;
  image_url: string;
  location: string;
  lat: number;
  lng: number;
  severity: number;
  governing_body: string;
  created_at: string;
  status: string;
};

const PAGE_SIZE = 6;

export function ApprovedPotholes() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

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

  /* ---------- STATES ---------- */
  if (loading) {
    return (
      <p className="text-gray-400 text-sm">
        Loading verified reports…
      </p>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="border border-dashed border-slate-700 rounded p-8 text-center">
        <p className="text-gray-400">
          No verified pothole reports yet.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Be the first to report a road issue and make an impact 🚧
        </p>
      </div>
    );
  }

  /* ---------- PAGINATION ---------- */
  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleReports = reports.slice(start, end);
  const totalPages = Math.ceil(reports.length / PAGE_SIZE);

  /* ---------- CARDS ---------- */
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleReports.map((r) => (
          <div
            key={r.id}
            className="bg-[#0f172a] border border-slate-700 rounded overflow-hidden"
          >
            {/* Image */}
            <div className="bg-black">
              <img
                src={r.image_url}
                alt="pothole"
                className="h-48 w-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="p-4 space-y-2 text-sm text-slate-300">
              <p className="text-white font-semibold">
                {r.location}
              </p>

              <p>
                <span className="text-white font-medium">
                  Authority:
                </span>{' '}
                {r.governing_body || 'Unknown'}
              </p>

              <p>
                <span className="text-white font-medium">
                  Coordinates:
                </span>{' '}
                {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
              </p>

              <p>
                <span className="text-white font-medium">
                  Severity:
                </span>{' '}
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    r.severity >= 4
                      ? 'bg-red-600 text-white'
                      : r.severity === 3
                      ? 'bg-yellow-500 text-black'
                      : 'bg-green-600 text-white'
                  }`}
                >
                  {r.severity}
                </span>
              </p>

              <p className="text-xs text-slate-400">
                Reported on:{' '}
                {new Date(r.created_at).toLocaleDateString()}
              </p>

              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                target="_blank"
                className="text-cyan-400 text-xs underline"
              >
                View on Google Maps
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* ---------- NAVIGATION ---------- */}
      {reports.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="px-4 py-2 rounded bg-slate-700 text-white text-sm disabled:opacity-40"
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
            className="px-4 py-2 rounded bg-slate-700 text-white text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
