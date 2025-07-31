'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FreelancerProfile } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StarIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';

interface FreelancerCardProps {
  freelancer: FreelancerProfile;
}

export default function FreelancerCard({ freelancer }: FreelancerCardProps) {
  const {
    id,
    username,
    title,
    description,
    skills,
    hourlyRate,
    profilePicture,
    reputation,
    completedJobs,
    availability,
    certifications
  } = freelancer;

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        {/* Header with profile image and basic info */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="relative">
            <Image
              src={profilePicture || '/default-avatar.png'}
              alt={`${username}'s profile`}
              width={64}
              height={64}
              className="rounded-full object-cover"
            />
            {certifications.length > 0 && (
              <CheckBadgeIcon className="absolute -bottom-1 -right-1 h-6 w-6 text-blue-600 bg-white rounded-full" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {username}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getAvailabilityColor(availability)}`}>
                {availability}
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600 mb-1">{title}</p>
            
            {/* Rating and completed jobs */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <StarIcon className="h-4 w-4 text-yellow-400" />
                <span>{reputation.toFixed(1)}</span>
              </div>
              <span>•</span>
              <span>{completedJobs} jobs completed</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {description}
        </p>

        {/* Skills */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
              >
                {skill}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">
                +{skills.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Hourly rate */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-gray-900">
              ${hourlyRate}
            </span>
            <span className="text-gray-500 text-sm">/hour</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 space-x-2">
        <Button variant="outline" size="sm" className="flex-1">
          <Link href={`/freelancers/${id}`} className="w-full">
            View Profile
          </Link>
        </Button>
        <Button size="sm" className="flex-1">
          Hire Now
        </Button>
      </CardFooter>
    </Card>
  );
}
