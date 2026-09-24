import React from 'react';

export default function Footer({ setCurrentTab }) {
  return (
    <footer className="border-t border-slate-200 bg-white mt-16 text-slate-500 text-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center sm:text-left">
            <span className="font-semibold text-slate-900 text-xs">AI Software Dependency Risk Analyzer</span>
            <p className="text-slate-500 text-[11px]">
              IEEE Final-Year Project • Security scan powered by OSV.dev, npm, PyPI, and Maven Central APIs.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <button
              onClick={() => setCurrentTab('privacy')}
              className="hover:text-slate-900 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1"
            >
              Privacy
            </button>
            <button
              onClick={() => setCurrentTab('terms')}
              className="hover:text-slate-900 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1"
            >
              Terms
            </button>
            <a
              href="https://osv.dev"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 hover:underline transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 rounded px-1"
            >
              OSV.dev
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

