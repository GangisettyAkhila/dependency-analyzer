import React, { useState, useRef, useEffect } from 'react';
import { FileJson, FileText, FileCode, UploadCloud, Lock, X, AlertCircle, Sparkles, ShieldCheck, ArrowRight, CheckCircle2, Search, Cpu } from 'lucide-react';

const ALLOWED_FILENAMES = new Set([
  'package.json',
  'package-lock.json',
  'requirements.txt',
  'requirements-lock.txt',
  'pom.xml',
  'yarn.lock'
]);

const SAMPLES = {
  npm: {
    filename: "package.json",
    label: "package.json",
    ecosystem: "npm",
    icon: FileJson,
    content: JSON.stringify({
      "name": "enterprise-web-service",
      "version": "2.4.0",
      "dependencies": {
        "express": "4.16.0",
        "lodash": "4.17.15",
        "jsonwebtoken": "8.5.1",
        "axios": "0.19.0"
      },
      "devDependencies": {
        "semver": "5.6.0"
      }
    }, null, 2)
  },
  npm_lock: {
    filename: "package-lock.json",
    label: "package-lock.json",
    ecosystem: "npm",
    icon: FileJson,
    content: JSON.stringify({
      "name": "enterprise-web-service",
      "version": "2.4.0",
      "lockfileVersion": 2,
      "packages": {
        "": {
          "name": "enterprise-web-service",
          "dependencies": {
            "express": "4.16.0"
          }
        },
        "node_modules/express": {
          "version": "4.16.0"
        },
        "node_modules/express/node_modules/qs": {
          "version": "6.5.1"
        }
      }
    }, null, 2)
  },
  python: {
    filename: "requirements.txt",
    label: "requirements.txt",
    ecosystem: "Python",
    icon: FileText,
    content: `# Production API Dependencies
Flask==0.12.2
requests==2.20.0
django==2.2.0
urllib3==1.24.1
Jinja2==2.10
PyYAML==5.1`
  },
  maven: {
    filename: "pom.xml",
    label: "pom.xml",
    ecosystem: "Maven",
    icon: FileCode,
    content: `<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.enterprise.security</groupId>
  <artifactId>auth-service</artifactId>
  <version>1.2.0</version>
  <dependencies>
    <dependency>
      <groupId>org.apache.logging.log4j</groupId>
      <artifactId>log4j-core</artifactId>
      <version>2.14.1</version>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
      <version>2.5.4</version>
    </dependency>
  </dependencies>
</project>`
  }
};

const getEcosystemFromFilename = (filename) => {
  if (!filename) return null;
  const name = filename.toLowerCase();
  if (name === 'package.json' || name === 'package-lock.json' || name === 'yarn.lock') return 'npm';
  if (name === 'requirements.txt' || name === 'requirements-lock.txt') return 'Python';
  if (name === 'pom.xml') return 'Maven';
  return null;
};

const formatFileSize = (bytes) => {
  if (!bytes) return "Sample file";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FileUpload({ onScanComplete, onNavigatePrivacy, isLoading, setIsLoading, error, setError }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return "No file selected.";
    
    if (!ALLOWED_FILENAMES.has(file.name)) {
      return "Unsupported file type. Upload a dependency manifest or lock file.";
    }

    if (file.size === 0) {
      return "Uploaded file is empty. Select a valid dependency manifest or lock file.";
    }

    if (file.size > 5 * 1024 * 1024) {
      return "File is too large. Maximum file size is 5 MB.";
    }

    return null;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (isLoading) return;
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (isLoading) return;
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  };

  const runAnalysis = async (fileObj, rawText = null, customFilename = null) => {
    setIsLoading(true);
    setError(null);

    try {
      let res;
      if (rawText && customFilename) {
        res = await fetch('/api/scan/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: customFilename, content: rawText })
        });
      } else if (fileObj) {
        const formData = new FormData();
        formData.append('file', fileObj);
        res = await fetch('/api/scan', {
          method: 'POST',
          body: formData
        });
      } else {
        throw new Error("No file provided.");
      }

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error("Invalid response format from server.");
      }

      if (!res.ok) {
        if (res.status === 400) {
          throw new Error(data.detail || "Invalid dependency file format or structure.");
        } else if (res.status === 500) {
          throw new Error(data.detail || "Server error while scanning dependencies. Please try again later.");
        } else {
          throw new Error(data.detail || `Scan failed with status ${res.status}.`);
        }
      }

      setError(null);
      onScanComplete(data);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Network connection error. Could not connect to backend scanner.");
      } else {
        setError(err.message || "An error occurred while scanning dependencies.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSample = (sampleKey) => {
    if (isLoading) return;
    const sample = SAMPLES[sampleKey];
    if (sample) {
      const sampleObj = { name: sample.filename, isSample: true, content: sample.content, size: sample.content.length };
      setSelectedFile(sampleObj);
      runAnalysis(null, sample.content, sample.filename);
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const detectedEcosystem = selectedFile ? getEcosystemFromFilename(selectedFile.name) : null;

  return (
    <div className="w-full space-y-5 font-sans">
      {/* Understated Technical Process Stepper */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 text-[11px] font-mono text-slate-500 dark:text-[#8B949E] flex-wrap pb-1">
        <span className="text-slate-700 dark:text-[#C9D1D9] font-medium">01 Upload</span>
        <span className="text-slate-300 dark:text-[#30363D]">→</span>
        <span>02 Parse</span>
        <span className="text-slate-300 dark:text-[#30363D]">→</span>
        <span>03 Query OSV.dev</span>
        <span className="text-slate-300 dark:text-[#30363D]">→</span>
        <span>04 Analyze</span>
      </div>

      {/* Dashed Dropzone Upload Container */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!isLoading && !selectedFile) fileInputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-xl p-6 sm:p-7 text-center transition-all ${
          isLoading
            ? "cursor-not-allowed opacity-60 bg-white dark:bg-[#161B22] border-slate-300 dark:border-[#30363D] pointer-events-none select-none"
            : dragActive
            ? "border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-blue-950/20 cursor-pointer"
            : selectedFile
            ? "border-slate-300 dark:border-[#30363D] bg-white dark:bg-[#161B22]"
            : "border-slate-300 dark:border-[#30363D] hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50/50 dark:hover:bg-[#1c2128]/50 bg-white dark:bg-[#161B22] cursor-pointer"
        }`}
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-disabled={isLoading}
        aria-label="Upload dependency file"
        onKeyDown={(e) => {
          if (isLoading) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!selectedFile) fileInputRef.current?.click();
          }
        }}
      >
        <input
          id="dependency-file-input"
          name="dependency_file"
          ref={fileInputRef}
          type="file"
          accept=".json,.txt,.xml,.lock"
          disabled={isLoading}
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="text-slate-700 dark:text-[#C9D1D9] text-sm font-medium py-4 flex flex-col items-center gap-2">
            <UploadCloud className="w-6 h-6 text-blue-600 dark:text-blue-500 animate-bounce stroke-[1.5]" />
            <span>Analyzing dependencies...</span>
          </div>
        ) : selectedFile ? (
          /* File Selected State */
          <div className="flex flex-col items-center justify-center space-y-3 py-1">
            <div className="flex items-center justify-between w-full max-w-md p-3 rounded-lg border border-slate-200 dark:border-[#30363D] bg-slate-50 dark:bg-[#0D1117]">
              <div className="flex items-center gap-3 truncate">
                <FileCode className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="text-left truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-xs text-slate-900 dark:text-[#E6EDF3] truncate">
                      {selectedFile.name}
                    </span>
                    {detectedEcosystem && (
                      <span className="text-[10px] font-sans font-medium px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                        {detectedEcosystem}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-[#8B949E]">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#30363D] text-slate-400 hover:text-slate-600 dark:hover:text-[#E6EDF3] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                title="Remove file"
                aria-label="Remove selected file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedFile.isSample) {
                  runAnalysis(null, selectedFile.content, selectedFile.name);
                } else {
                  runAnalysis(selectedFile);
                }
              }}
              className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 inline-flex items-center justify-center shadow-xs"
            >
              Analyze dependencies
            </button>
          </div>
        ) : (
          /* Empty Dropzone State */
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UploadCloud className="w-5 h-5 stroke-[1.5]" />
            </div>

            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-[#E6EDF3]">
                Drop your dependency file here or click to browse
              </p>
              <p className="text-xs text-slate-500 dark:text-[#8B949E]">
                Select a manifest or lock file from your computer
              </p>
            </div>

            <div className="pt-1 flex flex-col items-center gap-1">
              <button
                type="button"
                disabled={isLoading}
                aria-disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLoading) fileInputRef.current?.click();
                }}
                className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 inline-flex items-center justify-center shadow-xs"
              >
                Choose file
              </button>
              <span className="text-[11px] text-slate-500 dark:text-[#8B949E] font-normal">
                Up to 5 MB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 text-xs font-normal flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}


      {/* Compact Supported Formats Section */}
      <div className="space-y-2 pt-1">
        <div className="text-xs font-semibold text-slate-700 dark:text-[#C9D1D9]">
          Supported formats
        </div>
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-[#C9D1D9] min-w-[70px]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
              npm
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-[#8B949E]">
              <span>package.json</span>
              <span className="text-slate-300 dark:text-[#30363D]">·</span>
              <span>package-lock.json</span>
              <span className="text-slate-300 dark:text-[#30363D]">·</span>
              <span>yarn.lock</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#30363D]/60">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-[#C9D1D9] min-w-[70px]">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
              Python
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-[#8B949E]">
              <span>requirements.txt</span>
              <span className="text-slate-300 dark:text-[#30363D]">·</span>
              <span>requirements-lock.txt</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#30363D]/60">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-[#C9D1D9] min-w-[70px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
              Maven
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-[#8B949E]">
              <span>pom.xml</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Privacy Notice */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-[#8B949E] text-center pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>
          Your source code is never uploaded. Only package names and versions are sent to OSV.dev.
          {onNavigatePrivacy && (
            <button
              onClick={onNavigatePrivacy}
              className="ml-1 text-slate-600 dark:text-[#C9D1D9] hover:underline font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
            >
              How we handle your data
            </button>
          )}
        </span>
      </div>

      {/* Redesigned Sample Section */}
      <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-[#30363D]">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-700 dark:text-[#C9D1D9]">
            Try a sample
          </h2>
          <span className="text-xs text-slate-500 dark:text-[#8B949E] font-normal">
            Runs instantly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {Object.entries(SAMPLES).map(([key, sample]) => (
            <button
              key={key}
              type="button"
              onClick={() => loadSample(key)}
              disabled={isLoading}
              className="group h-10 px-3.5 rounded-lg bg-white dark:bg-[#161B22] hover:bg-blue-50/40 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-[#30363D] hover:border-blue-300 dark:hover:border-blue-500 text-slate-800 dark:text-[#E6EDF3] text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 flex items-center justify-between shadow-xs disabled:opacity-50 disabled:cursor-not-allowed w-full font-mono"
            >
              <span>{sample.filename}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {/* Small Result Information Line */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-[#8B949E] text-center pt-2 font-normal">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Results include severity breakdown, fix versions, dependency paths, and AI remediation steps.</span>
        </div>
      </div>
    </div>
  );
}


