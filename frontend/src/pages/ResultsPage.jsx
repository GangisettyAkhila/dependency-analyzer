import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import DependencyGraph from '../components/DependencyGraph';
import AIRiskModal from '../components/AIRiskModal';

const SEVERITY_COLORS = {
  CRITICAL: '#dc2626',
  HIGH: '#dc2626',
  MEDIUM: '#ea580c',
  LOW: '#64748b',
  SECURE: '#059669'
};

export default function ResultsPage({ scanResult, onNewScan }) {
  const [activeTab, setActiveTab] = useState('overview');
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
    risk_label = "Low",
    risk_interpretation = "Limited identified dependency risk",
    factor_contributions,
    dependencies = [],
    vulnerabilities_flat = [],
    ai_briefing
  } = scanResult;

  const factorList = useMemo(() => {
    const factorOrder = [
      { key: 'severity', label: 'Severity', weightLabel: '40%', meaning: 'How serious the vulnerability can be.' },
      { key: 'exposure', label: 'Exposure', weightLabel: '20%', meaning: 'Whether vulnerable components are directly accessible.' },
      { key: 'criticality', label: 'Criticality', weightLabel: '15%', meaning: 'Importance of affected dependencies in project architecture.' },
      { key: 'version_status', label: 'Version status', weightLabel: '15%', meaning: 'Staleness, deprecation, and outdated version status.' },
      { key: 'reach', label: 'Dependency reach', weightLabel: '10%', meaning: 'Transitive dependency depth and graph fan-out.' }
    ];

    return factorOrder.map(item => {
      let rawFactor = null;
      if (factor_contributions) {
        rawFactor = factor_contributions[item.key] || factor_contributions[item.key.replace('_', '')];
      }
      const score = rawFactor && typeof rawFactor.score === 'number' ? rawFactor.score : 0;
      const weightLabel = rawFactor && typeof rawFactor.weight === 'number'
        ? `${(rawFactor.weight * 100).toFixed(0)}%`
        : item.weightLabel;
      const meaning = rawFactor && rawFactor.meaning ? rawFactor.meaning : item.meaning;

      return {
        key: item.key,
        label: item.label,
        weightLabel,
        score,
        meaning
      };
    });
  }, [factor_contributions]);

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
    <div className="space-y-12 py-4 max-w-6xl mx-auto px-4 sm:px-6 font-sans text-slate-900 dark:text-[#C9D1D9]">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#30363D] pb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onNewScan}
            className="h-9 px-3 border border-slate-200 dark:border-[#30363D] rounded-lg text-xs font-normal text-slate-700 dark:text-[#C9D1D9] bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#30363D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Back to scanner
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#E6EDF3] truncate">{filename}</h1>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#161B22] text-slate-600 dark:text-[#8B949E] border border-slate-200 dark:border-[#30363D]">
                {ecosystem}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-[#8B949E] font-normal mt-0.5">
              Scanned on {new Date(scanned_at || Date.now()).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="h-9 px-4 rounded-lg border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#30363D] text-slate-700 dark:text-[#C9D1D9] text-xs font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Print report
          </button>
          <button
            onClick={exportJsonReport}
            className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* GitHub-style Active Line Navigation Tabs */}
      <nav aria-label="Scan View Tabs" className="flex items-center gap-6 border-b border-slate-200 dark:border-[#30363D] text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap focus:outline-none border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-[#E6EDF3]'
              : 'border-transparent text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('dependencies')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap focus:outline-none border-b-2 ${
            activeTab === 'dependencies'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-[#E6EDF3]'
              : 'border-transparent text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
          }`}
        >
          Dependencies ({total_deps})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap focus:outline-none border-b-2 ${
            activeTab === 'graph'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-[#E6EDF3]'
              : 'border-transparent text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
          }`}
        >
          Dependency graph
        </button>
        <button
          onClick={() => setActiveTab('findings')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap focus:outline-none border-b-2 ${
            activeTab === 'findings'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-[#E6EDF3]'
              : 'border-transparent text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
          }`}
        >
          Vulnerabilities ({vulnerabilities_flat.length})
        </button>
        <button
          onClick={() => setActiveTab('ai_insights')}
          className={`pb-3 font-medium transition-colors whitespace-nowrap focus:outline-none border-b-2 ${
            activeTab === 'ai_insights'
              ? 'border-blue-600 dark:border-blue-500 text-slate-900 dark:text-[#E6EDF3]'
              : 'border-transparent text-slate-500 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
          }`}
        >
          AI insights
        </button>
      </nav>

      {/* Tab 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-12">
          {/* Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Single Primary Project Risk Score Indicator */}
            <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-1">
              <h3 className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Project risk score</h3>
              <div className="text-3xl font-semibold text-slate-900 dark:text-[#E6EDF3]">
                {risk_score}<span className="text-base text-slate-500 dark:text-[#8B949E] font-normal">/100</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                {risk_label} risk • {risk_interpretation}
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-1">
              <h3 className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Total dependencies</h3>
              <div className="text-3xl font-semibold text-slate-900 dark:text-[#E6EDF3]">{total_deps}</div>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                {direct_deps} direct, {transitive_deps} transitive
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-1">
              <h3 className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Vulnerable packages</h3>
              <div className={`text-3xl font-semibold ${vulnerable_deps > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-[#E6EDF3]'}`}>
                {vulnerable_deps}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                {vulnerable_deps === 0 ? 'No advisories found' : `${((vulnerable_deps / (total_deps || 1)) * 100).toFixed(1)}% of dependencies`}
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-1">
              <h3 className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Critical and high</h3>
              <div className={`text-3xl font-semibold ${(critical_count + high_count) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-[#E6EDF3]'}`}>
                {critical_count + high_count}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                {critical_count} critical, {high_count} high
              </p>
            </div>

            <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-1">
              <h3 className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Medium and low</h3>
              <div className="text-3xl font-semibold text-slate-900 dark:text-[#E6EDF3]">
                {medium_count + low_count}
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                {medium_count} medium, {low_count} low
              </p>
            </div>
          </div>

          {/* Analytical Panel for Project Risk Calculation */}
          <details className="border border-slate-200 dark:border-[#30363D] rounded-xl bg-white dark:bg-[#161B22] p-5 text-sm group shadow-xs">
            <summary className="text-base font-semibold text-slate-900 dark:text-[#E6EDF3] cursor-pointer focus:outline-none list-none flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>Project risk calculation</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-[#0D1117] text-slate-700 dark:text-[#C9D1D9] border border-slate-200 dark:border-[#30363D]">
                  {risk_score} / 100 · {risk_label} risk
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                <span className="group-open:hidden">Show details</span>
                <span className="hidden group-open:inline">Hide details</span>
              </div>
            </summary>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#30363D] space-y-4">
              {/* Factor Panel Table for Desktop */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-[#30363D]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-[#0D1117] text-slate-500 dark:text-[#8B949E] font-medium border-b border-slate-200 dark:border-[#30363D]">
                    <tr>
                      <th className="py-2.5 px-4 font-medium">Factor</th>
                      <th className="py-2.5 px-4 font-medium text-center">Weight</th>
                      <th className="py-2.5 px-4 font-medium text-center">Score</th>
                      <th className="py-2.5 px-4 font-medium w-1/3">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#30363D] bg-white dark:bg-[#161B22]">
                    {factorList.map((factor) => (
                      <tr key={factor.key} className="hover:bg-slate-50/50 dark:hover:bg-[#1c2128]">
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-[#E6EDF3]">{factor.label}</div>
                          <div className="text-[11px] text-slate-500 dark:text-[#8B949E] font-normal">{factor.meaning}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-[#8B949E]">{factor.weightLabel}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-900 dark:text-[#E6EDF3]">{factor.score}/100</td>
                        <td className="py-3 px-4">
                          <div className="w-full bg-slate-100 dark:bg-[#0D1117] h-2.5 rounded-full overflow-hidden border border-slate-200/80 dark:border-[#30363D]/80">
                            <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, factor.score))}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Factor Panel List */}
              <div className="block sm:hidden space-y-3">
                {factorList.map((factor) => (
                  <div key={factor.key} className="p-3 rounded-lg border border-slate-200 dark:border-[#30363D] bg-slate-50/40 dark:bg-[#0D1117]/40 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-900 dark:text-[#E6EDF3]">{factor.label}</span>
                      <span className="font-mono text-slate-600 dark:text-[#8B949E]">{factor.weightLabel} · <strong className="text-slate-900 dark:text-[#E6EDF3]">{factor.score}/100</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#8B949E]">{factor.meaning}</div>
                    <div className="w-full bg-slate-100 dark:bg-[#0D1117] h-2.5 rounded-full overflow-hidden border border-slate-200/80 dark:border-[#30363D]/80">
                      <div className="bg-blue-600 dark:bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, factor.score))}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Compact Risk Scale Footer */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-700 dark:text-[#C9D1D9]">Risk scale:</span>
                <div className="flex items-center gap-2.5 text-[11px] font-mono flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-medium border border-emerald-200 dark:border-emerald-900/60">0–24 Low</span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-900/60">25–49 Moderate</span>
                  <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 font-medium border border-orange-200 dark:border-orange-900/60">50–74 High</span>
                  <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-medium border border-red-200 dark:border-red-900/60">75–100 Critical</span>
                </div>
              </div>
            </div>
          </details>

          {/* Charts & Graph Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-4">
              <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">
                Severity breakdown
              </h2>
              <div className="h-48 w-full flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#161B22', border: '1px solid #30363D', borderRadius: '8px', color: '#E6EDF3', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-[#8B949E]">No chart data available</p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 dark:text-[#C9D1D9]">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                    <span>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">
                  Dependency graph
                </h2>
                <span className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
                  Click a vulnerable node to view AI explanation
                </span>
              </div>
              <div className="w-full overflow-x-auto">
                <DependencyGraph
                  dependencies={dependencies}
                  filename={filename}
                  onSelectVulnPackage={(item) => setSelectedVuln(item)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: DEPENDENCIES */}
      {activeTab === 'dependencies' && (
        <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#30363D] pb-4">
            <div>
              <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Dependency inventory</h2>
              <p className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Complete list of direct and transitive package dependencies</p>
            </div>
            <span className="text-xs font-mono text-slate-600 dark:text-[#8B949E] px-2.5 py-1 rounded bg-slate-100 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D]">
              {total_deps} packages
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#0D1117] text-slate-500 dark:text-[#8B949E] font-normal border-b border-slate-200 dark:border-[#30363D]">
                <tr>
                  <th className="py-3 px-4 font-medium">Package</th>
                  <th className="py-3 px-4 font-medium">Version</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Parent package</th>
                  <th className="py-3 px-4 font-medium text-right">Security findings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#30363D]">
                {dependencies.map((dep, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2128] transition-opacity duration-150">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-[#E6EDF3]">{dep.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-[#8B949E]">v{dep.version}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                        dep.depth === 'direct'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {dep.depth}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-[#8B949E]">{dep.staleness || 'Maintained'}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 dark:text-[#8B949E] text-[11px]">{dep.parent || 'Root app'}</td>
                    <td className="py-3 px-4 text-right">
                      {dep.is_vulnerable ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                          {dep.vulnerabilities ? dep.vulnerabilities.length : 1} vulnerable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-[#30363D]">
                          Clean
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: GRAPH */}
      {activeTab === 'graph' && (
        <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-4">
          <div className="border-b border-slate-200 dark:border-[#30363D] pb-4">
            <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Dependency graph</h2>
            <p className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Interactive DAG auto-layout. Click any vulnerable node to view AI explanation.</p>
          </div>
          <div className="w-full">
            <DependencyGraph
              dependencies={dependencies}
              filename={filename}
              onSelectVulnPackage={(item) => setSelectedVuln(item)}
            />
          </div>
        </div>
      )}

      {/* Tab 4: VULNERABILITIES */}
      {activeTab === 'findings' && (
        <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#30363D]">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0D1117] p-1 rounded-lg border border-slate-200 dark:border-[#30363D] text-xs overflow-x-auto">
              <button
                onClick={() => setSeverityFilter('ALL')}
                className={`px-3 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  severityFilter === 'ALL' ? 'bg-white dark:bg-[#161B22] text-slate-900 dark:text-[#E6EDF3] font-medium shadow-xs' : 'text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3]'
                }`}
              >
                All ({vulnerabilities_flat ? vulnerabilities_flat.length : 0})
              </button>
              <button
                onClick={() => setSeverityFilter('CRITICAL')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  severityFilter === 'CRITICAL' ? 'bg-red-600 text-white font-medium' : 'text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3]'
                }`}
              >
                Critical ({critical_count})
              </button>
              <button
                onClick={() => setSeverityFilter('HIGH')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  severityFilter === 'HIGH' ? 'bg-red-600 text-white font-medium' : 'text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3]'
                }`}
              >
                High ({high_count})
              </button>
              <button
                onClick={() => setSeverityFilter('MEDIUM')}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                  severityFilter === 'MEDIUM' ? 'bg-orange-600 text-white font-medium' : 'text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3]'
                }`}
              >
                Medium ({medium_count})
              </button>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search package or vulnerability ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 px-3 w-full rounded-lg bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] text-xs text-slate-900 dark:text-[#E6EDF3] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] w-full">
            <table className="w-full text-left text-xs text-slate-700 dark:text-[#C9D1D9] border-collapse min-w-[700px]">
              <thead className="sticky top-0 bg-slate-50 dark:bg-[#0D1117] text-slate-500 dark:text-[#8B949E] font-normal border-b border-slate-200 dark:border-[#30363D]">
                <tr>
                  <th className="py-3 px-4 font-medium">Package</th>
                  <th className="py-3 px-4 font-medium">Installed version</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Severity</th>
                  <th className="py-3 px-4 font-medium">Vulnerability ID</th>
                  <th className="py-3 px-4 font-medium">Fixed version</th>
                  <th className="py-3 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#30363D]">
                {filteredVulnerabilities.length > 0 ? (
                  filteredVulnerabilities.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2128] transition-opacity duration-150">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-[#E6EDF3] whitespace-nowrap">
                        {item.package_name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-[#8B949E] whitespace-nowrap">
                        v{item.installed_version}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          item.depth === 'direct'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-[#30363D]'
                        }`}>
                          {item.depth}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          item.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/60' :
                          item.severity === 'HIGH' ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/60' :
                          item.severity === 'MEDIUM' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900/60' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-[#30363D]'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-[#C9D1D9] whitespace-nowrap">
                        {item.vuln_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-900 dark:text-[#E6EDF3] font-medium whitespace-nowrap">
                        {item.fixed_version || 'Latest'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedVuln(item)}
                          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-[#8B949E] font-normal text-xs">
                      {vulnerable_deps === 0
                        ? "No vulnerabilities detected in scanned dependencies."
                        : "No matching packages found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: AI INSIGHTS */}
      {activeTab === 'ai_insights' && (
        <div className="space-y-8">
          <div className="p-6 rounded-lg bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] space-y-6">
            <div className="border-b border-slate-200 dark:border-[#30363D] pb-4">
              <h2 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Executive AI project briefing</h2>
              <p className="text-sm text-slate-500 dark:text-[#8B949E] font-normal">Contextual analysis and remediation guidance generated from security evidence</p>
            </div>

            {ai_briefing && (
              <div className="space-y-6 text-sm">
                <div className="space-y-1.5">
                  <h3 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Executive summary</h3>
                  <p className="text-slate-600 dark:text-[#C9D1D9] font-normal leading-relaxed">{ai_briefing.executive_summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-200 dark:border-[#30363D]">
                  <div className="space-y-1.5">
                    <h3 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Graph path analysis</h3>
                    <p className="text-slate-600 dark:text-[#C9D1D9] font-normal leading-relaxed">{ai_briefing.graph_path_analysis}</p>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Risk priority rationale</h3>
                    <p className="text-slate-600 dark:text-[#C9D1D9] font-normal leading-relaxed">{ai_briefing.risk_priority_rationale}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-[#30363D]">
                  <h3 className="text-base font-medium text-slate-900 dark:text-[#E6EDF3]">Remediation checklist</h3>
                  {ai_briefing.remediation_checklist && ai_briefing.remediation_checklist.length > 0 ? (
                    <div className="space-y-3">
                      {ai_briefing.remediation_checklist.map((item, i) => (
                        <div key={i} className="p-4 bg-slate-50 dark:bg-[#0D1117] border border-slate-200 dark:border-[#30363D] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-medium text-slate-900 dark:text-[#E6EDF3]">{item.package_name}</span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                                {item.severity}
                              </span>
                              <span className="text-slate-500 dark:text-[#8B949E] text-[11px]">{item.vuln_id}</span>
                            </div>
                            <p className="text-slate-600 dark:text-[#C9D1D9] mt-1 font-normal text-xs">{item.recommendation}</p>
                          </div>
                          <code className="bg-slate-900 dark:bg-[#161B22] text-slate-100 dark:text-[#E6EDF3] px-3 py-1.5 rounded-lg font-mono text-xs shrink-0 border border-slate-800 dark:border-[#30363D]">
                            {item.action_command}
                          </code>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 dark:text-[#8B949E] font-normal text-xs">No specific remediation actions required.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Boundary Disclaimers */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#C9D1D9] text-xs space-y-2">
            <h3 className="font-medium text-slate-900 dark:text-[#E6EDF3]">Operational boundaries and disclaimers</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-[#8B949E] font-normal">
              <li>The AI model is an assistance layer and not the authoritative source for vulnerability discovery.</li>
              <li>Known vulnerabilities are derived strictly from trusted security advisories (OSV.dev).</li>
              <li>AI explanations do not invent advisory IDs or affected package version ranges.</li>
              <li>Upgrading packages does not guarantee backwards compatibility; test thoroughly before deployment.</li>
              <li>Automated scan results do not replace expert security review or source code penetration testing.</li>
            </ul>
          </div>
        </div>
      )}

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
