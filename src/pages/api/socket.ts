import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import type { Socket } from 'socket.io';
import { verifyAccessToken } from '@/lib/auth';
import { recordMetricEvent } from '@/lib/metrics';

interface AuthedSocket extends Socket {
  userId?: string;
  address?: string;
  roles?: string[];
  lastPresenceAt?: number;
}

interface PendingNotification {
  id: string; // server generated id
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  retries: number;
  lastSent: number;
  targetRoom: string;
}

// Simple in-memory presence & rate limit / retry structures
const presence: Record<string, { socketId: string; lastPing: number }> = {};
const rateWindowMs = 10_000; // 10s window
const rateLimit = 30; // max events per window per user (excluding acks/ping)
const userEventTimestamps: Record<string, number[]> = {};
const pendingNotifications: Record<string, PendingNotification> = {};
const MAX_RETRIES = 5;
const RETRY_BASE_DELAY_MS = 1500; // exponential backoff base

let io: Server;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SocketHandler = (req: NextApiRequest, res: NextApiResponse & { socket: any }) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.IO server...');
    
    io = new Server(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
      },
    });
    // Authentication middleware (optional but recommended)
    io.use((socket: AuthedSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers['x-access-token'];
      if (token && typeof token === 'string') {
        try {
          const access = verifyAccessToken(token);
          if (access) {
            socket.userId = access.sub;
            const scopeVal: unknown = (access as any).scope; // eslint-disable-line @typescript-eslint/no-explicit-any
            if (typeof scopeVal === 'string') {
              socket.roles = scopeVal.split(' ');
            } else if (Array.isArray(scopeVal)) {
              socket.roles = scopeVal.map(String);
            } else {
              socket.roles = [];
            }
          }
        } catch {
          // ignore invalid token (treat as anonymous)
        }
      }
      next();
    });

    function enforceRate(socket: AuthedSocket, label: string): boolean {
      const id = socket.userId || socket.id; // fallback to connection id
      const now = Date.now();
      const windowStart = now - rateWindowMs;
      const arr = userEventTimestamps[id] ||= [];
      // prune old
      while (arr.length && arr[0] < windowStart) arr.shift();
      if (arr.length >= rateLimit) {
        recordMetricEvent('realtime.rate_limited', { id, label });
        socket.emit('rate_limited', { retryAfterMs: rateWindowMs, label });
        return false;
      }
      arr.push(now);
      return true;
    }

    function scheduleRetry(p: PendingNotification) {
      if (p.retries >= MAX_RETRIES) {
        recordMetricEvent('realtime.notification.giveup', { id: p.id, target: p.targetRoom });
        delete pendingNotifications[p.id];
        return;
      }
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, p.retries); // exponential backoff
      setTimeout(() => {
        const ref = pendingNotifications[p.id];
        if (!ref) return;
        ref.retries += 1;
        ref.lastSent = Date.now();
        io.to(ref.targetRoom).emit('notification', ref.payload, ref.id);
        scheduleRetry(ref);
      }, delay);
    }

    io.on('connection', (socket: AuthedSocket) => {
      recordMetricEvent('realtime.connection');
      socket.lastPresenceAt = Date.now();

      // Join personal room via explicit event (with rate limiting)
      socket.on('join-user-room', (userAddress: string) => {
        if (!enforceRate(socket, 'join')) return;
        socket.address = userAddress;
        socket.join(`user:${userAddress}`);
        recordMetricEvent('realtime.join_room', { room: `user:${userAddress}` });
      });

      // Presence ping from client
      socket.on('presence:ping', () => {
        socket.lastPresenceAt = Date.now();
        if (socket.address) {
          presence[socket.address] = { socketId: socket.id, lastPing: socket.lastPresenceAt };
        }
      });

      // Provide presence snapshot (limited, rate-limited)
      socket.on('presence:who', (addresses: string[], cb?: (resp: Record<string, boolean>) => void) => {
        if (!enforceRate(socket, 'presence_who')) return;
        const out: Record<string, boolean> = {};
        const now = Date.now();
        for (const a of addresses || []) {
          const p = presence[a];
            out[a] = !!p && (now - p.lastPing) < 60_000; // active if ping < 60s
        }
        cb && cb(out);
      });

      // Generic notification events => unify into a single handler style to reduce surface
      const forward = (type: string, builder: (data: any) => { targets: string[]; message: string; payload: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        socket.on(type, (data: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          if (!enforceRate(socket, type)) return;
          try {
            const { targets, message, payload } = builder(data);
            for (const t of targets) {
              const room = `user:${t}`;
              const id = `ntf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              const ntfPayload = { ...payload, title: payload.title, message, timestamp: new Date().toISOString() };
              pendingNotifications[id] = { id, payload: ntfPayload, retries: 0, lastSent: Date.now(), targetRoom: room };
              io.to(room).emit('notification', ntfPayload, id);
              scheduleRetry(pendingNotifications[id]);
            }
          } catch (e) {
            recordMetricEvent('realtime.emit.error', { type, err: (e as Error).message });
          }
        });
      };

      forward('job-application', d => ({
        targets: [d.clientAddress],
        message: `Someone applied for your job: ${d.jobTitle}`,
        payload: { type: 'job_application', data: d }
      }));
      forward('milestone-completed', d => ({
        targets: [d.clientAddress],
        message: `Milestone "${d.milestoneDescription}" has been completed`,
        payload: { type: 'milestone_completed', data: d }
      }));
      forward('payment-released', d => ({
        targets: [d.freelancerAddress],
        message: `You received ${d.amount} ETH for milestone completion`,
        payload: { type: 'payment_released', data: d }
      }));
      forward('dispute-raised', d => ({
        targets: [d.clientAddress, d.freelancerAddress],
        message: `A dispute has been raised for project: ${d.projectTitle}`,
        payload: { type: 'dispute_raised', data: d }
      }));
      forward('new-message', d => ({
        targets: [d.recipientAddress],
        message: `You have a new message from ${d.senderName}`,
        payload: { type: 'new_message', data: d }
      }));

      // Client ACK for notifications to cancel retry schedule
      socket.on('notification:ack', (id: string) => {
        const pending = pendingNotifications[id];
        if (pending) {
          delete pendingNotifications[id];
          recordMetricEvent('realtime.notification.ack', { id });
        }
      });

      socket.on('disconnect', () => {
        recordMetricEvent('realtime.disconnect');
        if (socket.address) delete presence[socket.address];
      });
    });
    
    res.socket.server.io = io;
  }
  
  res.end();
};

export default SocketHandler;

export { io };
