import React, { useState, useEffect } from 'react';

export default function HistoryPage({ onSelectScan }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadScans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scans');
      if (!res.ok) throw new Error("Failed to load scan history.");
      const data = await res.json();
      setScans(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
  }, []);

  const handleSelect = async (scanId) => {
    try {
      const res = await fetch(`/api/scans/${scanId}`);
      if (!res.ok) throw new Error("Failed to load scan details.");
      const data = await res.json();
      onSelectScan(data);
    } catch (err) {
      alert("Error loading scan details: " + err.message);
    }
  };

  const handleDelete = async (scanId) => {
    if (!confirm("Are you sure you want to delete this scan record?")) return;
    try {
      const res = await fetch(`/api/scans/${scanId}`, { method: 'DELETE' });
      if (res.ok) {
        setScans(scans.filter(s => s.id !== scanId));
      }
    } catch (err) {
      alert("Failed to delete scan: " + err.message);
    }
  };

  return (
    <div className="space-y-6 py-4 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Saved Scan History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Total stored scan records: <strong className="text-slate-800 font-mono">{scans.length}</strong> {lastUpdated && `(Last updated: ${lastUpdated})`}
          </p>
        </div>

        <button
          onClick={loadScans}
          className="h-9 px-3.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full sm:w-auto"
        >
          Refresh List
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
          <span className="text-xs font-medium">Loading past scan records from SQLite...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
          {error}
        </div>
      ) : scans.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-lg border border-slate-200 p-8 space-y-2">
          <h2 className="text-sm font-semibold text-slate-800">No scans yet.</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload a dependency file to begin analysis. Past scan results will be saved here in SQLite for instant review.
          </p>
        </div>

      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 min-w-[750px]">
              <thead className="bg-slate-50 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Filename</th>
                  <th className="py-3.5 px-4 font-semibold">Ecosystem</th>
                  <th className="py-3.5 px-4 font-semibold">Scanned Date</th>
                  <th className="py-3.5 px-4 font-semibold">Total Deps</th>
                  <th className="py-3.5 px-4 font-semibold">Vulnerable</th>
                  <th className="py-3.5 px-4 font-semibold">Critical / High</th>
                  <th className="py-3.5 px-4 font-semibold">Weighted Risk Score</th>
                  <th className="py-3.5 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {scan.filename}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                        {scan.ecosystem}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(scan.scanned_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-900 whitespace-nowrap">{scan.total_deps}</td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                      <span className={scan.vulnerable_deps > 0 ? "text-red-600 font-semibold" : "text-emerald-600"}>
                        {scan.vulnerable_deps}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-orange-600 whitespace-nowrap">
                      {scan.critical_count + scan.high_count}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">
                      <span className={scan.risk_score >= 80 ? "text-emerald-600" : scan.risk_score >= 50 ? "text-amber-600" : "text-red-600"}>
                        {scan.risk_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSelect(scan.id)}
                          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(scan.id)}
                          className="h-8 px-3 rounded-lg bg-white hover:bg-red-50 border border-slate-200 text-slate-600 hover:text-red-700 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

