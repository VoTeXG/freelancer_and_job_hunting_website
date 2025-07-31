'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import FinancialDashboard from '@/components/FinancialDashboard';
import MessagingSystem from '@/components/MessagingSystem';
import MultiTokenPayments from '@/components/MultiTokenPayments';
import {
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

type TabType = 'dashboard' | 'messages' | 'financial' | 'search' | 'payments';

export default function AdvancedFeaturesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    {
      id: 'dashboard' as TabType,
      name: 'Dashboard Overview',
      icon: ChartBarIcon,
      description: 'View your complete freelancer dashboard'
    },
    {
      id: 'messages' as TabType,
      name: 'Messaging',
      icon: ChatBubbleLeftRightIcon,
      description: 'Chat with clients and collaborators'
    },
    {
      id: 'financial' as TabType,
      name: 'Financial Analytics',
      icon: CurrencyDollarIcon,
      description: 'Detailed financial insights and analytics'
    },
    {
      id: 'search' as TabType,
      name: 'Advanced Search',
      icon: MagnifyingGlassIcon,
      description: 'AI-powered job and talent matching'
    },
    {
      id: 'payments' as TabType,
      name: 'Multi-Token Payments',
      icon: CreditCardIcon,
      description: 'Send payments with various cryptocurrencies'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Enhanced Dashboard
              </h3>
              <p className="text-gray-600 mb-4">
                Comprehensive overview of your freelancing activities
              </p>
              <Button onClick={() => window.open('/dashboard/enhanced', '_blank')}>
                Open Full Dashboard
              </Button>
            </div>
          </div>
        );

      case 'messages':
        return <MessagingSystem />;

      case 'financial':
        return <FinancialDashboard />;

      case 'search':
        return (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  AI-Powered Job Search
                </h3>
                
                {/* Search Interface */}
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      placeholder="Describe your ideal job or skills..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Button>
                      <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  {/* Advanced Filters */}
                  <div className="border-t pt-4">
                    <div className="flex items-center mb-4">
                      <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <h4 className="font-medium text-gray-900">Advanced Filters</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Budget Range
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Any Budget</option>
                          <option>$100 - $500</option>
                          <option>$500 - $1,000</option>
                          <option>$1,000 - $5,000</option>
                          <option>$5,000+</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Project Duration
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Any Duration</option>
                          <option>Less than 1 week</option>
                          <option>1-4 weeks</option>
                          <option>1-3 months</option>
                          <option>3+ months</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience Level
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option>Any Level</option>
                          <option>Entry Level</option>
                          <option>Intermediate</option>
                          <option>Expert</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Skills Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Skills
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['React', 'Solidity', 'Node.js', 'Python', 'UI/UX', 'Smart Contracts', 'Web3', 'TypeScript'].map((skill) => (
                        <button
                          key={skill}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mock Search Results */}
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium text-gray-900 mb-4">AI-Matched Results</h4>
                <div className="space-y-4">
                  {[
                    {
                      title: 'Senior React Developer for DeFi Platform',
                      budget: '$2,500 - $5,000',
                      match: '95%',
                      skills: ['React', 'TypeScript', 'Smart Contracts'],
                      description: 'Build a comprehensive DeFi trading platform with advanced features...'
                    },
                    {
                      title: 'Smart Contract Auditor',
                      budget: '$1,500 - $3,000',
                      match: '88%',
                      skills: ['Solidity', 'Security', 'Auditing'],
                      description: 'Audit smart contracts for security vulnerabilities and gas optimization...'
                    },
                    {
                      title: 'Full-Stack Web3 Developer',
                      budget: '$3,000 - $7,500',
                      match: '92%',
                      skills: ['React', 'Node.js', 'Web3', 'Solidity'],
                      description: 'Develop a complete NFT marketplace with advanced trading features...'
                    }
                  ].map((job, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{job.title}</h5>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-green-600 font-medium">{job.match} match</span>
                          <span className="text-sm text-blue-600 font-medium">{job.budget}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{job.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {job.skills.map((skill, skillIndex) => (
                            <span
                              key={skillIndex}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                        <Button size="sm">Apply Now</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'payments':
        return <MultiTokenPayments />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Advanced Features Hub
          </h1>
          <p className="text-lg text-gray-600">
            Access advanced functionality for professional freelancing
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon
                      className={`mr-2 h-5 w-5 ${
                        activeTab === tab.id
                          ? 'text-blue-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
