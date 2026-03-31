'use client';

import { useEffect, useState } from 'react';
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from '@react-google-maps/api';
import {
  MapPinIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

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

const IMPACT_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

const IMPACT_BADGE_CLASS: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  2: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  3: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

const TYPE_LABEL: Record<Report['type'], string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  traffic_signal: 'Traffic Signal',
  open_drainage: 'Open Drainage',
};

const TYPE_ICON: Record<Report['type'], string> = {
  pothole: '🕳️',
  streetlight: '💡',
  traffic_signal: '🚦',
  open_drainage: '🚧',
};

const IMPACT_DESCRIPTION: Record<Report['type'], Record<number, string>> = {
  pothole: {
    1: 'Minor surface damage',
    2: 'Moderate dip / uneven road',
    3: 'Severe accident‑prone pothole',
  },
  streetlight: {
    1: 'Streetlight flickering occasionally',
    2: 'Streetlight often off or unstable',
    3: 'Streetlight completely not working',
  },
  traffic_signal: {
    1: 'Signal responding with delay',
    2: 'Signal stuck on one color',
    3: 'Traffic signal not functioning',
  },
  open_drainage: {
    1: 'Drain partially open',
    2: 'Drain fully open',
    3: 'Deep open drain posing danger',
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
        const approved = data.filter((r: Report) => r.status === 'approved');
        setReports(approved);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="bg-[#0c1525] border border-slate-800 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="h-48 bg-slate-800" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
              <div className="h-3 bg-slate-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="border border-dashed border-slate-800 rounded-xl p-16 text-center">
        <p className="text-gray-500 text-sm">No verified reports yet.</p>
      </div>
    );
  }

  const start = page * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleReports = reports.slice(start, end);
  const totalPages = Math.ceil(reports.length / PAGE_SIZE);

  return (
    <>
      <div className="space-y-8">
        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleReports.map((r) => {
            const level = Number(r.impact_level);
            return (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="group cursor-pointer bg-[#0c1525] border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative bg-slate-900 overflow-hidden">
                  <img
                    src={r.image_url}
                    alt={r.type}
                    className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Type badge overlaid on image */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-white border border-white/10">
                      <span>{TYPE_ICON[r.type]}</span>
                      {TYPE_LABEL[r.type]}
                    </span>
                  </div>
                  {/* Impact badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${IMPACT_BADGE_CLASS[level]}`}>
                      {IMPACT_LABEL[level]}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2.5">
                  <p className="text-white font-medium text-sm leading-snug line-clamp-2">
                    {r.location}
                  </p>

                  <p className="text-xs text-gray-500">
                    {IMPACT_DESCRIPTION[r.type][level]}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <MapPinIcon className="h-3.5 w-3.5" />
                      <span>{r.lat.toFixed(4)}, {r.lng.toFixed(4)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {reports.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="px-4 py-2 rounded-lg bg-[#0c1525] border border-slate-800 text-sm text-gray-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page === totalPages - 1}
              className="px-4 py-2 rounded-lg bg-[#0c1525] border border-slate-800 text-sm text-gray-400 hover:text-white hover:border-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            className="relative bg-[#0c1525] border border-slate-700/50 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 z-10 h-9 w-9 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 max-h-[88vh] overflow-y-auto">
              {/* Left: Details */}
              <div className="p-6 space-y-4">
                <img
                  src={selectedReport.image_url}
                  alt={selectedReport.type}
                  className="rounded-xl w-full h-60 object-cover"
                />

                {/* Type + Impact row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-medium text-white">
                    {TYPE_ICON[selectedReport.type]} {TYPE_LABEL[selectedReport.type]}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${IMPACT_BADGE_CLASS[selectedReport.impact_level]}`}>
                    {IMPACT_LABEL[selectedReport.impact_level]} Impact
                  </span>
                </div>

                <div>
                  <p className="text-white font-semibold leading-snug">
                    {selectedReport.location}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {IMPACT_DESCRIPTION[selectedReport.type][selectedReport.impact_level]}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-[#020817] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Latitude</p>
                    <p className="text-sm font-mono text-white">{selectedReport.lat.toFixed(5)}</p>
                  </div>
                  <div className="bg-[#020817] rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-500 mb-0.5">Longitude</p>
                    <p className="text-sm font-mono text-white">{selectedReport.lng.toFixed(5)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-gray-500">
                    Reported {new Date(selectedReport.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.lat},${selectedReport.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                    View on Google Maps
                  </a>
                </div>
              </div>

              {/* Right: Map */}
              <div className="h-64 md:h-auto min-h-[320px]">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    zoom={16}
                    center={{ lat: selectedReport.lat, lng: selectedReport.lng }}
                    options={{
                      disableDefaultUI: true,
                      zoomControl: true,
                      styles: [
                        { elementType: 'geometry', stylers: [{ color: '#1a2744' }] },
                        { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
                        { elementType: 'labels.text.stroke', stylers: [{ color: '#1a2744' }] },
                        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d3f6b' }] },
                        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1d33' }] },
                      ],
                    }}
                  >
                    <Marker
                      position={{ lat: selectedReport.lat, lng: selectedReport.lng }}
                    />
                  </GoogleMap>
                ) : (
                  <div className="h-full bg-slate-900 flex items-center justify-center">
                    <p className="text-sm text-gray-500">Loading map…</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
