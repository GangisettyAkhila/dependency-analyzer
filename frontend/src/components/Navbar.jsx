import React, { useState } from 'react';
import { Sun, Moon, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentTab, setCurrentTab, theme, toggleTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] sticky top-0 z-40 transition-colors duration-150 w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand Name with Icon */}
        <button 
          onClick={() => handleNavClick('home')}
          className="text-slate-900 dark:text-[#E6EDF3] text-base font-semibold tracking-tight hover:text-slate-700 dark:hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded px-1 flex items-center gap-2.5"
          aria-label="Go to scanner homepage"
        >
          <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2]" />
          </div>
          <span>Dependency Risk Analyzer</span>
        </button>

        <div className="flex items-center gap-4">
          {/* Desktop Navigation */}
          <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-6 h-14">
            <button
              onClick={() => handleNavClick('home')}
              className={`h-full flex items-center text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 border-b-2 px-1 ${
                currentTab === 'home' || currentTab === 'results'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
              }`}
            >
              Scanner
            </button>

            <button
              onClick={() => handleNavClick('history')}
              className={`h-full flex items-center text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 border-b-2 px-1 ${
                currentTab === 'history'
                  ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] font-normal'
              }`}
            >
              Scan History
            </button>
          </nav>

          {/* Dark Mode Sun/Moon Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg text-slate-600 dark:text-[#8B949E] hover:text-slate-900 dark:hover:text-[#E6EDF3] hover:bg-slate-100 dark:hover:bg-[#30363D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-8 px-3 border border-slate-200 dark:border-[#30363D] rounded text-xs font-medium text-slate-700 dark:text-[#C9D1D9] hover:bg-slate-50 dark:hover:bg-[#30363D] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div id="mobile-nav-menu" className="md:hidden border-t border-slate-200 dark:border-[#30363D] bg-white dark:bg-[#161B22] px-4 py-3 space-y-2">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left py-1.5 text-sm ${
              currentTab === 'home' || currentTab === 'results'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-[#8B949E]'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => handleNavClick('history')}
            className={`w-full text-left py-1.5 text-sm ${
              currentTab === 'history'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-[#8B949E]'
            }`}
          >
            Scan History
          </button>
        </div>
      )}
    </header>
  );
}

