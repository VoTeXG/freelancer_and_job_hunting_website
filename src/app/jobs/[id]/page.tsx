'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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
  const { addNotification } = useNotifications();
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

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
        // Show success message
        addNotification({ type: 'job_application', title: 'Application Submitted', message: 'Your proposal was sent.', data: { jobId }, timestamp: new Date().toISOString() });
        fetchJob(); // Refresh job data
      } else {
        addNotification({ type: 'new_message', title: 'Application Failed', message: data.error || 'Failed to submit application', data: { jobId }, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      addNotification({ type: 'new_message', title: 'Application Error', message: 'Failed to submit application', data: { jobId }, timestamp: new Date().toISOString() });
    } finally {
      setIsApplying(false);
    }
  };

  const myApplication = useMemo(() => {
    if (!user || !job?.applications) return null;
    return job.applications.find((a: any) => a.freelancer?.id === user.id) || null;
  }, [user, job]);

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
        addNotification({ type: 'job_application', title: 'Application Updated', message: 'Your proposal was updated.', data: { jobId }, timestamp: new Date().toISOString() });
        setShowApplicationModal(false);
        setIsEditing(false);
        fetchJob();
      } else {
        addNotification({ type: 'new_message', title: 'Update Failed', message: data.error || 'Failed to update application', data: { jobId }, timestamp: new Date().toISOString() });
      }
    } catch (e) {
      console.error('Edit application failed:', e);
      addNotification({ type: 'new_message', title: 'Update Error', message: 'Failed to update application', data: { jobId }, timestamp: new Date().toISOString() });
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
        addNotification({ type: 'job_application', title: 'Application Withdrawn', message: 'Your proposal was withdrawn.', data: { jobId }, timestamp: new Date().toISOString() });
        fetchJob();
      } else {
        addNotification({ type: 'new_message', title: 'Withdraw Failed', message: data.error || 'Failed to withdraw', data: { jobId }, timestamp: new Date().toISOString() });
      }
    } catch (e) {
      console.error('Withdraw application failed:', e);
      addNotification({ type: 'new_message', title: 'Withdraw Error', message: 'Failed to withdraw', data: { jobId }, timestamp: new Date().toISOString() });
    } finally {
      setIsWithdrawing(false);
      setConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
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
  const jobForModal = useMemo(() => ({
    ...job,
    budget: {
      amount: job.budgetAmount,
      currency: job.currency,
      type: String(job.budgetType || '').toLowerCase(),
    },
  }), [job]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Application Modal */}
      <JobApplicationModal
        isOpen={showApplicationModal}
        onClose={() => { setShowApplicationModal(false); setIsEditing(false); }}
        onSubmit={isEditing ? handleEdit : handleApply}
        isSubmitting={isApplying}
        job={jobForModal}
        mode={isEditing ? 'edit' : 'apply'}
        initialValues={isEditing && myApplication ? {
          coverLetter: myApplication.coverLetter,
          proposedRate: myApplication.proposedRate,
          estimatedDuration: myApplication.estimatedDuration,
          portfolio: myApplication.portfolio || '',
        } : undefined}
      />

      {/* Header */}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </CardContent>
          </Card>

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <Card>
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
          )}

          {/* Skills */}
          <Card>
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Button */}
          {isOpenStatus && (
            <Card>
              <CardContent className="p-6">
        {!myApplication ? (
                  <Button 
                    className="w-full mb-4"
                    onClick={() => setShowApplicationModal(true)}
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
          <Button variant="outline" className="flex-1" onClick={openEditModal} disabled={isWithdrawing || myApplication.status !== 'PENDING'}>
                        <LazyIcon name="PencilSquareIcon" className="h-4 w-4 mr-2" /> Edit
                      </Button>
          <Button variant="destructive" className="flex-1" onClick={handleWithdraw} disabled={isWithdrawing || myApplication.status !== 'PENDING'}>
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
          <Card>
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

          {/* Client Info */}
          <Card>
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
        </div>
      </div>
    </div>
  );
}
