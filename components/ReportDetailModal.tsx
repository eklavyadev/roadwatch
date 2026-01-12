'use client';

import { Dialog, DialogPanel } from '@headlessui/react';
import ApprovedPotholesMap from './ApprovedPotholesMap';

type Props = {
  report: any;
  onClose: () => void;
};

export default function ReportDetailModal({ report, onClose }: Props) {
  if (!report) return null;

  return (
    <Dialog open={true} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" />

      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="w-full max-w-5xl bg-[#0f172a] rounded-lg overflow-hidden">

          {/* IMAGE */}
          <img
            src={report.image_url}
            alt="report"
            className="w-full h-64 object-cover bg-black"
          />

          {/* CONTENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">

            {/* INFO */}
            <div className="space-y-3 text-sm text-slate-300">
              <h3 className="text-lg font-semibold text-white">
                {report.location}
              </h3>

              <p><b>Type:</b> {report.type}</p>
              <p><b>Impact:</b> {report.impact_level}</p>
              <p>
                <b>Reported:</b>{' '}
                {new Date(report.created_at).toLocaleString()}
              </p>

              <button
                onClick={onClose}
                className="mt-4 bg-white text-black px-4 py-2 rounded"
              >
                Close
              </button>
            </div>

            {/* MAP */}
            <div className="h-[300px] rounded overflow-hidden">
              <ApprovedPotholesMap
                focusReport={report}
                single
              />
            </div>

          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
