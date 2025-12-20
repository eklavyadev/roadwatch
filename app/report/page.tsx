'use client';

import { useState } from 'react';

export default function ReportPotholePage() {
  const [image, setImage] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [severity, setSeverity] = useState(3);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ---------- GET LOCATION ---------- */
  const getLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => alert('Location permission denied'),
      { enableHighAccuracy: true }
    );
  };

  /* ---------- SUBMIT ---------- */
  const submitReport = async () => {
    if (!image || !location || lat === null || lng === null) {
      alert('Please complete all fields');
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

    setLoading(false);

    if (!res.ok) {
      alert('Something went wrong. Please try again.');
      return;
    }

    // reset form
    setImage(null);
    setLocation('');
    setLat(null);
    setLng(null);
    setSeverity(3);
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#020817] text-white px-6 py-20">
      <div className="mx-auto max-w-xl bg-[#0f172a] p-6 rounded border border-slate-700">
        <h1 className="text-2xl font-bold mb-6">Report a Pothole</h1>

        {/* Success message */}
        {success && (
          <div className="mb-4 rounded bg-green-600/20 border border-green-600 p-3 text-sm text-green-400">
            ✅ Pothole reported successfully. It will be reviewed shortly.
          </div>
        )}

        {/* Image */}
        <label className="block mb-4">
          <span className="text-sm text-gray-300">Capture / Upload photo</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            className="mt-2 block w-full text-sm"
          />
        </label>

        {/* Image preview */}
        {image && (
          <div className="mb-4">
            <img
              src={URL.createObjectURL(image)}
              alt="preview"
              className="w-full h-48 object-contain rounded border border-slate-600"
            />
          </div>
        )}

        {/* Location text */}
        <label className="block mb-4">
          <span className="text-sm text-gray-300">Location description</span>
          <input
            type="text"
            placeholder="e.g. Near Borjhar Airport Gate"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-2 w-full rounded bg-[#020817] border border-slate-600 p-2"
          />
        </label>

        {/* Coordinates */}
        <div className="mb-4">
          <button
            onClick={getLocation}
            className="bg-cyan-500 text-black px-4 py-2 rounded text-sm font-semibold"
          >
            📍 Get My Location
          </button>

          {lat && lng && (
            <p className="text-xs text-gray-400 mt-2">
              Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
            </p>
          )}
        </div>

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

        {/* Submit */}
        <button
          onClick={submitReport}
          disabled={loading}
          className="w-full bg-white text-black py-3 rounded font-semibold disabled:opacity-60"
        >
          {loading ? 'Submitting…' : 'Submit Report'}
        </button>

        <p className="text-xs text-gray-400 mt-4 text-center">
          Reports are reviewed before appearing publicly
        </p>
      </div>
    </div>
  );
}
