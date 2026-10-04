import React, { useState, useEffect } from 'react';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { getApiUrl } from '../config/api';

export default function HistoryPage({ onSelectScan, onNavigateHome }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Delete Modal & Toast states
  const [pendingDeleteScan, setPendingDeleteScan] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadScans = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/scans'));
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
      const res = await fetch(getApiUrl(`/api/scans/${scanId}`));
      if (!res.ok) throw new Error("Failed to load scan details.");
      const data = await res.json();
      onSelectScan(data);
    } catch (err) {
      alert("Error loading scan details: " + err.message);
    }
  };

  const openDeleteModal = (scan) => {
    setPendingDeleteScan(scan);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteScan) return;
    setIsDeleting(true);
    try {
      const res = await fetch(getApiUrl(`/api/scans/${pendingDeleteScan.id}`), { method: 'DELETE' });
      if (res.ok) {
        setScans(scans.filter(s => s.id !== pendingDeleteScan.id));
        setPendingDeleteScan(null);
        showToast("Scan deleted.");
      } else {
        alert("Failed to delete scan record.");
      }
    } catch (err) {
      alert("Failed to delete scan: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-[#C9D1D9] relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#30363D] pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#E6EDF3]">Scan history</h1>
          <p className="text-sm text-slate-500 dark:text-[#8B949E] font-normal mt-0.5">
            Total stored scan records: {scans.length} {lastUpdated && `(Last updated: ${lastUpdated})`}
          </p>
        </div>

        <button
          onClick={loadScans}
          className="h-9 px-4 rounded-lg border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#30363D] text-slate-700 dark:text-[#C9D1D9] text-xs font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 inline-flex items-center justify-center w-full sm:w-auto"
        >
          Refresh list
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-[#8B949E] text-xs font-normal">
          Loading past scan records...
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs font-normal">
          {error}
        </div>
      ) : scans.length === 0 ? (
        <div className="py-14 text-center bg-white dark:bg-[#161B22] rounded-xl border border-slate-200 dark:border-[#30363D] p-8 space-y-3 max-w-md mx-auto my-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-[#E6EDF3]">No scans yet</h2>
          <p className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
            Completed dependency scans will appear here.
          </p>
          {onNavigateHome && (
            <div className="pt-2">
              <button
                onClick={onNavigateHome}
                className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 inline-flex items-center justify-center shadow-xs"
              >
                Go to Scanner
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs text-slate-700 dark:text-[#C9D1D9] min-w-[750px] border-collapse">
              <thead className="bg-slate-50 dark:bg-[#0D1117] text-slate-500 dark:text-[#8B949E] font-normal border-b border-slate-200 dark:border-[#30363D]">
                <tr>
                  <th className="py-3 px-4 font-medium">Filename</th>
                  <th className="py-3 px-4 font-medium">Ecosystem</th>
                  <th className="py-3 px-4 font-medium">Scanned date</th>
                  <th className="py-3 px-4 font-medium">Total dependencies</th>
                  <th className="py-3 px-4 font-medium">Vulnerable</th>
                  <th className="py-3 px-4 font-medium">Critical and high</th>
                  <th className="py-3 px-4 font-medium">Risk score</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#30363D] font-sans">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-50/80 dark:hover:bg-[#1c2128] transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-[#E6EDF3] whitespace-nowrap">
                      {scan.filename}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-[#8B949E] border border-slate-200 dark:border-[#30363D]">
                        {scan.ecosystem}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-[#8B949E] whitespace-nowrap">
                      {new Date(scan.scanned_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-900 dark:text-[#E6EDF3] whitespace-nowrap">{scan.total_deps}</td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                      <span className={scan.vulnerable_deps > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-600 dark:text-[#8B949E]"}>
                        {scan.vulnerable_deps}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-red-600 dark:text-red-400 whitespace-nowrap">
                      {scan.critical_count + scan.high_count}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium whitespace-nowrap">
                      <span className="text-slate-900 dark:text-[#E6EDF3]">
                        {scan.risk_score} / 100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSelect(scan.id)}
                          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 inline-flex items-center justify-center"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openDeleteModal(scan)}
                          className="h-8 px-3 rounded-lg bg-white dark:bg-[#161B22] hover:bg-slate-50 dark:hover:bg-[#30363D] border border-slate-200 dark:border-[#30363D] text-slate-600 dark:text-[#8B949E] hover:text-red-600 dark:hover:text-red-400 text-xs font-normal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 inline-flex items-center justify-center"
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

      {/* Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteScan)}
        scanFilename={pendingDeleteScan?.filename}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteScan(null)}
        isDeleting={isDeleting}
      />

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 dark:bg-[#161B22] text-white dark:text-[#E6EDF3] text-xs font-medium px-4 py-2.5 rounded-lg border border-slate-800 dark:border-[#30363D] shadow-md animate-in fade-in duration-150">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
