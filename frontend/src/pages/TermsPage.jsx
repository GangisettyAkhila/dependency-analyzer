import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8 text-slate-700 dark:text-[#C9D1D9] text-xs sm:text-sm leading-relaxed font-sans">
      <div className="border-b border-slate-200 dark:border-[#30363D] pb-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#E6EDF3]">Terms of Use</h1>
        <p className="text-sm text-slate-500 dark:text-[#8B949E] mt-1 font-normal">
          Usage terms and advisory data disclaimers.
        </p>
      </div>

      <div className="space-y-6">
        <section className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-2">
          <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">
            1. Application Purpose
          </h2>
          <p className="text-slate-600 dark:text-[#C9D1D9] font-normal">
            The AI Software Dependency Risk Analyzer provides automated software supply chain vulnerability detection, direct and transitive dependency parsing, registry staleness checks, and AI-assisted vulnerability risk explanations.
          </p>
        </section>

        <section className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-2">
          <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">
            2. Permitted Use and File Formats
          </h2>
          <p className="text-slate-600 dark:text-[#C9D1D9] font-normal">
            You may upload standard open-source dependency files including package.json, package-lock.json, requirements.txt, requirements-lock.txt, and pom.xml. File uploads are capped at 5MB in size. Binary files and non-text payloads are not supported.
          </p>
        </section>

        <section className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-2">
          <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">
            3. Vulnerability Advisory Disclaimer
          </h2>
          <p className="text-slate-600 dark:text-[#C9D1D9] font-normal">
            Vulnerability details, CVE identifiers, and fixed version numbers are retrieved live from public databases (OSV.dev, npm, PyPI, Maven Central). Recommended update commands should be validated in a test environment before updating production systems.
          </p>
        </section>
      </div>
    </div>
  );
}
