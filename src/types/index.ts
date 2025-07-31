// Core types for the blockchain freelancer platform

export interface User {
  id: string;
  walletAddress: string;
  username: string;
  email?: string;
  profilePicture?: string;
  isFreelancer: boolean;
  isClient: boolean;
  createdAt: Date;
  updatedAt: Date;
  reputation: number;
  totalEarnings?: number;
  completedJobs: number;
}

export interface FreelancerProfile extends User {
  skills: string[];
  hourlyRate: number;
  title: string;
  description: string;
  portfolio: PortfolioItem[];
  availability: 'available' | 'busy' | 'unavailable';
  languages: string[];
  experience: number; // years of experience
  certifications: NFTCertification[];
}

export interface ClientProfile extends User {
  companyName?: string;
  companyDescription?: string;
  website?: string;
  totalSpent: number;
  activeJobs: number;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  skills: string[];
  budget: {
    type: 'fixed' | 'hourly';
    amount: number;
    currency: 'ETH' | 'USDC' | 'USDT';
  };
  duration: string;
  clientId: string;
  client: ClientProfile;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled' | 'disputed';
  applicants: JobApplication[];
  selectedFreelancer?: string;
  contractAddress?: string;
  createdAt: Date;
  deadline?: Date;
  tags: string[];
}

export interface JobApplication {
  id: string;
  jobId: string;
  freelancerId: string;
  freelancer: FreelancerProfile;
  coverLetter: string;
  proposedRate: number;
  estimatedDuration: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}

export interface Contract {
  id: string;
  jobId: string;
  clientId: string;
  freelancerId: string;
  contractAddress: string;
  amount: number;
  currency: string;
  status: 'active' | 'completed' | 'disputed' | 'cancelled';
  milestones: Milestone[];
  createdAt: Date;
  completedAt?: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'in-progress' | 'submitted' | 'approved' | 'paid';
  dueDate?: Date;
  submittedAt?: Date;
  approvedAt?: Date;
}

export interface Review {
  id: string;
  contractId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  comment: string;
  transactionHash?: string;
  createdAt: Date;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  images: string[];
  technologies: string[];
  projectUrl?: string;
  completedAt: Date;
}

export interface NFTCertification {
  id: string;
  name: string;
  issuer: string;
  tokenId: string;
  contractAddress: string;
  imageUrl: string;
  issuedAt: Date;
  metadata: Record<string, unknown>;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'job_application' | 'job_update' | 'payment' | 'review' | 'message';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface EscrowTransaction {
  id: string;
  contractId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'locked' | 'released' | 'refunded';
  transactionHash?: string;
  createdAt: Date;
  releasedAt?: Date;
}

// Blockchain specific types
export interface WalletConnection {
  address: string;
  isConnected: boolean;
  chainId: number;
  balance: string;
}

export interface SmartContractEvent {
  eventName: string;
  transactionHash: string;
  blockNumber: number;
  data: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Filter and search types
export interface JobFilters {
  skills?: string[];
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: 'fixed' | 'hourly';
  duration?: string;
  location?: string;
  remote?: boolean;
}

export interface FreelancerFilters {
  skills?: string[];
  hourlyRateMin?: number;
  hourlyRateMax?: number;
  availability?: 'available' | 'busy' | 'unavailable';
  experience?: number;
  rating?: number;
  languages?: string[];
}

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: string;
  direction: SortDirection;
}
