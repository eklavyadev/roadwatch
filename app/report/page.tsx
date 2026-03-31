'use client';

import { useState } from 'react';
import imageCompression from 'browser-image-compression';
import {
  CameraIcon,
  MapPinIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';

async function compressImage(file: File) {
  return await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.7,
    fileType: 'image/jpeg',
  });
}

const MAX_SIZE_MB = 10;
const MAX_GPS_ACCURACY = 200;

const IMPACT_LABELS: Record<string, { value: number; label: string }[]> = {
  pothole: [
    { value: 1, label: 'Minor surface damage' },
    { value: 2, label: 'Moderate dip / uneven road' },
    { value: 3, label: 'Severe / accident‑prone pothole' },
  ],
  streetlight: [
    { value: 1, label: 'Flickering occasionally' },
    { value: 2, label: 'Often off / unstable' },
    { value: 3, label: 'Completely not working' },
  ],
  traffic_signal: [
    { value: 1, label: 'Delayed / slow response' },
    { value: 2, label: 'Stuck on one color' },
    { value: 3, label: 'Not functioning at all' },
  ],
  open_drainage: [
    { value: 1, label: 'Partially open' },
    { value: 2, label: 'Fully open' },
    { value: 3, label: 'Deep / hazardous' },
  ],
};

const ISSUE_TYPES = [
  { value: 'pothole', label: 'Pothole', icon: '🕳️' },
  { value: 'streetlight', label: 'Streetlight', icon: '💡' },
  { value: 'traffic_signal', label: 'Traffic Signal', icon: '🚦' },
  { value: 'open_drainage', label: 'Open Drainage', icon: '🚧' },
];

export default function ReportPage() {
  const [image, setImage] = useState<File | null>(null);
  const [autoLocation, setAutoLocation] = useState('Not detected yet');
  const [landmark, setLandmark] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [issueType, setIssueType] = useState('pothole');
  const [impactLevel, setImpactLevel] = useState(2);
  const [locLoading, setLocLoading] = useState(false);

  const locationResolved = lat !== null && lng !== null;
  const isAccuracyAcceptable = accuracy !== null && accuracy <= MAX_GPS_ACCURACY;

  /* ---------- GET LOCATION ---------- */
  const getLocation = () => {
    setError('');
    setLocLoading(true);

    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      setLocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        setLat(latitude);
        setLng(longitude);
        setAccuracy(Math.round(pos.coords.accuracy));
        setLocLoading(false);

        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );
          const data = await res.json();
          if (data.status === 'OK' && data.results?.length) {
            setAutoLocation(data.results[0].formatted_address);
          } else {
            setAutoLocation('GPS reported location');
          }
        } catch {
          setAutoLocation('GPS reported location');
        }
      },
      () => {
        setError('Location permission denied');
        setLocLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  /* ---------- SUBMIT ---------- */
  const submitReport = async () => {
    setError('');

    if (!image) { setError('Please upload an image of the issue'); return; }
    if (!locationResolved) { setError('Please detect your location using GPS'); return; }
    if (!isAccuracyAcceptable) { setError('Location accuracy is too low. Please retry from an open area.'); return; }
    if (image.size > MAX_SIZE_MB * 1024 * 1024) { setError('Please upload an image smaller than 10MB'); return; }

    setLoading(true);
    setSuccess(false);

    const finalLocation = landmark.trim()
      ? `(${landmark.trim()}) ${autoLocation}`
      : autoLocation;

    const formData = new FormData();
    formData.append('image', image);
    formData.append('location', finalLocation);
    formData.append('lat', String(lat));
    formData.append('lng', String(lng));
    formData.append('type', issueType);
    formData.append('impact_level', String(impactLevel));

    const res = await fetch('/api/report/create', { method: 'POST', body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || 'Something went wrong'); return; }

    setImage(null);
    setLandmark('');
    setLat(null);
    setLng(null);
    setAccuracy(null);
    setAutoLocation('Not detected yet');
    setImpactLevel(2);
    setIssueType('pothole');
    setSuccess(true);
  };

  /* ---------- SUCCESS STATE ---------- */
  if (success) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center px-6">
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.4) 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
        <div className="relative text-center max-w-sm w-full">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-6">
            <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Report submitted</h2>
          <p className="text-gray-400 text-sm mb-8">
            Your report has been submitted and is pending automated verification. Only verified issues appear on the public map.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setSuccess(false)}
              className="flex-1 rounded-lg border border-slate-700 text-gray-300 hover:text-white py-2.5 text-sm font-medium transition-all"
            >
              Submit another
            </button>
            <a
              href="/"
              className="flex-1 rounded-lg bg-cyan-500 text-[#020817] py-2.5 text-sm font-semibold text-center hover:bg-cyan-400 transition-all"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- FORM ---------- */
  return (
    <div className="min-h-screen bg-[#020817] text-white px-6 py-16 pt-24">
      {/* Dot grid */}
      <div
        className="fixed inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.4) 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative mx-auto max-w-lg">
        {/* Back link */}
        <a href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors mb-8">
          ← Back to home
        </a>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Report an Issue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit a civic infrastructure problem in your area
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* ── Photo ── */}
          <div className="bg-[#0c1525] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CameraIcon className="h-4 w-4 text-cyan-400" />
              <p className="text-sm font-medium text-white">Photo</p>
              <span className="text-xs text-gray-600">required</span>
            </div>

            {image ? (
              <div className="relative">
                <img
                  src={URL.createObjectURL(image)}
                  alt="preview"
                  className="w-full h-48 object-cover rounded-lg border border-slate-700"
                />
                <button
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white text-xs hover:bg-black transition-colors flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/40 bg-[#020817]/50 py-10 px-4 transition-all group">
                <div className="h-10 w-10 rounded-full bg-slate-800 group-hover:bg-cyan-500/10 flex items-center justify-center transition-colors">
                  <ArrowUpTrayIcon className="h-5 w-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400 group-hover:text-white transition-colors">
                    Tap to capture or upload
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">Max 10MB · JPEG, PNG</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const compressed = await compressImage(file);
                    setImage(compressed);
                  }}
                />
              </label>
            )}
          </div>

          {/* ── Issue Type ── */}
          <div className="bg-[#0c1525] border border-slate-800 rounded-xl p-5">
            <p className="text-sm font-medium text-white mb-4">Issue Type</p>
            <div className="grid grid-cols-2 gap-2.5">
              {ISSUE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => { setIssueType(type.value); setImpactLevel(2); }}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                    issueType === type.value
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-700 bg-[#020817]/50 text-gray-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span className="text-base">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Impact Level ── */}
          <div className="bg-[#0c1525] border border-slate-800 rounded-xl p-5">
            <p className="text-sm font-medium text-white mb-4">Impact Level</p>
            <div className="space-y-2">
              {IMPACT_LABELS[issueType].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setImpactLevel(opt.value)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-all ${
                    impactLevel === opt.value
                      ? opt.value === 1
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : opt.value === 2
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                        : 'border-red-500/40 bg-red-500/10 text-red-300'
                      : 'border-slate-700 bg-[#020817]/50 text-gray-400 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-xs font-semibold ${
                    impactLevel === opt.value
                      ? opt.value === 1 ? 'text-emerald-400' : opt.value === 2 ? 'text-amber-400' : 'text-red-400'
                      : 'text-gray-600'
                  }`}>
                    {opt.value === 1 ? 'Low' : opt.value === 2 ? 'Medium' : 'High'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Location ── */}
          <div className="bg-[#0c1525] border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="h-4 w-4 text-cyan-400" />
              <p className="text-sm font-medium text-white">Location</p>
              <span className="text-xs text-gray-600">required</span>
            </div>

            {/* Landmark */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1.5 block">Nearest landmark (optional)</label>
              <input
                type="text"
                placeholder="e.g. Near bus stop, opposite school"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full rounded-lg bg-[#020817] border border-slate-700 text-white placeholder-gray-600 px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            {/* Auto location */}
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1.5 block">Auto-detected address</label>
              <input
                type="text"
                value={autoLocation}
                disabled
                className="w-full rounded-lg bg-[#020817]/60 border border-slate-800 text-gray-400 px-4 py-2.5 text-sm cursor-not-allowed"
              />
            </div>

            {/* Detect button or status */}
            {!locationResolved ? (
              <button
                onClick={getLocation}
                disabled={locLoading}
                className="flex items-center justify-center gap-2 w-full rounded-lg bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500/20 py-2.5 text-sm font-medium transition-all disabled:opacity-50"
              >
                <MapPinIcon className="h-4 w-4" />
                {locLoading ? 'Detecting…' : 'Detect my location'}
              </button>
            ) : (
              <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircleIcon className="h-4 w-4" />
                  Location detected
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  {lat!.toFixed(5)}, {lng!.toFixed(5)}
                </p>
                {accuracy !== null && (
                  <p className="text-xs text-gray-600">
                    GPS accuracy: ±{accuracy}m
                    {!isAccuracyAcceptable && (
                      <span className="text-red-400 ml-1">
                        — too low, move to an open area
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            onClick={submitReport}
            disabled={loading || !locationResolved || !isAccuracyAcceptable || !image}
            className="w-full rounded-xl bg-cyan-500 text-[#020817] py-3.5 text-sm font-semibold hover:bg-cyan-400 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-cyan-500/20"
          >
            {loading ? 'Submitting…' : 'Submit Report'}
          </button>

          <p className="text-xs text-gray-600 text-center pb-4">
            Reports are published after automated verification. Accurate GPS improves data quality for everyone.
          </p>
        </div>
      </div>
    </div>
  );
}
