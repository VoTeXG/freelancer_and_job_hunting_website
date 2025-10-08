'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './ui/Modal';
import { Button } from './ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';

const applicationSchema = z.object({
  coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters long'),
  proposedRate: z.number().min(1, 'Rate must be greater than 0'),
  estimatedDuration: z.string().min(1, 'Please provide an estimated duration'),
  portfolio: z.string().url().optional().or(z.literal('')),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  isSubmitting: boolean;
  job: any;
  mode?: 'apply' | 'edit';
  initialValues?: Partial<ApplicationFormData>;
  submitLabel?: string;
  title?: string;
}

export default function JobApplicationModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  job,
  mode = 'apply',
  initialValues,
  submitLabel,
  title,
}: JobApplicationModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      coverLetter: '',
      proposedRate: job?.budget.amount || 0,
      estimatedDuration: '',
      portfolio: '',
    }
  });

  // When opening for edit, prefill form with provided initial values
  useEffect(() => {
    if (isOpen) {
      reset({
        coverLetter: initialValues?.coverLetter ?? '',
        proposedRate: initialValues?.proposedRate ?? (job?.budget.amount || 0),
        estimatedDuration: initialValues?.estimatedDuration ?? '',
        portfolio: initialValues?.portfolio ?? '',
      });
    }
    // We intentionally depend on isOpen, job?.budget.amount, and initialValues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, job?.budget?.amount, initialValues?.coverLetter, initialValues?.proposedRate, initialValues?.estimatedDuration, initialValues?.portfolio]);

  const coverLetter = watch('coverLetter');
  const proposedRate = watch('proposedRate');

  const handleFormSubmit = async (data: ApplicationFormData) => {
    await onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const effectiveTitle = title ?? (mode === 'edit' ? 'Edit Your Application' : 'Apply for this Job');
  const effectiveSubmit = submitLabel ?? (mode === 'edit' ? 'Save Changes' : 'Submit Application');

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={effectiveTitle}>
      <div className="space-y-6">
        {/* Job Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">{job?.title}</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
              <span>${job?.budget.amount.toLocaleString()} {job?.budget.currency}</span>
            </div>
            <div className="flex items-center space-x-1">
              <LazyIcon name="ClockIcon" className="h-4 w-4" />
              <span>{job?.duration}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter *
            </label>
            <textarea
              {...register('coverLetter')}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Explain why you're the perfect fit for this job..."
            />
            <div className="flex justify-between mt-1">
              {errors.coverLetter && (
                <p className="text-sm text-red-600">{errors.coverLetter.message}</p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {coverLetter?.length || 0}/500 characters
              </p>
            </div>
          </div>

          {/* Proposed Rate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Proposed Rate *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                {...register('proposedRate', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">
                  {job?.budget.type === 'hourly' ? '/hour' : 'total'}
                </span>
              </div>
            </div>
            {errors.proposedRate && (
              <p className="mt-1 text-sm text-red-600">{errors.proposedRate.message}</p>
            )}
            {job?.budget.type === 'fixed' && proposedRate && (
              <p className="mt-1 text-sm text-gray-600">
                {proposedRate > job.budget.amount 
                  ? `${((proposedRate - job.budget.amount) / job.budget.amount * 100).toFixed(1)}% above budget`
                  : proposedRate < job.budget.amount
                  ? `${((job.budget.amount - proposedRate) / job.budget.amount * 100).toFixed(1)}% below budget`
                  : 'Matches the client\'s budget'
                }
              </p>
            )}
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Duration *
            </label>
            <input
              {...register('estimatedDuration')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 2 weeks, 1 month, 3-5 days"
            />
            {errors.estimatedDuration && (
              <p className="mt-1 text-sm text-red-600">{errors.estimatedDuration.message}</p>
            )}
          </div>

          {/* Portfolio Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Link (Optional)
            </label>
            <input
              {...register('portfolio')}
              type="url"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://your-portfolio.com"
            />
            {errors.portfolio && (
              <p className="mt-1 text-sm text-red-600">{errors.portfolio.message}</p>
            )}
          </div>

          {/* Application Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <LazyIcon name="DocumentTextIcon" className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Tips for a strong application
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="space-y-1">
                    <li>• Address the client's specific needs</li>
                    <li>• Highlight relevant experience</li>
                    <li>• Propose a realistic timeline</li>
                    <li>• Include examples of similar work</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (mode === 'edit' ? 'Saving…' : 'Submitting...') : effectiveSubmit}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
