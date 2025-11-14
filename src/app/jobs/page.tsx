'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import dynamicImport from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useApplyToJob } from '@/hooks/useApplyToJob';
import JobListing from '@/components/JobListing';
const JobApplicationModal = dynamicImport(
  () => import('@/components/JobApplicationModal'),
  { ssr: false, loading: () => <div className="p-4 text-gray-500">Loading…</div> }
);
import Reveal from '@/components/Reveal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { Select } from '@/components/ui/form';
import { CardSkeleton } from '@/components/ui/SkeletonPresets';
import { EmptyState } from '@/components/ui/states/EmptyState';
import { ErrorState } from '@/components/ui/states/ErrorState';
import PageContainer from '@/components/PageContainer';

// Grid style enhancement: display jobs in responsive multi-column card grid while preserving search section.

function JobsPageInner() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'fixed' | 'hourly'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'budget' | 'deadline'>('recent');
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [modalJob, setModalJob] = useState<any | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const { user, loading: authLoading, token } = useAuth();
  const { applyToJob } = useApplyToJob({
    onOptimistic: (jobId) => {
      setApplyingJobId(jobId);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _count: { applications: j._count.applications + 1 } } : j));
      setAppliedJobIds(prev => new Set(prev).add(jobId));
    },
    onRollback: (jobId) => {
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, _count: { applications: Math.max(0, j._count.applications - 1) } } : j));
      setAppliedJobIds(prev => { const n = new Set(prev); n.delete(jobId); return n; });
    },
    onSuccess: () => { setModalJob(null); },
  });
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

  // Initialize from URL
  useEffect(() => {
    if (initialized.current) return;
    const sp = searchParams; if (!sp) return;
    const q = sp.get('search'); if (q) setSearchTerm(q);
    const bf = sp.get('budgetType'); if (bf && (bf === 'fixed' || bf === 'hourly')) setBudgetFilter(bf as any);
    const sk = sp.get('skills'); if (sk) setSelectedSkills(sk.split(','));
    const s = sp.get('sort'); if (s && ['recent','budget','deadline'].includes(s)) setSortBy(s as any);
    const p = sp.get('page'); if (p) setPage(parseInt(p) || 1);
    const minB = sp.get('minBudget'); if (minB) setMinBudget(minB);
    const maxB = sp.get('maxBudget'); if (maxB) setMaxBudget(maxB);
    initialized.current = true;
  }, [searchParams]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch jobs
  useEffect(() => {
    if (!initialized.current) return;
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
    router.replace(`/jobs?${params.toString()}`);
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/jobs?${params.toString()}`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load jobs');
        setJobs(prev => page === 1 ? data.jobs : [...prev, ...data.jobs]);
        setTotalCount(data.pagination.totalCount);
        setHasNextPage(data.pagination.hasNextPage);
      } catch (e: any) {
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

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage || loading) return;
    const el = sentinelRef.current; if (!el) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setPage(p => p + 1); });
    }, { rootMargin: '600px 0px 0px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, loading]);

  const handleApply = useCallback(async (jobId: string, applicationData: {coverLetter: string; proposedRate?: number; estimatedDuration: string; portfolio?: string}) => {
    if (!user || !token) return;
    try {
      await applyToJob(jobId, {
        coverLetter: applicationData.coverLetter,
        proposedRate: applicationData.proposedRate,
        estimatedDuration: applicationData.estimatedDuration,
        portfolio: applicationData.portfolio,
      });
    } finally {
      setApplyingJobId(null);
    }
  }, [user, token, applyToJob]);

  const handleModalSubmit = async (formData: any) => { if (!modalJob) return; await handleApply(modalJob.id, formData); };

  return (
    <div className="min-h-screen bg-[var(--surface-muted)]/60 dark:bg-[var(--surface-elevated)]/40 bg-[radial-gradient(circle_at_20%_20%,rgba(147,51,234,0.08),transparent_60%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.06),transparent_55%)]">
    <PageContainer className="relative">
      <div className="mb-6">
        <div className="flex flex-col gap-2 -ml-1 sm:-ml-2 lg:-ml-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight pl-1 sm:pl-2 lg:pl-3 border-l-4 border-[var(--brand-600)]/60">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-600)] to-blue-600">Find Jobs</span>
          </h1>
          <p className="text-[var(--text-muted)] text-lg">Discover blockchain and Web3 projects that match your skills</p>
        </div>
      </div>
  <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-4 pb-2 bg-[var(--surface-primary)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-primary)]/70 border-b border-[var(--border-primary)]">
        <Card glass hoverable density="compact" className="mb-6 ring-1 ring-[var(--border-primary)]/70 rounded-2xl animate-fade-up">
          <CardContent density="compact">
            <div className="relative mb-6">
              <LazyIcon name="MagnifyingGlassIcon" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs by title or description..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/80 border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-xs"
                suppressHydrationWarning
                autoComplete="off"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => {
                        if (selectedSkills.includes(skill)) setSelectedSkills(selectedSkills.filter(s => s !== skill));
                        else setSelectedSkills([...selectedSkills, skill]);
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        selectedSkills.includes(skill) ? 'bg-purple-100 text-purple-800 ring-1 ring-purple-300' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
                      }`}
                    >{skill}</button>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="budget-type" className="block text-sm font-medium text-gray-700 mb-2">Budget Type</label>
                <Select id="budget-type" value={budgetFilter} onChange={(e) => setBudgetFilter(e.target.value as any)} uiSize="md">
                  <option value="all">All Budget Types</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                </Select>
              </div>
              <div>
                <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <Select id="sort-by" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} uiSize="md">
                  <option value="recent">Most Recent</option>
                  <option value="budget">Highest Budget</option>
                  <option value="deadline">Nearest Deadline</option>
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                {showAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
              </button>
              {showAdvanced && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Budget (USD)</label>
                    <input type="number" value={minBudget} onChange={(e) => { setPage(1); setMinBudget(e.target.value); }} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g. 500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Budget (USD)</label>
                    <input type="number" value={maxBudget} onChange={(e) => { setPage(1); setMaxBudget(e.target.value); }} className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent" placeholder="e.g. 10000" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between items-center mb-6 animate-fade-up">
        <p className="text-gray-600">{loading ? 'Loading jobs...' : `Showing ${jobs.length} of ${totalCount} job${totalCount !== 1 ? 's' : ''}`}</p>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-gray-200 hover:border-purple-300 hover:text-purple-700" onClick={() => setShowAdvanced(v => !v)}>
            <LazyIcon name="AdjustmentsHorizontalIcon" className="h-4 w-4 mr-2" />{showAdvanced ? 'Hide Filters' : 'Advanced Filters'}
          </Button>
          {(minBudget || maxBudget) && <span className="text-xs text-gray-500">Budget: {minBudget || '0'} - {maxBudget || '∞'}</span>}
        </div>
      </div>
  {/* Grid layout for job cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {!loading && jobs.map((job, idx) => (
          <Reveal key={job.id} delay={Math.min(300, idx * 50)}>
            <div className="h-full">
              <JobListing
                job={{
                  id: job.id,
                  title: job.title,
                  description: job.description,
                  requirements: [],
                  skills: job.skills || [],
                  budget: { type: (job.budgetType.toLowerCase() === 'fixed' ? 'fixed' : 'hourly') as 'fixed' | 'hourly', amount: job.budgetAmount, currency: (['ETH','USDC','USDT'].includes(job.currency) ? job.currency : 'USDC') as 'ETH' | 'USDC' | 'USDT' },
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
                  applicants: Array.from({ length: job._count.applications }).map((_, i) => ({ id: `${job.id}-app-${i}` })) as any,
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
            </div>
          </Reveal>
        ))}
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <Reveal key={i} delay={i * 40}><CardSkeleton /></Reveal>
        ))}
        {error && !loading && <ErrorState message={error} onRetry={() => { setPage(1); setJobs([]); }} />}
      </div>
      <div ref={sentinelRef} className="h-10" />
      {!loading && !hasNextPage && jobs.length > 0 && <div className="text-center text-xs text-gray-500 mt-4">No more jobs</div>}
      <JobApplicationModal
        isOpen={!!modalJob}
        onClose={() => setModalJob(null)}
        onSubmit={async (data: any) => handleModalSubmit(data)}
        isSubmitting={!!applyingJobId}
        job={modalJob && { title: modalJob.title, budget: { amount: modalJob.budgetAmount, currency: modalJob.currency, type: modalJob.budgetType.toLowerCase() }, duration: modalJob.duration }}
      />
      {!loading && jobs.length === 0 && <EmptyState icon="FunnelIcon" title="No jobs found" description="Try adjusting your search criteria or browse all jobs" actionLabel="Clear Filters" onAction={clearFilters} />}
    </PageContainer>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading jobs…</div>}>
      <JobsPageInner />
    </Suspense>
  );
}
        
