'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { formatEther } from 'viem';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import PageContainer from '@/components/PageContainer';
import { useEscrow } from '@/hooks/useEscrow';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { useReputation } from '@/hooks/useReputation';
import { useCertificates } from '@/hooks/useCertificates';
// Dynamic icon loading to reduce initial JS bundle
import { LazyIcon } from '@/components/ui/LazyIcon';

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
  const { openConnectModal } = useConnectModal();
  const { createEscrow } = useEscrow();
  const { token } = useAuth();
  const { addNotification } = useNotifications();
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
  const [pendingEscrows, setPendingEscrows] = useState<any[]>([]);
  const [retryingIds, setRetryingIds] = useState<string[]>([]);

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
      const headers: Record<string,string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const [jobsResponse, applicationsResponse] = await Promise.all([
        fetch('/api/jobs?clientOnly=true', { headers }),
        fetch('/api/applications', { headers })
      ]);

      // Defensive: if server returned HTML (redirect/error), avoid JSON parse crash
      async function safeJson(res: Response) {
        const ct = res.headers.get('Content-Type') || '';
        const text = await res.text();
        if (ct.includes('application/json')) {
          try { return JSON.parse(text); } catch { return { success: false, error: 'Invalid JSON' }; }
        }
        if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
          return { success: false, error: 'Received HTML (possible redirect or auth error)' };
        }
        // Treat plain text as error wrapper
        return { success: false, error: text.slice(0,200) };
      }

      const jobsResult = await safeJson(jobsResponse);
      const applicationsResult = await safeJson(applicationsResponse);

      // Load blockchain data (mock functions for now)
      const [escrows, reputation, certificates] = await Promise.all([
        Promise.resolve([]).catch(() => []), // Mock: getEscrowsByUser(address)
        Promise.resolve(null).catch(() => null), // Mock: getUserReputation(address) 
        Promise.resolve([]).catch(() => []) // Mock: getFreelancerCertificates(address)
      ]);

      // Calculate stats
  const totalJobs = jobsResult.success ? (jobsResult.jobs?.length || 0) : 0;
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
  recentJobs: jobsResult.success ? (jobsResult.jobs || []).slice(0, 5) : [],
        recentEscrows: escrows.slice(0, 5)
      });
      // Derive pending escrow jobs (placeholder heuristic: jobs with status OPEN and zero activeEscrows)
      if (jobsResult.success) {
        const pending = (jobsResult.jobs || []).filter((j: any) => j.useBlockchain && !j.escrowDeployed);
        setPendingEscrows(pending.slice(0,10));
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      setStats(s => ({ ...s }));
    } finally {
      setLoading(false);
    }
  };

  const retryEscrow = async (jobId: string) => {
    if (!token) return;
    setRetryingIds(prev => [...prev, jobId]);
    try {
      const res = await fetch(`/api/jobs/${jobId}/escrow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'retry' })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Retry failed');
      addNotification({
        type: 'new_message',
        title: 'Escrow Retry Scheduled',
        message: 'Escrow marked pending again for deployment',
        data: { jobId },
        timestamp: new Date().toISOString()
      });
      // Refresh list
      await loadDashboardData();
    } catch (e: any) {
      addNotification({
        type: 'new_message',
        title: 'Escrow Retry Error',
        message: e.message || 'Unknown error',
        data: { jobId },
        timestamp: new Date().toISOString()
      });
    } finally {
      setRetryingIds(prev => prev.filter(id => id !== jobId));
    }
  };

  if (!isConnected) {
    return (
      <PageContainer>
        <Card className="text-center py-12">
          <CardContent>
            <LazyIcon name="ShieldCheckIcon" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6">
              Connect your wallet to access your blockchain-powered freelancer dashboard
            </p>
            <Button onClick={() => openConnectModal?.()}>
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
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
              <LazyIcon name="BriefcaseIcon" className="h-8 w-8 text-blue-500" />
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
              <LazyIcon name="ShieldCheckIcon" className="h-8 w-8 text-green-500" />
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
              <LazyIcon name="CurrencyDollarIcon" className="h-8 w-8 text-purple-500" />
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
              <LazyIcon name="TrophyIcon" className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {activeTab === 'overview' && pendingEscrows.length > 0 && (
        <Card className="mb-8 border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <LazyIcon name="ShieldCheckIcon" className="h-5 w-5" /> Pending Escrow Deployments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingEscrows.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-amber-900 truncate">{job.title}</p>
                  <p className="text-amber-700 text-xs">Created {new Date(job.createdAt).toLocaleDateString()} • Attempts: {job.escrowDeploymentAttempts}</p>
                </div>
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100" disabled={retryingIds.includes(job.id)} onClick={() => retryEscrow(job.id)}>
                  {retryingIds.includes(job.id) ? 'Retrying...' : 'Retry'}
                </Button>
              </div>
            ))}
            <p className="text-xs text-amber-600">Escrow flagged pending will be retried by backend process (future).</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[ 
            { id: 'overview', name: 'Overview', icon: (p:any) => <LazyIcon name="ChartBarIcon" {...p} /> },
            { id: 'escrows', name: 'Active Escrows', icon: (p:any) => <LazyIcon name="ShieldCheckIcon" {...p} /> },
            { id: 'reputation', name: 'Reputation', icon: (p:any) => <LazyIcon name="StarIcon" {...p} /> },
            { id: 'certificates', name: 'Certificates', icon: (p:any) => <LazyIcon name="TrophyIcon" {...p} /> }
          ].map((tab) => {
            const Icon:any = tab.icon as any;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-700'
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
                    <LazyIcon name="PlusIcon" className="h-4 w-4 mr-1" />
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
                                <LazyIcon name="ShieldCheckIcon" className="h-3 w-3 mr-1" />
                                Blockchain
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/jobs/${job.id}/enhanced`}>
                          <Button variant="outline" size="sm">
                            <LazyIcon name="EyeIcon" className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <LazyIcon name="BriefcaseIcon" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                          <LazyIcon name="EyeIcon" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <LazyIcon name="ShieldCheckIcon" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                <LazyIcon name="ShieldCheckIcon" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
                        <LazyIcon
                          key={i}
                          name="StarIcon"
                          className={`h-6 w-6 ${
                            i < Math.floor(stats.reputation.averageRating)
                              ? 'text-yellow-400'
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
                <LazyIcon name="StarIcon" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
                      <LazyIcon name="TrophyIcon" className="h-12 w-12 text-orange-600 mx-auto mb-4" />
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
                <LazyIcon name="TrophyIcon" className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
                <LazyIcon name="PlusIcon" className="h-5 w-5 mr-2" />
                Create New Job
              </Button>
            </Link>
            
            <Link href="/blockchain-test">
              <Button className="w-full" variant="outline">
                <LazyIcon name="ShieldCheckIcon" className="h-5 w-5 mr-2" />
                Test Blockchain Features
              </Button>
            </Link>
            
            <Link href="/profile">
              <Button className="w-full" variant="outline">
                <LazyIcon name="UserGroupIcon" className="h-5 w-5 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
  </PageContainer>
  );
}
