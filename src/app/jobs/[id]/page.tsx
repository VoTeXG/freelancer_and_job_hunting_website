'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  BriefcaseIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import JobApplicationModal from '@/components/JobApplicationModal';

export default function JobDetailPage() {
  const params = useParams();
  const [job, setJob] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [params.id]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/jobs/${params.id}`);
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
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`, // Replace with real token
        },
        body: JSON.stringify(applicationData),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowApplicationModal(false);
        // Show success message
        alert('Application submitted successfully!');
        fetchJob(); // Refresh job data
      } else {
        alert(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Failed to apply:', error);
      alert('Failed to submit application');
    } finally {
      setIsApplying(false);
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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Application Modal */}
      <JobApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        onSubmit={handleApply}
        isSubmitting={isApplying}
        job={job}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{job.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span>Posted {timeAgo(job.createdAt)}</span>
          <span>•</span>
          <span>{job.applicants.length} proposal{job.applicants.length !== 1 ? 's' : ''}</span>
          <span>•</span>
          <span className="capitalize">{job.status.replace('-', ' ')}</span>
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
          {job.status === 'open' && (
            <Card>
              <CardContent className="p-6">
                <Button 
                  className="w-full mb-4"
                  onClick={() => setShowApplicationModal(true)}
                >
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                  Apply Now
                </Button>
                <p className="text-sm text-gray-500 text-center">
                  Submit your proposal to get hired
                </p>
              </CardContent>
            </Card>
          )}

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">
                    ${job.budget.amount.toLocaleString()} {job.budget.currency}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.budget.type === 'fixed' ? 'Fixed price' : 'Hourly rate'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{job.duration}</p>
                  <p className="text-sm text-gray-500">Project duration</p>
                </div>
              </div>

              {job.deadline && (
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
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
                  <UserIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{job.clientId.username}</h3>
                  {job.clientId.companyName && (
                    <p className="text-sm text-gray-600">{job.clientId.companyName}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <StarIcon className="h-4 w-4 text-yellow-400" />
                      <span>{job.clientId.reputation || 'New client'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BriefcaseIcon className="h-4 w-4" />
                      <span>{job.clientId.completedJobs || 0} jobs</span>
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
