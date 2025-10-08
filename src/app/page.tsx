'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LazyIcon } from '@/components/ui/LazyIcon';

export default function Home() {
  const features = [
    {
      icon: (props:any) => <LazyIcon name="ShieldCheckIcon" {...props} />,
      title: 'Secure Blockchain Payments',
      description: 'Smart contracts ensure secure escrow payments with automatic release upon job completion.',
    },
    {
      icon: (props:any) => <LazyIcon name="CheckBadgeIcon" {...props} />,
      title: 'Verified Reputation System',
      description: 'Immutable on-chain reviews and ratings build trust between freelancers and clients.',
    },
    {
      icon: (props:any) => <LazyIcon name="CurrencyDollarIcon" {...props} />,
      title: 'Cryptocurrency Support',
      description: 'Pay and receive payments in ETH, USDC, and other popular cryptocurrencies.',
    },
    {
      icon: (props:any) => <LazyIcon name="StarIcon" {...props} />,
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
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-800 text-white">
        {/* Subtle overlay and decorative glows */}
        <div className="absolute inset-0 bg-white/5" />
        <div className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-purple-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                The Future of
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                  {' '}Freelancing
                </span>
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl md:max-w-none mx-auto md:mx-0">
                Connect with top freelancers and clients on a secure blockchain platform. 
                Transparent payments, verified reviews, and global opportunities.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button size="lg">
                  <Link href="/freelancers" className="flex items-center space-x-2">
                    <LazyIcon name="UserGroupIcon" className="h-5 w-5" />
                    <span>Find Freelancers</span>
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-700">
                  <Link href="/jobs" className="flex items-center space-x-2">
                    <LazyIcon name="BriefcaseIcon" className="h-5 w-5" />
                    <span>Browse Jobs</span>
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative w-full max-w-md md:max-w-lg ml-auto">
                <Image
                  src="/globe.svg"
                  alt="Decentralized work around the globe"
                  width={560}
                  height={560}
                  priority
                  sizes="(max-width: 768px) 0vw, (max-width: 1024px) 420px, 560px"
                  className="w-full h-auto drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="group rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 hover:shadow-md hover:ring-purple-300/60 transition p-6 text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium mt-1">{stat.label}</div>
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
            <div className="mx-auto h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6" />
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Built on blockchain technology to provide transparency, security, and trust 
              in every freelance transaction.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="relative overflow-hidden text-center border-0 shadow-sm ring-1 ring-gray-200/70 transition hover:-translate-y-1 hover:shadow-md hover:ring-purple-300/60"
                >
                  <CardHeader>
                    <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 ring-1 ring-purple-100 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-purple-600" />
                    </div>
                    <CardTitle className="text-lg font-semibold tracking-tight">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition" />
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Start Your Blockchain Freelance Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of freelancers and clients who trust our platform for secure, 
            transparent work relationships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">
              Get Started as Freelancer
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-700">
              Post Your First Job
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
