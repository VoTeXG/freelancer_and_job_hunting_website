'use client';

import { useState } from 'react';
import FreelancerCard from '@/components/FreelancerCard';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { FreelancerProfile } from '@/types';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon 
} from '@heroicons/react/24/outline';

// Sample data - replace with actual API calls
const sampleFreelancers: FreelancerProfile[] = [
  {
    id: '1',
    walletAddress: '0x123...',
    username: 'AliceChain',
    email: 'alice@example.com',
    isFreelancer: true,
    isClient: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    reputation: 4.9,
    completedJobs: 47,
    skills: ['React', 'Solidity', 'Web3.js', 'Smart Contracts', 'DeFi'],
    hourlyRate: 85,
    title: 'Senior Blockchain Developer',
    description: 'Full-stack blockchain developer with 5+ years of experience building DeFi protocols, NFT marketplaces, and Web3 applications. Expertise in Solidity, React, and various blockchain networks.',
    portfolio: [],
    availability: 'available',
    languages: ['English', 'Spanish'],
    experience: 5,
    certifications: [
      {
        id: '1',
        name: 'Certified Ethereum Developer',
        issuer: 'Ethereum Foundation',
        tokenId: '12345',
        contractAddress: '0xabc...',
        imageUrl: '/cert1.png',
        issuedAt: new Date(),
        metadata: {}
      }
    ],
    profilePicture: '/avatar1.jpg'
  },
  {
    id: '2',
    walletAddress: '0x456...',
    username: 'DevBob',
    isFreelancer: true,
    isClient: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    reputation: 4.7,
    completedJobs: 32,
    skills: ['TypeScript', 'Next.js', 'Node.js', 'GraphQL', 'Web3'],
    hourlyRate: 70,
    title: 'Full-Stack Web3 Developer',
    description: 'Passionate about building user-friendly Web3 applications. Specialized in frontend development with React/Next.js and backend APIs for blockchain integration.',
    portfolio: [],
    availability: 'busy',
    languages: ['English', 'French'],
    experience: 3,
    certifications: [],
    profilePicture: '/avatar2.jpg'
  },
  {
    id: '3',
    walletAddress: '0x789...',
    username: 'SmartContractCarol',
    isFreelancer: true,
    isClient: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    reputation: 4.8,
    completedJobs: 28,
    skills: ['Solidity', 'Hardhat', 'Foundry', 'Security Audits', 'Gas Optimization'],
    hourlyRate: 95,
    title: 'Smart Contract Security Specialist',
    description: 'Smart contract developer focused on security and gas optimization. Experienced in building and auditing DeFi protocols, DAOs, and NFT contracts.',
    portfolio: [],
    availability: 'available',
    languages: ['English', 'German'],
    experience: 4,
    certifications: [
      {
        id: '2',
        name: 'Smart Contract Security Auditor',
        issuer: 'ConsenSys',
        tokenId: '67890',
        contractAddress: '0xdef...',
        imageUrl: '/cert2.png',
        issuedAt: new Date(),
        metadata: {}
      }
    ],
    profilePicture: '/avatar3.jpg'
  }
];

export default function FreelancersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [rateRange, setRateRange] = useState({ min: 0, max: 200 });
  const [sortBy, setSortBy] = useState<'rating' | 'rate' | 'experience'>('rating');

  const skills = ['React', 'Solidity', 'Web3.js', 'TypeScript', 'Smart Contracts', 'DeFi', 'NFT', 'Node.js', 'Next.js'];

  const filteredFreelancers = sampleFreelancers.filter(freelancer => {
    const matchesSearch = freelancer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         freelancer.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         freelancer.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkills = selectedSkills.length === 0 || 
                         selectedSkills.some(skill => freelancer.skills.includes(skill));
    const matchesAvailability = availabilityFilter === 'all' || freelancer.availability === availabilityFilter;
    const matchesRate = freelancer.hourlyRate >= rateRange.min && freelancer.hourlyRate <= rateRange.max;
    
    return matchesSearch && matchesSkills && matchesAvailability && matchesRate;
  });

  const sortedFreelancers = [...filteredFreelancers].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.reputation - a.reputation;
      case 'rate':
        return a.hourlyRate - b.hourlyRate;
      case 'experience':
        return b.experience - a.experience;
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Freelancers</h1>
        <p className="text-lg text-gray-600">
          Connect with skilled blockchain and Web3 developers
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          {/* Search Bar */}
          <div className="relative mb-6">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search freelancers by name, title, or skills..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 6).map(skill => (
                  <button
                    key={skill}
                    onClick={() => {
                      if (selectedSkills.includes(skill)) {
                        setSelectedSkills(selectedSkills.filter(s => s !== skill));
                      } else {
                        setSelectedSkills([...selectedSkills, skill]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedSkills.includes(skill)
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as 'all' | 'available' | 'busy')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Freelancers</option>
                <option value="available">Available Now</option>
                <option value="busy">Busy</option>
              </select>
            </div>

            {/* Hourly Rate Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate ($)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={rateRange.min}
                  onChange={(e) => setRateRange({...rateRange, min: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={rateRange.max}
                  onChange={(e) => setRateRange({...rateRange, max: parseInt(e.target.value) || 200})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'rating' | 'rate' | 'experience')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="rating">Highest Rated</option>
                <option value="rate">Lowest Rate</option>
                <option value="experience">Most Experienced</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Showing {sortedFreelancers.length} freelancer{sortedFreelancers.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm">
          <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </div>

      {/* Freelancer Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedFreelancers.map(freelancer => (
          <FreelancerCard key={freelancer.id} freelancer={freelancer} />
        ))}
      </div>

      {/* Load More */}
      {sortedFreelancers.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More Freelancers
          </Button>
        </div>
      )}

      {/* No Results */}
      {sortedFreelancers.length === 0 && (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No freelancers found</h3>
          <p className="text-gray-500">
            Try adjusting your search criteria or browse all freelancers
          </p>
          <Button 
            className="mt-4" 
            onClick={() => {
              setSearchTerm('');
              setSelectedSkills([]);
              setAvailabilityFilter('all');
              setRateRange({ min: 0, max: 200 });
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
