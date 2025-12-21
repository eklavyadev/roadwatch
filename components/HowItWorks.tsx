'use client';

import {
  CameraIcon,
  MapPinIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

const steps = [
  {
    title: 'Capture the Pothole',
    description:
      'Citizens capture a photo of the pothole directly using their device camera and add a brief location description.',
    icon: CameraIcon,
  },
  {
    title: 'Auto Location Tagging',
    description:
      'The system automatically records precise GPS coordinates to ensure accurate positioning on the map.',
    icon: MapPinIcon,
  },
  {
    title: 'Verification Process',
    description:
      'Each report is reviewed by administrators to prevent spam and ensure data accuracy before approval.',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Visible on Public Map',
    description:
      'Approved potholes are displayed on the public map, helping authorities prioritize road repairs.',
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
            A simple, transparent workflow that turns citizen reports into
            actionable road maintenance data.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
          Only verified reports are shown publicly to ensure reliability and
          trust.
        </p>
      </div>
    </section>
  );
}
