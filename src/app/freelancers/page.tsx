'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, useCallback } from 'react';
import FreelancerCard from '@/components/FreelancerCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FreelancerProfile } from '@/types';
import PageContainer from '@/components/PageContainer';
import SectionHeader from '@/components/SectionHeader';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { Skeleton } from '@/components/ui/Skeleton';
import { CardSkeleton } from '@/components/ui/SkeletonPresets';
import { EmptyState } from '@/components/ui/states/EmptyState';
import { ErrorState } from '@/components/ui/states/ErrorState';
import { Select } from '@/components/ui/form';
import { useApiErrorHandlers } from '@/lib/queryClient';
import Reveal from '@/components/Reveal';
import { useAuth } from '@/providers/AuthProvider';

interface ApiFreelancer extends Omit<FreelancerProfile, 'createdAt' | 'updatedAt' | 'portfolio' | 'languages' | 'certifications' | 'email'> {
  createdAt: string;
  updatedAt: string;
}

function FreelancersPage() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [rateRange, setRateRange] = useState({ min: 0, max: 200 });
  const [sortBy, setSortBy] = useState<'rating' | 'rate' | 'experience' | 'recent'>('rating');
  const [page, setPage] = useState(1);
  const [freelancers, setFreelancers] = useState<ApiFreelancer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minExperience, setMinExperience] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const pageSize = 12;
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { toastError } = useApiErrorHandlers();

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchTerm), 500); return () => clearTimeout(t); }, [searchTerm]);

  // Fetch freelancers
  useEffect(() => {
    // Wait for auth to initialize before making API calls
    if (token === undefined) return;
    
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', pageSize.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (selectedSkills.length) params.set('skills', selectedSkills.join(','));
    if (availabilityFilter !== 'all') params.set('availability', availabilityFilter); // placeholder for future
    if (rateRange.min) params.set('minRate', rateRange.min.toString());
    if (rateRange.max < 200) params.set('maxRate', rateRange.max.toString());
  if (sortBy !== 'rating') params.set('sort', sortBy);
  if (minExperience) params.set('minExperience', minExperience);
  if (minRating) params.set('minRating', minRating);
    setLoading(true); setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/freelancers?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load freelancers');
        setFreelancers(prev => page === 1 ? data.freelancers : [...prev, ...data.freelancers]);
        setTotalCount(data.pagination.totalCount);
        setHasNextPage(data.pagination.hasNextPage);
      } catch (e:any) {
        if (e.name !== 'AbortError') {
          setError(e.message);
          toastError(e.message || 'Failed to load freelancers', 'Load failed');
        }
      } finally { setLoading(false); }
    })();
    return () => controller.abort();
  }, [token, debouncedSearch, selectedSkills, availabilityFilter, rateRange.min, rateRange.max, sortBy, minExperience, minRating, page, toastError]);

  // Reset pagination and results when filters/search change
  useEffect(() => {
    setPage(1);
    setFreelancers([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, availabilityFilter, sortBy, rateRange.min, rateRange.max, minExperience, minRating, selectedSkills.join(',')]);

  // Infinite scroll
  useEffect(() => {
    if (!hasNextPage || loading) return;
    const el = sentinelRef.current; if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) setPage(p => p + 1); });
    }, { rootMargin: '600px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, loading]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSkills([]);
    setAvailabilityFilter('all');
    setRateRange({ min: 0, max: 200 });
  setSortBy('rating');
  setMinExperience('');
  setMinRating('');
    setPage(1);
    setFreelancers([]);
  };

  const skills = ['React', 'Solidity', 'Web3.js', 'TypeScript', 'Smart Contracts', 'DeFi', 'NFT', 'Node.js', 'Next.js'];

  const displayFreelancers = freelancers.map(f => ({
    ...f,
    createdAt: new Date(f.createdAt),
    updatedAt: new Date(f.updatedAt),
    portfolio: [],
    languages: [],
    certifications: [],
  })) as FreelancerProfile[];

  // Show loading state while auth is initializing
  if (token === undefined) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
            <p className="mt-4 text-sm text-white">Loading...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Standardized Section Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">Find Freelancers</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">Connect with skilled blockchain and Web3 developers</p>
      </div>

      {/* Search and Filters */}
      <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-2 bg-white/85 dark:bg-gray-900/85 backdrop-blur border-b border-gray-200 dark:border-gray-700">
        <Card
          glass
          hoverable
          density="compact"
          className="mb-6 ring-1 ring-gray-200/70 dark:ring-gray-700/70 rounded-2xl animate-fade-up bg-gradient-to-r from-white/90 via-sky-50/90 to-teal-50/90 dark:from-slate-900/90 dark:via-sky-900/40 dark:to-emerald-900/40"
        >
          <CardContent density="compact">
            {/* Top row: search + quick actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="relative flex-1">
                <LazyIcon
                  name="MagnifyingGlassIcon"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-sky-500/70"
                />
                <input
                  type="text"
                  placeholder="Search by name, role, or skills..."
                  className="w-full pl-10 pr-4 py-3 rounded-full border border-sky-200/70 bg-white/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm md:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <LazyIcon name="ArrowPathIcon" className="mr-1.5 h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-sky-600 hover:to-teal-600"
                >
                  <LazyIcon name="AdjustmentsHorizontalIcon" className="mr-1.5 h-3.5 w-3.5" />
                  {showAdvanced ? 'Hide advanced' : 'Advanced'}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Skills Filter */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Skills
                </label>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <button
                        key={`skill-${skill}`}
                        type="button"
                        onClick={() => {
                          if (selected) {
                            setSelectedSkills(selectedSkills.filter((s) => s !== skill));
                          } else {
                            setSelectedSkills([...selectedSkills, skill]);
                          }
                        }}
                        className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition shadow-sm ${
                          selected
                            ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white ring-0 shadow-sky-500/30'
                            : 'bg-white/90 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Availability Filter */}
              <div>
                <label
                  htmlFor="availability-filter"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2"
                >
                  Availability
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-sky-400/60 to-teal-400/60 opacity-70" />
                  <div className="relative rounded-full bg-slate-950/90 p-[1px]">
                    <Select
                      id="availability-filter"
                      aria-label="Availability"
                      value={availabilityFilter}
                      onChange={(e) =>
                        setAvailabilityFilter(e.target.value as 'all' | 'available' | 'busy')
                      }
                      uiSize="md"
                      className="w-full rounded-full bg-slate-950/95 text-xs text-slate-50 border-0 px-3 py-2"
                    >
                      <option value="all">All freelancers</option>
                      <option value="available">Available now</option>
                      <option value="busy">Currently busy</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Hourly Rate Range */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
                  Hourly rate
                </label>
                <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 ring-1 ring-slate-200 shadow-sm">
                  <span className="text-[11px] font-medium text-slate-500">$</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={rateRange.min}
                    onChange={(e) =>
                      setRateRange({ ...rateRange, min: parseInt(e.target.value) || 0 })
                    }
                    className="w-16 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    min={0}
                  />
                  <span className="text-[11px] font-medium text-slate-400">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={rateRange.max}
                    onChange={(e) =>
                      setRateRange({ ...rateRange, max: parseInt(e.target.value) || 200 })
                    }
                    className="w-16 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    min={0}
                  />
                  <span className="ml-auto rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                    USD / hr
                  </span>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label
                  htmlFor="freelancers-sort-by"
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2"
                >
                  Sort by
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-sky-400/60 to-teal-400/60 opacity-70" />
                  <div className="relative rounded-full bg-slate-950/90 p-[1px]">
                    <Select
                      id="freelancers-sort-by"
                      aria-label="Sort By"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      uiSize="md"
                      className="w-full rounded-full bg-slate-950/95 text-xs text-slate-50 border-0 px-3 py-2"
                    >
                      <option value="rating">Highest rated</option>
                      <option value="rate">Lowest rate</option>
                      <option value="experience">Most experienced</option>
                      <option value="recent">Most recent</option>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced filters */}
            {showAdvanced && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200/70 pt-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                    Min experience (years)
                  </label>
                  <input
                    type="number"
                    value={minExperience}
                    onChange={(e) => {
                      setPage(1);
                      setMinExperience(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    placeholder="e.g. 2"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">
                    Min rating
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={minRating}
                    onChange={(e) => {
                      setPage(1);
                      setMinRating(e.target.value);
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
                    placeholder="e.g. 4.5"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="flex justify-between items-center mb-6 animate-fade-up">
        <p className="text-gray-600">
          {loading ? 'Loading freelancers...' : `Showing ${freelancers.length} of ${totalCount} freelancer${totalCount !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowAdvanced(v => !v)}>
            <LazyIcon name="AdjustmentsHorizontalIcon" className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
        </div>
      </div>

      {/* Freelancer Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-up">
        {!loading && displayFreelancers.map((f, idx) => (
          <Reveal key={f.id} delay={Math.min(400, idx * 60)}>
            <FreelancerCard freelancer={f} />
          </Reveal>
        ))}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 col-span-full animate-fade-up">
            {Array.from({ length: 6 }).map((_, i) => (
              <Reveal key={i} delay={i * 60}>
                <CardSkeleton />
              </Reveal>
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="col-span-full">
            <ErrorState message={error} onRetry={() => { setPage(1); setFreelancers([]); }} />
          </div>
        )}
      </div>

      {/* Sentinel */}
      <div ref={sentinelRef} className="h-10" />
      {!loading && !hasNextPage && freelancers.length > 0 && (
        <div className="text-center text-xs text-gray-500 mt-4">No more freelancers</div>
      )}

      {/* No Results */}
  {!loading && freelancers.length === 0 && (
        <EmptyState
          icon="UserGroupIcon"
          title="No freelancers found"
          description="Try adjusting your search criteria or browse all freelancers"
          actionLabel="Clear Filters"
          onAction={clearFilters}
        />
      )}
  {/* hidden sentinel ensures layout reserved */}
  <div style={{ height: 1 }} />
    </PageContainer>
  );
}

export default dynamic(() => Promise.resolve(FreelancersPage), { ssr: false });
