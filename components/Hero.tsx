'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function Hero() {
  return (
    <div>
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.5) 1px, transparent 0)`,
          backgroundSize: '36px 36px',
        }}
      />

      {/* Cyan glow at top */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/8 via-transparent to-transparent pointer-events-none" />

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.12),transparent)] pointer-events-none" />

      {/* HERO */}
      <main className="relative flex min-h-screen items-center px-6 pt-28 pb-16 lg:px-8 lg:pt-0 lg:pb-0">
        <div className="mx-auto max-w-3xl text-center lg:-mt-12">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/8 px-4 py-1.5 text-xs font-medium text-cyan-400 mb-8 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Civic infrastructure · AI-verified reports
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Making Roads{' '}
            <span className="text-cyan-400 relative">
              Safer
              <span className="absolute -inset-1 bg-cyan-400/10 blur-lg rounded-lg" />
            </span>
            {' '}With Data
          </h1>

          <p className="mt-6 text-base sm:text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
            A geo-tagged, validation-first platform enabling citizens to report
            real-world infrastructure issues — potholes, broken streetlights,
            drainage hazards — backed by GPS and AI verification.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/report"
              className="w-full sm:w-auto rounded-lg bg-cyan-500 px-7 py-3 text-sm font-semibold text-[#020817] hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-500/25"
            >
              Report an issue
            </a>
            <a
              href="#how"
              className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/3 px-7 py-3 text-sm font-semibold text-white hover:border-white/20 hover:bg-white/6 transition-all backdrop-blur-sm text-center"
            >
              How it works
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-xs mx-auto border border-white/8 rounded-xl px-4 py-4 bg-white/3 backdrop-blur-sm">
            {[
              { value: '4', label: 'Issue types' },
              { value: '100%', label: 'Geo-tagged' },
              { value: 'AI', label: 'Verified' },
            ].map((stat, i) => (
              <div key={stat.label} className={`text-center ${i > 0 ? 'border-l border-white/8' : ''}`}>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#how"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-600 hover:text-cyan-400 transition-colors"
        >
          <span className="text-xs">Scroll</span>
          <ChevronDownIcon className="h-4 w-4 animate-bounce" />
        </a>
      </main>
    </div>
  );
}
