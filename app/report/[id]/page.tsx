import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';

const IMPACT_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

const TYPE_LABEL: Record<string, string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  traffic_signal: 'Traffic Signal',
  open_drainage: 'Open Drainage',
};

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return (
      <div className="min-h-screen bg-[#020817] text-white flex items-center justify-center">
        <p className="text-red-400">Supabase configuration missing.</p>
      </div>
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: report, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#020817] text-white flex items-center justify-center flex-col gap-4">
        <p className="text-red-400">Report not found or an error occurred.</p>
        <pre className="text-sm bg-red-900/20 p-4 rounded text-red-300 max-w-2xl overflow-auto">
          {error ? JSON.stringify(error, null, 2) : 'Report data is null'}
        </pre>
      </div>
    );
  }


  const complaintSubject = encodeURIComponent(`[RoadWatch] Road Issue Reported at ${report.location}`);
  const complaintBody = encodeURIComponent(
    `Hello,\n\n` +
    `I am writing to report a verified infrastructure issue via the RoadWatch Transparency Portal.\n\n` +
    `Location: ${report.location}\n` +
    `Coordinates: ${report.lat?.toFixed(5)}, ${report.lng?.toFixed(5)}\n` +
    `Issue Type: ${TYPE_LABEL[report.type] || report.type}\n` +
    `Impact Level: ${IMPACT_LABEL[report.impact_level] || report.impact_level}\n` +
    `Reported on: ${new Date(report.created_at).toLocaleDateString()}\n\n` +
    `This issue requires prompt inspection and rectification.\n\n` +
    `Sincerely,\n` +
    `Concerned Citizen (Via RoadWatch)`
  );
  const governingBody = report.governing_body || 'PWD';
  const mailtoUrl = `mailto:?subject=${complaintSubject}&body=${complaintBody}`;

  return (
    <div className="min-h-screen bg-[#020817] text-white px-6 py-10">
      <div className="mx-auto max-w-3xl bg-[#0f172a] p-6 rounded border border-slate-700">
        <h1 className="text-2xl font-bold mb-4">Report #{report.id}</h1>
        {report.image_url && (
          <div className="mb-4">
            <Image
              src={report.image_url}
              alt="Report image"
              width={800}
              height={450}
              className="w-full h-auto rounded object-cover"
            />
          </div>
        )}
        <dl className="space-y-2 text-sm">
          <div className="grid grid-cols-3">
            <dt className="font-medium text-slate-300">Type</dt>
            <dd className="col-span-2 text-white">{report.type}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-slate-300">Impact Level</dt>
            <dd className="col-span-2 text-white">{report.impact_level}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-slate-300">Location</dt>
            <dd className="col-span-2 text-white">{report.location}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-slate-300">Coordinates</dt>
            <dd className="col-span-2 text-white">
              {report.lat?.toFixed(5)}, {report.lng?.toFixed(5)}
            </dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-slate-300">Status</dt>
            <dd className="col-span-2 text-white">{report.status ?? 'pending'}</dd>
          </div>
          <div className="grid grid-cols-3">
            <dt className="font-medium text-slate-300">Submitted At</dt>
            <dd className="col-span-2 text-white">
              {new Date(report.created_at).toLocaleString()}
            </dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <a
            href={mailtoUrl}
            className="flex-1 rounded bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 transition shadow-lg text-center flex items-center justify-center gap-2"
          >
            ✉️ Email {governingBody} Authority
          </a>
          <a
            href="#"
            className="flex-1 rounded bg-cyan-500 px-4 py-3 text-sm font-bold text-[#020817] hover:bg-cyan-400 transition shadow-lg text-center flex items-center justify-center gap-2"
            title="Portal links will be mapped from mail.json soon"
          >
            🏛️ File Official Portal Complaint
          </a>
        </div>
      </div>
    </div>
  );
}
