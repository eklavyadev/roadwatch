import React from 'react';
import Navbar from '../components/navbar';
import { ApprovedReports } from '@/components/ApprovedPotholes';
import ApprovedPotholesMap from '@/components/ApprovedPotholesMap';
import HowItWorks from '@/components/HowItWorks';
import Hero from '@/components/Hero';

export default function HomePage() {
  return (
    <div>
      {/* HERO SECTION */}
      <div className="relative min-h-screen bg-[#020817] text-white">
        <Navbar />
        <Hero />
      </div>

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* VERIFIED REPORTS */}
      <section id="approved" className="relative bg-[#020817] px-6 py-24">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-500 mb-2">
              Verified reports
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Civic Issues Near You
            </h2>
            <p className="text-gray-500 text-sm mt-2 max-w-md">
              Real issues reported and verified by AI, visible to the public and actionable by authorities.
            </p>
          </div>

          <ApprovedReports />
        </div>
      </section>

      {/* MAP SECTION */}
      <section id="map" className="relative bg-[#020817] px-6 py-24">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-500 mb-2">
              Live map
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Issues on Map
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Geographic overview of all verified road infrastructure reports.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-800">
            <ApprovedPotholesMap />
          </div>
        </div>
      </section>
    </div>
  );
}
