import React, { useState, useEffect } from 'react';

export default function AIRiskModal({ vulnItem, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!vulnItem) return null;

  const aiExp = vulnItem.ai_explanation || {};
  const cmd = aiExp.remediation_command || `Update ${vulnItem.package_name} to version ${vulnItem.fixed_version || 'latest'}`;

  const copyCommand = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/60';
      case 'MEDIUM':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-[#30363D]';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] rounded-xl max-w-2xl w-full p-6 space-y-6 text-slate-900 dark:text-[#C9D1D9] my-auto animate-in fade-in zoom-in-95 duration-150 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-[#30363D] pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="modal-title" className="text-base font-semibold font-mono text-slate-900 dark:text-[#E6EDF3]">
                {vulnItem.package_name}
              </h2>
              <span className="text-xs font-mono text-slate-500 dark:text-[#8B949E]">v{vulnItem.installed_version}</span>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-lg border ${getSeverityBadge(vulnItem.severity)}`}>
                {vulnItem.severity}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#8B949E] mt-1 font-mono">{vulnItem.vuln_id}</p>
          </div>

          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] hover:bg-slate-100 dark:hover:bg-[#30363D] text-xs font-normal focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            aria-label="Close dialog"
          >
            Close
          </button>
        </div>

        {/* AI Explanation Content */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-slate-900 dark:text-[#E6EDF3]">
                AI risk explanation
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white dark:bg-[#161B22] text-slate-600 dark:text-[#8B949E] border border-slate-200 dark:border-[#30363D]">
                {aiExp.attack_vector || 'Security advisory'}
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-[#C9D1D9] font-normal leading-relaxed">
              {aiExp.plain_english_summary || vulnItem.summary}
            </p>
          </div>

          {/* Impact Assessment */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-slate-900 dark:text-[#E6EDF3]">Impact assessment</h3>
            <p className="text-xs text-slate-600 dark:text-[#C9D1D9] font-normal leading-relaxed bg-slate-50 dark:bg-[#0D1117] p-3 rounded-lg border border-slate-200 dark:border-[#30363D]">
              {aiExp.why_it_matters || 'Exposes application component to potential security flaw.'}
            </p>
          </div>

          {/* Remediation Command */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <h3 className="font-medium text-slate-900 dark:text-[#E6EDF3]">Remediation command</h3>
              <span className="text-slate-500 dark:text-[#8B949E] text-[11px]">
                Fixed version: <span className="font-mono text-slate-900 dark:text-[#E6EDF3] font-medium">{vulnItem.fixed_version || 'Latest'}</span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-900 dark:bg-[#0D1117] border border-slate-900 dark:border-[#30363D] text-slate-100 dark:text-[#E6EDF3] font-mono text-xs gap-3">
              <code className="truncate max-w-full sm:max-w-[420px]">{cmd}</code>
              <button
                onClick={copyCommand}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-sans text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 self-end sm:self-auto"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* References */}
          {vulnItem.references && vulnItem.references.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-[#30363D]">
              <h3 className="text-xs font-medium text-slate-900 dark:text-[#E6EDF3]">Advisory references</h3>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {vulnItem.references.slice(0, 3).map((refUrl, idx) => (
                  <a
                    key={idx}
                    href={refUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-mono truncate max-w-[280px]"
                  >
                    {refUrl}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-[#30363D]">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg bg-slate-100 dark:bg-[#30363D] hover:bg-slate-200 dark:hover:bg-[#3c444d] text-slate-800 dark:text-[#E6EDF3] text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
