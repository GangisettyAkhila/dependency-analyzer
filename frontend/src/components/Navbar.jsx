import React, { useState } from 'react';

export default function Navbar({ currentTab, setCurrentTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Name */}
        <button 
          onClick={() => handleNavClick('home')}
          className="focus:outline-none focus:ring-2 focus:ring-blue-600 rounded-lg py-1 px-1 text-left transition-opacity hover:opacity-80"
          aria-label="Go to scanner homepage"
        >
          <span className="font-bold text-slate-900 text-base tracking-tight">Dependency Risk Analyzer</span>
        </button>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              currentTab === 'home' || currentTab === 'results'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Scanner
          </button>

          <button
            onClick={() => handleNavClick('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              currentTab === 'history'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Scan History
          </button>

          <button
            onClick={() => handleNavClick('privacy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              currentTab === 'privacy'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Privacy
          </button>

          <button
            onClick={() => handleNavClick('terms')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 ${
              currentTab === 'terms'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Terms
          </button>
        </nav>

        {/* Mobile Hamburger Toggle Button (No Emojis/Icons - Clean CSS Hamburger) */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden h-9 px-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600 flex items-center justify-center"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-menu"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile Navigation Menu Dropdown */}
      {mobileMenuOpen && (
        <div id="mobile-nav-menu" className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'home' || currentTab === 'results'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => handleNavClick('history')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'history'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Scan History
          </button>
          <button
            onClick={() => handleNavClick('privacy')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'privacy'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => handleNavClick('terms')}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'terms'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Terms
          </button>
        </div>
      )}
    </header>
  );
}



