'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function createCustomIcon(colour: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="11" fill="${colour}" stroke="white" stroke-width="2"/>
    <text x="14" y="18" text-anchor="middle" fill="white" font-size="11" font-family="sans-serif">🕳</text>
  </svg>`;
  const iconUrl = \`data:image/svg+xml;charset=UTF-8,\${encodeURIComponent(svg)}\`;
  return L.icon({
    iconUrl,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function confColour(c: number) {
  if (c > 0.6) return '#ef4444';
  if (c > 0.4) return '#f59e0b';
  return '#22d3ee';
}

function MapBounds({ potholes }: { potholes: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (potholes.length > 0) {
      const bounds = L.latLngBounds(potholes.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [potholes, map]);
  return null;
}

export default function VideoMapInner({ potholes }: { potholes: any[] }) {
  if (potholes.length === 0) {
    return <div className="h-64 md:h-auto min-h-[300px] flex items-center justify-center text-gray-400 border border-slate-700 rounded-lg bg-[#0f172a]">No detected potholes with valid coordinates</div>;
  }
  
  return (
    <div className="border border-slate-700 rounded-lg overflow-hidden h-64 md:h-full min-h-[300px]">
      <MapContainer 
        center={[potholes[0].latitude, potholes[0].longitude]} 
        zoom={14} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds potholes={potholes} />
        {potholes.map(p => (
          <Marker 
            key={p.id} 
            position={[p.latitude, p.longitude]}
            icon={createCustomIcon(confColour(p.confidence))}
          >
            <Popup>
              <div style={{ color: '#020817', fontSize: '12px' }}>
                <p style={{ fontWeight: 600, marginBottom: '2px' }}>Pothole #{p.id}</p>
                <p>Confidence: {(p.confidence * 100).toFixed(1)}%</p>
                <p>Time: {p.time_sec}s</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
