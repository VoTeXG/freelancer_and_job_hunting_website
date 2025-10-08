'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import JobListing from '@/components/JobListing';
const JobApplicationModal = dynamicImport(
  () => import('@/components/JobApplicationModal'),
  { ssr: false, loading: () => <div className="p-4 text-gray-500">Loading…</div> }
);
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Job } from '@/types';
import PageContainer from '@/components/PageContainer';
import SectionHeader from '@/components/SectionHeader';
import { LazyIcon } from '@/components/ui/LazyIcon';

// Remote-loaded jobs
interface ApiJob {
  id: string;
  title: string;
  description: string;
  budgetAmount: number;
  budgetType: 'FIXED' | 'HOURLY';
  currency: string;
  duration: string;
  skills: string[];
  status: string;
  createdAt: string;
  deadline?: string | null;
  client: { id: string; username: string; profile?: { rating: number | null; completedJobs: number | null } | null };
  _count: { applications: number };
}

function JobsPageInner() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'fixed' | 'hourly'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'budget' | 'deadline'>('recent');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [modalJob, setModalJob] = useState<ApiJob | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const { user, loading: authLoading, token } = useAuth();
  const { addNotification } = useNotifications();
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minBudget, setMinBudget] = useState<string>('');
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialized = useRef(false);

  const pageSize = 10;

  const skills = ['React', 'Solidity', 'Web3.js', 'TypeScript', 'Smart Contracts', 'DeFi', 'NFT', 'Node.js'];

  // Initialize state from URL once
  useEffect(() => {
    if (initialized.current) return;
  const sp = searchParams;
  if (!sp) return;
  const q = sp.get('search'); if (q) setSearchTerm(q);
  const bf = sp.get('budgetType'); if (bf && (bf === 'fixed' || bf === 'hourly')) setBudgetFilter(bf as any);
  const sk = sp.get('skills'); if (sk) setSelectedSkills(sk.split(','));
  const s = sp.get('sort'); if (s && ['recent','budget','deadline'].includes(s)) setSortBy(s as any);
  const p = sp.get('page'); if (p) setPage(parseInt(p) || 1);
  const minB = sp.get('minBudget'); if (minB) setMinBudget(minB);
  const maxB = sp.get('maxBudget'); if (maxB) setMaxBudget(maxB);
    initialized.current = true;
  }, [searchParams]);

  // Debounce search to reduce calls
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Sync state to URL & fetch
  useEffect(() => {
    if (!initialized.current) return; // wait for initial hydration
    const controller = new AbortController();
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', pageSize.toString());
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (budgetFilter !== 'all') params.set('budgetType', budgetFilter);
    if (selectedSkills.length) params.set('skills', selectedSkills.join(','));
    if (sortBy !== 'recent') params.set('sort', sortBy);
    if (minBudget) params.set('minBudget', minBudget);
    if (maxBudget) params.set('maxBudget', maxBudget);
    // Push shallow route update (no scroll)
    router.replace(`/jobs?${params.toString()}`);
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load jobs');
  // If page === 1 replace, else append for infinite scroll
  setJobs(prev => page === 1 ? data.jobs : [...prev, ...data.jobs]);
        setTotalCount(data.pagination.totalCount);
        setHasNextPage(data.pagination.hasNextPage);
      } catch (e:any) {
        if (e.name !== 'AbortError') setError(e.message);
      } finally { setLoading(false); }
    };
    load();
    return () => controller.abort();
  }, [debouncedSearch, selectedSkills, budgetFilter, sortBy, page, minBudget, maxBudget, router]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSkills([]);
    setBudgetFilter('all');
    setSortBy('recent');
    setPage(1);
  setMinBudget('');
  setMaxBudget('');
    setJobs([]);
  };

  // Intersection Observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage || loading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setPage(p => p + 1);
        }
      });
    }, { rootMargin: '600px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, loading]);

  const handleApply = useCallback(async (jobId: string, applicationData: {coverLetter: string; proposedRate?: number; estimatedDuration: string; portfolio?: string}) => {
    if (!user || !token) {
      addNotification({
        type: 'job_application',
        title: 'Login Required',
        message: 'Please log in to apply for jobs.',
        data: {},
        timestamp: new Date().toISOString()
      });
      return;
    }
    setApplyingJobId(jobId);
    // Optimistic applicant count + applied state
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _count: { applications: j._count.applications + 1 } } : j));
    setAppliedJobIds(prev => new Set(prev).add(jobId));
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          coverLetter: applicationData.coverLetter,
          proposedRate: applicationData.proposedRate,
          estimatedDuration: applicationData.estimatedDuration,
          portfolio: applicationData.portfolio
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply');
      }
      addNotification({
        type: 'job_application',
        title: 'Application Submitted',
        message: 'Your application was submitted successfully.',
        data: { jobId },
        timestamp: new Date().toISOString()
      });
    } catch (e:any) {
      // Rollback optimistic update
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _count: { applications: Math.max(0, j._count.applications - 1) } } : j));
      setAppliedJobIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
      addNotification({
        type: 'job_application',
        title: 'Application Failed',
        message: e.message || 'Could not submit application',
        data: { jobId },
        timestamp: new Date().toISOString()
      });
    } finally {
      setApplyingJobId(null);
      setModalJob(null);
    }
  }, [user, token, addNotification]);

  const handleModalSubmit = async (formData: any) => {
    if (!modalJob) return;
    await handleApply(modalJob.id, formData);
  };

  return (
    <PageContainer>
      {/* Header */}
      <SectionHeader
        title="Find Jobs"
        subtitle="Discover blockchain and Web3 projects that match your skills"
      />

      {/* Search and Filters */}
  <Card className="mb-8 border-0 shadow-sm ring-1 ring-gray-200/70 rounded-2xl bg-white/90 backdrop-blur">
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="relative mb-6">
            <LazyIcon name="MagnifyingGlassIcon" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs by title or description..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Budget Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Type
              </label>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value as 'all' | 'fixed' | 'hourly')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Budget Types</option>
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'budget' | 'deadline')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="recent">Most Recent</option>
                <option value="budget">Highest Budget</option>
                <option value="deadline">Nearest Deadline</option>
              </select>
            </div>
          </div>
          {/* Advanced filters toggle */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
            </button>
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Budget (USD)</label>
                  <input
                    type="number"
                    value={minBudget}
                    onChange={(e) => { setPage(1); setMinBudget(e.target.value); }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g. 500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Budget (USD)</label>
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => { setPage(1); setMaxBudget(e.target.value); }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g. 10000"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          {loading ? 'Loading jobs...' : `Showing ${jobs.length} of ${totalCount} job${totalCount !== 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-gray-200 hover:border-purple-300 hover:text-purple-700" onClick={() => setShowAdvanced(v => !v)}>
            <LazyIcon name="AdjustmentsHorizontalIcon" className="h-4 w-4 mr-2" />
            {showAdvanced ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
          {(minBudget || maxBudget) && (
            <span className="text-xs text-gray-500">Budget: {minBudget || '0'} - {maxBudget || '∞'}</span>
          )}
        </div>
      </div>

      {/* Job Listings */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
  {!loading && jobs.map(job => (
          <JobListing 
            key={job.id} 
            job={{
            id: job.id,
            title: job.title,
            description: job.description,
            // Map API fields to component expected shape fallback
            requirements: [],
            skills: job.skills || [],
            budget: { 
              type: (job.budgetType.toLowerCase() === 'fixed' ? 'fixed' : 'hourly') as 'fixed' | 'hourly', 
              amount: job.budgetAmount, 
              currency: (['ETH','USDC','USDT'].includes(job.currency) ? job.currency : 'USDC') as 'ETH' | 'USDC' | 'USDT' 
            },
            duration: job.duration,
            clientId: job.client.id,
            client: {
              id: job.client.id,
              walletAddress: '',
              username: job.client.username,
              isFreelancer: false,
              isClient: true,
              createdAt: new Date(job.createdAt),
              updatedAt: new Date(job.createdAt),
              reputation: job.client.profile?.rating || 0,
              completedJobs: job.client.profile?.completedJobs || 0,
              companyName: '',
              totalSpent: 0,
              activeJobs: 0
            },
            status: 'open',
            // Represent applications count from aggregation via placeholder objects for display only
            applicants: Array.from({ length: job._count.applications }).map((_,i) => ({ id: `${job.id}-app-${i}` })) as any,
            createdAt: new Date(job.createdAt),
            deadline: job.deadline ? new Date(job.deadline) : undefined,
            tags: []
            }}
            onApply={(id) => setModalJob(jobs.find(j => j.id === id) || null)}
            onOpenApplyModal={(j) => setModalJob(j as any)}
            showApply={!!user}
            applying={applyingJobId === job.id}
            applied={appliedJobIds.has(job.id)}
          />
        ))}
        {loading && (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
            ))}
          </div>
        )}
        {error && !loading && (
          <div className="text-center py-8 text-red-600 text-sm">{error}</div>
        )}
      </div>

      {/* Load More */}
      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-10" />
      {!loading && !hasNextPage && jobs.length > 0 && (
        <div className="text-center text-xs text-gray-500 mt-4">No more jobs</div>
      )}

      {/* Application Modal */}
      <JobApplicationModal
        isOpen={!!modalJob}
        onClose={() => setModalJob(null)}
  onSubmit={async (data: any) => handleModalSubmit(data)}
        isSubmitting={!!applyingJobId}
        job={modalJob && {
          title: modalJob.title,
          budget: { amount: modalJob.budgetAmount, currency: modalJob.currency, type: modalJob.budgetType.toLowerCase() },
          duration: modalJob.duration,
        }}
      />

      {/* No Results */}
  {!loading && jobs.length === 0 && (
        <div className="text-center py-12">
          <LazyIcon name="FunnelIcon" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500">
            Try adjusting your search criteria or browse all jobs
          </p>
          <Button 
            className="mt-4" 
    onClick={clearFilters}
          >
            Clear Filters
          </Button>
        </div>
      )}
  </PageContainer>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading jobs…</div>}>
      <JobsPageInner />
    </Suspense>
  );
}
