'use client';
// LazyIcon: dynamically load heroicons on demand to reduce initial bundle size.
import React, { Suspense } from 'react';

export interface LazyIconProps {
  name: string;
  className?: string;
  variant?: 'outline' | 'solid';
}
type IconProps = { className?: string };

// Whitelist only icons we actually use across the app (keeps chunk sizes smaller)
const allowed = new Set([
  'BriefcaseIcon', 'ShieldCheckIcon', 'CurrencyDollarIcon', 'TrophyIcon', 'BellIcon', 'CheckIcon', 'XMarkIcon', 'TrashIcon', 'UserGroupIcon', 'ChartBarIcon', 'ClockIcon', 'StarIcon', 'PlusIcon', 'EyeIcon',
  'MapPinIcon', 'CalendarIcon', 'Bars3Icon', 'UserCircleIcon', 'ChevronDownIcon', 'MagnifyingGlassIcon', 'DocumentIcon', 'PaperAirplaneIcon', 'CheckBadgeIcon', 'WalletIcon', 'AcademicCapIcon', 'GlobeAltIcon', 'PencilIcon', 'UserIcon',
  'ArrowTrendingUpIcon', 'ArrowTrendingDownIcon', 'CreditCardIcon', 'PaperClipIcon', 'FaceSmileIcon', 'PhoneIcon', 'VideoCameraIcon', 'AdjustmentsHorizontalIcon', 'FunnelIcon', 'CloudArrowUpIcon',
  'ChatBubbleLeftRightIcon', 'ArrowsRightLeftIcon', 'CheckCircleIcon', 'ExclamationTriangleIcon', 'DocumentTextIcon', 'ArrowTopRightOnSquareIcon', 'DocumentMagnifyingGlassIcon',
  'SparklesIcon', 'BoltIcon', 'IdentificationIcon', 'RocketLaunchIcon'
]);

// Dynamic import loaders per variant using static paths to avoid webpack expression warnings.
const loadOutline = () => import('@heroicons/react/24/outline');
const loadSolid = () => import('@heroicons/react/24/solid');

export function LazyIcon({ name, className, variant = 'outline' }: LazyIconProps) {
  if (!allowed.has(name)) return null;
  // Cache lazy components by key to avoid re-creating them on every render
  const key = `${variant}:${name}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache: any = (globalThis as any).__LAZY_ICON_CACHE__ || ((globalThis as any).__LAZY_ICON_CACHE__ = new Map());
  let Icon = cache.get(key) as React.LazyExoticComponent<React.ComponentType<IconProps>> | undefined;
  if (!Icon) {
    Icon = React.lazy(async () => {
      const mod = variant === 'solid' ? await loadSolid() : await loadOutline();
      const C = (mod as any)[name] as React.ComponentType<IconProps> | undefined;
      return { default: (C ?? (() => null)) as React.ComponentType<IconProps> };
    }) as React.LazyExoticComponent<React.ComponentType<IconProps>>;
    cache.set(key, Icon);
  }
  return (
    <Suspense fallback={<span className={className} />}>{React.createElement(Icon as any, { className })}</Suspense>
  );
}
