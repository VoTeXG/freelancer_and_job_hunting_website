'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { useAccount } from 'wagmi';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: 'job_application' | 'milestone_completed' | 'payment_released' | 'dispute_raised' | 'new_message';
  title: string;
  message: string;
  data: Record<string, unknown>; // eslint-disable-line @typescript-eslint/no-explicit-any
  timestamp: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  socket: Socket | null;
  filterTypes: string[];
  setFilterTypes: (types: string[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { push } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]); // empty => no filter

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!(isConnected && address)) return;

    let stopped = false;
    const connect = () => {
      const socketInstance = io({
        path: '/api/socket',
        addTrailingSlash: false,
        // Send auth token if available (placeholder: localStorage?)
        auth: () => ({ token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : undefined })
      });

      socketInstance.on('connect', () => {
        reconnectAttempts.current = 0;
        console.log('Connected to notification server');
        socketInstance.emit('join-user-room', address);
        // Start heartbeat
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
          socketInstance.emit('presence:ping');
        }, 25_000); // 25s heartbeat
      });

      socketInstance.on('disconnect', () => {
        if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      });

      // Rate limit notifications from server (client side guard) if needed
      const lastNotfTimes: number[] = [];
      const clientRateWindow = 5_000; // 5s
      const clientMaxInWindow = 25;

      socketInstance.on('notification', (notificationData, serverId?: string) => {
        const now = Date.now();
        // prune
        while (lastNotfTimes.length && lastNotfTimes[0] < now - clientRateWindow) lastNotfTimes.shift();
        if (lastNotfTimes.length >= clientMaxInWindow) {
          // Drop & ack to suppress retries
          if (serverId) socketInstance.emit('notification:ack', serverId);
          return;
        }
        lastNotfTimes.push(now);
        const notification: Notification = {
          id: serverId || `notification_${now}_${Math.random()}`,
          ...notificationData,
          read: false,
        };
        setNotifications(prev => [notification, ...prev]);
        if (serverId) socketInstance.emit('notification:ack', serverId);
        push({
          title: notification.title,
          message: notification.message,
          variant: mapTypeToVariant(notification.type),
          duration: 5000
        });
        if (Notification.permission === 'granted') {
          new Notification(notification.title, { body: notification.message, icon: '/favicon.ico' });
        }
      });

      socketInstance.on('rate_limited', (info) => {
        console.warn('Realtime rate limited', info);
      });

      socketInstance.on('connect_error', (err) => {
        reconnectAttempts.current += 1;
        const attempt = reconnectAttempts.current;
        const backoff = Math.min(30_000, 1000 * Math.pow(2, attempt));
        console.warn(`Socket connect error (${attempt}) retrying in ${backoff}ms`, err.message);
        setTimeout(() => {
          if (!stopped) connect();
        }, backoff + Math.random() * 500); // jitter
      });

      setSocket(socketInstance);
    };
    connect();

    return () => {
      stopped = true;
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      if (socket) socket.disconnect();
      setSocket(null);
    };
  }, [address, isConnected]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'read'>) => {
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random()}`,
      ...notificationData,
      read: false,
    };
    setNotifications(prev => {
      const next = [notification, ...prev];
      // Cap to last 500 notifications to prevent unbounded memory growth
      if (next.length > 500) return next.slice(0, 500);
      return next;
    });
    push({ title: notification.title, message: notification.message, variant: mapTypeToVariant(notification.type), duration: 4500 });
  }, [push]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? (n.read ? n : { ...n, read: true }) : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => n.read ? n : { ...n, read: true }));
  }, []);

  const clearNotifications = useCallback(() => { setNotifications([]); }, []);

  const unreadCount = useMemo(() => notifications.reduce((c,n)=>c + (n.read ? 0 : 1), 0), [notifications]);

  // Derived filtered notifications
  const effectiveNotifications = useMemo(() => filterTypes.length ? notifications.filter(n => filterTypes.includes(n.type)) : notifications, [notifications, filterTypes]);

  return (
    <NotificationContext.Provider value={{
      notifications: effectiveNotifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      socket,
      filterTypes,
      setFilterTypes,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

function mapTypeToVariant(type: Notification['type']): 'success' | 'error' | 'info' | 'warning' {
  switch (type) {
    case 'job_application': return 'info';
    case 'milestone_completed': return 'success';
    case 'payment_released': return 'success';
    case 'dispute_raised': return 'warning';
    case 'new_message': return 'info';
    default: return 'info';
  }
}
