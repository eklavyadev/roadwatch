'use client';

import {
  CameraIcon,
  MapPinIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const steps = [
  {
    title: 'Capture the Issue',
    description:
      'Citizens photograph a civic problem — pothole, broken streetlight, traffic signal, or open drainage.',
    icon: CameraIcon,
  },
  {
    title: 'Auto Location Tag',
    description:
      'GPS coordinates are recorded automatically to pin the issue precisely on the city map.',
    icon: MapPinIcon,
  },
  {
    title: 'AI Verification',
    description:
      'AI analyzes the image and metadata — verifying relevance, detecting duplicates, filtering spam.',
    icon: CpuChipIcon,
  },
  {
    title: 'Admin Oversight',
    description:
      'Administrators review flagged reports and override AI decisions to ensure accuracy.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Public Map',
    description:
      'Only verified issues appear on the public map, enabling authorities to track and prioritize.',
    icon: GlobeAltIcon,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative bg-slate-50 dark:bg-[#020817] px-6 py-24 overflow-hidden">
      {/* Top separator */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-white/8 to-transparent" />

      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-500 mb-3">
            Process
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            How Road<span className="text-cyan-500 dark:text-cyan-400">Watch</span> Works
          </h2>
          <p className="mt-4 text-sm text-slate-500 dark:text-gray-500 leading-relaxed">
            A validation-first workflow that converts citizen reports into
            reliable, actionable civic infrastructure data.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
          {/* Connecting line on desktop */}
          <div className="hidden lg:block absolute top-[2.25rem] left-[calc(10%+1rem)] right-[calc(10%+1rem)] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

          {steps.map((step, index) => (
            <div key={index} className="group relative">
              <div className="h-full bg-white dark:bg-[#0c1525] border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-cyan-400/40 dark:hover:border-cyan-500/30 hover:shadow-md dark:hover:shadow-xl dark:hover:shadow-cyan-500/5 transition-all duration-300">

                {/* Top row: number + icon */}
                <div className="flex items-center justify-between mb-4">
                  <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-[#020817] border border-slate-200 dark:border-slate-700 group-hover:border-cyan-400/50 dark:group-hover:border-cyan-500/40 flex items-center justify-center text-xs font-bold text-cyan-500 dark:text-cyan-400 transition-colors shrink-0">
                    {index + 1}
                  </div>
                  <step.icon className="h-5 w-5 text-slate-400 dark:text-slate-600 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors" />
                </div>

                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-xs text-slate-400 dark:text-gray-600">
          AI enables scalable verification · Human oversight maintains trust
        </p>
      </div>
    </section>
  );
}
