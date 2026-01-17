import Navbar from "@/components/navbar";

export default function ApiDocsPage() {
  return (
    <div>
      <Navbar />

      <div className="min-h-screen bg-[#020817] text-white px-6 py-20 mt-10">
        <div className="mx-auto max-w-4xl space-y-12">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">
              Road<span className="text-cyan-400">Watch</span> Public API
            </h1>
            <p className="mt-3 text-gray-400">
              A read‑only public API providing access to verified civic
              infrastructure reports for visualization, research, and analysis.
            </p>
          </div>

          {/* Overview */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>Publicly accessible</li>
              <li>Read‑only (GET requests only)</li>
              <li>No authentication required</li>
              <li>Includes only verified / approved reports</li>
              <li>Supports multiple civic issue types</li>
            </ul>
          </section>

          {/* Endpoint */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Endpoint</h2>

            <div className="bg-black rounded p-4 text-sm font-mono text-cyan-400">
              GET /api/admin/reports
            </div>

            <p className="mt-3 text-gray-400 text-sm">
              Returns a list of all submitted civic issue reports. Consumers
              should filter results where{" "}
              <code className="text-white">status = "approved"</code>.
            </p>
          </section>

          {/* Example Request */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Example Request</h2>

            <pre className="bg-black rounded p-4 text-sm overflow-x-auto text-gray-200">
{`fetch('/api/admin/reports')
  .then(res => res.json())
  .then(data => {
    const approved = data.filter(
      report => report.status === "approved"
    );
    console.log(approved);
  });`}
            </pre>
          </section>

          {/* Example Response */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Example Response</h2>

            <pre className="bg-black rounded p-4 text-sm overflow-x-auto text-gray-200">
{`[
  {
    "id": 42,
    "image_url": "https://.../reports/report-123.jpg",
    "location": "Near Borjhar Airport Gate",
    "lat": 26.1062,
    "lng": 91.5859,
    "type": "streetlight",
    "impact_level": 3,
    "governing_body": "Municipal Corporation",
    "status": "approved",
    "created_at": "2025-12-20T15:42:11.123Z"
  }
]`}
            </pre>
          </section>

          {/* Fields */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Response Fields</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
              <p><span className="text-white font-medium">id</span> – Unique report ID</p>
              <p><span className="text-white font-medium">image_url</span> – Public image URL</p>
              <p><span className="text-white font-medium">location</span> – Human‑readable location</p>
              <p><span className="text-white font-medium">lat, lng</span> – GPS coordinates</p>
              <p>
                <span className="text-white font-medium">type</span> – Issue category
                <br />
                <span className="text-xs text-gray-400">
                  (pothole, streetlight, traffic_signal, open_drainage)
                </span>
              </p>
              <p>
                <span className="text-white font-medium">impact_level</span> – Numeric scale (1–3)
                <br />
                <span className="text-xs text-gray-400">
                  Meaning depends on issue type
                </span>
              </p>
              <p><span className="text-white font-medium">governing_body</span> – Responsible authority</p>
              <p><span className="text-white font-medium">status</span> – approved / pending / rejected</p>
              <p><span className="text-white font-medium">created_at</span> – ISO timestamp</p>
            </div>
          </section>

          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
  <h2 className="text-xl font-semibold mb-4">
    Impact Level Semantics
  </h2>

  <p className="text-sm text-gray-400 mb-4">
    The meaning of <code className="text-white">impact_level</code> depends on the issue type.
    API consumers should interpret severity using the mappings below.
  </p>

  <div className="space-y-4 text-sm text-gray-300">

    <div>
      <p className="text-white font-medium">Pothole</p>
      <ul className="list-disc list-inside ml-4">
        <li>1 – Minor surface damage</li>
        <li>2 – Moderate dip / uneven road</li>
        <li>3 – Severe / accident‑prone pothole</li>
      </ul>
    </div>

    <div>
      <p className="text-white font-medium">Streetlight</p>
      <ul className="list-disc list-inside ml-4">
        <li>1 – Flickering occasionally</li>
        <li>2 – Often off or unstable</li>
        <li>3 – Completely not working</li>
      </ul>
    </div>

    <div>
      <p className="text-white font-medium">Traffic Signal</p>
      <ul className="list-disc list-inside ml-4">
        <li>1 – Delayed or slow response</li>
        <li>2 – Stuck on one color</li>
        <li>3 – Not functioning at all</li>
      </ul>
    </div>

    <div>
      <p className="text-white font-medium">Open Drainage</p>
      <ul className="list-disc list-inside ml-4">
        <li>1 – Partially open</li>
        <li>2 – Fully open</li>
        <li>3 – Deep or hazardous</li>
      </ul>
    </div>

  </div>
</section>


          {/* Usage */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-3">Recommended Usage</h2>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>Filter approved reports only</li>
              <li>Visualize issues on maps or dashboards</li>
              <li>Use <code className="text-white">type</code> to group issue categories</li>
              <li>Use <code className="text-white">impact_level</code> for prioritization</li>
              <li>Respect public data usage guidelines</li>
            </ul>
          </section>

          {/* Footer */}
          <p className="text-center text-xs text-gray-500">
            RoadWatch Public API · Read‑only · Open Civic Data Initiative
          </p>
        </div>
      </div>
    </div>
  );
}
