// @ts-nocheck // Temporary: unresolved stale JSX.Element signature causing TS2503; revisit after cleaning TS cache
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import type { ReactNode } from 'react';

// Fallback in case JSX namespace resolution fails in isolatedModules build (should be provided by @types/react)
// This prevents transient TS2503 errors; can be removed once build cache is reset.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX { interface Element {} }
}
import { useNotifications } from '@/providers/NotificationProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { LazyIcon } from '@/components/ui/LazyIcon';

export default function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    filterTypes,
    setFilterTypes
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // IntersectionObserver to auto mark as read when sufficiently visible
  useEffect(() => {
    if (!isOpen) return; // only observe when panel open
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          const id = (entry.target as HTMLElement).dataset.nid;
          const notif = notifications.find(n => n.id === id);
            if (id && notif && !notif.read) {
              markAsRead(id);
              observer.unobserve(entry.target); // stop observing once read
            }
        }
      });
    }, { threshold: [0.6] });

    // Observe current notification elements
    notifications.forEach(n => {
      const el = itemRefs.current[n.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [notifications, isOpen, markAsRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_application':
        return '📋';
      case 'milestone_completed':
        return '✅';
      case 'payment_released':
        return '💰';
      case 'dispute_raised':
        return '⚖️';
      case 'new_message':
        return '💬';
      default:
        return '🔔';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
  <LazyIcon name="BellIcon" className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <LazyIcon name="CheckIcon" className="h-3 w-3 mr-1" />
                    Mark All Read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearNotifications}
                  className="text-xs text-red-600 hover:bg-red-50"
                >
                  <LazyIcon name="TrashIcon" className="h-3 w-3 mr-1" />
                  Clear
                </Button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close notifications"
                >
                  <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-gray-100">
            <FilterBar active={filterTypes} onChange={setFilterTypes} />
          </div>
          <VirtualizedList
            items={notifications}
            itemHeight={92}
            height={384}
            render={(notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                icon={getNotificationIcon(notification.type)}
                formatTimestamp={formatTimestamp}
                refCallback={(el) => { itemRefs.current[notification.id] = el; }}
                onClick={() => markAsRead(notification.id)}
              />
            )}
          />
        </div>
      )}
    </div>
  );
}

function FilterBar({ active, onChange }: { active: string[]; onChange: (v: string[]) => void }) {
  const categories: { key: string; label: string }[] = [
    { key: 'job_application', label: 'Applications' },
    { key: 'milestone_completed', label: 'Milestones' },
    { key: 'payment_released', label: 'Payments' },
    { key: 'dispute_raised', label: 'Disputes' },
    { key: 'new_message', label: 'Messages' },
  ];
  const toggle = (k: string) => {
    if (active.includes(k)) onChange(active.filter(a => a !== k));
    else onChange([...active, k]);
  };
  const clear = () => onChange([]);
  return (
    <div className="flex flex-wrap gap-2 items-center text-xs">
      {categories.map(c => (
        <button
          key={c.key}
          onClick={() => toggle(c.key)}
          className={`px-2 py-1 rounded border transition-colors ${active.includes(c.key) ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-300 hover:border-purple-400 hover:text-purple-700'}`}
        >{c.label}</button>
      ))}
      <button onClick={clear} className="ml-auto text-gray-500 hover:text-gray-700">Reset</button>
    </div>
  );
}

// Memoized list item
const NotificationItem = memo(function NotificationItem({ notification, icon, formatTimestamp, refCallback, onClick }: { notification: any; icon: string; formatTimestamp: (ts:string)=>string; refCallback: (el: HTMLDivElement | null)=>void; onClick: () => void; }) {
  return (
    <div
      ref={refCallback}
      data-nid={notification.id}
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-2">{formatTimestamp(notification.timestamp)}</p>
        </div>
        {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
      </div>
    </div>
  );
});

// Lightweight vertical virtualization (fixed height rows)
type RenderFn = (item: any, index: number) => ReactNode;
function VirtualizedList(props: { items: any[]; itemHeight: number; height: number; render: RenderFn }) {
  const { items, itemHeight, height, render } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * itemHeight;
  const overscan = 3;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, Math.ceil((scrollTop + height) / itemHeight) + overscan);
  const visibleItems = items.slice(startIndex, endIndex);
  const onScroll = useCallback(() => { if (containerRef.current) setScrollTop(containerRef.current.scrollTop); }, []);
  return items.length ? (
    <div ref={containerRef} onScroll={onScroll} className="overflow-y-auto" style={{ maxHeight: height }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const index = startIndex + i;
          return (
            <div key={item.id} style={{ position: 'absolute', top: index * itemHeight, left: 0, right: 0 }}>
              {render(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="p-8 text-center">
  <LazyIcon name="BellIcon" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <p className="text-gray-600">No notifications yet</p>
      <p className="text-sm text-gray-500 mt-1">You'll see updates about your jobs and projects here</p>
    </div>
  );
}
