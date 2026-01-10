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
      <section id="approved" className="bg-[#020817] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold text-white mb-2">
            Verified Road Issues
          </h2>
          <p className="text-gray-400 mb-10">
            Recently approved civic issues reported by citizens
          </p>

          <ApprovedReports />
        </div>
      </section>

      {/* MAP SECTION */}
      <section id="map" className="bg-[#020817] px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-semibold text-white mb-2">
            Issues on Map
          </h2>
          <p className="text-gray-400 mb-8">
            Geographic overview of all verified reports
          </p>

          <ApprovedPotholesMap />
        </div>
      </section>
    </div>
  );
}
