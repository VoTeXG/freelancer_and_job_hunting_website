'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEscrow } from '@/hooks/useEscrow';
import { useReputation } from '@/hooks/useReputation';
import { useCertificates } from '@/hooks/useCertificates';
import {
  BriefcaseIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  TrophyIcon,
  ShieldCheckIcon,
  ClockIcon,
  StarIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalJobs: number;
  activeEscrows: number;
  totalEarnings: number;
  completedProjects: number;
  reputation: any;
  certificates: any[];
  recentJobs: any[];
  recentEscrows: any[];
}

export default function DashboardEnhanced() {
  const { address, isConnected } = useAccount();
  const { createEscrow } = useEscrow();
  const { submitReview } = useReputation();
  const { mintCertificate } = useCertificates();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalJobs: 0,
    activeEscrows: 0,
    totalEarnings: 0,
    completedProjects: 0,
    reputation: null,
    certificates: [],
    recentJobs: [],
    recentEscrows: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'escrows' | 'reputation' | 'certificates'>('overview');

  useEffect(() => {
    if (isConnected && address) {
      loadDashboardData();
    }
  }, [isConnected, address]);

  const loadDashboardData = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      
      // Load traditional data from database
      const [jobsResponse, applicationsResponse] = await Promise.all([
        fetch('/api/jobs', {
          headers: { 'Authorization': 'Bearer mock-token' }
        }),
        fetch('/api/applications', {
          headers: { 'Authorization': 'Bearer mock-token' }
        })
      ]);

      const jobsResult = await jobsResponse.json();
      const applicationsResult = await applicationsResponse.json();

      // Load blockchain data (mock functions for now)
      const [escrows, reputation, certificates] = await Promise.all([
        Promise.resolve([]).catch(() => []), // Mock: getEscrowsByUser(address)
        Promise.resolve(null).catch(() => null), // Mock: getUserReputation(address) 
        Promise.resolve([]).catch(() => []) // Mock: getFreelancerCertificates(address)
      ]);

      // Calculate stats
      const totalJobs = jobsResult.success ? jobsResult.data.length : 0;
      const activeEscrows = escrows.filter((escrow: any) => escrow.isActive).length;
      const completedProjects = certificates.length;
      const totalEarnings = escrows.reduce((sum: number, escrow: any) => {
        return sum + parseFloat(formatEther(escrow.totalAmount));
      }, 0);

      setStats({
        totalJobs,
        activeEscrows,
        totalEarnings,
        completedProjects,
        reputation,
        certificates,
        recentJobs: jobsResult.success ? jobsResult.data.slice(0, 5) : [],
        recentEscrows: escrows.slice(0, 5)
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to access your blockchain-powered freelancer dashboard
            </p>
            <Button>Connect Wallet</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening with your blockchain-powered freelance work.
        </p>
        <div className="mt-4 text-sm text-gray-600">
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalJobs}</p>
              </div>
              <BriefcaseIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active Escrows</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeEscrows}</p>
              </div>
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.totalEarnings.toFixed(3)} ETH
                </p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Certificates</p>
                <p className="text-3xl font-bold text-orange-600">{stats.certificates.length}</p>
              </div>
              <TrophyIcon className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'escrows', name: 'Active Escrows', icon: ShieldCheckIcon },
            { id: 'reputation', name: 'Reputation', icon: StarIcon },
            { id: 'certificates', name: 'Certificates', icon: TrophyIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Jobs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Jobs</CardTitle>
                <Link href="/jobs/create-enhanced">
                  <Button size="sm">
                    <PlusIcon className="h-4 w-4 mr-1" />
                    New Job
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {stats.recentJobs.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentJobs.map((job: any) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 line-clamp-1">{job.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {job.budgetAmount} {job.currency} • {job.duration}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              job.status === 'active' ? 'bg-green-100 text-green-800' :
                              job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
                            </span>
                            {job.useBlockchain && (
                              <span className="flex items-center text-xs text-green-600">
                                <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                Blockchain
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/jobs/${job.id}/enhanced`}>
                          <Button variant="outline" size="sm">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No jobs posted yet</p>
                  <Link href="/jobs/create-enhanced">
                    <Button className="mt-4">Create Your First Job</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Escrows */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Escrows</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentEscrows.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentEscrows.map((escrow: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            Escrow Contract #{index + 1}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatEther(escrow.totalAmount)} ETH
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              escrow.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {escrow.isActive ? 'Active' : 'Completed'}
                            </span>
                            <span className="text-xs text-gray-600">
                              {escrow.milestones.length} milestones
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No active escrows</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'escrows' && (
        <Card>
          <CardHeader>
            <CardTitle>Active Escrow Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentEscrows.filter((escrow: any) => escrow.isActive).length > 0 ? (
              <div className="space-y-6">
                {stats.recentEscrows.filter((escrow: any) => escrow.isActive).map((escrow: any, index: number) => (
                  <div key={index} className="border border-green-200 bg-green-50 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-green-900">
                          Escrow Contract #{index + 1}
                        </h3>
                        <p className="text-green-700">
                          Total Amount: {formatEther(escrow.totalAmount)} ETH
                        </p>
                      </div>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                        Active
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-green-800">Milestones:</h4>
                      {escrow.milestones.map((milestone: any, mIndex: number) => (
                        <div key={mIndex} className="bg-white border border-green-200 rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{milestone.description}</p>
                              <p className="text-sm text-green-600">
                                {formatEther(milestone.amount)} ETH
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              milestone.completed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {milestone.completed ? 'Completed' : 'In Progress'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShieldCheckIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Escrows</h3>
                <p className="text-gray-600">
                  Create blockchain-protected jobs to start using escrow contracts
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reputation' && (
        <Card>
          <CardHeader>
            <CardTitle>Reputation & Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.reputation ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-6 w-6 ${
                            i < Math.floor(stats.reputation.averageRating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.reputation.averageRating.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600">Average Rating</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.reputation.totalReviews}
                    </p>
                    <p className="text-sm text-gray-600">Total Reviews</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.reputation.reputationScore}
                    </p>
                    <p className="text-sm text-gray-600">Reputation Score</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <StarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reputation Data</h3>
                <p className="text-gray-600">
                  Complete projects to start building your on-chain reputation
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'certificates' && (
        <Card>
          <CardHeader>
            <CardTitle>Work Certificates (NFTs)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.certificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.certificates.map((certificate: any, index: number) => (
                  <div key={index} className="border border-orange-200 bg-orange-50 rounded-lg p-6">
                    <div className="text-center">
                      <TrophyIcon className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                      <h3 className="font-medium text-orange-900 mb-2">
                        Certificate #{certificate.tokenId}
                      </h3>
                      <p className="text-sm text-orange-700 mb-4">
                        Skill Level: {certificate.skillLevel}
                      </p>
                      <div className="space-y-2 text-sm text-orange-600">
                        <p>Project Value: {formatEther(certificate.projectValue)} ETH</p>
                        <p>Skills: {certificate.skillsCount} demonstrated</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Yet</h3>
                <p className="text-gray-600">
                  Complete blockchain-protected projects to earn NFT certificates
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/jobs/create-enhanced">
              <Button className="w-full" variant="outline">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New Job
              </Button>
            </Link>
            
            <Link href="/blockchain-test">
              <Button className="w-full" variant="outline">
                <ShieldCheckIcon className="h-5 w-5 mr-2" />
                Test Blockchain Features
              </Button>
            </Link>
            
            <Link href="/profile">
              <Button className="w-full" variant="outline">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
