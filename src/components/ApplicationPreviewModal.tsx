'use client';

import Link from 'next/link';
import Modal from './ui/Modal';
import { Button } from './ui/Button';
import { LazyIcon } from './ui/LazyIcon';

interface ApplicationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any | null;
  job: any;
}

function normalizeStatus(status: unknown) {
  const value = typeof status === 'string' ? status.toUpperCase() : '';
  switch (value) {
    case 'ACCEPTED':
      return { label: 'ACCEPTED', className: 'bg-green-100 text-green-700' };
    case 'REJECTED':
      return { label: 'REJECTED', className: 'bg-red-100 text-red-700' };
    case 'WITHDRAWN':
      return { label: 'WITHDRAWN', className: 'bg-gray-200 text-gray-700' };
    default:
      return { label: value || 'PENDING', className: 'bg-blue-100 text-blue-700' };
  }
}

function formatAppliedAt(appliedAt: unknown) {
  if (!appliedAt) return 'Unknown';
  const date = new Date(appliedAt as string);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export default function ApplicationPreviewModal({
  isOpen,
  onClose,
  application,
  job,
}: ApplicationPreviewModalProps) {
  if (!application) {
    return null;
  }

  const { label, className } = normalizeStatus(application.status);
  const freelancer = application.freelancer || {};
  const profile = freelancer.profile || {};

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Application Preview" size="lg">
      <div className="space-y-6">
        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{freelancer.username || 'Unknown freelancer'}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {Array.isArray(profile.skills) && profile.skills.length > 0
                  ? profile.skills.slice(0, 5).join(', ')
                  : 'No skills listed'}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
              {label}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />
              <div>
                <p className="font-medium">${application.proposedRate?.toLocaleString?.() ?? application.proposedRate}</p>
                <p className="text-xs text-gray-500">Proposed rate ({job?.budgetType === 'HOURLY' ? 'hourly' : 'fixed'})</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LazyIcon name="ClockIcon" className="h-4 w-4" />
              <div>
                <p className="font-medium">{application.estimatedDuration || 'Not provided'}</p>
                <p className="text-xs text-gray-500">Estimated duration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LazyIcon name="CalendarIcon" className="h-4 w-4" />
              <div>
                <p className="font-medium">{formatAppliedAt(application.appliedAt)}</p>
                <p className="text-xs text-gray-500">Applied on</p>
              </div>
            </div>
            {profile.hourlyRate && (
              <div className="flex items-center gap-2">
                <LazyIcon name="ChartBarIcon" className="h-4 w-4" />
                <div>
                  <p className="font-medium">${profile.hourlyRate.toLocaleString?.() ?? profile.hourlyRate} / hr</p>
                  <p className="text-xs text-gray-500">Freelancer rate</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Cover Letter</h4>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 whitespace-pre-line">
            {application.coverLetter || 'No cover letter provided.'}
          </div>
        </section>

        <section className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-800">Additional Details</h4>
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-2">
            {application.portfolio ? (
              <a
                href={application.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <LazyIcon name="ArrowTopRightOnSquareIcon" className="h-4 w-4" />
                View portfolio
              </a>
            ) : (
              <p className="text-gray-500">No portfolio link provided.</p>
            )}
            <p className="text-gray-500">
              Proposed for: {job?.title || 'Job'}
            </p>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <Link href={`/jobs/${job?.id ?? ''}/applications/${application.id}`}>
              Open Full View
            </Link>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
