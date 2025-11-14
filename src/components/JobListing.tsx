'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Job } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';

interface JobListingProps {
  job: Job;
  onApply?: (jobId: string) => void;
  onOpenApplyModal?: (job: Job) => void;
  showApply?: boolean;
  applying?: boolean;
  applied?: boolean;
}

export default function JobListing({ job, onApply, onOpenApplyModal, showApply = true, applying, applied }: JobListingProps) {
  const {
    id,
    title,
    description,
    skills,
    budget,
    duration,
    client,
    status,
    createdAt,
    deadline,
    applicants
  } = job;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-50 text-green-700 ring-1 ring-green-200';
      case 'in-progress':
        return 'bg-blue-50 text-blue-700 ring-1 ring-blue-200';
      case 'completed':
        return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 ring-1 ring-red-200';
      default:
        return 'bg-gray-50 text-gray-700 ring-1 ring-gray-200';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(date));
  };

  const timeAgo = (date: Date) => {
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
    <Card className="h-full rounded-2xl border-0 shadow-sm ring-1 ring-gray-200/70 hover:shadow-md transition">
      <CardContent className="p-6">
        {/* Header with title and status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative h-8 w-8 shrink-0 rounded-md ring-1 ring-gray-200 overflow-hidden bg-white">
              <Image src="/briefcase.svg" alt="Job icon" fill sizes="32px" className="object-contain p-1" loading="lazy" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {title}
            </h3>
          </div>
          <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
            {status.replace('-', ' ')}
          </span>
        </div>

        {/* Client info and posted time */}
        <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
          <span>by {client.username}</span>
          <span>{timeAgo(createdAt)}</span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {description}
        </p>

  {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 5).map((skill, index) => (
              <span
                key={index}
    className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium ring-1 ring-purple-100"
              >
                {skill}
              </span>
            ))}
            {skills.length > 5 && (
        <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded-md text-xs ring-1 ring-gray-200">
                +{skills.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Job details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
              <span className="font-medium">
                {budget.type === 'fixed' ? `$${budget.amount.toLocaleString()}` : `$${budget.amount}/hr`}
              </span>
              <span className="text-gray-500">
                {budget.type === 'fixed' ? 'Fixed price' : 'Hourly'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <LazyIcon name="ClockIcon" className="h-4 w-4" />
              <span>{duration}</span>
            </div>
            {deadline && (
              <div className="flex items-center space-x-1">
                <LazyIcon name="CalendarIcon" className="h-4 w-4" />
                <span>Due: {formatDate(deadline)}</span>
              </div>
            )}
          </div>

          {/* Proposals count */}
          <div className="text-sm text-gray-500">
            {applicants.length} proposal{applicants.length !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 space-x-2">
        <Button variant="outline" size="sm" className="flex-1 border-gray-200 hover:border-purple-300 hover:text-purple-700" asChild>
          <Link href={`/jobs/${id}`} aria-label={`View details for ${title}`} className="w-full">
            View Details
          </Link>
        </Button>
        {status === 'open' && showApply && (
          <Button 
            size="sm" 
            className="flex-1"
            disabled={!!applying || applied}
            onClick={() => {
              if (onOpenApplyModal) {
                onOpenApplyModal(job);
              } else {
                onApply?.(id);
              }
            }}
          >
            {applying ? 'Applying...' : applied ? 'Applied' : 'Apply Now'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
