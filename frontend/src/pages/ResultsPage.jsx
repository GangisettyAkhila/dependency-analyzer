import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import DependencyGraph from '../components/DependencyGraph';
import AIRiskModal from '../components/AIRiskModal';

const SEVERITY_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#d97706',
  LOW: '#2563eb',
  SECURE: '#059669'
};

export default function ResultsPage({ scanResult, onNewScan }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [depthFilter, setDepthFilter] = useState('ALL');
  const [selectedVuln, setSelectedVuln] = useState(null);

  if (!scanResult) return null;

  const {
    id,
    filename,
    ecosystem,
    scanned_at,
    total_deps,
    direct_deps,
    transitive_deps,
    vulnerable_deps,
    critical_count,
    high_count,
    medium_count,
    low_count,
    risk_score,
    dependencies,
    vulnerabilities_flat
  } = scanResult;

  const pieData = useMemo(() => [
    { name: 'Critical', value: critical_count, color: SEVERITY_COLORS.CRITICAL },
    { name: 'High', value: high_count, color: SEVERITY_COLORS.HIGH },
    { name: 'Medium', value: medium_count, color: SEVERITY_COLORS.MEDIUM },
    { name: 'Low', value: low_count, color: SEVERITY_COLORS.LOW },
    { name: 'Secure', value: Math.max(0, total_deps - vulnerable_deps), color: SEVERITY_COLORS.SECURE }
  ].filter(d => d.value > 0), [critical_count, high_count, medium_count, low_count, total_deps, vulnerable_deps]);

  const filteredVulnerabilities = useMemo(() => {
    return (vulnerabilities_flat || []).filter(item => {
      const matchesSearch = 
        item.package_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.vuln_id && item.vuln_id.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSeverity = 
        severityFilter === 'ALL' || item.severity.toUpperCase() === severityFilter;

      const matchesDepth = 
        depthFilter === 'ALL' || item.depth === depthFilter;

      return matchesSearch && matchesSeverity && matchesDepth;
    });
  }, [vulnerabilities_flat, searchTerm, severityFilter, depthFilter]);

  const exportJsonReport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scanResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dep_risk_report_${filename}_${id.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 py-4 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Standardized Responsive Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onNewScan}
            className="h-9 px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full sm:w-auto"
          >
            Back to Scanner
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold font-mono text-slate-900 truncate max-w-[200px] sm:max-w-xs">{filename}</h1>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {ecosystem}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Scanned on {new Date(scanned_at || Date.now()).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 flex-1 sm:flex-initial inline-flex items-center justify-center"
          >
            Print PDF
          </button>
          <button
            onClick={exportJsonReport}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 flex-1 sm:flex-initial inline-flex items-center justify-center"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Metric Cards Row - Responsive (1 col mobile, 2 col tablet, 5 col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scanned</span>
          <div className="text-2xl font-bold font-mono text-slate-900">{total_deps}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {direct_deps} Direct / {transitive_deps} Transitive
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vulnerable Packages</span>
          <div className={`text-2xl font-bold font-mono ${vulnerable_deps > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {vulnerable_deps}
          </div>
          <div className="text-[11px] text-slate-500">
            {vulnerable_deps === 0 ? 'No OSV vulnerabilities' : `${((vulnerable_deps / (total_deps || 1)) * 100).toFixed(1)}% of dependencies`}
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Critical / High</span>
          <div className="text-2xl font-bold font-mono text-orange-600">
            {critical_count + high_count}
          </div>
          <div className="text-[11px] text-slate-500">
            {critical_count} Critical / {high_count} High
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medium / Low</span>
          <div className="text-2xl font-bold font-mono text-amber-600">
            {medium_count + low_count}
          </div>
          <div className="text-[11px] text-slate-500">
            {medium_count} Medium / {low_count} Low
          </div>
        </div>

        {/* Accurately Labeled Weighted Security Score */}
        <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Weighted Security Score</span>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-bold font-mono ${risk_score >= 80 ? 'text-emerald-600' : risk_score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {risk_score} / 100
            </span>
          </div>
          <div className="text-[11px] text-slate-500">Calculated from OSV & depth weights</div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-lg bg-white border border-slate-200 space-y-3">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Severity Breakdown
          </h3>
          <div className="h-44 w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No chart data available</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-600">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></span>
                <span>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 p-5 rounded-lg bg-white border border-slate-200 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Dependency Hierarchy Tree
            </h3>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Direct and Transitive Tree
            </span>
          </div>

          <div className="w-full overflow-x-auto">
            <DependencyGraph dependencies={dependencies} filename={filename} />
          </div>
        </div>
      </div>

      {/* Vulnerability Table Section with Sticky Header and Accessible Search Input */}
      <div className="p-4 sm:p-5 rounded-lg bg-white border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto max-w-full">
            <button
              onClick={() => setSeverityFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                severityFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Detected ({vulnerabilities_flat ? vulnerabilities_flat.length : 0})
            </button>
            <button
              onClick={() => setSeverityFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                severityFilter === 'CRITICAL' ? 'bg-red-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Critical ({critical_count})
            </button>
            <button
              onClick={() => setSeverityFilter('HIGH')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                severityFilter === 'HIGH' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              High ({high_count})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full md:w-auto">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto max-w-full">
              <button
                onClick={() => setDepthFilter('ALL')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${depthFilter === 'ALL' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'}`}
              >
                All Depths
              </button>
              <button
                onClick={() => setDepthFilter('direct')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${depthFilter === 'direct' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600'}`}
              >
                Direct
              </button>
              <button
                onClick={() => setDepthFilter('transitive')}
                className={`px-2.5 py-1 rounded whitespace-nowrap ${depthFilter === 'transitive' ? 'bg-white text-slate-900 font-semibold' : 'text-slate-600'}`}
              >
                Transitive
              </button>
            </div>

            <div className="relative w-full sm:w-60">
              <label htmlFor="vuln-search-input" className="sr-only">
                Search package or CVE ID
              </label>
              <input
                id="vuln-search-input"
                name="vuln_search_term"
                type="text"
                placeholder="Search package or CVE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 px-3 w-full rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Readability Enhanced Table with Sticky Header & Mobile Horizontal Scroll */}
        <div className="overflow-x-auto max-h-[500px] w-full">
          <table className="w-full text-left text-xs text-slate-700 border-collapse min-w-[700px]">
            <thead className="sticky top-0 bg-slate-50 z-10 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Package</th>
                <th className="py-3.5 px-4 font-semibold">Installed Version</th>
                <th className="py-3.5 px-4 font-semibold">Depth</th>
                <th className="py-3.5 px-4 font-semibold">Staleness / Deprecation</th>
                <th className="py-3.5 px-4 font-semibold">Severity</th>
                <th className="py-3.5 px-4 font-semibold">Vulnerability ID</th>
                <th className="py-3.5 px-4 font-semibold">Fixed Version</th>
                <th className="py-3.5 px-4 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredVulnerabilities.length > 0 ? (
                filteredVulnerabilities.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {item.package_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      v{item.installed_version}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        item.depth === 'direct'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {item.depth}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        item.is_deprecated
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : item.staleness?.includes('Outdated') || item.staleness?.includes('Stale')
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.staleness || 'Maintained'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        item.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border-red-200' :
                        item.severity === 'HIGH' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                        item.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800 whitespace-nowrap">
                      {item.vuln_id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-700 font-semibold whitespace-nowrap">
                      {item.fixed_version || 'Latest'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedVuln(item)}
                        className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center"
                      >
                        AI Explanation
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium text-xs">
                    {vulnerable_deps === 0
                      ? "No vulnerabilities found. All scanned dependencies are currently free of known OSV advisories."
                      : "No matching packages found."}
                  </td>
                </tr>

              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AIRiskModal */}
      {selectedVuln && (
        <AIRiskModal
          vulnItem={selectedVuln}
          onClose={() => setSelectedVuln(null)}
        />
      )}
    </div>
  );
}

