import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8 text-slate-700 dark:text-[#C9D1D9] text-sm leading-relaxed font-sans">
      
      {/* Header Bar */}
      <div className="border-b border-slate-200 dark:border-[#30363D] pb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#E6EDF3] tracking-tight">
          Privacy & Data Handling
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">
          How dependency files are processed, stored, and shared with external services.
        </p>
      </div>

      {/* Two-Column Information Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pt-2">
        
        {/* Left Column: Narrow Section Index */}
        <aside className="md:col-span-3 space-y-3">
          <div className="text-[11px] font-mono font-semibold text-slate-400 dark:text-[#8B949E] tracking-wider uppercase">
            On this page
          </div>
          <nav aria-label="Privacy Page Sections" className="space-y-2 text-xs font-mono text-slate-600 dark:text-[#8B949E]">
            <a href="#local-processing" className="block hover:text-slate-900 dark:hover:text-[#E6EDF3] transition-colors">
              <span className="text-blue-600 dark:text-blue-400 font-semibold mr-1.5">01</span> Local processing
            </a>
            <a href="#external-services" className="block hover:text-slate-900 dark:hover:text-[#E6EDF3] transition-colors">
              <span className="text-blue-600 dark:text-blue-400 font-semibold mr-1.5">02</span> External services
            </a>
            <a href="#data-deletion" className="block hover:text-slate-900 dark:hover:text-[#E6EDF3] transition-colors">
              <span className="text-blue-600 dark:text-blue-400 font-semibold mr-1.5">03</span> Data deletion
            </a>
          </nav>
        </aside>

        {/* Right Column: Main Editorial Content */}
        <main className="md:col-span-9 space-y-10">
          
          {/* Section 01 */}
          <section id="local-processing" className="space-y-3 scroll-mt-20">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#30363D] pb-2">
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">01</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#E6EDF3]">
                Local processing & storage
              </h2>
            </div>
            <p className="text-slate-600 dark:text-[#8B949E] text-sm leading-relaxed">
              Uploaded software dependency files (<code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161B22] text-slate-800 dark:text-[#C9D1D9] border border-slate-200 dark:border-[#30363D]">package.json</code>, <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161B22] text-slate-800 dark:text-[#C9D1D9] border border-slate-200 dark:border-[#30363D]">requirements.txt</code>, <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161B22] text-slate-800 dark:text-[#C9D1D9] border border-slate-200 dark:border-[#30363D]">pom.xml</code>, and lockfiles) are parsed by the application backend. Scanned package names, version strings, risk scores, and advisories are stored in the local SQLite database (<code className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161B22] text-slate-800 dark:text-[#C9D1D9] border border-slate-200 dark:border-[#30363D]">dep_analyzer.db</code>). Source code is never parsed or stored.
            </p>
          </section>

          {/* Section 02 */}
          <section id="external-services" className="space-y-4 scroll-mt-20">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#30363D] pb-2">
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">02</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#E6EDF3]">
                External API requests
              </h2>
            </div>
            <p className="text-slate-600 dark:text-[#8B949E] text-sm leading-relaxed">
              The application communicates with public APIs to identify vulnerabilities and package metadata.
            </p>

            {/* Simple Rows Separated by Horizontal Lines (No Cards) */}
            <div className="divide-y divide-slate-100 dark:divide-[#30363D] border-t border-b border-slate-200 dark:border-[#30363D]">
              <div className="py-3 space-y-1">
                <div className="font-mono font-semibold text-xs text-slate-900 dark:text-[#E6EDF3]">
                  OSV.dev
                </div>
                <p className="text-xs text-slate-600 dark:text-[#8B949E]">
                  Queries package names and versions against the OSV vulnerability database.
                </p>
              </div>

              <div className="py-3 space-y-1">
                <div className="font-mono font-semibold text-xs text-slate-900 dark:text-[#E6EDF3]">
                  npm · PyPI · Maven Central
                </div>
                <p className="text-xs text-slate-600 dark:text-[#8B949E]">
                  Queries package metadata, release information, and deprecation information.
                </p>
              </div>

              <div className="py-3 space-y-1">
                <div className="font-mono font-semibold text-xs text-slate-900 dark:text-[#E6EDF3]">
                  LLM provider
                </div>
                <p className="text-xs text-slate-600 dark:text-[#8B949E]">
                  Processes advisory summaries and CVSS details to generate plain-English risk explanations.
                </p>
              </div>
            </div>
          </section>

          {/* Section 03 */}
          <section id="data-deletion" className="space-y-3 scroll-mt-20">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#30363D] pb-2">
              <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">03</span>
              <h2 className="text-base font-semibold text-slate-900 dark:text-[#E6EDF3]">
                Data deletion
              </h2>
            </div>
            <p className="text-slate-600 dark:text-[#8B949E] text-sm leading-relaxed">
              All stored scan records can be deleted at any time from the Scan History dashboard page. Deleting a record removes the data from your local SQLite database.
            </p>
          </section>

          {/* Small Data Flow Reference at Bottom */}
          <div className="pt-6 border-t border-slate-200 dark:border-[#30363D] space-y-2 text-xs font-mono text-slate-500 dark:text-[#8B949E]">
            <div className="text-[11px] font-semibold text-slate-400 dark:text-[#8B949E] uppercase tracking-wider">
              Data Flow
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span>Dependency file</span>
              <span className="text-slate-300 dark:text-[#30363D]">→</span>
              <span>Local parsing</span>
              <span className="text-slate-300 dark:text-[#30363D]">→</span>
              <span>Package names + versions</span>
              <span className="text-slate-300 dark:text-[#30363D]">→</span>
              <span>Security APIs</span>
              <span className="text-slate-300 dark:text-[#30363D]">→</span>
              <span className="text-slate-700 dark:text-[#C9D1D9]">Analysis results</span>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
