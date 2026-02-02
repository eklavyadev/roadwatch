'use client';

import { useEffect, useState } from 'react';
import imageCompression from 'browser-image-compression';

/* ---------- IMAGE COMPRESSION ---------- */
async function compressImage(file: File) {
  return await imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1280,
    useWebWorker: true,
    initialQuality: 0.7,
    fileType: 'image/jpeg',
  });
}

/* ---------- CONSTANTS ---------- */
const IMPACT_LABELS: Record<string, { value: number; label: string }[]> = {
  flooding: [
    { value: 1, label: 'Water accumulation (Ankle deep)' },
    { value: 2, label: 'Flash flooding (Knee deep)' },
    { value: 3, label: 'Severe flooding (Property damage risk)' },
  ],
  drainage_blockage: [
    { value: 1, label: 'Minor debris / Partial blockage' },
    { value: 2, label: 'Full blockage / Stagnant water' },
    { value: 3, label: 'Drain overflow / Hazardous open drain' },
  ],
};

export default function ReportWaspIssuePage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [image, setImage] = useState<File | null>(null);
  const [autoLocation, setAutoLocation] = useState('Location not fetched');
  const [landmark, setLandmark] = useState('');

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [issueType, setIssueType] = useState('flooding');
  const [impactLevel, setImpactLevel] = useState(2);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const locationResolved = lat !== null && lng !== null;

  /* ---------- GET LOCATION ---------- */
  const getLocation = () => {
    setError('');
    setAutoLocation('Fetching exact address...');

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        setAccuracy(Math.round(pos.coords.accuracy));

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
          );
          const data = await res.json();

          if (data.status === 'OK' && data.results?.length > 0) {
            setAutoLocation(data.results[0].formatted_address);
          } else {
            setAutoLocation(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          setAutoLocation("Address fetch failed (Check API Key)");
        }
      },
      (err) => {
        setError('Location permission denied. Please enable GPS.');
        setAutoLocation('Location not fetched');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /* ---------- SUBMIT TO API ---------- */
  const submitReport = async () => {
    setError('');
    if (!image) { setError('Please provide a photo of the issue'); return; }
    if (!locationResolved) { setError('Location is required for flood alerts'); return; }

    setLoading(true);
    setSuccess(false);

    // Prepare FormData to match the Backend API requirements
    const formData = new FormData();
    formData.append('image', image);
    formData.append('location', autoLocation);
    formData.append('landmark', landmark.trim());
    formData.append('lat', String(lat));
    formData.append('lng', String(lng));
    formData.append('type', issueType === 'flooding' ? 'Flash Flood' : 'Drain Blockage');
    formData.append('impact_level', String(impactLevel));

    try {
      const res = await fetch('/api/report/create', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Submission failed');
      }

      setSuccess(true);
      // Reset Form
      setImage(null);
      setLandmark('');
      setLat(null);
      setLng(null);
      setAutoLocation('Location not fetched');
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#020817] text-white px-6 py-20">
      <div className="mx-auto max-w-xl bg-[#0f172a] p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold">WASP <span className="text-teal-500 font-light">Reporter</span></h1>
        </div>
        <p className="text-gray-400 text-sm mb-8">Localized flood and drainage intelligence for Guwahati.</p>

        {success && (
          <div className="mb-6 rounded-lg bg-teal-500/10 border border-teal-500 p-4 text-sm text-teal-400 font-medium animate-in fade-in slide-in-from-top-2">
            ✅ Success! Your report is live on the Resilience Dashboard.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-600/10 border border-red-600 p-4 text-sm text-red-400 animate-in shake">
            ⚠️ {error}
          </div>
        )}

        {/* Image Upload Area */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Evidence Photo</label>
          <div 
            onClick={() => document.getElementById('fileInput')?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer bg-[#020817] ${image ? 'border-teal-500' : 'border-slate-600 hover:border-teal-500'}`}
          >
            {image ? (
                <div className="relative">
                  <img src={URL.createObjectURL(image)} className="max-h-48 mx-auto rounded-lg shadow-lg" alt="Preview" />
                  <p className="text-[10px] text-teal-500 mt-2">Image Compressed Successfully</p>
                </div>
            ) : (
                <div className="text-gray-500">
                    <span className="text-3xl block mb-2">📷</span>
                    <p className="text-xs font-medium uppercase tracking-widest">Capture Evidence</p>
                </div>
            )}
          </div>
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                setLoading(true);
                const compressed = await compressImage(file);
                setImage(compressed);
                setLoading(false);
              }
            }}
          />
        </div>

        {/* Issue Type Selector */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
                type="button"
                onClick={() => setIssueType('flooding')}
                className={`py-3 rounded-lg border font-bold transition-all ${issueType === 'flooding' ? 'border-teal-500 bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'border-slate-700 bg-slate-800 text-gray-400'}`}
            >
                Flash Flood
            </button>
            <button 
                type="button"
                onClick={() => setIssueType('drainage_blockage')}
                className={`py-3 rounded-lg border font-bold transition-all ${issueType === 'drainage_blockage' ? 'border-teal-500 bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'border-slate-700 bg-slate-800 text-gray-400'}`}
            >
                Drain Blockage
            </button>
        </div>

        {/* Severity Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Impact Intensity</label>
          <select
            value={impactLevel}
            onChange={(e) => setImpactLevel(Number(e.target.value))}
            className="w-full bg-[#020817] border border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm text-gray-200"
          >
            {IMPACT_LABELS[issueType].map((opt) => (
              <option key={opt.value} value={opt.value}>Level {opt.value}: {opt.label}</option>
            ))}
          </select>
        </div>

        {/* Location Box */}
        <div className="bg-[#020817] border border-slate-700 rounded-xl p-5 mb-8">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-bold text-gray-200 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${locationResolved ? 'bg-teal-500 animate-pulse' : 'bg-red-500'}`} />
                  GPS Data
                </span>
                <button 
                    type="button"
                    onClick={getLocation} 
                    className="bg-teal-500 text-black px-3 py-1.5 rounded-md text-[11px] font-black uppercase tracking-wider hover:bg-teal-400 transition"
                >
                    {locationResolved ? 'Recalibrate' : 'Fetch GPS'}
                </button>
            </div>
            
            <p className="text-xs text-teal-500 mb-3 font-mono leading-relaxed line-clamp-2">{autoLocation}</p>
            
            <input
                type="text"
                placeholder="Nearby Ward / Apartment Name (Optional)"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-600 p-3 rounded-lg text-sm mb-3 focus:border-teal-500 outline-none placeholder:text-gray-600"
            />

            {locationResolved && (
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>LAT: {lat?.toFixed(5)}</span>
                    <span>LNG: {lng?.toFixed(5)}</span>
                    <span className="text-teal-600">ACCURACY: ±{accuracy}m</span>
                </div>
            )}
        </div>

        <button
          onClick={submitReport}
          disabled={loading || !locationResolved}
          className="w-full bg-white text-black py-4 rounded-xl font-black text-lg hover:bg-teal-500 hover:text-black disabled:opacity-30 disabled:grayscale transition-all shadow-[0_10px_30px_rgba(255,255,255,0.05)] active:scale-95"
        >
          {loading ? 'UPLOADING DATA...' : 'SUBMIT SIGNAL'}
        </button>

        <p className="text-[10px] text-gray-600 mt-6 text-center leading-relaxed">
          WASP Intelligence Node: Guwahati Metropolitan Area<br/>
          Signal will be correlated with SDG-13 Resilience Metrics.
        </p>
      </div>
    </div>
  );
}