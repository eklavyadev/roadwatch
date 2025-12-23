'use client';

import { useState } from 'react';

const MAX_SIZE_MB = 10;

export default function ReportPotholePage() {
  const [image, setImage] = useState<File | null>(null);
  const [location, setLocation] = useState('Waiting for location…');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [severity, setSeverity] = useState(3);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const locationResolved = lat !== null && lng !== null;

  /* ---------- GET LOCATION + AUTO FILL ---------- */
  const getLocation = () => {
    setError('');
    setLocation('Detecting location…');

    if (!navigator.geolocation) {
      setLocation('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        setLat(latitude);
        setLng(longitude);

        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
          );

          const data = await res.json();

          if (data.results?.length) {
            setLocation(data.results[0].formatted_address);
          } else {
            setLocation('Unable to resolve address');
          }
        } catch {
          setLocation('Failed to fetch address');
        }
      },
      () => {
        setLocation('Location permission denied');
      },
      { enableHighAccuracy: true }
    );
  };

  /* ---------- SUBMIT ---------- */
  const submitReport = async () => {
    setError('');

    if (!image || !locationResolved) {
      setError('Please upload an image and detect location');
      return;
    }

    if (image.size > MAX_SIZE_MB * 1024 * 1024) {
      setError('Please upload an image smaller than 10MB');
      return;
    }

    setLoading(true);
    setSuccess(false);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('location', location);
    formData.append('lat', String(lat));
    formData.append('lng', String(lng));
    formData.append('severity', String(severity));

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
    setLat(null);
    setLng(null);
    setLocation('Waiting for location…');
    setSeverity(3);
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white px-6 py-20">
      <div className="mx-auto max-w-xl bg-[#0f172a] p-6 rounded border border-slate-700">
        <h1 className="text-2xl font-bold mb-6">Report a Pothole</h1>

        {success && (
          <div className="mb-4 rounded bg-green-600/20 border border-green-600 p-3 text-sm text-green-400">
            ✅ Pothole reported successfully. It will be verified automatically.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded bg-red-600/20 border border-red-600 p-3 text-sm text-red-400">
            ⚠️ {error}
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
            onChange={(e) => setImage(e.target.files?.[0] || null)}
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

        {/* Location (Disabled Field) */}
        <label className="block mb-3">
          <span className="text-sm text-gray-300">Detected Location</span>
          <input
            type="text"
            value={location}
            disabled
            className="mt-2 w-full rounded bg-[#020817] border border-slate-600 p-2 text-gray-400 cursor-not-allowed"
          />
        </label>

        {/* Detect Location Button (ONLY before resolved) */}
        {!locationResolved && (
          <button
            onClick={getLocation}
            className="mb-4 bg-cyan-500 text-black px-4 py-2 rounded text-sm font-semibold"
          >
            📍 Detect Location
          </button>
        )}

        {locationResolved && (
          <p className="text-xs text-gray-500 mb-4">
            Lat: {lat!.toFixed(5)}, Lng: {lng!.toFixed(5)}
          </p>
        )}

        {/* Severity */}
        <label className="block mb-6">
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
        </label>

        <button
          onClick={submitReport}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded font-semibold disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Report'}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Location is auto‑generated from GPS for accuracy
        </p>
      </div>
    </div>
  );
}
