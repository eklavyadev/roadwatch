import Navbar from "@/components/navbar";

export default function TechStackPage() {
  return (
    <>
        <Navbar />
    <div className="min-h-screen bg-[#020817] text-white px-6 py-20 mt-10">
      <div className="mx-auto max-w-5xl space-y-14">

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold">
            Technology Behind{' '}
            <span className="text-cyan-400">RoadWatch</span>
          </h1>
          <p className="mt-4 text-gray-400">
            A modern, scalable tech stack designed for real‑time civic
            reporting and data transparency.
          </p>
        </div>

        {/* Core Stack */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Core Technologies</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TechCard
              title="Next.js (App Router)"
              desc="Full‑stack React framework used for building UI, API routes, and server logic in a single codebase."
              />
            <TechCard
              title="Tailwind CSS"
              desc="Utility‑first CSS framework for rapid, consistent, and responsive UI development."
              />
            <TechCard
              title="Supabase"
              desc="Used for PostgreSQL database and secure image storage for pothole reports."
              />
            <TechCard
              title="PostgreSQL"
              desc="Relational database used to store reports, severity, status, timestamps, and coordinates."
              />
          </div>
        </section>

        {/* Google Tech */}
        <section className="bg-[#0f172a] border border-cyan-500/40 rounded p-6">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-400">
            Google Technology Used
          </h2>

          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li>
              <span className="text-white font-medium">
                Google Maps JavaScript API
              </span>{' '}
              – Visualizing geo‑tagged pothole locations
            </li>
            <li>
              <span className="text-white font-medium">
                Google Maps Markers & Bounds
              </span>{' '}
              – Displaying multiple verified potholes on a single map
            </li>
          </ul>

          <p className="mt-4 text-sm text-gray-400">
            This satisfies the GDG requirement of using at least one Google
            technology in a meaningful way.
          </p>
        </section>

        {/* Browser APIs */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">
            Browser & Platform APIs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TechCard
              title="Camera API"
              desc="Allows users to capture live pothole images directly from their device."
              />
            <TechCard
              title="Geolocation API"
              desc="Automatically records precise latitude and longitude for accurate reporting."
              />
          </div>
        </section>

        {/* Architecture */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">
            System Architecture
          </h2>

          <div className="bg-[#0f172a] border border-slate-700 rounded p-6 text-gray-300 text-sm space-y-2">
            <p>• User captures pothole image and location</p>
            <p>• Backend API uploads image to storage</p>
            <p>• Metadata stored in PostgreSQL database</p>
            <p>• Admin verifies reports</p>
            <p>• Approved data shown on public map & API</p>
          </div>
        </section>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          Built for civic impact · Designed for scalability · Powered by open
          data
        </p>
      </div>
    </div>
</>
  );
}

/* ---------- Helper Component ---------- */
function TechCard({
  title,
  desc,
}: {
    title: string;
  desc: string;
}) {
    return (
        <div className="bg-[#0f172a] border border-slate-700 rounded p-5">
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-400 leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
