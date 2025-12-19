'use client';

import { useState } from 'react';

type Report = {
  id: string;
  image_url: string;
  location: string;
  lat: number;
  lng: number;
  severity: number;
  governing_body: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function AdminPage() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<
    'pending' | 'approved' | 'rejected'
  >('pending');

  /* ---------- AUTH ---------- */
  const login = async () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAuth(true);
      fetchReports();
    } else {
      alert('Wrong password');
    }
  };

  /* ---------- DATA ---------- */
  const fetchReports = async () => {
    const res = await fetch('/api/admin/reports');
    const data = await res.json();
    setReports(data);
  };

  const updateStatus = async (
    id: string,
    status: 'pending' | 'approved' | 'rejected'
  ) => {
    await fetch('/api/admin/update', {
      method: 'POST',
      body: JSON.stringify({ id, status }),
    });
    fetchReports();
  };

  const filteredReports = reports.filter(
    (r) => r.status === activeTab
  );

  /* ---------- LOGIN UI ---------- */
  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020817]">
        <div className="border border-slate-700 p-6 rounded w-72 bg-[#0f172a]">
          <h2 className="text-lg font-bold mb-4 text-white">
            Admin Login
          </h2>
          <input
            type="password"
            placeholder="Admin password"
            className="border border-slate-600 bg-[#020817] text-white p-2 w-full mb-3 rounded"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={login}
            className="w-full bg-white text-black py-2 rounded font-medium"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  /* ---------- DASHBOARD ---------- */
  return (
    <div className="p-6 bg-[#020817] min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {['pending', 'approved', 'rejected'].map((tab) => (
          <button
            key={tab}
            onClick={() =>
              setActiveTab(tab as 'pending' | 'approved' | 'rejected')
            }
            className={`px-4 py-2 rounded capitalize ${
              activeTab === tab
                ? 'bg-white text-black'
                : 'bg-[#0f172a] text-slate-300 border border-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((r) => (
          <div
            key={r.id}
            className="border border-slate-700 rounded bg-[#0f172a] overflow-hidden"
          >
            {/* Image */}
            <div className="bg-black flex items-center justify-center">
              <img
                src={r.image_url}
                alt="report"
                className="h-64 w-full object-contain"
              />
            </div>

            {/* Content */}
            <div className="p-4 space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-white font-semibold">Location:</span>{' '}
                {r.location}
              </p>

              <p>
                <span className="text-white font-semibold">Coordinates:</span>{' '}
                {r.lat}, {r.lng}
              </p>

              <p>
                <span className="text-white font-semibold">Severity:</span>{' '}
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

              <p>
                <span className="text-white font-semibold">Authority:</span>{' '}
                <span className="px-2 py-1 bg-slate-700 rounded text-xs text-white">
                  {r.governing_body}
                </span>
              </p>

              <p className="text-xs text-slate-400">
                Submitted:{' '}
                {new Date(r.created_at).toLocaleString()}
              </p>

              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
                target="_blank"
                className="text-blue-400 text-xs underline"
              >
                View on Google Maps
              </a>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 p-4 border-t border-slate-700">
              {r.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => updateStatus(r.id, 'approved')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, 'rejected')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded"
                  >
                    Reject
                  </button>
                </div>
              )}

              {r.status === 'approved' && (
                <>
                  <span className="text-green-400 text-sm font-semibold">
                    ✔ Approved
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateStatus(r.id, 'pending')}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-1 rounded text-sm"
                    >
                      Move to Pending
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'rejected')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-1 rounded text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}

              {r.status === 'rejected' && (
                <>
                  <span className="text-red-400 text-sm font-semibold">
                    ✖ Declined
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateStatus(r.id, 'pending')}
                      className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-1 rounded text-sm"
                    >
                      Move to Pending
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1 rounded text-sm"
                    >
                      Approve
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
