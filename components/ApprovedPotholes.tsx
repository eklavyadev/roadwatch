'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

const IMPACT_DESCRIPTION: Record<Report['type'], Record<number, string>> = {
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('roadwatch_cached_approved_reports');
      if (cached) {
        try {
          setReports(JSON.parse(cached));
          setLoading(false);
        } catch {}
      }
    }

    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        const approved = data.filter((r: Report) => r.status === 'approved');
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleReports.map((r) => {
          const level = Number(r.impact_level);
          return (
            <Link
              key={r.id}
              href={`/report/${r.id}`}
              className="group block bg-[#0f172a] border border-slate-700 rounded overflow-hidden hover:border-cyan-400 transition"
            >
              {/* Image */}
              <div className="bg-black relative">
                <img
                  src={r.image_url}
                  alt={r.type}
                  className="h-48 w-full object-cover group-hover:opacity-90 transition"
                />
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2 text-sm text-slate-300">
                <p className="text-white font-semibold line-clamp-2">{r.location}</p>

                <p>
                  <span className="text-white font-medium">Issue Type: </span>
                  {TYPE_LABEL[r.type]}
                </p>

                <p>
                  <span className="text-white font-medium">Coordinates: </span>
                  {r.lat.toFixed(5)}, {r.lng.toFixed(5)}
                </p>

                <p>
                  <span className="text-white font-medium">Impact Level: </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${IMPACT_BADGE_CLASS[level]}`}>
                    {IMPACT_LABEL[level]}
                  </span>
                </p>

                <p className="text-xs text-slate-400">{IMPACT_DESCRIPTION[r.type][level]}</p>

                <p className="text-xs text-slate-400">
                  Reported on: {new Date(r.created_at).toLocaleDateString()}
                </p>

                <p className="text-xs text-cyan-500 group-hover:text-cyan-300 transition font-medium pt-1">
                  View full report →
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
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
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
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
