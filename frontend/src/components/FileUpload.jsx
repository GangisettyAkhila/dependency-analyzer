import React, { useState, useRef } from 'react';

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
    label: "Sample package.json",
    content: JSON.stringify({
      "name": "sample-vulnerable-node-app",
      "version": "1.0.0",
      "dependencies": {
        "lodash": "4.17.15",
        "express": "4.16.0",
        "axios": "0.19.0",
        "moment": "2.24.0"
      },
      "devDependencies": {
        "semver": "5.6.0"
      }
    }, null, 2)
  },
  npm_lock: {
    filename: "package-lock.json",
    label: "Sample package-lock.json",
    content: JSON.stringify({
      "name": "sample-vulnerable-node-app",
      "version": "1.0.0",
      "lockfileVersion": 2,
      "packages": {
        "": {
          "name": "sample-vulnerable-node-app",
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
    label: "Sample requirements.txt",
    content: `# Sample Python Requirements
flask==0.12.2
requests==2.20.0
django==2.2.0
urllib3==1.24.1
jinja2==2.10
pyyaml==5.1`
  },
  maven: {
    filename: "pom.xml",
    label: "Sample pom.xml",
    content: `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>com.example.vulnerable</groupId>
  <artifactId>demo-app</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>org.apache.logging.log4j</groupId>
      <artifactId>log4j-core</artifactId>
      <version>2.14.1</version>
    </dependency>
  </dependencies>
</project>`
  }
};

export default function FileUpload({ onScanComplete, isLoading, setIsLoading, error, setError }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return "No file selected.";
    
    // Strict filename check
    if (!ALLOWED_FILENAMES.has(file.name)) {
      return "Unsupported file type. Upload a dependency manifest or lock file.";
    }

    // Empty file check
    if (file.size === 0) {
      return "Uploaded file is empty. Select a valid dependency manifest or lock file.";
    }

    // Size limit check (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      return "File size exceeds 5MB limit. Upload a smaller file.";
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
    runAnalysis(file);
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
      setSelectedFile({ name: sample.filename, isSample: true, content: sample.content });
      runAnalysis(null, sample.content, sample.filename);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Dashed Outline Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => {
          if (!isLoading) fileInputRef.current?.click();
        }}
        className={`border-2 border-dashed rounded-lg p-6 sm:p-12 text-center transition-colors ${
          isLoading
            ? "cursor-not-allowed opacity-50 bg-slate-100 border-slate-300 pointer-events-none select-none"
            : dragActive
            ? "border-blue-600 bg-blue-50/60 cursor-pointer"
            : "border-slate-300 hover:border-slate-400 bg-slate-50/60 cursor-pointer"
        }`}
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-disabled={isLoading}
        aria-label="Upload dependency file"
        onKeyDown={(e) => {
          if (isLoading) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
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

        <div className="flex flex-col items-center justify-center space-y-2">
          {isLoading ? (
            <div className="text-slate-800 text-xs font-semibold py-4 flex items-center justify-center gap-2">
              <span>Scanning dependencies with OSV.dev & package registries...</span>
            </div>
          ) : (
            <>
              <label
                htmlFor="dependency-file-input"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight cursor-pointer"
                onClick={(e) => {
                  if (isLoading) e.preventDefault();
                  else e.stopPropagation();
                }}
              >
                Click or drag & drop a dependency file here
              </label>
              <p className="text-xs text-slate-500 font-normal px-2">
                Supports package.json, package-lock.json, requirements.txt, requirements-lock.txt, pom.xml, yarn.lock
              </p>
              <p className="text-xs text-slate-500 font-normal pb-3">
                (Max 5MB)
              </p>

              <button
                type="button"
                disabled={isLoading}
                aria-disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLoading) fileInputRef.current?.click();
                }}
                className="h-9 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
              >
                Analyze Dependencies
              </button>
            </>
          )}

          {selectedFile && !isLoading && (
            <div className="mt-3 px-3 py-1 rounded bg-white border border-slate-200 text-xs font-mono text-slate-800">
              Selected: {selectedFile.name}
            </div>
          )}
        </div>
      </div>

      {/* Inline Error Banner - Light Red Background & Dark Red Text */}
      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs text-center font-medium shadow-xs">
          {error}
        </div>
      )}

      {/* Standardized Sample File Buttons */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-bold text-slate-900 text-left tracking-tight">
          Or try with a sample file
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => loadSample('npm')}
            disabled={isLoading}
            aria-disabled={isLoading}
            className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Sample package.json
          </button>

          <button
            type="button"
            onClick={() => loadSample('npm_lock')}
            disabled={isLoading}
            aria-disabled={isLoading}
            className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Sample package-lock.json
          </button>

          <button
            type="button"
            onClick={() => loadSample('python')}
            disabled={isLoading}
            aria-disabled={isLoading}
            className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Sample requirements.txt
          </button>

          <button
            type="button"
            onClick={() => loadSample('maven')}
            disabled={isLoading}
            aria-disabled={isLoading}
            className="h-9 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 inline-flex items-center justify-center w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            Sample pom.xml
          </button>
        </div>
      </div>
    </div>
  );
}




