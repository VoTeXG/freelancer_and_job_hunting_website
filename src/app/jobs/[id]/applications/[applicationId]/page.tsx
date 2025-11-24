'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';

function normalizeParam(param: unknown) {
  if (typeof param === 'string') return param;
  if (Array.isArray(param)) return param[0];
  return undefined;
}

function formatDateTime(input: unknown) {
  if (!input) return 'Unknown';
  const value = new Date(input as string);
  if (Number.isNaN(value.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

function statusClassName(status: unknown) {
  const key = typeof status === 'string' ? status.toUpperCase() : '';
  switch (key) {
    case 'ACCEPTED':
      return 'bg-green-100 text-green-700';
    case 'REJECTED':
      return 'bg-red-100 text-red-700';
    case 'WITHDRAWN':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-blue-100 text-blue-700';
  }
}

export default function JobApplicationDetail() {
  const params = useParams();
  const jobId = normalizeParam((params as any)?.id);
  const applicationId = normalizeParam((params as any)?.applicationId);
  const [application, setApplication] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchApplication() {
      if (!jobId || !applicationId) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/jobs/${jobId}/applications/${applicationId}`);
        const data = await response.json().catch(() => ({ success: false, error: 'Failed to parse response' }));
        if (!response.ok || !data.success) {
          if (!isMounted) return;
          setError(data.error || 'Failed to load application');
          setApplication(null);
        } else if (isMounted) {
          setApplication(data.application);
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load application');
        setApplication(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchApplication();
    return () => {
      isMounted = false;
    };
  }, [jobId, applicationId]);

  const freelancer = useMemo(() => application?.freelancer ?? {}, [application]);
  const profile = useMemo(() => freelancer?.profile ?? {}, [freelancer]);
  const job = application?.job;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-gray-500">
            <Link href={`/jobs/${jobId}`} className="text-blue-600 hover:text-blue-700">
              &larr; Back to job
            </Link>
          </p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Application Detail</h1>
          {job && (
            <p className="text-gray-600 mt-1">
              Job: {job.title}
            </p>
          )}
        </div>
        {application && (
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(application.status)}`}>
            {(typeof application.status === 'string' ? application.status.toUpperCase() : 'PENDING')}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="h-32 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-32 rounded-lg bg-gray-200 animate-pulse" />
          <div className="h-32 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      )}

      {!isLoading && error && (
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error}</p>
            <Button className="mt-4" asChild>
              <Link href={`/jobs/${jobId}`}>
                Return to job
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && application && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card hoverable glass>
              <CardHeader>
                <CardTitle>Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm text-gray-700">
                  {application.coverLetter || 'No cover letter provided.'}
                </div>
              </CardContent>
            </Card>

            <Card hoverable glass>
              <CardHeader>
                <CardTitle>Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                  <span className="font-medium">
                    ${application.proposedRate?.toLocaleString?.() ?? application.proposedRate}
                  </span>
                  <span className="text-gray-500">
                    {job?.budgetType === 'HOURLY' ? 'per hour' : 'fixed bid'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <LazyIcon name="ClockIcon" className="h-4 w-4" />
                  <span>{application.estimatedDuration || 'No duration provided'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LazyIcon name="CalendarIcon" className="h-4 w-4" />
                  <span>Applied on {formatDateTime(application.appliedAt)}</span>
                </div>
                {application.portfolio ? (
                  <a
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    href={application.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <LazyIcon name="ArrowTopRightOnSquareIcon" className="h-4 w-4" />
                    View portfolio
                  </a>
                ) : (
                  <p className="text-gray-500">No portfolio link provided.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card hoverable glass>
              <CardHeader>
                <CardTitle>Freelancer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <div>
                  <p className="text-base font-semibold text-gray-900">{freelancer.username || 'Unknown freelancer'}</p>
                  {profile.skills && profile.skills.length > 0 && (
                    <p className="text-gray-600 mt-1">{profile.skills.slice(0, 8).join(', ')}</p>
                  )}
                </div>
                {profile.rating !== undefined && profile.rating !== null && (
                  <div className="flex items-center gap-2">
                    <LazyIcon name="StarIcon" className="h-4 w-4 text-yellow-400" />
                    <span>{profile.rating.toFixed ? profile.rating.toFixed(1) : profile.rating} rating</span>
                  </div>
                )}
                {profile.completedJobs !== undefined && profile.completedJobs !== null && (
                  <div className="flex items-center gap-2">
                    <LazyIcon name="BriefcaseIcon" className="h-4 w-4" />
                    <span>{profile.completedJobs} completed jobs</span>
                  </div>
                )}
                {profile.totalEarnings !== undefined && profile.totalEarnings !== null && (
                  <div className="flex items-center gap-2">
                    <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                    <span>${profile.totalEarnings.toLocaleString?.() ?? profile.totalEarnings} earned</span>
                  </div>
                )}
                {freelancer.walletAddress && (
                  <div className="flex items-center gap-2">
                    <LazyIcon name="WalletIcon" className="h-4 w-4" />
                    <span className="font-mono text-xs">{freelancer.walletAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card hoverable glass>
              <CardHeader>
                <CardTitle>Job Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-700">
                <p className="font-medium text-gray-900">{job?.title || 'Job'}</p>
                <div className="flex items-center gap-2">
                  <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                  <span>${job?.budgetAmount?.toLocaleString?.() ?? job?.budgetAmount} {job?.currency}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LazyIcon name="ClockIcon" className="h-4 w-4" />
                  <span>{job?.duration || 'Duration not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <LazyIcon name="ChartBarIcon" className="h-4 w-4" />
                  <span>Status: {job?.status || 'Unknown'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
