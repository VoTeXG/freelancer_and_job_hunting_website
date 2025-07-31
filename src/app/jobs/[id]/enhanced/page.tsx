'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEscrow } from '@/hooks/useEscrow';
import { useReputation } from '@/hooks/useReputation';
import { useCertificates } from '@/hooks/useCertificates';
import { getFromIPFS, getIPFSGatewayUrl } from '@/lib/ipfs';
import {
  ClockIcon,
  CurrencyDollarIcon,
  UserIcon,
  CalendarIcon,
  ShieldCheckIcon,
  DocumentIcon,
  StarIcon,
  ChartBarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

interface Job {
  id: string;
  title: string;
  description: string;
  budgetAmount: number;
  budgetType: string;
  currency: string;
  duration: string;
  deadline?: string;
  skills: string[];
  requirements?: string[];
  milestones?: Array<{
    description: string;
    amount: number;
    deadline?: string;
  }>;
  ipfsHash?: string;
  useBlockchain: boolean;
  creatorAddress?: string;
  escrowContractAddress?: string;
  status: string;
  createdAt: string;
}

interface EscrowInfo {
  totalAmount: bigint;
  client: string;
  freelancer: string;
  milestones: Array<{
    description: string;
    amount: bigint;
    completed: boolean;
    approved: boolean;
  }>;
  isActive: boolean;
}

export default function JobDetailEnhanced() {
  const params = useParams();
  const { address, isConnected } = useAccount();
  const { createEscrow } = useEscrow();
  const { submitReview } = useReputation();
  const { mintCertificate } = useCertificates();
  
  const [job, setJob] = useState<Job | null>(null);
  const [escrowInfo, setEscrowInfo] = useState<EscrowInfo | null>(null);
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null);
  const [clientReputation, setClientReputation] = useState<any>(null);
  const [clientCertificates, setClientCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params?.id) {
      loadJobDetails(params.id as string);
    }
  }, [params?.id]);

  const loadJobDetails = async (jobId: string) => {
    try {
      setLoading(true);
      
      // Load job from database
      const response = await fetch(`/api/jobs/${jobId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Job not found');
      }
      
      const jobData = result.data;
      setJob(jobData);

      // Load IPFS metadata if available
      if (jobData.ipfsHash) {
        try {
          const metadata = await getFromIPFS(jobData.ipfsHash);
          setIpfsMetadata(metadata);
        } catch (ipfsError) {
          console.error('Failed to load IPFS metadata:', ipfsError);
        }
      }

      // Load blockchain data if job uses blockchain (mock for now)
      if (jobData.useBlockchain && jobData.escrowContractAddress && isConnected) {
        try {
          // Mock: const escrowData = await getEscrowInfo(jobData.escrowContractAddress);
          const escrowData = null; // Placeholder
          setEscrowInfo(escrowData);
        } catch (blockchainError) {
          console.error('Failed to load blockchain data:', blockchainError);
        }
      }

      // Load client reputation and certificates (mock for now)
      if (jobData.creatorAddress && isConnected) {
        try {
          // Mock functions - would normally call:
          // getUserReputation(jobData.creatorAddress),
          // getFreelancerCertificates(jobData.creatorAddress)
          const [reputation, certificates] = await Promise.all([
            Promise.resolve(null),
            Promise.resolve([])
          ]);
          setClientReputation(reputation);
          setClientCertificates(certificates);
        } catch (reputationError) {
          console.error('Failed to load client reputation:', reputationError);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyJob = async () => {
    if (!job || !isConnected || !address) {
      alert('Please connect your wallet to apply');
      return;
    }

    try {
      // Create job application
      const applicationData = {
        jobId: job.id,
        freelancerAddress: address,
        coverLetter: 'Application submitted through blockchain interface',
        proposedAmount: job.budgetAmount,
        proposedTimeline: job.duration,
      };

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`, // Replace with real token
        },
        body: JSON.stringify(applicationData),
      });

      const result = await response.json();

      if (result.success) {
        alert('Application submitted successfully!');
      } else {
        alert(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Failed to apply for job:', error);
      alert('Failed to submit application');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600">{error || 'Job not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl text-gray-900">{job.title}</CardTitle>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Posted {new Date(job.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {job.duration}
                    </span>
                    {job.useBlockchain && (
                      <span className="flex items-center text-green-600">
                        <ShieldCheckIcon className="h-4 w-4 mr-1" />
                        Blockchain Protected
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {job.budgetAmount} {job.currency}
                  </div>
                  <div className="text-sm text-gray-600">{job.budgetType} rate</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Information */}
          {job.useBlockchain && escrowInfo && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <ShieldCheckIcon className="h-6 w-6 mr-2" />
                  Blockchain Escrow Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-green-700">Total Escrow Amount</p>
                    <p className="text-lg font-bold text-green-900">
                      {formatEther(escrowInfo.totalAmount)} ETH
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-700">Escrow Status</p>
                    <p className="text-lg font-bold text-green-900">
                      {escrowInfo.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>

                {escrowInfo.milestones.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-2">Project Milestones</p>
                    <div className="space-y-2">
                      {escrowInfo.milestones.map((milestone, index) => (
                        <div key={index} className="bg-white border border-green-200 rounded p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{milestone.description}</p>
                              <p className="text-sm text-green-600">
                                {formatEther(milestone.amount)} ETH
                              </p>
                            </div>
                            <div className="text-right">
                              {milestone.completed ? (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                  Completed
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Milestones (from database) */}
          {job.milestones && job.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Project Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {job.milestones.map((milestone, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            Milestone {index + 1}: {milestone.description}
                          </h4>
                          {milestone.deadline && (
                            <p className="text-sm text-gray-600 mt-1">
                              Due: {new Date(milestone.deadline).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">
                            {milestone.amount} {job.currency}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* IPFS Attachments */}
          {ipfsMetadata?.attachments && ipfsMetadata.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentIcon className="h-6 w-6 mr-2" />
                  Project Attachments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ipfsMetadata.attachments.map((attachment: any, index: number) => (
                    <a
                      key={index}
                      href={getIPFSGatewayUrl(attachment.ipfsHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <DocumentIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-sm text-gray-600">{attachment.type}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills and Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Skills & Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Required Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {job.requirements && job.requirements.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Additional Requirements</h4>
                  <ul className="space-y-1">
                    {job.requirements.map((requirement, index) => (
                      <li key={index} className="text-gray-700">• {requirement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Apply Button */}
          <Card>
            <CardContent className="p-6">
              <Button
                onClick={handleApplyJob}
                disabled={!isConnected}
                className="w-full mb-4"
              >
                {!isConnected ? 'Connect Wallet to Apply' : 'Apply for Job'}
              </Button>
              
              {!isConnected && (
                <p className="text-sm text-gray-600 text-center">
                  Connect your wallet to apply and access blockchain features
                </p>
              )}
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="h-6 w-6 mr-2" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.creatorAddress && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Wallet Address</p>
                  <p className="text-sm text-gray-600 font-mono">
                    {job.creatorAddress.slice(0, 6)}...{job.creatorAddress.slice(-4)}
                  </p>
                </div>
              )}

              {clientReputation && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Reputation</p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(clientReputation.averageRating)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({clientReputation.totalReviews} reviews)
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <ChartBarIcon className="h-4 w-4 text-blue-500" />
                      <span>Reputation Score: {clientReputation.reputationScore}</span>
                    </div>
                  </div>
                </div>
              )}

              {clientCertificates.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Certificates</p>
                  <div className="space-y-2">
                    {clientCertificates.slice(0, 3).map((cert, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <TrophyIcon className="h-4 w-4 text-gold-500" />
                        <span className="text-gray-600">
                          {cert.skillLevel} Level Certificate
                        </span>
                      </div>
                    ))}
                    {clientCertificates.length > 3 && (
                      <p className="text-sm text-gray-600">
                        +{clientCertificates.length - 3} more certificates
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Job Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className="text-sm font-medium capitalize">{job.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Posted</span>
                <span className="text-sm font-medium">
                  {new Date(job.createdAt).toLocaleDateString()}
                </span>
              </div>
              {job.deadline && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Deadline</span>
                  <span className="text-sm font-medium">
                    {new Date(job.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Budget Type</span>
                <span className="text-sm font-medium capitalize">{job.budgetType}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
