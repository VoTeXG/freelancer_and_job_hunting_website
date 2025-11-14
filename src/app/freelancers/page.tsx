'use client';

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

interface ApiFreelancer extends Omit<FreelancerProfile, 'createdAt' | 'updatedAt' | 'portfolio' | 'languages' | 'certifications' | 'email'> {
  createdAt: string;
  updatedAt: string;
}

export default function FreelancersPage() {
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
  }, [debouncedSearch, selectedSkills, availabilityFilter, rateRange.min, rateRange.max, sortBy, minExperience, minRating, page]);

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

  return (
    <PageContainer>
      {/* Standardized Section Header */}
      <div className="mb-6 animate-fade-up">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-600)] to-blue-600">Find Freelancers</span>
        </h1>
        <p className="text-[var(--text-muted)] text-lg">Connect with skilled blockchain and Web3 developers</p>
      </div>

      {/* Search and Filters */}
      <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-2 bg-[var(--surface-primary)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-primary)]/70 border-b border-[var(--border-primary)]">
      <Card glass hoverable density="compact" className="mb-6 ring-1 ring-[var(--border-primary)]/70 rounded-2xl animate-fade-up">
        <CardContent density="compact">
          {/* Search Bar */}
          <div className="relative mb-6">
            <LazyIcon name="MagnifyingGlassIcon" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search freelancers by name, title, or skills..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
                  <button
                    key={skill}
                    onClick={() => {
                      if (selectedSkills.includes(skill)) {
                        setSelectedSkills(selectedSkills.filter(s => s !== skill));
                      } else {
                        setSelectedSkills([...selectedSkills, skill]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      selectedSkills.includes(skill)
                        ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300'
                        : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <label htmlFor="availability-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <Select
                id="availability-filter"
                aria-label="Availability"
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'available' | 'busy')}
                uiSize="md"
              >
                <option value="all">All Freelancers</option>
                <option value="available">Available Now</option>
                <option value="busy">Busy</option>
              </Select>
            </div>

            {/* Hourly Rate Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ($)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={rateRange.min}
                  onChange={(e) => setRateRange({...rateRange, min: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={rateRange.max}
                  onChange={(e) => setRateRange({...rateRange, max: parseInt(e.target.value) || 200})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label htmlFor="freelancers-sort-by" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <Select
                id="freelancers-sort-by"
                aria-label="Sort By"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                uiSize="md"
              >
                <option value="rating">Highest Rated</option>
                <option value="rate">Lowest Rate</option>
                <option value="experience">Most Experienced</option>
                <option value="recent">Most Recent</option>
              </Select>
            </div>
          </div>
          {/* Advanced toggle placeholder */}
          <div className="mt-4">
            <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </button>
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Experience (years)</label>
                  <input
                    type="number"
                    value={minExperience}
                    onChange={(e) => { setPage(1); setMinExperience(e.target.value); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g. 2"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={minRating}
                    onChange={(e) => { setPage(1); setMinRating(e.target.value); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g. 4.5"
                  />
                </div>
              </div>
            )}
          </div>
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
