'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { useApiErrorHandlers } from '@/lib/queryClient';
import Reveal from '@/components/Reveal';

interface Application {
  _id: string;
  freelancerId: {
    _id: string;
    username: string;
    email: string;
    profile: {
      skills: string[];
      hourlyRate: number;
      portfolio: string[];
      completedJobs: number;
      rating: number;
    };
  };
  coverLetter: string;
  proposedRate: number;
  estimatedDuration: string;
  portfolio?: string;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
}

interface Job {
  _id: string;
  title: string;
  description: string;
  budget: {
    amount: number;
    type: 'fixed' | 'hourly';
    currency: string;
  };
  applicants: Application[];
  status: string;
  createdAt: string;
}

export default function ClientDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inFlightApps, setInFlightApps] = useState<Set<string>>(new Set());
  const { toastSuccess, toastError } = useApiErrorHandlers();

  useEffect(() => {
    fetchClientJobs();
  }, []);

  const fetchClientJobs = async () => {
    try {
      // This would be filtered by client ID in real implementation
      const response = await fetch('/api/jobs?clientOnly=true', {
        headers: {
          'Authorization': `Bearer mock-token`, // Replace with real token
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
        if (data.jobs.length > 0) {
          setSelectedJob(data.jobs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplicationAction = async (jobId: string, applicationId: string, action: 'accept' | 'reject') => {
    try {
      setInFlightApps(prev => new Set(prev).add(applicationId + ':' + action));
      const response = await fetch(`/api/jobs/${jobId}/applications/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setJobs(prevJobs => 
          prevJobs.map(job => 
            job._id === jobId 
              ? {
                  ...job,
                  applicants: job.applicants.map(app => 
                    app._id === applicationId 
                      ? { ...app, status: action === 'accept' ? 'accepted' : 'rejected' as const }
                      : app
                  )
                }
              : job
          )
        );
        
        // Update selected job if it's the current one
        if (selectedJob?._id === jobId) {
          setSelectedJob(prev => prev ? {
            ...prev,
            applicants: prev.applicants.map(app => 
              app._id === applicationId 
                ? { ...app, status: action === 'accept' ? 'accepted' : 'rejected' as const }
                : app
            )
          } : null);
        }

        toastSuccess(
          action === 'accept' ? 'Application accepted' : 'Application rejected',
          action === 'accept' ? 'Accepted' : 'Rejected'
        );
      }
    } catch (error) {
      console.error('Failed to update application:', error);
      toastError('Failed to update application');
    } finally {
      setInFlightApps(prev => {
        const next = new Set(prev);
        next.delete(applicationId + ':' + action);
        return next;
      });
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 skeleton-shimmer"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-96 bg-gray-200 rounded skeleton-shimmer"></div>
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded skeleton-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold text-gray-900">Your Job Posts</h1>
        <p className="text-gray-600 mt-2">Manage your job postings and review applications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs List */}
        <div className="space-y-4 animate-fade-up">
          <h2 className="text-lg font-semibold text-gray-900">Posted Jobs ({jobs.length})</h2>
          
          {jobs.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500">No jobs posted yet</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job, idx) => (
              <Reveal key={job._id} delay={Math.min(400, idx * 60)}>
                <Card 
                  interactive
                  className={`cursor-pointer ${selectedJob?._id === job._id ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedJob(job)}
                >
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{job.title}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center justify-between">
                        <span>{job.applicants.length} applications</span>
                        <span className="capitalize">{job.status}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                        <span>${job.budget.amount.toLocaleString()}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Posted {formatDate(job.createdAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            ))
          )}
        </div>

        {/* Applications Detail */}
  <div className="lg:col-span-2 animate-fade-up">
          {selectedJob ? (
            <div className="space-y-6">
              {/* Job Header */}
              <Card className="animate-fade-up">
                <CardHeader>
                  <CardTitle>{selectedJob.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">{selectedJob.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                      <span>${selectedJob.budget.amount.toLocaleString()}</span>
                    </div>
                    <span>•</span>
                    <span>{selectedJob.applicants.length} applications</span>
                  </div>
                </CardContent>
              </Card>

              {/* Applications */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Applications ({selectedJob.applicants.length})
                </h3>
                
                {selectedJob.applicants.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">No applications yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {selectedJob.applicants.map((application, idx) => (
                      <Reveal key={application._id} delay={Math.min(400, idx * 60)}>
                        <Card>
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                                <LazyIcon name="UserIcon" className="h-6 w-6 text-gray-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {application.freelancerId.username}
                                </h4>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  <div className="flex items-center space-x-1">
                                    <LazyIcon name="StarIcon" className="h-4 w-4 text-yellow-400" />
                                    <span>{application.freelancerId.profile.rating || 'New'}</span>
                                  </div>
                                  <span>
                                    {application.freelancerId.profile.completedJobs || 0} jobs completed
                                  </span>
                                  <span>
                                    ${application.freelancerId.profile.hourlyRate}/hr
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                                {application.status}
                              </span>
                            </div>
                          </div>

                          {/* Proposal Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
                                <span>Proposed Rate</span>
                              </div>
                              <p className="font-medium">${application.proposedRate.toLocaleString()}</p>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <LazyIcon name="ClockIcon" className="h-4 w-4" />
                                <span>Duration</span>
                              </div>
                              <p className="font-medium">{application.estimatedDuration}</p>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <LazyIcon name="UserIcon" className="h-4 w-4" />
                                <span>Applied</span>
                              </div>
                              <p className="font-medium">{formatDate(application.appliedAt)}</p>
                            </div>
                          </div>

                          {/* Cover Letter */}
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Cover Letter</h5>
                            <p className="text-gray-600 text-sm leading-relaxed">
                              {application.coverLetter}
                            </p>
                          </div>

                          {/* Skills */}
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Skills</h5>
                            <div className="flex flex-wrap gap-2">
                              {application.freelancerId.profile.skills.map((skill, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Portfolio Link */}
                          {application.portfolio && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Portfolio</h5>
                              <a
                                href={application.portfolio}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                              >
                                <LazyIcon name="EyeIcon" className="h-4 w-4" />
                                <span>View Portfolio</span>
                              </a>
                            </div>
                          )}

                          {/* Actions */}
                          {application.status === 'pending' && (
                            <div className="flex space-x-2 pt-4 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplicationAction(selectedJob._id, application._id, 'reject')}
                                loading={inFlightApps.has(application._id + ':' + 'reject')}
                                loadingText="Declining..."
                                className="flex items-center space-x-1"
                              >
                                <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                                <span>Decline</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApplicationAction(selectedJob._id, application._id, 'accept')}
                                loading={inFlightApps.has(application._id + ':' + 'accept')}
                                loadingText="Accepting..."
                                className="flex items-center space-x-1"
                              >
                                <LazyIcon name="CheckIcon" className="h-4 w-4" />
                                <span>Accept</span>
                              </Button>
                            </div>
                          )}
                          </CardContent>
                        </Card>
                      </Reveal>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">Select a job to view applications</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
