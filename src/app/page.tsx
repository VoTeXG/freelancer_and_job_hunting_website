'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  ShieldCheckIcon, 
  CurrencyDollarIcon, 
  StarIcon,
  UserGroupIcon,
  BriefcaseIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Secure Blockchain Payments',
      description: 'Smart contracts ensure secure escrow payments with automatic release upon job completion.',
    },
    {
      icon: CheckBadgeIcon,
      title: 'Verified Reputation System',
      description: 'Immutable on-chain reviews and ratings build trust between freelancers and clients.',
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Cryptocurrency Support',
      description: 'Pay and receive payments in ETH, USDC, and other popular cryptocurrencies.',
    },
    {
      icon: StarIcon,
      title: 'NFT Certificates',
      description: 'Earn NFT certificates for completed projects to showcase your achievements.',
    },
  ];

  const stats = [
    { label: 'Active Freelancers', value: '10,000+' },
    { label: 'Jobs Posted', value: '50,000+' },
    { label: 'Total Paid Out', value: '$5M+' },
    { label: 'Countries', value: '150+' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              The Future of
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                {' '}Freelancing
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              Connect with top freelancers and clients on a secure blockchain platform. 
              Transparent payments, verified reviews, and global opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Link href="/freelancers" className="flex items-center space-x-2">
                  <UserGroupIcon className="h-5 w-5" />
                  <span>Find Freelancers</span>
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
                <Link href="/jobs" className="flex items-center space-x-2">
                  <BriefcaseIcon className="h-5 w-5" />
                  <span>Browse Jobs</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-blue-600">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose BlockFreelancer?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built on blockchain technology to provide transparency, security, and trust 
              in every freelance transaction.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center border-0 shadow-lg">
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Blockchain Freelance Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of freelancers and clients who trust our platform for secure, 
            transparent work relationships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Get Started as Freelancer
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              Post Your First Job
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
