import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import { Clock, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import { getApiUrl } from '../config/api';

export default function HomePage({ onScanComplete, onSelectScan, onNavigatePrivacy, isLoading, setIsLoading, error, setError }) {
  const [recentScans, setRecentScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);

  const fetchRecentScans = async () => {
    setLoadingScans(true);
    try {
      const res = await fetch(getApiUrl('/api/scans'));
      if (res.ok) {
        const data = await res.json();
        setRecentScans(data.slice(0, 5)); // show latest 5
      }
    } catch {
      // silent fallback
    } finally {
      setLoadingScans(false);
    }
  };

  useEffect(() => {
    fetchRecentScans();
  }, []);

  const handleSelectRecent = async (scanId) => {
    if (!onSelectScan) return;
    try {
      const res = await fetch(getApiUrl(`/api/scans/${scanId}`));
      if (res.ok) {
        const data = await res.json();
        onSelectScan(data);
      }
    } catch (err) {
      alert("Error loading scan details: " + err.message);
    }
  };

  return (
    <div className="space-y-8 py-4 font-sans">
      {/* Workspace Section */}
      <div className="relative space-y-8">
        {/* Strengthened cool blue dot-grid background texture (#AFC9E8) */}
        <div 
          className="absolute inset-x-0 -top-2 h-96 pointer-events-none opacity-60 dark:opacity-45 bg-[radial-gradient(#afc9e8_1.6px,transparent_1.6px)] dark:bg-[radial-gradient(#345279_1.6px,transparent_1.6px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_90%)]" 
          aria-hidden="true" 
        />

        {/* Hero Section */}
        <section className="relative text-center space-y-1.5 pt-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#0F172A] dark:text-[#E6EDF3] tracking-tight leading-tight text-center max-w-2xl mx-auto">
            Analyze your dependencies for security risks
          </h1>
          <p className="text-[#64748B] dark:text-[#8B949E] text-sm font-normal max-w-xl mx-auto leading-relaxed text-center">
            Upload a dependency manifest or lock file to begin.
          </p>
        </section>

        {/* File Upload Component */}
        <section className="relative">
          <FileUpload
            onScanComplete={onScanComplete}
            onNavigatePrivacy={onNavigatePrivacy}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
            setError={setError}
          />
        </section>
      </div>

      {/* Recent Scans Section */}
      <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-[#30363D]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500 dark:text-[#8B949E]" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E6EDF3]">
              Recent scans
            </h2>
          </div>
        </div>

        {loadingScans ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-[#8B949E]">
            Loading recent scans...
          </div>
        ) : recentScans.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white dark:bg-[#161B22] border border-slate-200 dark:border-[#30363D]">
            <p className="text-xs text-slate-500 dark:text-[#8B949E]">
              No previous scans yet. Your completed scans will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] overflow-hidden shadow-xs">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-700 dark:text-[#C9D1D9] min-w-[600px] border-collapse">
                <thead className="bg-slate-50 dark:bg-[#0D1117] text-slate-500 dark:text-[#8B949E] font-medium border-b border-slate-200 dark:border-[#30363D]">
                  <tr>
                    <th className="py-2.5 px-4">File</th>
                    <th className="py-2.5 px-4">Ecosystem</th>
                    <th className="py-2.5 px-4">Result</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#30363D]">
                  {recentScans.map((scan) => (
                    <tr
                      key={scan.id}
                      onClick={() => handleSelectRecent(scan.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#1c2128] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-[#E6EDF3]">
                        {scan.filename}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-[#0D1117] text-slate-600 dark:text-[#8B949E] border border-slate-200 dark:border-[#30363D]">
                          {scan.ecosystem}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {scan.vulnerable_deps > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            {scan.vulnerable_deps} Vulnerable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            Score: {scan.risk_score}/100
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-[#8B949E]">
                        {new Date(scan.scanned_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-xs font-medium">
                          View <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

