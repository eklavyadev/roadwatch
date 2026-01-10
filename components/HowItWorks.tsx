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
      'Citizens capture a photo of a civic issue such as a pothole, broken streetlight, traffic signal problem, or open drainage, along with a brief location reference.',
    icon: CameraIcon,
  },
  {
    title: 'Auto Location Tagging',
    description:
      'The system automatically records precise GPS coordinates to accurately place the issue on the city map.',
    icon: MapPinIcon,
  },
  {
    title: 'AI‑Powered Verification',
    description:
      'An AI moderation service analyzes the image and metadata to verify relevance, detect duplicates, and filter spam or invalid reports.',
    icon: CpuChipIcon,
  },
  {
    title: 'Admin Oversight',
    description:
      'Administrators can review flagged or high‑impact reports and override AI decisions when required to ensure accuracy.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Visible on Public Map',
    description:
      'Only verified civic issues appear on the public map, enabling authorities and citizens to track and prioritize infrastructure problems.',
    icon: GlobeAltIcon,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-[#020817] px-6 py-20">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white">
            How Road<span className="text-cyan-400">Watch</span> Works
          </h2>
          <p className="mt-4 text-gray-400">
            A fast, validation‑first workflow that converts citizen reports
            into reliable, actionable civic infrastructure data.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative bg-[#0f172a] border border-slate-700 rounded-lg p-6"
            >
              {/* Step number */}
              <span className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-cyan-500 text-[#020817] flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>

              {/* Icon */}
              <step.icon className="h-10 w-10 text-cyan-400 mb-4" />

              {/* Content */}
              <h3 className="text-lg font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-14 text-center text-sm text-gray-500">
          AI enables scalable verification, while human oversight maintains
          transparency, accountability, and trust.
        </p>
      </div>
    </section>
  );
}
