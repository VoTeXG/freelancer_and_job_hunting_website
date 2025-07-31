'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (isConnected && address) {
      // Initialize Socket.IO connection
      const socketInstance = io({
        path: '/api/socket',
        addTrailingSlash: false,
      });

      socketInstance.on('connect', () => {
        console.log('Connected to notification server');
        // Join user's personal room
        socketInstance.emit('join-user-room', address);
      });

      socketInstance.on('notification', (notificationData) => {
        const notification: Notification = {
          id: `notification_${Date.now()}_${Math.random()}`,
          ...notificationData,
          read: false,
        };
        
        setNotifications(prev => [notification, ...prev]);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
          });
        }
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
      };
    }
  }, [address, isConnected]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addNotification = (notificationData: Omit<Notification, 'id' | 'read'>) => {
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random()}`,
      ...notificationData,
      read: false,
    };
    setNotifications(prev => [notification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      socket,
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
