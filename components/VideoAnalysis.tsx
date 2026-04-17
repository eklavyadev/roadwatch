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
function DetailPanel({ analysis }: { analysis: Analysis }) {
  const [active,   setActive]   = useState<Pothole | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [copied,   setCopied]   = useState(false);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const potholes   = analysis.potholes;
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
          { label: 'Frames',   value: analysis.total_frames.toLocaleString() },
          { label: 'Potholes', value: analysis.total_potholes },
          { label: 'Duration', value: `~${Math.round(analysis.total_frames / 30)}s` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#020817] border border-slate-700 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-cyan-400">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Map */}
      {potholes.length > 0 && isLoaded ? (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '360px' }}
            zoom={16}
            center={{ lat: potholes[0].latitude, lng: potholes[0].longitude }}
            onLoad={(map) => {
              if (potholes.length > 1) {
                const bounds = new window.google.maps.LatLngBounds();
                potholes.forEach((p) =>
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
              ],
            }}
          >
            {potholes.map((p) => (
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
      ) : potholes.length === 0 ? (
        <div className="border border-dashed border-slate-700 rounded-lg p-8 text-center text-slate-500 text-sm">
          No potholes detected in this video.
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
          Loading map…
        </div>
      )}

      {/* Legend */}
      {potholes.length > 0 && (
        <div className="flex gap-4 text-xs text-slate-500">
          {[
            { cls: 'bg-red-500',    label: 'High (>60%)' },
            { cls: 'bg-yellow-500', label: 'Medium (40–60%)' },
            { cls: 'bg-cyan-500',   label: 'Low (<40%)' },
          ].map(({ cls, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cls}`} />
              {label}
            </span>
          ))}
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
      {potholes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pothole Locations
          </p>
          <div className="divide-y divide-slate-700 border border-slate-700 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
            {potholes.map((p) => (
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
  const esRef                           = useRef<EventSource | null>(null);

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

  /* ---------- UPLOAD + SSE STREAM ---------- */
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setPercent(0);
    setPotholeCount(0);
    setFrames({ done: 0, total: 0 });
    setError(null);
    setCurrentFile(file.name);
    esRef.current?.close();

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${MODEL_API}/analyze-video`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed — is the model server running?');
      const { task_id } = await res.json();

      setStatus('processing');

      const es = new EventSource(`${MODEL_API}/progress/${task_id}`);
      esRef.current = es;

      es.onmessage = async (ev) => {
        const data = JSON.parse(ev.data);

        setPercent(data.percent ?? 0);
        if (data.potholes_found !== undefined) setPotholeCount(data.potholes_found);
        if (data.progress !== undefined)
          setFrames({ done: data.progress, total: data.total_frames ?? 0 });

        if (data.status === 'done') {
          es.close();

          const result = data.result;
          const saved  = await fetch('/api/video-analysis/save', {
            method: 'POST',
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
          setError(data.error ?? 'Processing failed');
          setStatus('error');
          es.close();
        }
      };

      es.onerror = () => {
        setStatus((prev) => {
          if (prev === 'done') return 'done'; // server closed connection after completion — ignore
          setError('Lost connection to model server');
          return 'error';
        });
        es.close();
      };
    } catch (err: any) {
      setError(err.message);
      setStatus('error');
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
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`w-full text-left rounded-lg border px-4 py-3 transition
                    ${selected?.id === a.id
                      ? 'border-cyan-500 bg-cyan-950/30'
                      : 'border-slate-700 bg-[#0f172a] hover:border-slate-500'}`}
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
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded
                      ${a.total_potholes > 0 ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      {a.total_potholes} 🕳️
                    </span>
                  </div>
                  {/* frame count */}
                  <p className="text-xs text-slate-600 mt-1">
                    {a.total_frames.toLocaleString()} frames &nbsp;·&nbsp;
                    ~{Math.round(a.total_frames / 30)}s
                  </p>
                </button>
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
