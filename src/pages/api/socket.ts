import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';

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
    
    io.on('connection', (socket) => {
      console.log('User connected:', socket.id);
      
      // Join user to their personal room
      socket.on('join-user-room', (userAddress: string) => {
        socket.join(`user:${userAddress}`);
        console.log(`User ${userAddress} joined their room`);
      });
      
      // Handle job application notifications
      socket.on('job-application', (data: {
        jobId: string;
        clientAddress: string;
        freelancerName: string;
        jobTitle: string;
      }) => {
        // Notify job creator
        socket.to(`user:${data.clientAddress}`).emit('notification', {
          type: 'job_application',
          title: 'New Job Application',
          message: `Someone applied for your job: ${data.jobTitle}`,
          data: data,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle milestone completion notifications
      socket.on('milestone-completed', (data: {
        clientAddress: string;
        freelancerAddress: string;
        milestoneDescription: string;
        milestoneId: string;
        jobId: string;
      }) => {
        // Notify client
        socket.to(`user:${data.clientAddress}`).emit('notification', {
          type: 'milestone_completed',
          title: 'Milestone Completed',
          message: `Milestone "${data.milestoneDescription}" has been completed`,
          data: data,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle payment notifications
      socket.on('payment-released', (data: {
        freelancerAddress: string;
        amount: string;
        jobTitle: string;
        milestoneId: string;
      }) => {
        // Notify freelancer
        socket.to(`user:${data.freelancerAddress}`).emit('notification', {
          type: 'payment_released',
          title: 'Payment Received',
          message: `You received ${data.amount} ETH for milestone completion`,
          data: data,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle dispute notifications
      socket.on('dispute-raised', (data: {
        clientAddress: string;
        freelancerAddress: string;
        projectTitle: string;
        disputeId: string;
        reason: string;
      }) => {
        // Notify both parties
        socket.to(`user:${data.clientAddress}`).emit('notification', {
          type: 'dispute_raised',
          title: 'Dispute Raised',
          message: `A dispute has been raised for project: ${data.projectTitle}`,
          data: data,
          timestamp: new Date().toISOString()
        });
        
        socket.to(`user:${data.freelancerAddress}`).emit('notification', {
          type: 'dispute_raised',
          title: 'Dispute Raised',
          message: `A dispute has been raised for project: ${data.projectTitle}`,
          data: data,
          timestamp: new Date().toISOString()
        });
      });
      
      // Handle new message notifications
      socket.on('new-message', (data: {
        recipientAddress: string;
        senderName: string;
        senderAddress: string;
        message: string;
        conversationId: string;
      }) => {
        // Notify recipient
        socket.to(`user:${data.recipientAddress}`).emit('notification', {
          type: 'new_message',
          title: 'New Message',
          message: `You have a new message from ${data.senderName}`,
          data: data,
          timestamp: new Date().toISOString()
        });
      });
      
      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
    });
    
    res.socket.server.io = io;
  }
  
  res.end();
};

export default SocketHandler;

export { io };
