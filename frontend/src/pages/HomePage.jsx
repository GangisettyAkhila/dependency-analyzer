import React from 'react';
import FileUpload from '../components/FileUpload';

export default function HomePage({ onScanComplete, isLoading, setIsLoading, error, setError }) {
  return (
    <div className="space-y-12 pt-8 pb-0">
      {/* Hero Section matching screenshot */}
      <section className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          AI Software Dependency<br />
          Risk Analyzer
        </h1>

        <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Scan software dependency files, detect known vulnerabilities using the OSV.dev database, check package staleness, and get clear, plain-English explanations with recommended fixes.
        </p>
      </section>

      {/* File Upload Component */}
      <section className="px-4">
        <FileUpload
          onScanComplete={onScanComplete}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          error={error}
          setError={setError}
        />
      </section>
    </div>
  );
}



