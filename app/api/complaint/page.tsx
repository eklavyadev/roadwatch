import Navbar from "@/components/navbar";

export default function ComplaintApiDocsPage() {
  return (
    <div>
      <Navbar />

      <div className="min-h-screen bg-[#020817] text-white px-6 py-20 mt-10">
        <div className="mx-auto max-w-4xl space-y-12">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">
              Road<span className="text-cyan-400">Watch</span> Complaint Portal API
            </h1>
            <p className="mt-3 text-gray-400">
              A read‑only public API providing access to verified PWD road authority contacts
              across various States and Union Territories in India for easy reporting and civic action.
            </p>
          </div>

          {/* Overview */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>Publicly accessible</li>
              <li>Read‑only (GET requests only)</li>
              <li>No authentication required</li>
              <li>Includes official department contacts</li>
              <li>Covers Indian States and Union Territories</li>
            </ul>
          </section>

          {/* Endpoint */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Endpoint</h2>

            <div className="bg-black rounded p-4 text-sm font-mono text-cyan-400">
              GET /api/authorities
            </div>

            <p className="mt-3 text-gray-400 text-sm">
              Returns a complete list of PWD authorities and their contact details across India.
            </p>
          </section>

          {/* Example Request */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Example Request</h2>

            <pre className="bg-black rounded p-4 text-sm overflow-x-auto text-gray-200">
{`fetch('/api/authorities')
  .then(res => res.json())
  .then(data => {
    console.log(data);
  });`}
            </pre>
          </section>

          {/* Example Response */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Example Response</h2>

            <pre className="bg-black rounded p-4 text-sm overflow-x-auto text-gray-200">
{`[
  {
    "state_ut": "Andhra Pradesh",
    "authority_type": "State Government",
    "department_name": "Roads & Buildings Department",
    "office_email": "eincrbap@gmail.com",
    "administrative_head_email": "prlsecy-trb@ap.gov.in",
    "official_website": "https://aprdc.ap.gov.in"
  }
]`}
            </pre>
          </section>

          {/* Fields */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-4">Response Fields</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-300">
              <p><span className="text-white font-medium">state_ut</span> – Name of the State or UT</p>
              <p><span className="text-white font-medium">authority_type</span> – Type of Government</p>
              <p><span className="text-white font-medium">department_name</span> – Name of the Department</p>
              <p><span className="text-white font-medium">office_email</span> – Official contact email</p>
              <p><span className="text-white font-medium">administrative_head_email</span> – Admin contact email</p>
              <p><span className="text-white font-medium">official_website</span> – Link to official website</p>
            </div>
          </section>

          {/* Usage */}
          <section className="bg-[#0f172a] border border-slate-700 rounded p-6">
            <h2 className="text-xl font-semibold mb-3">Recommended Usage</h2>
            <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
              <li>Populate contact lists for civic portals</li>
              <li>Filter or search by <code className="text-white">state_ut</code></li>
              <li>Provide direct email links for citizens</li>
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
