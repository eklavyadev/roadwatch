'use client';

import { useEffect, useState } from 'react';
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from '@react-google-maps/api';

/* ---------- TYPES ---------- */
type Report = {
  id: string;
  lat: number;
  lng: number;
  location: string;
  type: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  impact_level: number;
};

/* ---------- DESCRIPTION (SAME AS FEED) ---------- */
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

type ApprovedPotholesMapProps = {
  focusReport?: any;
  single?: boolean;
};

export default function ApprovedPotholesMap({ focusReport, single }: ApprovedPotholesMapProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [active, setActive] = useState<Report | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  /* ---------- FETCH DATA ---------- */
  useEffect(() => {
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((data) => {
        const approved = data.filter(
          (r: any) => r.status === 'approved'
        );
        setReports(approved);
      })
      .catch(() => {
        setReports([]);
      });
  }, []);

  /* ---------- STATES ---------- */
  if (!isLoaded) {
    return <p className="text-gray-400">Loading map…</p>;
  }

  if (reports.length === 0) {
    return (
      <p className="text-gray-400 text-sm">
        No approved reports to display on the map yet.
      </p>
    );
  }

  /* ---------- MAP ---------- */
  return (
    <GoogleMap
      mapContainerStyle={{ width: '100%', height: '500px' }}
      zoom={12}
      center={{ lat: reports[0].lat, lng: reports[0].lng }}
      onLoad={(map) => {
        const bounds = new window.google.maps.LatLngBounds();
        reports.forEach((r) =>
          bounds.extend({ lat: r.lat, lng: r.lng })
        );
        map.fitBounds(bounds);
      }}
    >
      {reports.map((r) => (
        <Marker
          key={r.id}
          position={{ lat: r.lat, lng: r.lng }}
          onClick={() => setActive(r)}
        />
      ))}

      {active && (
        <InfoWindow
          position={{ lat: active.lat, lng: active.lng }}
          onCloseClick={() => setActive(null)}
        >
          <div
            style={{
              color: '#020817', // readable on default white InfoWindow
              fontSize: '12px',
              maxWidth: '220px',
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>
              {active.location}
            </p>
            <p>
              {DESCRIPTION[active.type]?.[active.impact_level]}
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
