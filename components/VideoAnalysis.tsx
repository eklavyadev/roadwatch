'use client';

import { useState, useRef, useEffect } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from '@react-google-maps/api';

const MODEL_API =
  process.env.NEXT_PUBLIC_AI_SERVER_URL ?? '';

/* ---------- TYPES ---------- */
type Pothole = {
  id: number;
  latitude: number;
  longitude: number;
  confidence: number;
  time_sec: number;
  bbox: { x1: number; y1: number; x2: number; y2: number };
};

type Analysis = {
  id: string;
  filename: string;
  total_frames: number;
  total_potholes: number;
  potholes: Pothole[];
  created_at: string;
};

type Status = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

/* ---------- HELPERS ---------- */
function confColour(c: number) {
  if (c > 0.6) return '#ef4444';
  if (c > 0.4) return '#f59e0b';
  return '#22d3ee';
}

function confBadge(c: number) {
  if (c > 0.6) return 'bg-red-600 text-white';
  if (c > 0.4) return 'bg-yellow-500 text-black';
  return 'bg-cyan-600 text-white';
}

function markerIcon(colour: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="11" fill="${colour}" stroke="white" stroke-width="2"/>
    <text x="14" y="18" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif">🕳</text>
  </svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(28, 28),
  };
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return 'just now';
}

function buildJsonReport(analysis: Analysis) {
  return {
    filename: analysis.filename,
    analysed_at: analysis.created_at,
    total_frames_processed: analysis.total_frames,
    total_potholes_found: analysis.total_potholes,
    potholes: analysis.potholes.map((p) => ({
      id: p.id,
      latitude: p.latitude,
      longitude: p.longitude,
      confidence: p.confidence,
      time_sec: p.time_sec,
      bbox: p.bbox,
    })),
  };
}

/* ================================================================
   DETAIL PANEL  (map + JSON for a selected analysis)
   ================================================================ */
const CONF_THRESHOLD = 0.5;

function DetailPanel({ analysis }: { analysis: Analysis }) {
  const [active,   setActive]   = useState<Pothole | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [showAll,  setShowAll]  = useState(false);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const allPotholes  = analysis.potholes;
  const confirmed    = allPotholes.filter((p) => p.confidence >= CONF_THRESHOLD);
  const possible     = allPotholes.filter((p) => p.confidence <  CONF_THRESHOLD);
  const visible      = showAll ? allPotholes : confirmed;

  const jsonReport = buildJsonReport(analysis);
  const jsonStr    = JSON.stringify(jsonReport, null, 2);

  const copyJson = () => {
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = analysis.filename.replace(/\.[^.]+$/, '') + '_report.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Frames',    value: analysis.total_frames.toLocaleString() },
          { label: 'Confirmed', value: confirmed.length },
          { label: 'Duration',  value: `~${Math.round(analysis.total_frames / 30)}s` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#020817] border border-slate-700 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-cyan-400">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      {visible.length > 0 && isLoaded ? (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '360px' }}
            zoom={16}
            center={{ lat: visible[0].latitude, lng: visible[0].longitude }}
            onLoad={(map) => {
              if (visible.length > 1) {
                const bounds = new window.google.maps.LatLngBounds();
                visible.forEach((p) =>
                  bounds.extend({ lat: p.latitude, lng: p.longitude })
                );
                map.fitBounds(bounds);
              }
            }}
            options={{
              styles: [
                { elementType: 'geometry',           stylers: [{ color: '#1e293b' }] },
                { elementType: 'labels.text.fill',   stylers: [{ color: '#94a3b8' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
                // Hide all POI markers (parks, courts, restaurants, etc.)
                { featureType: 'poi',                stylers: [{ visibility: 'off' }] },
                // Hide transit icons (bus stops, metro, etc.)
                { featureType: 'transit',            stylers: [{ visibility: 'off' }] },
              ],
            }}
          >
            {visible.map((p) => (
              <Marker
                key={p.id}
                position={{ lat: p.latitude, lng: p.longitude }}
                onClick={() => setActive(p)}
                icon={markerIcon(confColour(p.confidence))}
              />
            ))}
            {active && (
              <InfoWindow
                position={{ lat: active.latitude, lng: active.longitude }}
                onCloseClick={() => setActive(null)}
              >
                <div style={{ color: '#0f172a', fontSize: '12px', minWidth: '160px' }}>
                  <p style={{ fontWeight: 700, marginBottom: 4 }}>🕳️ Pothole #{active.id}</p>
                  <p>Confidence: <b>{(active.confidence * 100).toFixed(1)}%</b></p>
                  <p>At: {active.time_sec}s</p>
                  <p style={{ fontSize: '10px', color: '#64748b', marginTop: 4 }}>
                    {active.latitude.toFixed(6)}, {active.longitude.toFixed(6)}
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        </div>
      ) : allPotholes.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center text-slate-500 text-sm">
          No potholes detected in this video.
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
          Loading map…
        </div>
      )}

      {/* Legend + show more toggle */}
      {allPotholes.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-4 text-xs text-slate-500">
            {[
              { cls: 'bg-red-500',    label: 'High (>60%)' },
              { cls: 'bg-yellow-500', label: 'Medium (50–60%)' },
            ].map(({ cls, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cls}`} />
                {label}
              </span>
            ))}
          </div>
          {possible.length > 0 && (
            <button
              onClick={() => { setShowAll((v) => !v); setActive(null); }}
              className="text-xs px-3 py-1 rounded border border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition"
            >
              {showAll
                ? '✕ Hide possible reports'
                : `🔍 Show ${possible.length} more possible report${possible.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      )}

      {/* JSON Report section */}
      <div className="border border-slate-700 rounded-lg overflow-hidden">
        {/* Header — always visible, click to expand */}
        <button
          onClick={() => setJsonOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#0f172a] hover:bg-slate-800/60 transition"
        >
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            📄 JSON Report
          </span>
          <div className="flex items-center gap-3">
            {/* Download — always shown regardless of expand state */}
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); downloadJson(); }}
              className="text-xs text-cyan-400 hover:text-cyan-300 underline"
            >
              ⬇ Download
            </span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); copyJson(); }}
              className="text-xs text-slate-400 hover:text-white"
            >
              {copied ? '✅ Copied' : '📋 Copy'}
            </span>
            <span className="text-slate-500 text-sm">{jsonOpen ? '▲' : '▼'}</span>
          </div>
        </button>

        {/* Expandable JSON viewer */}
        {jsonOpen && (
          <div className="bg-[#020817] border-t border-slate-700 max-h-80 overflow-y-auto">
            <pre className="text-xs text-green-400 font-mono p-4 whitespace-pre-wrap break-all">
              {jsonStr}
            </pre>
          </div>
        )}
      </div>

      {/* Pothole list */}
      {visible.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pothole Locations
          </p>
          <div className="divide-y divide-slate-700 border border-slate-700 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
            {visible.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition text-sm
                  ${active?.id === p.id ? 'bg-slate-700' : 'bg-[#0f172a] hover:bg-slate-800/60'}`}
                onClick={() => setActive(p)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 text-xs font-mono w-5">#{p.id}</span>
                  <span className="text-slate-300 font-mono text-xs">
                    {p.latitude.toFixed(5)},&nbsp;{p.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500">{p.time_sec}s</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${confBadge(p.confidence)}`}>
                    {(p.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function VideoAnalysis() {
  const [analyses,    setAnalyses]    = useState<Analysis[]>([]);
  const [selected,    setSelected]    = useState<Analysis | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [status,       setStatus]       = useState<Status>('idle');
  const [percent,      setPercent]      = useState(0);
  const [potholeCount, setPotholeCount] = useState(0);
  const [frames,       setFrames]       = useState({ done: 0, total: 0 });
  const [error,        setError]        = useState<string | null>(null);
  const [currentFile,  setCurrentFile]  = useState('');
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const pollRef                         = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---------- LOAD HISTORY ---------- */
  useEffect(() => {
    fetch('/api/video-analysis/list')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAnalyses(list);
        if (list.length > 0) setSelected(list[0]);
      })
      .catch(() => setAnalyses([]))
      .finally(() => setLoadingList(false));
  }, []);

  /* ---------- UPLOAD + POLL ---------- */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setPercent(0);
    setPotholeCount(0);
    setFrames({ done: 0, total: 0 });
    setError(null);
    setCurrentFile(file.name);

    // clear any previous poll
    if (pollRef.current) clearInterval(pollRef.current);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch('/api/proxy/analyze-video', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed — is the model server running?');
      const { task_id } = await res.json();

      setStatus('processing');

      // Poll every 800ms instead of SSE — works reliably through Cloudflare tunnel
      pollRef.current = setInterval(async () => {
        try {
          const r    = await fetch(`/api/proxy/progress/${task_id}`);
          const data = await r.json();

          setPercent(data.percent ?? 0);
          if (data.potholes_found !== undefined) setPotholeCount(data.potholes_found);
          if (data.progress     !== undefined)
            setFrames({ done: data.progress, total: data.total_frames ?? 0 });

          if (data.status === 'done') {
            clearInterval(pollRef.current!);

            const result = data.result;
            const saved  = await fetch('/api/video-analysis/save', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filename:       file.name,
                total_frames:   result.total_frames_processed,
                total_potholes: result.total_potholes_found,
                potholes:       result.potholes,
              }),
            }).then((r) => r.json());

            if (saved?.id) {
              setAnalyses((prev) => [saved, ...prev]);
              setSelected(saved);
            }
            setStatus('done');
          }

          if (data.status === 'error') {
            clearInterval(pollRef.current!);
            setError(data.error ?? 'Processing failed');
            setStatus('error');
          }
        } catch {
          clearInterval(pollRef.current!);
          setError('Lost connection to model server');
          setStatus('error');
        }
      }, 800);

    } catch (err: any) {
      setError(err.message);
      setStatus('error');
    }
  };

  /* ---------- DELETE ---------- */
  const deleteAnalysis = async (id: string) => {
    if (!confirm('Delete this analysis permanently?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/video-analysis/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAnalyses((prev) => prev.filter((a) => a.id !== id));
        if (selected?.id === id) setSelected(null);
      }
    } finally {
      setDeleting(null);
    }
  };

  /* ================================================================
     RENDER
     ================================================================ */
  const busy = status === 'uploading' || status === 'processing';

  return (
    <div className="space-y-5">

      {/* ── Upload + progress bar ── */}
      <div className="bg-[#0f172a] border border-slate-700 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Analyse a video</p>
            <p className="text-xs text-slate-500 mt-0.5">
              GPS coordinates must be overlaid on the bottom 25% of the frame
            </p>
          </div>
          <label
            className={`inline-block px-4 py-2 rounded font-semibold text-sm transition
              ${busy
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer'}`}
          >
            {busy ? 'Processing…' : '🎬 Upload Video'}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFile}
              disabled={busy}
            />
          </label>
        </div>

        {busy && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">
                {status === 'uploading'
                  ? `⬆️ Uploading ${currentFile}…`
                  : `🔍 ${currentFile} — frame ${frames.done.toLocaleString()} / ${frames.total ? frames.total.toLocaleString() : '?'}`}
              </span>
              <span className="text-cyan-400 font-mono font-semibold">{percent}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${status === 'uploading' ? 4 : percent}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">
              🕳️&nbsp;{potholeCount} pothole{potholeCount !== 1 ? 's' : ''} found so far
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-red-950/40 border border-red-800 rounded p-3 text-red-400 text-xs">
            ❌ {error}
          </div>
        )}
      </div>

      {/* ── History list (left) + Detail panel (right) ── */}
      {loadingList ? (
        <p className="text-slate-500 text-sm text-center py-8">Loading history…</p>
      ) : analyses.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-lg p-12 text-center text-slate-600 text-sm">
          No analyses yet — upload your first video above.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

          {/* LEFT — scrollable video list */}
          <div className="lg:col-span-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Uploaded Videos ({analyses.length})
            </p>
            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {analyses.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-lg border transition
                    ${selected?.id === a.id
                      ? 'border-cyan-500 bg-cyan-950/30'
                      : 'border-slate-700 bg-[#0f172a] hover:border-slate-500'}`}
                >
                  {/* clickable area */}
                  <button
                    className="w-full text-left px-4 pt-3 pb-2"
                    onClick={() => setSelected(a)}
                  >
                    {/* filename */}
                    <p className="text-sm text-white font-medium truncate mb-1.5">
                      🎬 {a.filename}
                    </p>
                    {/* meta row */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 truncate">
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}&nbsp;·&nbsp;{timeAgo(a.created_at)}
                      </span>
                      {(() => {
                        const count = a.potholes.filter((p) => p.confidence >= CONF_THRESHOLD).length;
                        return (
                          <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded
                            ${count > 0 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                            {count} 🕳️
                          </span>
                        );
                      })()}
                    </div>
                    {/* frame count */}
                    <p className="text-xs text-slate-600 mt-1">
                      {a.total_frames.toLocaleString()} frames &nbsp;·&nbsp;
                      ~{Math.round(a.total_frames / 30)}s
                    </p>
                  </button>

                  {/* delete button */}
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => deleteAnalysis(a.id)}
                      disabled={deleting === a.id}
                      className="w-full text-xs text-red-400 border border-red-900/50 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-40 py-1 rounded transition"
                    >
                      {deleting === a.id ? 'Deleting…' : '🗑 Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — map + JSON report */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-white truncate">
                    {selected.filename}
                  </p>
                  <span className="text-xs text-slate-500 shrink-0">
                    {new Date(selected.created_at).toLocaleString()}
                  </span>
                </div>
                <DetailPanel key={selected.id} analysis={selected} />
              </div>
            ) : (
              <div className="h-full min-h-[200px] flex items-center justify-center text-slate-600 text-sm border border-dashed border-slate-700 rounded-lg">
                Select a video from the list
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
