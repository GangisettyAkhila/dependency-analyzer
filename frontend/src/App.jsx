import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden w-full">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 w-full">

        {currentTab === 'home' && (
          <HomePage
            onScanComplete={handleScanComplete}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            error={error}
            setError={setError}
          />
        )}

        {currentTab === 'results' && scanResult && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <ResultsPage
              scanResult={scanResult}
              onNewScan={handleNewScan}
            />
          </div>
        )}

        {currentTab === 'history' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <HistoryPage
              onSelectScan={handleSelectHistoryScan}
            />
          </div>
        )}

        {currentTab === 'privacy' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <PrivacyPolicyPage />
          </div>
        )}

        {currentTab === 'terms' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <TermsPage />
          </div>
        )}
      </main>

      <Footer setCurrentTab={setCurrentTab} />
    </div>
  );
}
