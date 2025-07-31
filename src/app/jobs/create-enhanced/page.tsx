'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEscrow } from '@/hooks/useEscrow';
import { uploadJSONToIPFS, uploadToIPFS } from '@/lib/ipfs';
import { 
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  ShieldCheckIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline';

const jobSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters long'),
  description: z.string().min(50, 'Description must be at least 50 characters long'),
  budgetAmount: z.number().min(0.001, 'Budget must be at least 0.001 ETH'),
  budgetType: z.enum(['fixed', 'hourly']),
  currency: z.literal('ETH'), // For now, only ETH
  duration: z.string().min(1, 'Duration is required'),
  deadline: z.string().optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  requirements: z.array(z.string()).optional(),
  milestones: z.array(z.object({
    description: z.string().min(5, 'Milestone description required'),
    amount: z.number().min(0.001, 'Amount must be at least 0.001 ETH'),
    deadline: z.string().optional()
  })).min(1, 'At least one milestone is required'),
  useBlockchain: z.boolean(),
  attachments: z.array(z.any()).optional()
});

type JobFormData = z.infer<typeof jobSchema>;

interface Milestone {
  description: string;
  amount: number;
  deadline?: string;
}

export default function CreateJobPageEnhanced() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createEscrow } = useEscrow();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [ipfsUploading, setIpfsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      budgetType: 'fixed',
      currency: 'ETH',
      skills: [],
      requirements: [],
      milestones: [{ description: '', amount: 0.001 }],
      useBlockchain: true,
      attachments: []
    }
  });

  const skills = watch('skills');
  const requirements = watch('requirements');
  const budgetType = watch('budgetType');
  const milestones = watch('milestones');
  const useBlockchain = watch('useBlockchain');
  const budgetAmount = watch('budgetAmount');

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setValue('skills', [...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setValue('skills', skills.filter(skill => skill !== skillToRemove));
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setValue('requirements', [...(requirements || []), requirementInput.trim()]);
      setRequirementInput('');
    }
  };

  const removeRequirement = (index: number) => {
    const updatedRequirements = (requirements || []).filter((_, i) => i !== index);
    setValue('requirements', updatedRequirements);
  };

  const addMilestone = () => {
    setValue('milestones', [...milestones, { description: '', amount: 0.001 }]);
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const updatedMilestones = milestones.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    );
    setValue('milestones', updatedMilestones);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setValue('milestones', milestones.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachmentsToIPFS = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    
    setIpfsUploading(true);
    try {
      const uploadPromises = files.map(file => uploadToIPFS(file));
      const ipfsHashes = await Promise.all(uploadPromises);
      return ipfsHashes;
    } finally {
      setIpfsUploading(false);
    }
  };

  const onSubmit = async (data: JobFormData) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    try {
      let ipfsMetadataHash = '';
      let attachmentHashes: string[] = [];

      // Upload attachments to IPFS
      if (attachments.length > 0) {
        attachmentHashes = await uploadAttachmentsToIPFS(attachments);
      }

      // Create job metadata for IPFS
      const jobMetadata = {
        title: data.title,
        description: data.description,
        skills: data.skills,
        requirements: data.requirements,
        attachments: attachmentHashes.map((hash, index) => ({
          name: attachments[index]?.name || `attachment_${index}`,
          ipfsHash: hash,
          type: attachments[index]?.type || 'unknown'
        })),
        createdAt: new Date().toISOString(),
        creator: address
      };

      // Upload job metadata to IPFS
      ipfsMetadataHash = await uploadJSONToIPFS(jobMetadata);

      // Prepare job data for database
      const jobData = {
        title: data.title,
        description: data.description,
        budgetAmount: data.budgetAmount,
        budgetType: data.budgetType,
        currency: data.currency,
        duration: data.duration,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        skills: data.skills,
        requirements: data.requirements,
        milestones: data.milestones,
        ipfsHash: ipfsMetadataHash,
        useBlockchain: data.useBlockchain,
        creatorAddress: address
      };

      // Save to database first
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token`, // Replace with real token
        },
        body: JSON.stringify(jobData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save job to database');
      }

      // If using blockchain, create escrow contract
      if (data.useBlockchain) {
        const totalAmount = data.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
        
        try {
          await createEscrow({
            freelancer: '0x0000000000000000000000000000000000000000', // Will be set when freelancer is selected
            milestoneDescriptions: data.milestones.map(m => m.description),
            milestoneAmounts: data.milestones.map(m => parseEther(m.amount.toString()).toString()),
            deadline: data.deadline ? Math.floor(new Date(data.deadline).getTime() / 1000) : 0,
            jobDescription: data.description,
            totalAmount: parseEther(totalAmount.toString()).toString(),
            platformFee: parseEther('0.025').toString() // 2.5% platform fee
          });

          alert('Job posted successfully with blockchain escrow!');
        } catch (escrowError) {
          console.error('Escrow creation failed:', escrowError);
          alert('Job saved to database, but escrow creation failed. You can create the escrow later when a freelancer is selected.');
        }
      } else {
        alert('Job posted successfully!');
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to post job:', error);
      alert(`Failed to post job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMilestoneAmount = milestones.reduce((sum, milestone) => sum + (milestone.amount || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Post a New Job</h1>
        <p className="text-gray-600 mt-2">Create a secure, blockchain-powered freelance project</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Wallet Connection Status */}
        {!isConnected && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center space-x-3 p-4">
              <ShieldCheckIcon className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">Wallet Not Connected</p>
                <p className="text-yellow-700 text-sm">Connect your wallet to enable blockchain features</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blockchain Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
              <span>Blockchain Protection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <input
                {...register('useBlockchain')}
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={!isConnected}
              />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Use blockchain escrow system
                </label>
                <p className="text-sm text-gray-500">
                  Secure milestone-based payments with smart contracts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Build a responsive React web application"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                {...register('description')}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your project in detail..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Attachments
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <CloudArrowUpIcon className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload files</span>
                  <span className="text-xs text-gray-500">Images, documents, designs, etc.</span>
                </label>
              </div>
              
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Project Milestones</CardTitle>
            <p className="text-sm text-gray-600">Break your project into milestone-based payments</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Milestone {index + 1}</h4>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={milestone.description}
                    onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What will be delivered in this milestone?"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (ETH) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={milestone.amount}
                      onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={milestone.deadline || ''}
                      onChange={(e) => updateMilestone(index, 'deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMilestone}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mx-auto mb-1" />
              Add Another Milestone
            </button>
            
            {milestones.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Total Project Value:</span>
                  <span className="text-lg font-bold text-blue-900">{totalMilestoneAmount.toFixed(3)} ETH</span>
                </div>
              </div>
            )}
            
            {errors.milestones && (
              <p className="text-sm text-red-600">{errors.milestones.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Skills and Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills *
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., React, Node.js, Design"
                />
                <Button type="button" onClick={addSkill}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {errors.skills && (
                <p className="mt-1 text-sm text-red-600">{errors.skills.message}</p>
              )}
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Requirements
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Must have portfolio, 3+ years experience"
                />
                <Button type="button" onClick={addRequirement}>
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
              {requirements && requirements.length > 0 && (
                <ul className="space-y-2">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm text-gray-700">{requirement}</span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Duration *
                </label>
                <select
                  {...register('duration')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select duration</option>
                  <option value="1-7 days">1-7 days</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="3-4 weeks">3-4 weeks</option>
                  <option value="1-2 months">1-2 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6+ months">6+ months</option>
                </select>
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Deadline (Optional)
                </label>
                <input
                  {...register('deadline')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={isSubmitting || ipfsUploading || !isConnected}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {ipfsUploading ? 'Uploading to IPFS...' : 'Creating Job...'}
              </>
            ) : (
              'Post Job'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting || !isConnected}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
