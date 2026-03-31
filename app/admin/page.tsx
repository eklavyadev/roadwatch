'use client';

import { useState } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowPathIcon,
  MapPinIcon,
  CalendarDaysIcon,
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
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
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

const IMPACT_LABEL: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High' };

const IMPACT_BADGE: Record<number, string> = {
  1: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  2: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
  3: 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/25',
};

const IMPACT_DESCRIPTION: Record<Report['type'], Record<number, string>> = {
  pothole: { 1: 'Minor surface damage', 2: 'Moderate dip / uneven road', 3: 'Severe / accident‑prone pothole' },
  streetlight: { 1: 'Flickering occasionally', 2: 'Often off / unstable', 3: 'Completely not working' },
  traffic_signal: { 1: 'Delayed / slow response', 2: 'Stuck on one color', 3: 'Not functioning at all' },
  open_drainage: { 1: 'Partially open', 2: 'Fully open', 3: 'Deep / hazardous' },
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white dark:bg-[#0c1525] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const login = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuth(true);
      fetchReports();
    } else {
      showToast('Wrong password', 'error');
    }
  };

  const fetchReports = async () => {
    const res = await fetch('/api/admin/reports');
    const data = await res.json();
    setReports(data);
  };

  const updateStatus = async (id: string, status: 'pending' | 'approved' | 'rejected') => {
    await fetch('/api/admin/update', { method: 'POST', body: JSON.stringify({ id, status }) });
    fetchReports();
    showToast(`Moved to ${status}`);
  };

  const deleteReport = async (id: string) => {
    const ok = confirm('This will permanently delete the report. Continue?');
    if (!ok) return;
    const res = await fetch(`/api/admin/reports/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchReports(); showToast('Report deleted'); }
    else showToast('Delete failed', 'error');
  };

  const counts = {
    pending: reports.filter((r) => r.status === 'pending').length,
    approved: reports.filter((r) => r.status === 'approved').length,
    rejected: reports.filter((r) => r.status === 'rejected').length,
  };

  const filteredReports = reports.filter((r) => r.status === activeTab);

  /* LOGIN */
  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020817] px-6">
        <div
          className="absolute inset-0 opacity-[0.1] dark:opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.4) 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div className="relative w-full max-w-sm">
          <div className="bg-white dark:bg-[#0c1525] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl dark:shadow-2xl dark:shadow-black/50">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="h-8 w-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
                <svg width="15" height="15" viewBox="0 0 14 14" fill="none" className="text-white dark:text-[#020817]">
                  <path d="M7 1L13 4V7C13 10.3 10.3 13 7 13C3.7 13 1 10.3 1 7V4L7 1Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="7" cy="7.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Road<span className="text-cyan-500 dark:text-cyan-400">Watch</span></p>
                <p className="text-xs text-slate-500 dark:text-gray-500">Admin Portal</p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Sign in</h2>
            <p className="text-sm text-slate-500 dark:text-gray-500 mb-6">Enter the admin password to continue</p>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Admin password"
                className="w-full rounded-lg bg-slate-50 dark:bg-[#020817] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-400 dark:focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-400/20 dark:focus:ring-cyan-500/20 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
              />
              <button
                onClick={login}
                className="w-full rounded-lg bg-cyan-500 text-white dark:text-[#020817] py-2.5 text-sm font-semibold hover:bg-cyan-400 active:scale-95 transition-all"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className={`fixed bottom-6 right-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl ${
            toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            {toast.msg}
          </div>
        )}
      </div>
    );
  }

  /* DASHBOARD */
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020817] text-slate-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020817]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white dark:text-[#020817]">
                <path d="M7 1L13 4V7C13 10.3 10.3 13 7 13C3.7 13 1 10.3 1 7V4L7 1Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="7" cy="7.5" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900 dark:text-white">Admin Panel</h1>
              <p className="text-xs text-slate-500 dark:text-gray-500">Road<span className="text-cyan-500 dark:text-cyan-400">Watch</span></p>
            </div>
          </div>
          <button
            onClick={fetchReports}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600 transition-all"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Reports" value={reports.length} icon={ChartBarIcon} color="bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300" />
          <StatCard label="Pending Review" value={counts.pending} icon={ClockIcon} color="bg-amber-500/15 text-amber-600 dark:text-amber-400" />
          <StatCard label="Approved" value={counts.approved} icon={CheckCircleIcon} color="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Rejected" value={counts.rejected} icon={XCircleIcon} color="bg-red-500/15 text-red-600 dark:text-red-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(
            [
              { key: 'pending', label: 'Pending', color: 'amber' },
              { key: 'approved', label: 'Approved', color: 'emerald' },
              { key: 'rejected', label: 'Rejected', color: 'red' },
            ] as const
          ).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-[#020817]'
                  : 'bg-white dark:bg-[#0c1525] border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-600'
              }`}
            >
              {label}
              {counts[key] > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                  activeTab === key
                    ? 'bg-white/20 dark:bg-black/10 text-white dark:text-[#020817]'
                    : color === 'amber'
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : color === 'emerald'
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports */}
        {filteredReports.length === 0 ? (
          <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-16 text-center">
            <p className="text-slate-500 dark:text-gray-500 text-sm">No {activeTab} reports</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReports.map((r) => (
              <div key={r.id} className="bg-white dark:bg-[#0c1525] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                {/* Image */}
                <div className="relative bg-slate-100 dark:bg-slate-900">
                  <img src={r.image_url} alt="report" className="h-52 w-full object-cover" />
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-medium text-white border border-white/10">
                      {TYPE_ICON[r.type]} {TYPE_LABEL[r.type]}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${IMPACT_BADGE[r.impact_level]}`}>
                      {IMPACT_LABEL[r.impact_level]}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <p className="text-slate-900 dark:text-white font-medium text-sm leading-snug line-clamp-2">{r.location}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">{IMPACT_DESCRIPTION[r.type]?.[r.impact_level]}</p>
                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-600">
                      <MapPinIcon className="h-3.5 w-3.5" />
                      {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-600">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 space-y-2">
                  {r.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(r.id, 'approved')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 py-2 text-sm font-medium transition-all">
                        <CheckCircleIcon className="h-4 w-4" />Approve
                      </button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/25 py-2 text-sm font-medium transition-all">
                        <XCircleIcon className="h-4 w-4" />Reject
                      </button>
                    </div>
                  )}

                  {r.status === 'approved' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(r.id, 'pending')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white py-2 text-sm font-medium transition-all">
                        <ArrowPathIcon className="h-4 w-4" />Pending
                      </button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/25 py-2 text-sm font-medium transition-all">
                        <XCircleIcon className="h-4 w-4" />Reject
                      </button>
                    </div>
                  )}

                  {r.status === 'rejected' && (
                    <>
                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(r.id, 'pending')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white py-2 text-sm font-medium transition-all">
                          <ArrowPathIcon className="h-4 w-4" />Pending
                        </button>
                        <button onClick={() => updateStatus(r.id, 'approved')} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 py-2 text-sm font-medium transition-all">
                          <CheckCircleIcon className="h-4 w-4" />Approve
                        </button>
                      </div>
                      <button onClick={() => deleteReport(r.id)} className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/25 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 py-2 text-sm font-medium transition-all">
                        <TrashIcon className="h-4 w-4" />Delete Permanently
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-sm transition-all ${
          toast.type === 'error'
            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400'
            : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
