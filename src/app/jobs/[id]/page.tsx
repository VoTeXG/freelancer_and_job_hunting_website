'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { useAuth } from '@/providers/AuthProvider';
import { useApiErrorHandlers } from '@/lib/queryClient';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Reveal from '@/components/Reveal';
import ApplicationPreviewModal from '@/components/ApplicationPreviewModal';

const JobApplicationModal = dynamic(
  () => import('@/components/JobApplicationModal'),
  { ssr: false, loading: () => <div className="p-4 text-gray-500">Loading…</div> }
);

export default function JobDetailPage() {
  const params = useParams();
  const jobParam = (params as any)?.id;
  const jobId: string | undefined = Array.isArray(jobParam) ? jobParam[0] : jobParam;
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { token, user } = useAuth();
  const { toastSuccess, toastError, bannerError } = useApiErrorHandlers();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewApplication, setPreviewApplication] = useState<any | null>(null);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (!previewApplication) return;
    if (!job?.applications?.some((app: any) => app.id === previewApplication.id)) {
      setPreviewApplication(null);
    }
  }, [job, previewApplication]);

  const fetchJob = async () => {
    try {
      if (!jobId) return;
  const response = await fetch(`/api/jobs/${jobId}`);
      const data = await response.json();
      
      if (data.success) {
        setJob(data.job);
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (applicationData: any) => {
    setIsApplying(true);
    try {
      if (!jobId) throw new Error('Missing job id');
    const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(applicationData),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowApplicationModal(false);
        toastSuccess('Your proposal was sent.', 'Application submitted');
        fetchJob(); // Refresh job data
      } else {
        toastError(data.error || 'Failed to submit application', 'Application failed');
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      toastError('Failed to submit application', 'Application error');
    } finally {
      setIsApplying(false);
    }
  };

  const myApplication = useMemo(() => {
    if (!user || !job?.applications) return null;
    return job.applications.find((a: any) => a.freelancer?.id === user.id) || null;
  }, [user, job]);

  const jobForModal = useMemo(() => {
    if (!job) {
      return null;
    }

    return {
      ...job,
      budget: {
        amount: job.budgetAmount,
        currency: job.currency,
        type: String(job.budgetType || '').toLowerCase(),
      },
    };
  }, [job]);

  const isJobOwner = Boolean(user?.id && job?.client?.id && user.id === job.client.id);

  const applications = useMemo(() => {
    if (!job?.applications) {
      return [] as any[];
    }
    return job.applications as any[];
  }, [job]);

  const openEditModal = () => {
    setIsEditing(true);
    setShowApplicationModal(true);
  };

  const handleEdit = async (updates: any) => {
    if (!jobId || !token) return;
    setIsApplying(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess('Your proposal was updated.', 'Application updated');
        setShowApplicationModal(false);
        setIsEditing(false);
        fetchJob();
      } else {
        toastError(data.error || 'Failed to update application', 'Update failed');
      }
    } catch (e) {
      console.error('Edit application failed:', e);
      toastError('Failed to update application', 'Update error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleWithdraw = async () => {
    if (!jobId || !token) return;
    setConfirmOpen(true);
  };

  const doWithdraw = async () => {
    if (!jobId || !token) { setConfirmOpen(false); return; }
    setIsWithdrawing(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess('Your proposal was withdrawn.', 'Application withdrawn');
        fetchJob();
      } else {
        toastError(data.error || 'Failed to withdraw', 'Withdraw failed');
      }
    } catch (e) {
      console.error('Withdraw application failed:', e);
      toastError('Failed to withdraw', 'Withdraw error');
    } finally {
      setIsWithdrawing(false);
      setConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4 skeleton-shimmer"></div>
          <div className="h-32 bg-gray-200 rounded skeleton-shimmer"></div>
          <div className="h-48 bg-gray-200 rounded skeleton-shimmer"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
        <p className="text-gray-600">The job you're looking for doesn't exist or has been removed.</p>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just posted';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const days = Math.floor(diffInHours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w ago`;
  };

  const isOpenStatus = String(job.status || '').toUpperCase() === 'OPEN';
  const applicantsCount = Array.isArray(job.applications) ? job.applications.length : (job.applicants?.length || 0);
  const client = job.client || job.clientId || {};

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Application Modal */}
      <JobApplicationModal
        isOpen={showApplicationModal}
        onClose={() => { setShowApplicationModal(false); setIsEditing(false); }}
        onSubmit={isEditing ? handleEdit : handleApply}
        isSubmitting={isApplying}
        job={jobForModal ?? undefined}
        mode={isEditing ? 'edit' : 'apply'}
        initialValues={isEditing && myApplication ? {
          coverLetter: myApplication.coverLetter,
          proposedRate: myApplication.proposedRate,
          estimatedDuration: myApplication.estimatedDuration,
          portfolio: myApplication.portfolio || '',
        } : undefined}
      />

      <ApplicationPreviewModal
        isOpen={Boolean(previewApplication)}
        onClose={() => setPreviewApplication(null)}
        application={previewApplication}
        job={job}
      />

      {/* Header */}
      <Reveal>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span>Posted {timeAgo(job.createdAt)}</span>
            <span>•</span>
            <span>{applicantsCount} proposal{applicantsCount !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span className="capitalize">{String(job.status || '').toLowerCase().replace('-', ' ')}</span>
          </div>
        </div>
      </Reveal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <Reveal delay={50}>
          <Card hoverable glass>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </CardContent>
          </Card>
          </Reveal>

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <Reveal delay={100}>
            <Card hoverable glass>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {job.requirements.map((req: string, index: number) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700">{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            </Reveal>
          )}

          {/* Skills */}
          <Reveal delay={150}>
          <Card hoverable glass>
            <CardHeader>
              <CardTitle>Skills Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
          </Reveal>

          {isJobOwner && (
            <Reveal delay={200}>
            <Card hoverable glass>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {applications.length === 0 ? (
                  <p className="text-sm text-gray-600">No applications yet. Invite freelancers or share this job to attract proposals.</p>
                ) : (
                  applications.map((application: any) => {
                    const status = String(application.status || '').toUpperCase();
                    const statusClass = status === 'ACCEPTED'
                      ? 'bg-green-100 text-green-700'
                      : status === 'REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : status === 'WITHDRAWN'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-blue-100 text-blue-700';
                    return (
                      <div key={application.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 break-words">{application.freelancer?.username ?? 'Unknown freelancer'}</p>
                            <p className="mt-1 text-sm text-gray-600 break-words">
                              {Array.isArray(application.freelancer?.profile?.skills) && application.freelancer.profile.skills.length > 0
                                ? application.freelancer.profile.skills.slice(0, 5).join(', ')
                                : 'No skills listed'}
                            </p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}>
                            {status}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                            ${application.proposedRate?.toLocaleString?.() ?? application.proposedRate}
                          </span>
                          <span className="flex items-center gap-1">
                            <LazyIcon name="ClockIcon" className="h-4 w-4" />
                            {application.estimatedDuration || 'No duration provided'}
                          </span>
                          <span className="flex items-center gap-1">
                            <LazyIcon name="CalendarIcon" className="h-4 w-4" />
                            Applied {application.appliedAt ? timeAgo(application.appliedAt) : 'recently'}
                          </span>
                        </div>

                        {application.coverLetter && (
                          <p className="mt-3 text-sm text-gray-600 whitespace-pre-line max-h-48 overflow-hidden">
                            {application.coverLetter}
                          </p>
                        )}

                        {application.portfolio && (
                          <div className="mt-3 text-sm">
                            <a
                              href={application.portfolio}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                            >
                              <LazyIcon name="ArrowTopRightOnSquareIcon" className="h-4 w-4" />
                              Portfolio
                            </a>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewApplication(application)}
                          >
                            <LazyIcon name="EyeIcon" className="h-4 w-4 mr-1" />
                            Quick Preview
                          </Button>
                          <Button size="sm" asChild>
                            <Link href={`/jobs/${job.id}/applications/${application.id}`}>
                              <LazyIcon name="DocumentMagnifyingGlassIcon" className="h-4 w-4 mr-1" />
                              Open Full View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            </Reveal>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Button */}
          {isOpenStatus && (
            <Reveal delay={200}>
            <Card hoverable glass>
              <CardContent className="p-6">
        {!myApplication ? (
                  <Button 
                    className="w-full mb-4"
                    onClick={() => {
                      if (!token) {
                        bannerError('Please log in to apply to this job.');
                        return;
                      }
                      setShowApplicationModal(true);
                    }}
                  >
                    <LazyIcon name="PaperAirplaneIcon" className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
          You applied with ${'{'}myApplication.proposedRate{'}'} and status { '{'}myApplication.status{'}' }.
                    </div>
                    <div className="flex gap-3">
          <Button variant="outline" className="flex-1" loading={isApplying} loadingText="Saving..." onClick={() => {
                          if (!token) { bannerError('Please log in to edit your application.'); return; }
                          openEditModal();
                        }} disabled={isWithdrawing || myApplication.status !== 'PENDING'}>
                        <LazyIcon name="PencilSquareIcon" className="h-4 w-4 mr-2" /> Edit
                      </Button>
          <Button variant="destructive" className="flex-1" loading={isWithdrawing} loadingText="Withdrawing..." onClick={() => {
                          if (!token) { bannerError('Please log in to withdraw your application.'); return; }
                          handleWithdraw();
                        }} disabled={isWithdrawing || myApplication.status !== 'PENDING'}>
                        <LazyIcon name="XMarkIcon" className="h-4 w-4 mr-2" /> Withdraw
                      </Button>
                    </div>
                  </div>
                )}
                <p className="text-sm text-gray-500 text-center">
                  Submit your proposal to get hired
                </p>
              </CardContent>
            </Card>
            </Reveal>
          )}

          <ConfirmDialog
            isOpen={confirmOpen}
            title="Withdraw Application"
            message="Are you sure you want to withdraw your application? This action cannot be undone."
            confirmText={isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
            onConfirm={doWithdraw}
            onCancel={() => setConfirmOpen(false)}
            confirmVariant="destructive"
          />

          {/* Job Details */}
          <Reveal delay={250}>
          <Card hoverable glass>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <LazyIcon name="CurrencyDollarIcon" className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">
                    ${Number(job.budgetAmount).toLocaleString()} {job.currency}
                  </p>
                  <p className="text-sm text-gray-500">
                    {String(job.budgetType || '').toUpperCase() === 'FIXED' ? 'Fixed price' : 'Hourly rate'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <LazyIcon name="ClockIcon" className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{job.duration}</p>
                  <p className="text-sm text-gray-500">Project duration</p>
                </div>
              </div>

              {job.deadline && (
                <div className="flex items-center space-x-3">
                  <LazyIcon name="CalendarIcon" className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{formatDate(job.deadline)}</p>
                    <p className="text-sm text-gray-500">Deadline</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </Reveal>

          {/* Client Info */}
          <Reveal delay={300}>
          <Card hoverable glass>
            <CardHeader>
              <CardTitle>About the Client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <LazyIcon name="UserIcon" className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{client.username}</h3>
                  {client.profile?.companyName && (
                    <p className="text-sm text-gray-600">{client.profile.companyName}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <LazyIcon name="StarIcon" className="h-4 w-4 text-yellow-400" />
                      <span>{client.profile?.rating ?? 'New client'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <LazyIcon name="BriefcaseIcon" className="h-4 w-4" />
                      <span>{client.profile?.completedJobs || 0} jobs</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
