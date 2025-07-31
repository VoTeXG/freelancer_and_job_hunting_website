'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CreditCardIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface FinancialData {
  totalEarnings: number;
  pendingPayments: number;
  completedJobs: number;
  averageJobValue: number;
  monthlyEarnings: Array<{ month: string; amount: number }>;
  topSkills: Array<{ skill: string; earnings: number; jobs: number }>;
  paymentHistory: Array<{
    id: string;
    date: string;
    amount: number;
    jobTitle: string;
    status: 'completed' | 'pending' | 'disputed';
  }>;
}

export default function FinancialDashboard() {
  const { address, isConnected } = useWallet();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    if (isConnected && address) {
      fetchFinancialData();
    }
  }, [isConnected, address, timeframe]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData: FinancialData = {
        totalEarnings: 15750.50,
        pendingPayments: 2340.25,
        completedJobs: 23,
        averageJobValue: 685.23,
        monthlyEarnings: [
          { month: 'Jan', amount: 1200 },
          { month: 'Feb', amount: 1850 },
          { month: 'Mar', amount: 2100 },
          { month: 'Apr', amount: 1650 },
          { month: 'May', amount: 2300 },
          { month: 'Jun', amount: 2850 }
        ],
        topSkills: [
          { skill: 'React Development', earnings: 5200, jobs: 8 },
          { skill: 'Smart Contracts', earnings: 4100, jobs: 5 },
          { skill: 'UI/UX Design', earnings: 3450, jobs: 6 },
          { skill: 'Backend API', earnings: 3000, jobs: 4 }
        ],
        paymentHistory: [
          {
            id: '1',
            date: '2024-01-28',
            amount: 1200,
            jobTitle: 'E-commerce Smart Contract',
            status: 'completed'
          },
          {
            id: '2',
            date: '2024-01-25',
            amount: 850,
            jobTitle: 'React Dashboard Development',
            status: 'completed'
          },
          {
            id: '3',
            date: '2024-01-20',
            amount: 950,
            jobTitle: 'DeFi Protocol Integration',
            status: 'pending'
          }
        ]
      };
      
      setFinancialData(mockData);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'disputed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <CreditCardIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600">
          Connect your wallet to view your financial dashboard
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeframe Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Financial Dashboard</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <Button
              key={period}
              size="sm"
              variant={timeframe === period ? 'default' : 'outline'}
              onClick={() => setTimeframe(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData?.totalEarnings || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData?.pendingPayments || 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <span className="text-gray-500">3 pending milestones</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Jobs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {financialData?.completedJobs || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-600">+3</span>
              <span className="text-gray-500 ml-1">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Job Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(financialData?.averageJobValue || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-4 text-sm">
              <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-red-600">-5.2%</span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Earnings Chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Earnings</h3>
            <div className="space-y-4">
              {financialData?.monthlyEarnings.map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{data.month}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(data.amount / 3000) * 100}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(data.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Earning Skills</h3>
            <div className="space-y-4">
              {financialData?.topSkills.map((skill, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{skill.skill}</p>
                    <p className="text-xs text-gray-500">{skill.jobs} jobs</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(skill.earnings)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                    Job
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {financialData?.paymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-4 text-sm text-gray-900">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-sm text-gray-900">{payment.jobTitle}</td>
                    <td className="py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
