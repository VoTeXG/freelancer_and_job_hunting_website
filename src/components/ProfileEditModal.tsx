'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  title: z.string().min(1, 'Title is required'),
  bio: z.string().max(1000, 'Bio must be less than 1000 characters'),
  hourlyRate: z.number().min(0, 'Hourly rate must be positive'),
  availability: z.enum(['available', 'busy', 'unavailable']),
  location: z.string().optional(),
  experience: z.number().min(0, 'Experience must be positive'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userData: any;
  onSave: (data: ProfileFormData & { skills: string[] }) => Promise<void>;
}

export default function ProfileEditModal({ 
  isOpen, 
  onClose, 
  userData,
  onSave 
}: ProfileEditModalProps) {
  const [skills, setSkills] = useState<string[]>(userData?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: userData?.username || '',
      title: userData?.title || '',
      bio: userData?.bio || '',
      hourlyRate: userData?.hourlyRate || 0,
      availability: userData?.availability || 'available',
      location: userData?.location || '',
      experience: userData?.experience || 0,
    },
  });

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      await onSave({ ...data, skills });
      onClose();
      reset();
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
            <LazyIcon name="UserCircleIcon" className="w-12 h-12 text-gray-400" />
          </div>
          <div>
            <Button type="button" variant="outline" size="sm">
              Change Photo
            </Button>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG up to 2MB</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              {...register('username')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your username"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professional Title *
            </label>
            <input
              {...register('title')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Senior Blockchain Developer"
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            {...register('bio')}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell clients about your experience and expertise..."
          />
          {errors.bio && (
            <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
          )}
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Skills
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
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
                  <LazyIcon name="XMarkIcon" className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add a skill"
            />
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={addSkill}
            >
              <LazyIcon name="PlusIcon" className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Rate and Availability */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hourly Rate ($)
            </label>
            <input
              {...register('hourlyRate', { valueAsNumber: true })}
              type="number"
              min="0"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.hourlyRate && (
              <p className="text-red-500 text-sm mt-1">{errors.hourlyRate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability
            </label>
            <select
              {...register('availability')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Experience (Years)
            </label>
            <input
              {...register('experience', { valueAsNumber: true })}
              type="number"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            {...register('location')}
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Remote, New York, USA"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            loadingText="Saving…"
            disabled={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
