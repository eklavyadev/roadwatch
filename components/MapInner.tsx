'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

type Report = {
  id: string;
  lat: number;
  lng: number;
  location: string;
  type: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  impact_level: number;
};

const DESCRIPTION: Record<Report['type'], Record<number, string>> = {
  pothole: {
    1: '🕳️ Minor surface damage',
    2: '🕳️ Moderate dip / uneven road',
    3: '🕳️ Severe accident‑prone pothole',
  },
  streetlight: {
    1: '💡 Streetlight flickering',
    2: '💡 Streetlight often off',
    3: '💡 Streetlight not working',
  },
  traffic_signal: {
    1: '🚦 Signal responding with delay',
    2: '🚦 Signal stuck on one color',
    3: '🚦 Traffic signal not functioning',
  },
  open_drainage: {
    1: '🚧 Drain partially open',
    2: '🚧 Drain fully open',
    3: '🚧 Hazardous open drainage',
  },
};

function MapBounds({ reports }: { reports: Report[] }) {
  const map = useMap();
  useEffect(() => {
    if (reports.length > 0) {
      const bounds = L.latLngBounds(reports.map(r => [r.lat, r.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [reports, map]);
  return null;
}

export default function MapInner({ focusReport, single }: { focusReport?: any; single?: boolean }) {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    if (focusReport) {
      setReports([focusReport]);
    } else {
      fetch('/api/admin/reports')
        .then((res) => res.json())
        .then((data) => {
          const approved = data.filter((r: any) => r.status === 'approved');
          setReports(approved);
        })
        .catch(() => setReports([]));
    }
  }, [focusReport]);

  if (reports.length === 0) {
    return <p className="text-gray-400 text-sm p-4">No reports to display on map yet.</p>;
  }

  return (
    <MapContainer 
      center={[reports[0].lat, reports[0].lng]} 
      zoom={12} 
      style={{ height: '500px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBounds reports={reports} />
      {reports.map(r => (
        <Marker key={r.id} position={[r.lat, r.lng]}>
          <Popup>
            <div style={{ color: '#020817', fontSize: '12px', maxWidth: '220px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>{r.location}</p>
              <p>{DESCRIPTION[r.type]?.[r.impact_level]}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
