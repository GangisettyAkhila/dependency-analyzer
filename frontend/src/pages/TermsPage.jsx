import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900">Terms of Use</h1>
        <p className="text-xs text-slate-500 mt-1">
          Usage terms and advisory data disclaimers.
        </p>
      </div>

      <div className="space-y-6">
        <section className="p-5 rounded-lg bg-white border border-slate-200 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            1. Application Purpose
          </h2>
          <p className="text-slate-600">
            The AI Software Dependency Risk Analyzer provides automated software supply chain vulnerability detection, direct and transitive dependency parsing, registry staleness checks, and AI-assisted vulnerability risk explanations.
          </p>
        </section>

        <section className="p-5 rounded-lg bg-white border border-slate-200 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            2. Permitted Use and File Formats
          </h2>
          <p className="text-slate-600">
            You may upload standard open-source dependency files including package.json, package-lock.json, requirements.txt, requirements-lock.txt, and pom.xml. File uploads are capped at 5MB in size. Binary files and non-text payloads are not supported.
          </p>
        </section>

        <section className="p-5 rounded-lg bg-white border border-slate-200 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">
            3. Vulnerability Advisory Disclaimer
          </h2>
          <p className="text-slate-600">
            Vulnerability details, CVE identifiers, and fixed version numbers are retrieved live from public databases (OSV.dev, npm, PyPI, Maven Central). Recommended update commands should be validated in a test environment before updating production systems.
          </p>
        </section>
      </div>
    </div>
  );
}
