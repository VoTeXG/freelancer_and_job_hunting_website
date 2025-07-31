'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { 
  CurrencyDollarIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const jobSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters long'),
  description: z.string().min(50, 'Description must be at least 50 characters long'),
  budgetAmount: z.number().min(1, 'Budget must be greater than 0'),
  budgetType: z.enum(['fixed', 'hourly']),
  currency: z.string().min(1, 'Currency is required'),
  duration: z.string().min(1, 'Duration is required'),
  deadline: z.string().optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  requirements: z.array(z.string()).optional(),
});

type JobFormData = z.infer<typeof jobSchema>;

export default function CreateJobPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');

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
      currency: 'USD',
      skills: [],
      requirements: [],
    }
  });

  const skills = watch('skills');
  const requirements = watch('requirements');
  const budgetType = watch('budgetType');

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

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      // Get the actual token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to post a job');
        router.push('/');
        return;
      }

      // Format data to match API expectations
      const jobData = {
        title: data.title,
        description: data.description,
        budgetAmount: data.budgetAmount,
        budgetType: data.budgetType.toUpperCase(),
        currency: data.currency,
        duration: data.duration,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        skills: data.skills,
        requirements: data.requirements || [],
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(jobData),
      });

      const result = await response.json();

      if (result.success) {
        alert('Job posted successfully!');
        router.push('/dashboard');
      } else {
        alert(result.error || 'Failed to post job');
      }
    } catch (error) {
      console.error('Failed to post job:', error);
      alert('Failed to post job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Post a New Job</h1>
        <p className="text-gray-600 mt-2">Find the perfect freelancer for your project</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                placeholder="Describe your project in detail. Include what you need, your expectations, and any specific requirements..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Duration *
              </label>
              <input
                {...register('duration')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2 weeks, 1-3 months, Less than 1 week"
              />
              {errors.duration && (
                <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Deadline (Optional)
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  {...register('deadline')}
                  type="date"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CurrencyDollarIcon className="h-5 w-5" />
              <span>Budget</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Budget Type *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    {...register('budgetType')}
                    type="radio"
                    value="fixed"
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded-full mr-3 ${
                    budgetType === 'fixed' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {budgetType === 'fixed' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Fixed Price</h3>
                    <p className="text-sm text-gray-600">Pay a fixed amount for the entire project</p>
                  </div>
                </label>

                <label className="relative flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    {...register('budgetType')}
                    type="radio"
                    value="hourly"
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 border-2 rounded-full mr-3 ${
                    budgetType === 'hourly' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {budgetType === 'hourly' && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Hourly Rate</h3>
                    <p className="text-sm text-gray-600">Pay per hour of work</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {budgetType === 'hourly' ? 'Max Hourly Rate *' : 'Budget Amount *'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register('budgetAmount', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                {errors.budgetAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetAmount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Skills *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., React, Node.js, Python"
                />
                <Button type="button" onClick={addSkill} variant="outline">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {errors.skills && (
              <p className="text-sm text-red-600">{errors.skills.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Requirements (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Requirement
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Must be available during EST business hours"
                />
                <Button type="button" onClick={addRequirement} variant="outline">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {requirements && requirements.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Requirements:</p>
                <ul className="space-y-2">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                      <span className="flex-1 text-sm text-gray-700">{requirement}</span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post Job'}
          </Button>
        </div>
      </form>
    </div>
  );
}
