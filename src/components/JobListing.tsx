'use client';

import Link from 'next/link';
import { Job } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface JobListingProps {
  job: Job;
}

export default function JobListing({ job }: JobListingProps) {
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
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        {/* Header with title and status */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
            {title}
          </h3>
          <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
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
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {skills.length > 5 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">
                +{skills.length - 5} more
              </span>
            )}
          </div>
        </div>

        {/* Job details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <CurrencyDollarIcon className="h-4 w-4" />
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
              <ClockIcon className="h-4 w-4" />
              <span>{duration}</span>
            </div>
            {deadline && (
              <div className="flex items-center space-x-1">
                <CalendarIcon className="h-4 w-4" />
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
        <Button variant="outline" size="sm" className="flex-1">
          <Link href={`/jobs/${id}`} className="w-full">
            View Details
          </Link>
        </Button>
        {status === 'open' && (
          <Button size="sm" className="flex-1">
            Apply Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
