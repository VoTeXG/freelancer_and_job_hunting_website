'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useNotifications } from '@/providers/NotificationProvider';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
  PhoneIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
}

interface ChatUser {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

interface Conversation {
  id: string;
  participants: ChatUser[];
  lastMessage?: Message;
  unreadCount: number;
  jobTitle?: string;
}

export default function MessagingSystem() {
  const { address, isConnected } = useWallet();
  const { socket } = useNotifications();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchConversations();
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('new_message', handleNewMessage);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);

      return () => {
        socket.off('new_message');
        socket.off('user_online');
        socket.off('user_offline');
      };
    }
  }, [socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      // Mock data for demonstration
      const mockConversations: Conversation[] = [
        {
          id: '1',
          participants: [
            {
              id: 'client1',
              name: 'Alice Johnson',
              avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
              isOnline: true
            }
          ],
          lastMessage: {
            id: 'msg1',
            senderId: 'client1',
            senderName: 'Alice Johnson',
            content: 'Hi! I have a question about the milestone requirements.',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            type: 'text'
          },
          unreadCount: 2,
          jobTitle: 'E-commerce Smart Contract Development'
        },
        {
          id: '2',
          participants: [
            {
              id: 'client2',
              name: 'Bob Wilson',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
              isOnline: false,
              lastSeen: new Date(Date.now() - 3600000).toISOString()
            }
          ],
          lastMessage: {
            id: 'msg2',
            senderId: address || '',
            senderName: 'You',
            content: 'I\'ll have the design mockups ready by tomorrow.',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            type: 'text'
          },
          unreadCount: 0,
          jobTitle: 'React Dashboard UI/UX Design'
        }
      ];
      
      setConversations(mockConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      // Mock messages for demonstration
      const mockMessages: Message[] = [
        {
          id: '1',
          senderId: 'client1',
          senderName: 'Alice Johnson',
          content: 'Hello! I\'m excited to work with you on this project.',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'text'
        },
        {
          id: '2',
          senderId: address || '',
          senderName: 'You',
          content: 'Hi Alice! Thanks for choosing me. I\'ve reviewed your requirements and I\'m ready to get started.',
          timestamp: new Date(Date.now() - 82800000).toISOString(),
          type: 'text'
        },
        {
          id: '3',
          senderId: 'client1',
          senderName: 'Alice Johnson',
          content: 'Great! I\'ve attached the project specifications document.',
          timestamp: new Date(Date.now() - 82000000).toISOString(),
          type: 'file',
          fileName: 'project-specs.pdf',
          fileUrl: '#'
        },
        {
          id: '4',
          senderId: 'client1',
          senderName: 'Alice Johnson',
          content: 'Hi! I have a question about the milestone requirements.',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          type: 'text'
        }
      ];
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewMessage = (message: Message) => {
    if (selectedConversation && message.senderId !== address) {
      setMessages(prev => [...prev, message]);
    }
    
    // Update conversation list
    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversation
          ? {
              ...conv,
              lastMessage: message,
              unreadCount: message.senderId === address ? 0 : conv.unreadCount + 1
            }
          : conv
      )
    );
  };

  const handleUserOnline = (userId: string) => {
    setConversations(prev =>
      prev.map(conv => ({
        ...conv,
        participants: conv.participants.map(p =>
          p.id === userId ? { ...p, isOnline: true } : p
        )
      }))
    );
  };

  const handleUserOffline = (userId: string) => {
    setConversations(prev =>
      prev.map(conv => ({
        ...conv,
        participants: conv.participants.map(p =>
          p.id === userId ? { ...p, isOnline: false, lastSeen: new Date().toISOString() } : p
        )
      }))
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !socket) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: address || '',
      senderName: 'You',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    // Add message to local state immediately
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Send via socket
    socket.emit('send_message', {
      conversationId: selectedConversation,
      message
    });

    // Update conversation list
    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversation
          ? { ...conv, lastMessage: message }
          : conv
      )
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = 
      new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);
  const otherParticipant = selectedConv?.participants[0];

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600">
          Connect your wallet to access messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
        </div>
        <div className="overflow-y-auto h-full">
          {conversations.map((conversation) => {
            const participant = conversation.participants[0];
            return (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation.id)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=6366f1&color=fff`}
                      alt={participant.name}
                      className="w-10 h-10 rounded-full"
                    />
                    {participant.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {participant.name}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mb-1">
                      {conversation.jobTitle}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.lastMessage?.content}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={otherParticipant?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant?.name || '')}&background=6366f1&color=fff`}
                      alt={otherParticipant?.name}
                      className="w-10 h-10 rounded-full"
                    />
                    {otherParticipant?.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{otherParticipant?.name}</p>
                    <p className="text-xs text-gray-500">
                      {otherParticipant?.isOnline 
                        ? 'Online' 
                        : `Last seen ${otherParticipant?.lastSeen ? formatTimestamp(otherParticipant.lastSeen) : 'recently'}`
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <PhoneIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <VideoCameraIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loading ? (
                <div className="text-center text-gray-500">Loading messages...</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === address ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === address
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      {message.type === 'file' ? (
                        <div className="flex items-center space-x-2">
                          <PaperClipIcon className="h-4 w-4" />
                          <span className="text-sm">{message.fileName}</span>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                      <p
                        className={`text-xs mt-1 ${
                          message.senderId === address ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTimestamp(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline">
                  <PaperClipIcon className="h-4 w-4" />
                </Button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 rounded-full p-1"
                  >
                    <FaceSmileIcon className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="rounded-full p-2"
                >
                  <PaperAirplaneIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
