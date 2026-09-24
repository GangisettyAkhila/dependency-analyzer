import React, { useState } from 'react';

export default function AIRiskModal({ vulnItem, onClose }) {
  const [copied, setCopied] = useState(false);

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
        return 'bg-red-50 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-4 sm:p-6 space-y-6 shadow-xl relative text-slate-900 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="modal-title" className="text-sm sm:text-base font-semibold font-mono text-slate-900">
                {vulnItem.package_name}
              </h2>
              <span className="text-xs font-mono text-slate-500">v{vulnItem.installed_version}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${getSeverityBadge(vulnItem.severity)}`}>
                {vulnItem.severity}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">{vulnItem.vuln_id}</p>
          </div>

          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors"
            aria-label="Close dialog"
          >
            Close
          </button>
        </div>

        {/* AI Explanation Content */}
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                AI Risk Explanation
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                {aiExp.attack_vector || 'Security Advisory'}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {aiExp.plain_english_summary || vulnItem.summary}
            </p>
          </div>

          {/* Impact Assessment */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-800">Impact Assessment</h3>
            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
              {aiExp.why_it_matters || 'Exposes application component to potential security flaw.'}
            </p>
          </div>

          {/* Remediation Command */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Remediation Command</span>
              <span className="text-slate-500 text-[11px]">
                Fixed version: <span className="font-mono text-emerald-700 font-medium">{vulnItem.fixed_version || 'Latest'}</span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-slate-900 border border-slate-900 text-slate-100 font-mono text-xs gap-3">
              <code className="truncate max-w-full sm:max-w-[420px]">{cmd}</code>
              <button
                onClick={copyCommand}
                className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 self-end sm:self-auto"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* References */}
          {vulnItem.references && vulnItem.references.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700">Advisory References</h3>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {vulnItem.references.slice(0, 3).map((refUrl, idx) => (
                  <a
                    key={idx}
                    href={refUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-mono truncate max-w-[280px]"
                  >
                    {refUrl}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

}
