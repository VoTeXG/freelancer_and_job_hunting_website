'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NotificationCenter from './NotificationCenter';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/providers/AuthProvider';
import { isAdminWallet } from '@/lib/clientAdmin';

interface NavItem {
  name: string;
  href: string;
  description: string;
  icon: string;
  iconVariant?: 'outline' | 'solid';
}

interface NavGroup {
  key: string;
  label: string;
  summary: string;
  icon: string;
  iconVariant?: 'outline' | 'solid';
  items: NavItem[];
}

const freelancerNavItems: NavItem[] = [
  {
    name: 'Browse Jobs',
    href: '/jobs',
    icon: 'MagnifyingGlassIcon',
    description: 'Explore on-chain gigs and submit proposals in minutes.',
  },
  {
    name: 'Freelancer Dashboard',
    href: '/dashboard/enhanced',
    icon: 'ChartBarIcon',
    description: 'Track pipelines, escrows, certificates, and earnings.',
  },
  {
    name: 'Profile & Credentials',
    href: '/profile',
    icon: 'IdentificationIcon',
    description: 'Polish your reputation, skills, and NFT credentials.',
  },
];

const clientNavItems: NavItem[] = [
  {
    name: 'Post a Job',
    href: '/jobs/create-enhanced',
    icon: 'RocketLaunchIcon',
    iconVariant: 'solid',
    description: 'Spin up a smart-contract-backed engagement in one flow.',
  },
  {
    name: 'Find Freelancers',
    href: '/freelancers',
    icon: 'UserGroupIcon',
    description: 'Browse verified talent with on-chain reputation scores.',
  },
  {
    name: 'Client Dashboard',
    href: '/dashboard',
    icon: 'AdjustmentsHorizontalIcon',
    description: 'Review proposals, manage offers, and approve milestones.',
  },
  {
    name: 'Advanced Tools',
    href: '/advanced',
    icon: 'BoltIcon',
    description: 'Access automation, escrow retries, and analytics utilities.',
  },
];

const adminNavItems: NavItem[] = [
  {
    name: 'Metrics & Alerts',
    href: '/admin/metrics',
    icon: 'ShieldCheckIcon',
    iconVariant: 'solid',
    description: 'Monitor platform KPIs, queues, and incident signals.',
  },
];

// Hover timing (ms) – tunable via env for quick UX iterations
// Defaults aligned with request: open 50ms, close 100ms
const HOVER_OPEN_DELAY = Number(process.env.NEXT_PUBLIC_NAV_OPEN_DELAY_MS || 50);
const HOVER_CLOSE_DELAY = Number(process.env.NEXT_PUBLIC_NAV_CLOSE_DELAY_MS || 100);

export default function Navigation() {
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  // Avoid hydration mismatches by rendering auth-dependent UI only after mount
  const [mounted, setMounted] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropdownCloseTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const hoverOpenTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-user-menu-trigger]') && !target.closest('[data-user-menu-dropdown]')) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!openDropdown) return;
    const onClick = (event: MouseEvent) => {
      const ref = dropdownRefs.current[openDropdown];
      if (ref && !ref.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [openDropdown]);

  const walletAddress = (user as any)?.walletAddress as string | undefined;
  // Only determine admin status on the client after mount to keep SSR and initial client render identical
  const isAdminUser = mounted && isAdminWallet(walletAddress);

  const navGroups = useMemo<NavGroup[]>(() => {
    const groups: NavGroup[] = [
      {
        key: 'freelancer',
        label: 'Freelancer Hub',
        summary: 'Resources to win work and deliver with confidence.',
        icon: 'UserGroupIcon',
        iconVariant: 'solid',
        items: freelancerNavItems,
      },
      {
        key: 'client',
        label: 'Client Suite',
        summary: 'Launch, fund, and manage your blockchain workforce.',
        icon: 'BriefcaseIcon',
        iconVariant: 'solid',
        items: clientNavItems,
      },
    ];
    // Add admin group only after mount to avoid SSR/CSR differences
    if (isAdminUser) {
      groups.push({
        key: 'admin',
        label: 'Admin Ops',
        summary: 'Internal tooling for platform oversight and response.',
        icon: 'ShieldCheckIcon',
        iconVariant: 'solid',
        items: adminNavItems,
      });
    }
    return groups;
  }, [isAdminUser]);

  const isActive = useMemo(() => {
    return (href: string) => {
      if (!pathname) return false;
      if (href === '/') return pathname === '/';
      return pathname === href || pathname.startsWith(`${href}/`);
    };
  }, [pathname]);

  const identity = useMemo(() => {
    if (!user) {
      return { avatar: undefined, initials: 'U', email: undefined };
    }
    const u = user as any;
    const profile = u?.profile;
    const avatar = profile?.avatar as string | undefined;
    const firstName = profile?.firstName as string | undefined;
    const lastName = profile?.lastName as string | undefined;
    const email = u?.email as string | undefined;
    const initials = ((firstName?.[0] || '') + (lastName?.[0] || (!firstName && email ? email[0] : ''))).toUpperCase() || 'U';
    return { avatar, initials, email };
  }, [user]);

  return (
    <nav className="sticky top-0 z-50" suppressHydrationWarning>
      <div className="relative border-b border-[color:var(--border-primary)]/40 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/80 to-transparent"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_55%)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-3 sm:px-5 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3 -ml-6 sm:-ml-12 lg:-ml-16 xl:-ml-20">
              <Link
                href="/"
                className="group flex items-center space-x-2 rounded-xl border border-white/60 bg-white/90 px-2 py-1 shadow-[0_8px_16px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(99,102,241,0.2)]"
              >
                <div className="relative h-8 w-8">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-500 blur-sm opacity-80 transition group-hover:opacity-100" />
                  <div className="relative z-10 flex h-full w-full items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white backdrop-blur">
                    CB
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-base font-semibold text-gray-900 transition group-hover:text-purple-700">CareerBridge</span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-gray-500 transition group-hover:text-gray-600">Bridge to your success</span>
                </div>
              </Link>
            </div>

            <div className="hidden items-center gap-2 lg:flex xl:gap-4">
              {navGroups.map((group) => {
                const groupActive = group.items.some((item) => isActive(item.href));
                const isOpen = openDropdown === group.key;
                const buttonActive = groupActive || isOpen;
                return (
                  <div
                    key={group.key}
                    ref={(node) => {
                      dropdownRefs.current[group.key] = node;
                    }}
                    className="relative"
                    onMouseEnter={() => {
                      const closeTimer = dropdownCloseTimers.current[group.key];
                      if (closeTimer) {
                        clearTimeout(closeTimer);
                        dropdownCloseTimers.current[group.key] = null;
                      }
                      const openTimer = hoverOpenTimers.current[group.key];
                      if (openTimer) {
                        clearTimeout(openTimer);
                      }
                      hoverOpenTimers.current[group.key] = setTimeout(() => {
                        setOpenDropdown(group.key);
                        hoverOpenTimers.current[group.key] = null;
                      }, HOVER_OPEN_DELAY);
                    }}
                    onMouseLeave={() => {
                      const openTimer = hoverOpenTimers.current[group.key];
                      if (openTimer) {
                        clearTimeout(openTimer);
                        hoverOpenTimers.current[group.key] = null;
                      }
                      dropdownCloseTimers.current[group.key] = setTimeout(() => {
                        setOpenDropdown((prev) => (prev === group.key ? null : prev));
                      }, HOVER_CLOSE_DELAY);
                    }}
                    onBlur={(event) => {
                      const nextFocus = event.relatedTarget as Node | null;
                      if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
                        setOpenDropdown((prev) => (prev === group.key ? null : prev));
                      }
                    }}
                  >
                    <button
                      onClick={() => setOpenDropdown((prev) => (prev === group.key ? null : group.key))}
                      onFocus={() => setOpenDropdown(group.key)}
                      className={`group flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium backdrop-blur transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-brand)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
                        buttonActive
                          ? 'border-purple-300 bg-white/70 text-purple-700 shadow-[0_10px_25px_rgba(99,102,241,0.12)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:bg-white/60 hover:text-purple-700 hover:shadow-[0_8px_20px_rgba(99,102,241,0.08)]'
                      }`}
                      aria-haspopup="menu"
                      aria-expanded={isOpen}
                    >
                      <span
                        className={`rounded-full bg-white/70 p-1.5 shadow-sm transition group-hover:scale-110 ${
                          buttonActive ? 'text-purple-600' : 'text-purple-500/70'
                        }`}
                      >
                        <LazyIcon name={group.icon} variant={group.iconVariant} className="h-4 w-4" />
                      </span>
                      <span className="transition group-hover:translate-x-[1px]">{group.label}</span>
                      <LazyIcon
                        name="ChevronDownIcon"
                        className={`h-4 w-4 transition ${isOpen ? 'rotate-180 text-purple-500' : 'text-purple-400/70'}`}
                      />
                    </button>
                    {isOpen && (
                      <div
                        className="absolute left-0 top-full mt-3 w-[600px] rounded-2xl border border-gray-200/70 bg-white/95 p-5 shadow-[0_28px_48px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur"
                        role="menu"
                      >
                        <div className="px-1 pb-4 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{group.summary}</div>
                        <div className="grid grid-cols-1 gap-3">
                          {group.items.map((item) => (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setOpenDropdown(null)}
                              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 transition hover:-translate-y-0.5 hover:border-purple-200 hover:bg-purple-50/60 ${
                                isActive(item.href) ? 'border-blue-200 bg-blue-50/60' : 'border-transparent bg-white/60'
                              }`}
                              role="menuitem"
                            >
                              <span className="rounded-lg bg-purple-100/70 p-2 text-purple-600">
                                <LazyIcon name={item.icon} variant={item.iconVariant} className="h-4 w-4" />
                              </span>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                <span className="text-xs text-gray-500">{item.description}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationCenter />
              {/* Defer wallet button until after mount to prevent hydration mismatch */}
              {mounted ? (
                <div className="hidden sm:block">
                  <ConnectButton chainStatus="icon" showBalance={false} />
                </div>
              ) : (
                <div className="hidden sm:block h-10 w-[120px] rounded-md bg-white/60 ring-1 ring-black/5" aria-hidden />
              )}
              <div className="hidden md:block">
                <Button
                  asChild
                  variant="gradient"
                  size="sm"
                  className="shadow-[0_18px_35px_rgba(99,102,241,0.25)] transition hover:-translate-y-0.5"
                >
                  <Link href="/jobs/create-enhanced" className="inline-flex items-center gap-2">
                    <LazyIcon name="RocketLaunchIcon" className="h-4 w-4" />
                    Post a Job
                  </Link>
                </Button>
              </div>

              {mounted && !loading && user && (
                <div className="relative md:hidden">
                  <button
                    data-user-menu-trigger
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    {identity.avatar ? (
                      <span className="relative inline-flex h-10 w-10 overflow-hidden rounded-full bg-purple-100">
                        <Image src={identity.avatar} alt="avatar" fill sizes="40px" className="object-cover" />
                      </span>
                    ) : (
                      identity.initials
                    )}
                  </button>
                  {userMenuOpen && (
                    <div
                      data-user-menu-dropdown
                      role="menu"
                      aria-label="User menu"
                      className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-[fadeIn_.12s_ease-out]"
                    >
                      <div className="px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
                        <div className="truncate font-medium text-gray-800">{identity.email}</div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          role="menuitem"
                          className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          href="/dashboard/enhanced"
                          role="menuitem"
                          className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          role="menuitem"
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mounted && !loading && !user && (
                <div className="hidden items-center gap-3 md:flex">
                  <Link
                    href="/login"
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md border border-purple-200 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                  >
                    Register
                  </Link>
                </div>
              )}

              <div className="sm:hidden">
                {mounted ? (
                  <ConnectButton chainStatus="none" showBalance={false} />
                ) : (
                  <div className="h-10 w-[140px] rounded-md bg-white/60 ring-1 ring-black/5" aria-hidden />
                )}
              </div>

              {mounted && !loading && user && (
                <div className="relative hidden items-center gap-3 md:flex">
                  <button
                    data-user-menu-trigger
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className={`flex items-center gap-2 rounded-full border pl-2 pr-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-purple-400 ${
                      userMenuOpen
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-transparent text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={userMenuOpen}
                  >
                    {identity.avatar ? (
                      <span className="relative inline-flex h-8 w-8 overflow-hidden rounded-full bg-purple-100 ring-2 ring-white">
                        <Image src={identity.avatar} alt="avatar" fill sizes="32px" className="object-cover" />
                      </span>
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-semibold text-white shadow-inner">
                        {identity.initials}
                      </span>
                    )}
                    <span className="hidden max-w-[140px] truncate lg:inline">{identity.email ?? 'Account'}</span>
                    <LazyIcon
                      name="ChevronDownIcon"
                      variant="solid"
                      className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {userMenuOpen && (
                    <div
                      data-user-menu-dropdown
                      role="menu"
                      aria-label="User menu"
                      className="absolute right-0 top-full mt-2 w-60 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-[fadeIn_.12s_ease-out]"
                    >
                      <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-3 text-xs text-gray-500">
                        {identity.avatar ? (
                          <span className="relative inline-flex h-9 w-9 overflow-hidden rounded-full bg-purple-100 ring-2 ring-white">
                            <Image src={identity.avatar} alt="avatar" fill sizes="36px" className="object-cover" />
                          </span>
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-semibold text-white shadow-inner">
                            {identity.initials}
                          </span>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <span className="text-[11px] uppercase tracking-wide text-gray-400">Signed in as</span>
                          <span className="truncate text-sm font-medium text-gray-800">{identity.email}</span>
                        </div>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          role="menuitem"
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LazyIcon name="UserCircleIcon" variant="solid" className="h-4 w-4 text-purple-600" />
                          Profile
                        </Link>
                        <Link
                          href="/dashboard/enhanced"
                          role="menuitem"
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LazyIcon name="ChartBarIcon" variant="solid" className="h-4 w-4 text-purple-600" />
                          Dashboard
                        </Link>
                      </div>
                      <div className="border-t border-gray-100 pt-1">
                        <button
                          role="menuitem"
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="md:hidden">
                <button
                  onClick={() => setIsMenuOpen((open) => !open)}
                  className="rounded-md p-2 text-gray-700 transition hover:scale-105 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  aria-label="Toggle navigation menu"
                  aria-controls="mobile-menu"
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? <LazyIcon name="XMarkIcon" className="h-6 w-6" /> : <LazyIcon name="Bars3Icon" className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="space-y-5 border-t border-gray-200 bg-white/95 px-3 pt-4 pb-6 shadow-[0_16px_30px_rgba(15,23,42,0.12)] backdrop-blur">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Freelancer</p>
              <div className="space-y-1">
                {freelancerNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <LazyIcon name={item.icon} variant={item.iconVariant} className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Clients</p>
              <div className="space-y-1">
                {clientNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-purple-50 text-purple-700'
                        : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <LazyIcon name={item.icon} variant={item.iconVariant} className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {isAdminUser && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Admin</p>
                <div className="space-y-1">
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive(item.href)
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                    >
                      <LazyIcon name={item.icon} variant={item.iconVariant} className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {!loading && !user && (
              <div className="flex gap-3 px-3 py-4">
                <Link
                  href="/login"
                  className="flex-1 rounded-md bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="flex-1 rounded-md border border-purple-200 px-4 py-2 text-center text-sm font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}

            {!loading && user && (
              <div className="flex gap-3 px-3 py-4">
                <button
                  onClick={() => {
                    logout();
                    setIsMenuOpen(false);
                  }}
                  className="flex-1 rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
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
