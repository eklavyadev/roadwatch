'use client';
import React from 'react';

type Report = {
  id: string;
  lat: number;
  lng: number;
  location: string;
  type: 'pothole' | 'streetlight' | 'traffic_signal' | 'open_drainage';
  impact_level: number;
};

type ApprovedPotholesMapProps = {
  focusReport?: any;
  single?: boolean;
};

export default function ApprovedPotholesMap({ focusReport, single }: ApprovedPotholesMapProps) {
  // Placeholder component because Google Maps API requires billing.
  return (
    <div className="bg-[#0f172a] text-slate-300 p-6 rounded border border-slate-700 text-center">
      <p>Map view is disabled (Google Maps API not configured).</p>
    </div>
  );
}
