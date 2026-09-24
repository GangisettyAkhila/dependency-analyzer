import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Privacy Policy and Data Handling Disclosure</h1>
        <p className="text-xs text-slate-500 mt-1">
          Information regarding file parsing, local storage, and external API requests.
        </p>
      </div>

      <div className="space-y-6">
        <section className="p-5 rounded-lg bg-white border border-slate-200 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            1. Local SQLite Storage and File Processing
          </h2>
          <p className="text-slate-600">
            Uploaded software dependency files (package.json, requirements.txt, pom.xml, and lockfiles) are parsed on your local application backend. Scanned package names, version strings, risk scores, and advisories are saved in a local SQLite database (dep_analyzer.db). Source code is not parsed or stored.
          </p>
        </section>

        <section className="p-5 rounded-lg bg-white border border-slate-200 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            2. External API Data Requests
          </h2>
          <p className="text-slate-600">
            To identify vulnerabilities and package metadata, the application communicates with public APIs:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li><strong className="text-slate-900">OSV.dev API (api.osv.dev)</strong>: Queries package names and version strings against Google OSV database.</li>
            <li><strong className="text-slate-900">Ecosystem Registries (npm, PyPI, Maven Central)</strong>: Queries release timestamps and deprecation notices.</li>
            <li><strong className="text-slate-900">LLM Provider</strong>: Advisory summaries and CVSS details are processed to generate plain-English risk explanations.</li>
          </ul>
        </section>

        <section className="p-5 rounded-lg bg-white border border-slate-200 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            3. Data Deletion
          </h2>
          <p className="text-slate-600">
            All stored scan records can be deleted at any time from the Scan History dashboard page. Deleting a record removes the data from your local SQLite database.
          </p>
        </section>
      </div>
    </div>
  );
}
