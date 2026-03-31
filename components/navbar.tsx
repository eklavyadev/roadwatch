'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel } from '@headlessui/react';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from './ThemeProvider';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'How it works', href: '/#how' },
  { name: 'Map', href: '/#map' },
  { name: 'API Docs', href: '/api' },
  { name: 'Tech Stack', href: '/tech' },
  { name: 'Impact', href: '/impact' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/80 dark:bg-[#020817]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 shadow-sm dark:shadow-xl dark:shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <nav className="flex items-center justify-between px-6 py-4 lg:px-8">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <a href="/" className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white dark:text-[#020817]">
                  <path d="M7 1L13 4V7C13 10.3 10.3 13 7 13C3.7 13 1 10.3 1 7V4L7 1Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="7" cy="7.5" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">
                Road<span className="text-cyan-500 dark:text-cyan-400">Watch</span>
              </span>
            </a>
          </div>

          {/* Mobile controls */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Theme toggle mobile */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop links */}
          <div className="hidden lg:flex lg:gap-x-8 items-center">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                {item.name}
              </a>
            ))}
          </div>

          {/* Desktop right side */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:items-center lg:gap-3">
            {/* Theme toggle desktop */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors border border-slate-200 dark:border-white/10"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </button>
            <a
              href="/report"
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white dark:text-[#020817] hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
            >
              Report an issue
            </a>
          </div>
        </nav>

        {/* MOBILE MENU */}
        <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
          <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full bg-white dark:bg-[#020817] border-l border-slate-200 dark:border-white/5 p-6 sm:max-w-sm">
            <div className="flex items-center justify-between mb-8">
              <a href="/" className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-cyan-500 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-white dark:text-[#020817]">
                    <path d="M7 1L13 4V7C13 10.3 10.3 13 7 13C3.7 13 1 10.3 1 7V4L7 1Z" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="7" cy="7.5" r="1.5" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Road<span className="text-cyan-500 dark:text-cyan-400">Watch</span>
                </span>
              </a>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4 space-y-2">
                <a
                  href="/report"
                  className="block rounded-lg bg-cyan-500 px-4 py-2.5 text-center text-sm font-semibold text-white dark:text-[#020817] hover:bg-cyan-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Report an issue
                </a>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </header>
    </div>
  );
}
