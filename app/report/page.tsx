'use client';

import { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import Link from 'next/link';

async function compressImage(file: File) {
  return await imageCompression(file, {
    maxSizeMB: 1,          // < 1MB
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.7,
    fileType: 'image/jpeg',
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

function base64ToBlob(base64: string, mime: string) {
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

const MAX_SIZE_MB = 10;
const MAX_GPS_ACCURACY = 200; // meters

const IMPACT_LABELS: Record<
  string,
  { value: number; label: string }[]
> = {
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

const TYPE_LABEL: Record<string, string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  traffic_signal: 'Traffic Signal',
  open_drainage: 'Open Drainage',
};

const IMPACT_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export default function ReportPotholePage() {
  const [image, setImage] = useState<File | null>(null);

  // System-detected (read-only)
  const [autoLocation, setAutoLocation] = useState('Not detected yet');

  // User-provided
  const [landmark, setLandmark] = useState('');

  // GPS
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [issueType, setIssueType] = useState('pothole');
  const [impactLevel, setImpactLevel] = useState(2);

  // Offline support states
  const [isOnline, setIsOnline] = useState(true);
  const [offlineDraftsCount, setOfflineDraftsCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const locationResolved = lat !== null && lng !== null;
  const isAccuracyAcceptable =
    accuracy !== null && accuracy <= MAX_GPS_ACCURACY;

  // Initialize and check connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineReports();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial local storage draft check
    const cached = localStorage.getItem('roadwatch_offline_reports');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setOfflineDraftsCount(parsed.length);
      } catch {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /* ---------- SYNC OFFLINE DRAFTS ---------- */
  const syncOfflineReports = async () => {
    if (syncing) return;
    const cached = localStorage.getItem('roadwatch_offline_reports');
    if (!cached) return;

    let drafts: any[] = [];
    try {
      drafts = JSON.parse(cached);
    } catch {
      return;
    }

    if (drafts.length === 0) return;

    setSyncing(true);
    setError('');
    let failedCount = 0;
    const remainingDrafts: any[] = [];

    for (const draft of drafts) {
      try {
        const blob = base64ToBlob(draft.image_base64, draft.image_type);
        const file = new File([blob], draft.image_name, { type: draft.image_type });

        const formData = new FormData();
        formData.append('image', file);
        formData.append('location', draft.location);
        formData.append('lat', String(draft.lat));
        formData.append('lng', String(draft.lng));
        formData.append('type', draft.type);
        formData.append('impact_level', String(draft.impact_level));
        if (draft.road_category) {
          formData.append('road_category', draft.road_category);
        }

        const res = await fetch('/api/report/create', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          console.error('Failed to sync draft:', data.error);
          failedCount++;
          remainingDrafts.push(draft);
        }
      } catch (err) {
        console.error('Error syncing draft:', err);
        failedCount++;
        remainingDrafts.push(draft);
      }
    }

    localStorage.setItem('roadwatch_offline_reports', JSON.stringify(remainingDrafts));
    setOfflineDraftsCount(remainingDrafts.length);
    setSyncing(false);

    if (failedCount === 0) {
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 5000);
    } else {
      setError(`Successfully synced some drafts, but ${failedCount} reports failed to upload. They will be kept locally.`);
    }
  };

  /* ---------- GET LOCATION ---------- */
  const getLocation = () => {
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = Math.abs(pos.coords.latitude);
        const longitude = Math.abs(pos.coords.longitude);

        setLat(latitude);
        setLng(longitude);
        setAccuracy(Math.round(pos.coords.accuracy));

        // Simplified location handling (Google Maps API disabled)
        setAutoLocation(`Lat ${latitude.toFixed(5)}, Lng ${longitude.toFixed(5)}`);
      },
      () => {
        setError('Location permission denied');
      },
      { enableHighAccuracy: true }
    );
  };

  /* ---------- SUBMIT ---------- */
  const submitReport = async () => {
    setError('');

    if (!image) {
      setError('Please upload an image of the issue');
      return;
    }

    if (!locationResolved) {
      setError('Please detect your location using GPS');
      return;
    }

    if (!isAccuracyAcceptable) {
      setError(
        'Location accuracy is too low. Please retry from an open area.'
      );
      return;
    }

    if (image.size > MAX_SIZE_MB * 1024 * 1024) {
      setError('Please upload an image smaller than 10MB');
      return;
    }

    setLoading(true);
    setSuccess(false);

    const finalLocation = landmark.trim()
      ? `(${landmark.trim()}) ${autoLocation}`
      : autoLocation;

    let roadCategory = 'PWD';
    if (navigator.onLine) {
      try {
        const classRes = await fetch('/api/classify-road', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat, lng }),
        });
        if (classRes.ok) {
          const classData = await classRes.json();
          if (classData.category) {
            roadCategory = classData.category;
          }
        }
      } catch (err) {
        console.warn('Failed to classify road:', err);
      }
    }

    // Check if offline, bypass server and cache locally
    if (!navigator.onLine) {
      try {
        const base64Str = await fileToBase64(image);
        const offlineReport = {
          image_base64: base64Str,
          image_name: image.name,
          image_type: image.type,
          location: finalLocation,
          lat,
          lng,
          type: issueType,
          impact_level: impactLevel,
          road_category: roadCategory,
        };

        const cached = localStorage.getItem('roadwatch_offline_reports');
        const list = cached ? JSON.parse(cached) : [];
        list.push(offlineReport);
        localStorage.setItem('roadwatch_offline_reports', JSON.stringify(list));
        setOfflineDraftsCount(list.length);

        setLoading(false);
        // Reset form fields
        setImage(null);
        setLandmark('');
        setLat(null);
        setLng(null);
        setAccuracy(null);
        setAutoLocation('Not detected yet');
        setImpactLevel(2);
        setIssueType('pothole');
        setSuccess(true);
        setError('OFFLINE_SAVED'); // use error state to trigger custom offline warning
        return;
      } catch (err: any) {
        setLoading(false);
        setError('Failed to save report offline: ' + err.message);
        return;
      }
    }

    // Online submission flow
    try {
      const formData = new FormData();
      formData.append('image', image);
      formData.append('location', finalLocation);
      formData.append('lat', String(lat));
      formData.append('lng', String(lng));
      formData.append('type', issueType);
      formData.append('impact_level', String(impactLevel));
      formData.append('road_category', roadCategory);

      const res = await fetch('/api/report/create', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      // Reset
      setImage(null);
      setLandmark('');
      setLat(null);
      setLng(null);
      setAccuracy(null);
      setAutoLocation('Not detected yet');
      setImpactLevel(2);
      setIssueType('pothole');
      setSuccess(true);
    } catch (err) {
      console.warn('Online fetch failed. Attemping local offline fallback...', err);
      try {
        const base64Str = await fileToBase64(image);
        const offlineReport = {
          image_base64: base64Str,
          image_name: image.name,
          image_type: image.type,
          location: finalLocation,
          lat,
          lng,
          type: issueType,
          impact_level: impactLevel,
          road_category: roadCategory,
        };

        const cached = localStorage.getItem('roadwatch_offline_reports');
        const list = cached ? JSON.parse(cached) : [];
        list.push(offlineReport);
        localStorage.setItem('roadwatch_offline_reports', JSON.stringify(list));
        setOfflineDraftsCount(list.length);

        setLoading(false);
        setImage(null);
        setLandmark('');
        setLat(null);
        setLng(null);
        setAccuracy(null);
        setAutoLocation('Not detected yet');
        setImpactLevel(2);
        setIssueType('pothole');
        setSuccess(true);
        setError('OFFLINE_SAVED');
      } catch (offlineErr: any) {
        setLoading(false);
        setError('Network failed, and local saving failed: ' + offlineErr.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white px-6 py-20">
      <div className="mx-auto max-w-xl bg-[#0f172a] p-6 rounded border border-slate-700">
        <h1 className="text-2xl font-bold mb-6">Report a Road‑Related Issue</h1>
        <p className="mt-2 text-sm text-gray-300">If you need to file a complaint with the appropriate authority, please visit the <Link href="/complaint" className="text-blue-400 underline">Complaint Page</Link>.</p>

        {success && error === 'OFFLINE_SAVED' && (
          <div className="mb-4 rounded bg-amber-600/20 border border-amber-600 p-3 text-sm text-amber-400">
            📦 <b>Report Saved Locally (Offline)</b>
            <p className="mt-1 text-xs text-slate-300">
              You are currently offline or in a low-network zone. The report has been securely saved to local storage and will automatically synchronize once your internet connection is restored.
            </p>
          </div>
        )}

        {success && error !== 'OFFLINE_SAVED' && (
          <div className="mb-4 rounded bg-green-600/20 border border-green-600 p-3 text-sm text-green-400">
            ✅ Pothole reported successfully.
          </div>
        )}

        {error && error !== 'OFFLINE_SAVED' && (
          <div className="mb-4 rounded bg-red-600/20 border border-red-600 p-3 text-sm text-red-400">
            ⚠️ {error}
          </div>
        )}

        {/* Offline Connection Alert */}
        {!isOnline && (
          <div className="mb-4 rounded bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-400 flex items-center justify-between">
            <span>📡 <b>Status:</b> Offline (Local-Saving Engaged)</span>
            <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded uppercase font-bold animate-pulse">Offline</span>
          </div>
        )}

        {/* Offline Drafts Sync Banner */}
        {offlineDraftsCount > 0 && (
          <div className="mb-4 rounded bg-cyan-500/10 border border-cyan-500/20 p-4 text-sm text-cyan-400 space-y-2">
            <div className="flex items-center justify-between">
              <span>📦 <b>{offlineDraftsCount} Unsynced Report{offlineDraftsCount > 1 ? 's' : ''}</b> locally stored</span>
              <button
                onClick={syncOfflineReports}
                disabled={syncing || !isOnline}
                className="bg-cyan-500 text-black px-3 py-1 rounded font-semibold text-xs disabled:opacity-55 disabled:cursor-not-allowed hover:bg-cyan-400 transition"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            {!isOnline && (
              <p className="text-[11px] text-slate-400 italic">Please connect to the internet to upload your cached drafts.</p>
            )}
          </div>
        )}

        {syncSuccess && (
          <div className="mb-4 rounded bg-green-600/20 border border-green-600 p-3 text-sm text-green-400">
            ✨ All local drafts synced successfully with the server!
          </div>
        )}


        {/* Image */}
        <label className="block mb-4">
          <span className="text-sm text-gray-300">
            Capture / Upload photo (max 10MB)
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const compressed = await compressImage(file);
                setImage(compressed);
              }}

            className="mt-2 block w-full text-sm"
          />
        </label>

        {image && (
          <div className="mb-4">
            <img
              src={URL.createObjectURL(image)}
              alt="preview"
              className="w-full h-48 object-contain rounded border border-slate-600"
            />
          </div>
        )}

        {/* Landmark */}
        <label className="block mb-4">
          <span className="text-sm text-gray-300">
            Nearest landmark (optional)
          </span>
          <input
            type="text"
            placeholder="e.g. Near bus stop, opposite school"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
            className="mt-2 w-full rounded bg-[#020817] border border-slate-600 p-2"
          />
        </label>

        {/* Auto location */}
        <label className="block mb-4">
          <span className="text-sm text-gray-300">
            📍 Auto‑detected area (from GPS)
          </span>
          <input
            type="text"
            value={autoLocation}
            disabled
            className="mt-2 w-full rounded bg-[#020817] border border-slate-600 p-2 text-gray-400 cursor-not-allowed"
          />
        </label>

        {!locationResolved && (
          <button
            onClick={getLocation}
            className="mb-4 bg-cyan-500 text-black px-4 py-2 rounded text-sm font-semibold"
          >
            📍 Detect Location
          </button>
        )}

        {locationResolved && accuracy !== null && (
          <div className="mb-4 text-xs text-gray-400 space-y-1">
            <p>
              Lat: {lat!.toFixed(5)}, Lng: {lng!.toFixed(5)}
            </p>
            <p>📡 GPS Accuracy: ± {accuracy} meters</p>

            {!isAccuracyAcceptable && (
              <p className="text-red-400">
                Location accuracy is too low. Try moving to an open area or reset
                GPS via
                <a
                  href="https://maps.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-cyan-400 mx-1"
                >
                  maps.google.com
                </a>
                (required accuracy ≤ {MAX_GPS_ACCURACY}m).
              </p>
            )}
          </div>
        )}

        {/* Severity */}
        {/* <label className="block mb-6">
          <span className="text-sm text-gray-300">Severity</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="mt-2 w-full bg-[#020817] border border-slate-600 p-2 rounded"
          >
            <option value={1}>1 – Minor</option>
            <option value={2}>2 – Low</option>
            <option value={3}>3 – Medium</option>
            <option value={4}>4 – High</option>
            <option value={5}>5 – Critical</option>
          </select>
        </label> */}

                {/* ISSUE TYPE */}
        <label className="block mb-4">
          <span className="text-sm text-gray-300">Issue Type</span>
          <select
            value={issueType}
            onChange={(e) => {
              setIssueType(e.target.value);
              setImpactLevel(3); // reset on change
            }}
            className="mt-2 w-full bg-[#020817] border border-slate-600 p-2 rounded"
          >
            <option value="pothole">Pothole</option>
            <option value="streetlight">Streetlight</option>
            <option value="traffic_signal">Traffic Signal</option>
            <option value="open_drainage">Open Drainage</option>
          </select>
        </label>

        {/* IMPACT LEVEL (DYNAMIC) */}
        <label className="block mb-6">
          <span className="text-sm text-gray-300">Impact Level</span>
          <select
            value={impactLevel}
            onChange={(e) => setImpactLevel(Number(e.target.value))}
            className="mt-2 w-full bg-[#020817] border border-slate-600 p-2 rounded"
          >
            {IMPACT_LABELS[issueType].map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.value} – {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={submitReport}
          disabled={loading || !locationResolved || !isAccuracyAcceptable}
          className="w-full bg-white text-black py-3 rounded font-semibold disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Report'}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Reports are published after automated verification.
          <br />
          Accurate GPS improves data quality for everyone.
        </p>
      </div>
    </div>
  );
}
