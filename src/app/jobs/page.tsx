'use client';

import { useState } from 'react';
import JobListing from '@/components/JobListing';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Job } from '@/types';
import { 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon 
} from '@heroicons/react/24/outline';

// Sample data - replace with actual API calls
const sampleJobs: Job[] = [
  {
    id: '1',
    title: 'Build a DeFi Dashboard with React and Web3',
    description: 'Looking for an experienced React developer to build a comprehensive DeFi dashboard. Must have experience with Web3.js, ethers.js, and blockchain integration. The dashboard should display portfolio balances, yield farming opportunities, and transaction history.',
    requirements: ['3+ years React experience', 'Web3 integration experience', 'TypeScript proficiency'],
    skills: ['React', 'TypeScript', 'Web3.js', 'DeFi', 'Smart Contracts'],
    budget: { type: 'fixed', amount: 5000, currency: 'USDC' },
    duration: '4-6 weeks',
    clientId: '1',
    client: {
      id: '1',
      walletAddress: '0x123...',
      username: 'CryptoCorp',
      isFreelancer: false,
      isClient: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      reputation: 4.8,
      completedJobs: 12,
      companyName: 'Crypto Corporation',
      totalSpent: 50000,
      activeJobs: 3
    },
    status: 'open',
    applicants: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    tags: ['urgent', 'featured']
  },
  {
    id: '2',
    title: 'Smart Contract Development for NFT Marketplace',
    description: 'Seeking a Solidity developer to create smart contracts for an NFT marketplace. Must implement ERC-721 standards, royalty mechanisms, and marketplace functionality with proper security audits.',
    requirements: ['Solidity expertise', 'Smart contract security knowledge', 'Gas optimization experience'],
    skills: ['Solidity', 'Smart Contracts', 'NFT', 'ERC-721', 'Security'],
    budget: { type: 'hourly', amount: 80, currency: 'ETH' },
    duration: '6-8 weeks',
    clientId: '2',
    client: {
      id: '2',
      walletAddress: '0x456...',
      username: 'NFTStudio',
      isFreelancer: false,
      isClient: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      reputation: 4.5,
      completedJobs: 8,
      companyName: 'NFT Studio',
      totalSpent: 30000,
      activeJobs: 2
    },
    status: 'open',
    applicants: [],
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    tags: ['blockchain', 'high-pay']
  },
  {
    id: '3',
    title: 'Full-Stack Web3 Gaming Platform',
    description: 'Build a complete Web3 gaming platform with user authentication, wallet integration, in-game NFT trading, and leaderboards. Looking for a team or individual with full-stack experience.',
    requirements: ['Full-stack development', 'Gaming experience preferred', 'Web3 knowledge'],
    skills: ['React', 'Node.js', 'PostgreSQL', 'Web3', 'Gaming'],
    budget: { type: 'fixed', amount: 15000, currency: 'USDC' },
    duration: '3-4 months',
    clientId: '3',
    client: {
      id: '3',
      walletAddress: '0x789...',
      username: 'GameStudio',
      isFreelancer: false,
      isClient: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      reputation: 4.9,
      completedJobs: 5,
      companyName: 'Blockchain Game Studio',
      totalSpent: 75000,
      activeJobs: 1
    },
    status: 'open',
    applicants: [],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    tags: ['long-term', 'gaming']
  }
];

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budgetFilter, setBudgetFilter] = useState<'all' | 'fixed' | 'hourly'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'budget' | 'deadline'>('recent');

  const skills = ['React', 'Solidity', 'Web3.js', 'TypeScript', 'Smart Contracts', 'DeFi', 'NFT', 'Node.js'];

  const filteredJobs = sampleJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSkills = selectedSkills.length === 0 || 
                         selectedSkills.some(skill => job.skills.includes(skill));
    const matchesBudget = budgetFilter === 'all' || job.budget.type === budgetFilter;
    
    return matchesSearch && matchesSkills && matchesBudget;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'budget':
        return b.budget.amount - a.budget.amount;
      case 'deadline':
        if (!a.deadline || !b.deadline) return 0;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Find Jobs</h1>
        <p className="text-lg text-gray-600">
          Discover blockchain and Web3 projects that match your skills
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
              placeholder="Search jobs by title or description..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Skills Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skills.map(skill => (
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

            {/* Budget Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Type
              </label>
              <select
                value={budgetFilter}
                onChange={(e) => setBudgetFilter(e.target.value as 'all' | 'fixed' | 'hourly')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Budget Types</option>
                <option value="fixed">Fixed Price</option>
                <option value="hourly">Hourly Rate</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'budget' | 'deadline')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="recent">Most Recent</option>
                <option value="budget">Highest Budget</option>
                <option value="deadline">Nearest Deadline</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Showing {sortedJobs.length} job{sortedJobs.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm">
          <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
          Advanced Filters
        </Button>
      </div>

      {/* Job Listings */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {sortedJobs.map(job => (
          <JobListing key={job.id} job={job} />
        ))}
      </div>

      {/* Load More */}
      {sortedJobs.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More Jobs
          </Button>
        </div>
      )}

      {/* No Results */}
      {sortedJobs.length === 0 && (
        <div className="text-center py-12">
          <FunnelIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-500">
            Try adjusting your search criteria or browse all jobs
          </p>
          <Button 
            className="mt-4" 
            onClick={() => {
              setSearchTerm('');
              setSelectedSkills([]);
              setBudgetFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
