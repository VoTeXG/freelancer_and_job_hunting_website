'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProvider';
import { usePathname } from 'next/navigation';
import { LazyIcon } from '@/components/ui/LazyIcon';
import NotificationCenter from './NotificationCenter';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close user menu on outside click (desktop + mobile unified)
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu-trigger]') && !target.closest('[data-user-menu-dropdown]')) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  const navigation = [
    { name: 'Find Jobs', href: '/jobs', icon: (p:any) => <LazyIcon name="BriefcaseIcon" variant="solid" {...p} /> },
    { name: 'Find Freelancers', href: '/freelancers', icon: (p:any) => <LazyIcon name="UserGroupIcon" variant="solid" {...p} /> },
    { name: 'Post Job', href: '/jobs/create-enhanced', icon: (p:any) => <LazyIcon name="PlusIcon" variant="solid" {...p} /> },
    { name: 'Dashboard', href: '/dashboard/enhanced', icon: (p:any) => <LazyIcon name="ChartBarIcon" variant="solid" {...p} /> },
    { name: 'Advanced Features', href: '/advanced', icon: (p:any) => <LazyIcon name="ChartBarIcon" variant="solid" {...p} /> },
    { name: 'IPFS Manager', href: '/ipfs-manager', icon: (p:any) => <LazyIcon name="ChartBarIcon" variant="solid" {...p} /> },
    { name: 'Blockchain Test', href: '/blockchain-test', icon: (p:any) => <LazyIcon name="ChartBarIcon" variant="solid" {...p} /> },
  ];

  const isActive = useMemo(() => {
    return (href: string) => {
      if (!pathname) return false;
      // exact for root pages, startsWith for sections
      if (href === '/') return pathname === '/';
      return pathname === href || pathname.startsWith(`${href}/`);
    };
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200 shadow-sm">
  {/* Full-width container with no left padding so logo is flush with viewport */}
  <div className="w-full pr-4 sm:pr-6 lg:pr-8">
        <div className="flex justify-between h-16">
          {/* Logo and brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BF</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                BlockFreelancer
              </span>
            </Link>
          </div>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-transparent border border-transparent ${
                    isActive(item.href)
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Auth actions and mobile menu button */}
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            {/* Global wallet connect */}
            <div className="hidden sm:block">
              <ConnectButton chainStatus="icon" showBalance={false} />
            </div>
            {/* Mobile avatar trigger (hidden on desktop) */}
            {!loading && user && (
              <div className="relative md:hidden">
                <button
                  data-user-menu-trigger
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-purple-400"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  {(() => {
                    const u = user as any;
                    const profile = u?.profile;
                    const avatar = profile?.avatar as string | undefined;
                    const firstName = profile?.firstName as string | undefined;
                    const lastName = profile?.lastName as string | undefined;
                    const email = u?.email as string | undefined;
                    const initials = ((firstName?.[0] || '') + (lastName?.[0] || (!firstName && email ? email[0] : ''))).toUpperCase() || 'U';
                    if (avatar) {
                      return (
                        <span className="relative inline-flex h-10 w-10 overflow-hidden rounded-full bg-purple-100">
                          <Image src={avatar} alt="avatar" fill sizes="40px" className="object-cover" />
                        </span>
                      );
                    }
                    return initials;
                  })()}
                </button>
                {userMenuOpen && (
                  <div
                    data-user-menu-dropdown
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-1 z-50 origin-top-right animate-[fadeIn_.12s_ease-out]"
                  >
                    <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
                      <div className="font-medium text-gray-800 truncate">{(user as any)?.email}</div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/dashboard/enhanced"
                        role="menuitem"
                        className="block px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-gray-100">
                      <button
                        role="menuitem"
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!loading && !user && (
              <div className="hidden md:flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                >
                  Register
                </Link>
              </div>
            )}
            {/* Mobile connect button (when no user shown) */}
            <div className="sm:hidden">
              <ConnectButton chainStatus="none" showBalance={false} />
            </div>
            {!loading && user && (
              <div className="hidden md:flex items-center gap-3 relative">
                {/** Avatar + menu trigger */}
                {(() => {
                  const u = user as any; // shape: { id, email, username, profile? }
                  const profile = u?.profile;
                  const avatar = profile?.avatar as string | undefined;
                  const firstName = profile?.firstName as string | undefined;
                  const lastName = profile?.lastName as string | undefined;
                  const email = u?.email as string | undefined;
                  const initials = (firstName?.[0] || '') + (lastName?.[0] || (!firstName && email ? email[0] : ''));
                  return null; // placeholder; actual button below uses same data
                })()}
                <button
                  data-user-menu-trigger
                  onClick={() => setUserMenuOpen(o => !o)}
                  className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-purple-400 ${userMenuOpen ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-transparent text-gray-700 hover:bg-purple-50 hover:text-purple-700'}`}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  {(() => {
                    const u = user as any;
                    const profile = u?.profile;
                    const avatar = profile?.avatar as string | undefined;
                    const firstName = profile?.firstName as string | undefined;
                    const lastName = profile?.lastName as string | undefined;
                    const email = u?.email as string | undefined;
                    const initials = ((firstName?.[0] || '') + (lastName?.[0] || (!firstName && email ? email[0] : ''))).toUpperCase() || 'U';
                    if (avatar) {
                      return (
                        <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full bg-purple-100 ring-2 ring-white">
                          <Image src={avatar} alt="avatar" fill sizes="32px" className="object-cover" />
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-semibold shadow-inner">
                        {initials}
                      </span>
                    );
                  })()}
                  <span className="truncate max-w-[140px] hidden lg:inline">{(user as any)?.email || 'Account'}</span>
                  <LazyIcon name="ChevronDownIcon" variant="solid" className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {userMenuOpen && (
                  <div
                    data-user-menu-dropdown
                    role="menu"
                    aria-label="User menu"
                    className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 p-1 z-50 origin-top-right animate-[fadeIn_.12s_ease-out]"
                  >
                    <div className="px-3 py-3 border-b border-gray-100 text-xs text-gray-500 flex items-center gap-3">
                      {(() => {
                        const u = user as any;
                        const profile = u?.profile;
                        const avatar = profile?.avatar as string | undefined;
                        const firstName = profile?.firstName as string | undefined;
                        const lastName = profile?.lastName as string | undefined;
                        const email = u?.email as string | undefined;
                        const initials = ((firstName?.[0] || '') + (lastName?.[0] || (!firstName && email ? email[0] : ''))).toUpperCase() || 'U';
                        if (avatar) {
                          return (
                            <span className="relative inline-flex h-9 w-9 overflow-hidden rounded-full bg-purple-100 ring-2 ring-white">
                              <Image src={avatar} alt="avatar" fill sizes="36px" className="object-cover" />
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-sm font-semibold shadow-inner">
                            {initials}
                          </span>
                        );
                      })()}
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] uppercase tracking-wide text-gray-400">Signed in as</span>
                        <span className="font-medium text-gray-800 text-sm truncate">{(user as any)?.email}</span>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LazyIcon name="UserCircleIcon" variant="solid" className="h-4 w-4 text-purple-600" /> Profile
                      </Link>
                      <Link
                        href="/dashboard/enhanced"
                        role="menuitem"
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                        onClick={() => setUserMenuOpen(false)}
                       >
                        <LazyIcon name="ChartBarIcon" variant="solid" className="h-4 w-4 text-purple-600" /> Dashboard
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-gray-100">
                      <button
                        role="menuitem"
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-gray-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400"
                aria-label="Toggle navigation menu"
                aria-controls="mobile-menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? (
                  <LazyIcon name="XMarkIcon" className="h-6 w-6" />
                ) : (
                  <LazyIcon name="Bars3Icon" className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
            {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white/90 backdrop-blur border-t border-gray-200 shadow-sm">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            {!loading && !user && (
              <div className="px-3 py-4 flex gap-3">
                <Link
                  href="/login"
                  className="flex-1 text-center px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="flex-1 text-center px-4 py-2 text-sm font-medium rounded-md border border-purple-200 text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
            {!loading && user && (
              <div className="px-3 py-4 flex gap-3">
                <button
                  onClick={() => { logout(); setIsMenuOpen(false);} }
                  className="flex-1 text-center px-4 py-2 text-sm font-medium rounded-md border border-red-200 text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
