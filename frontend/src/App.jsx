import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';

export default function App() {
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'results' | 'history' | 'privacy' | 'terms'
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dark mode state management
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleScanComplete = (result) => {
    setScanResult(result);
    setCurrentTab('results');
  };

  const handleSelectHistoryScan = (result) => {
    setScanResult(result);
    setCurrentTab('results');
  };

  const handleNewScan = () => {
    setScanResult(null);
    setCurrentTab('home');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0D1117] text-slate-900 dark:text-[#C9D1D9] flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden w-full transition-colors duration-150">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="flex-1 w-full pb-10">
        {currentTab === 'home' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <HomePage
              onScanComplete={handleScanComplete}
              onSelectScan={handleSelectHistoryScan}
              onNavigatePrivacy={() => setCurrentTab('privacy')}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              error={error}
              setError={setError}
            />
          </div>
        )}

        {currentTab === 'results' && scanResult && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <ResultsPage
              scanResult={scanResult}
              onNewScan={handleNewScan}
            />
          </div>
        )}

        {currentTab === 'history' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <HistoryPage
              onSelectScan={handleSelectHistoryScan}
              onNavigateHome={() => setCurrentTab('home')}
            />
          </div>
        )}

        {currentTab === 'privacy' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <PrivacyPolicyPage />
          </div>
        )}

        {currentTab === 'terms' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
            <TermsPage />
          </div>
        )}
      </main>
    </div>
  );
}
