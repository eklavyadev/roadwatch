'use client';
import dynamic from 'next/dynamic';
import React from 'react';

// Next.js dynamic import to disable SSR for react-leaflet
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-[#0f172a] rounded animate-pulse border border-slate-700"></div>,
});

type ApprovedPotholesMapProps = {
  focusReport?: any;
  single?: boolean;
};

export default function ApprovedPotholesMap({ focusReport, single }: ApprovedPotholesMapProps) {
  return <MapInner focusReport={focusReport} single={single} />;
}
