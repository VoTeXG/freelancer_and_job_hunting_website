'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useWallet } from '@/hooks/useWallet';
import { useProfile } from '@/hooks/useProfile';
import ProfileEditModal from '@/components/ProfileEditModal';
import { 
  UserCircleIcon,
  WalletIcon,
  StarIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

export default function ProfilePage() {
  const { wallet } = useWallet();
  const [isEditing, setIsEditing] = useState(false);
  
  // Mock token for now - in real app, this would come from authentication
  const mockToken = 'mock-jwt-token';
  const { profile, updateProfile, isLoading } = useProfile({ token: mockToken });
  
  // Sample user data - this will be replaced by profile data from the hook
  const userData = profile || {
    username: 'AliceChain',
    title: 'Senior Blockchain Developer',
    bio: 'Full-stack blockchain developer with 5+ years of experience building DeFi protocols, NFT marketplaces, and Web3 applications.',
    profilePicture: '/avatar1.jpg',
    reputation: 4.9,
    totalEarnings: 125000,
    completedJobs: 47,
    skills: ['React', 'Solidity', 'Web3.js', 'Smart Contracts', 'DeFi', 'TypeScript'],
    hourlyRate: 85,
    availability: 'available',
    languages: ['English', 'Spanish'],
    experience: 5,
    location: 'Remote',
    isFreelancer: true,
    isClient: true
  };

  const handleSaveProfile = async (profileData: any) => {
    try {
      await updateProfile(profileData);
      // Profile will be automatically updated via the hook
    } catch (error) {
      console.error('Failed to save profile:', error);
      // You can add toast notification here
    }
  };

  const recentJobs = [
    {
      id: '1',
      title: 'DeFi Protocol Development',
      client: 'CryptoCorp',
      amount: 8500,
      currency: 'USDC',
      status: 'completed',
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      rating: 5
    },
    {
      id: '2',
      title: 'NFT Marketplace Frontend',
      client: 'NFTStudio',
      amount: 6200,
      currency: 'ETH',
      status: 'completed',
      completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      rating: 4.8
    },
    {
      id: '3',
      title: 'Smart Contract Audit',
      client: 'GameStudio',
      amount: 4500,
      currency: 'USDC',
      status: 'in-progress',
      rating: null
    }
  ];

  const nftCertifications = [
    {
      id: '1',
      name: 'Certified Ethereum Developer',
      issuer: 'Ethereum Foundation',
      imageUrl: '/cert1.png',
      tokenId: '12345'
    },
    {
      id: '2',
      name: 'DeFi Specialist Certificate',
      issuer: 'ConsenSys Academy',
      imageUrl: '/cert2.png',
      tokenId: '67890'
    }
  ];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        userData={userData}
        onSave={handleSaveProfile}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="p-6 text-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                  <UserCircleIcon className="w-16 h-16 text-gray-400" />
                </div>
                <CheckBadgeIcon className="absolute bottom-0 right-1/2 transform translate-x-6 h-6 w-6 text-blue-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-1">{userData.username}</h1>
              <p className="text-blue-600 font-medium mb-2">{userData.title}</p>
              
              <div className="flex items-center justify-center space-x-1 mb-4">
                <StarIcon className="h-5 w-5 text-yellow-400" />
                <span className="font-medium">{userData.reputation}</span>
                <span className="text-gray-500">({userData.completedJobs} jobs)</span>
              </div>

              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${getAvailabilityColor(userData.availability)}`}>
                {userData.availability}
              </span>

              <div className="mt-4 space-y-2">
                <Button className="w-full" onClick={() => setIsEditing(!isEditing)}>
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <WalletIcon className="h-5 w-5" />
                <span>Wallet Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wallet.isConnected ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-mono text-sm break-all">{wallet.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Chain ID</p>
                    <p className="font-medium">{wallet.chainId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="font-bold text-green-600">${userData.totalEarnings.toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Connect your wallet to view details</p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {userData.skills.map((skill, index) => (
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

          {/* NFT Certifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AcademicCapIcon className="h-5 w-5" />
                <span>NFT Certifications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nftCertifications.map((cert) => (
                  <div key={cert.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <AcademicCapIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cert.name}</p>
                      <p className="text-xs text-gray-500">{cert.issuer}</p>
                      <p className="text-xs text-blue-600">#{cert.tokenId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Work History & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{userData.bio}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">${userData.hourlyRate}</div>
                  <div className="text-sm text-gray-500">Hourly Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{userData.completedJobs}</div>
                  <div className="text-sm text-gray-500">Jobs Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{userData.experience}Y</div>
                  <div className="text-sm text-gray-500">Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{userData.reputation}</div>
                  <div className="text-sm text-gray-500">Rating</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Work */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BriefcaseIcon className="h-5 w-5" />
                <span>Recent Work</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <div key={job.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{job.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">Client: {job.client}</p>
                    
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">${job.amount} {job.currency}</span>
                        {job.completedAt && (
                          <span className="text-gray-500 ml-2">
                            • {job.completedAt.toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {job.rating && (
                        <div className="flex items-center space-x-1">
                          <StarIcon className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-medium">{job.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
