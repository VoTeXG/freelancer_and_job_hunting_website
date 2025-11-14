'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LazyIcon } from '@/components/ui/LazyIcon';
import Reveal from '@/components/Reveal';

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
      {/* Standardized Hero Section */}
  <section className="relative overflow-hidden text-white" suppressHydrationWarning>
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-600)] via-blue-700 to-purple-800" />
        <div className="absolute inset-0 bg-white/5" />
        <div className="pointer-events-none absolute -top-24 -right-16 h-80 w-80 rounded-full bg-purple-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium text-white/90 shadow-lg backdrop-blur">
                <LazyIcon name="SparklesIcon" className="h-4 w-4 text-amber-200" />
                <span>CareerBridge: Bridge to your success with smart escrow</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Bridge to Your Success with
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400">
                  {' '}CareerBridge
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl md:max-w-none mx-auto md:mx-0">
                Unite ambitious clients and blockchain-native talent under one bridge. 
                Automated escrow, verifiable credentials, and global reach keep every project moving forward.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <Button size="lg" asChild>
                  <Link href="/freelancers" aria-label="Find Freelancers" className="inline-flex items-center gap-2">
                    <LazyIcon name="UserGroupIcon" className="h-5 w-5" />
                    <span>Find Freelancers</span>
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white hover:text-purple-700">
                  <Link href="/jobs" aria-label="Browse Jobs" className="inline-flex items-center gap-2">
                    <LazyIcon name="BriefcaseIcon" className="h-5 w-5" />
                    <span>Browse Jobs</span>
                  </Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-center md:justify-start text-sm text-blue-100/90">
                <Link href="/jobs/create-enhanced" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 transition hover:bg-white/15">
                  <LazyIcon name="RocketLaunchIcon" className="h-4 w-4 text-amber-200" />
                  Post a job in minutes
                </Link>
                <Link href="/freelancers?filter=top-rated" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 transition hover:bg-white/15">
                  <LazyIcon name="TrophyIcon" className="h-4 w-4 text-amber-200" />
                  Browse top talent
                </Link>
                <Link href="/advanced" className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 transition hover:bg-white/15">
                  <LazyIcon name="BoltIcon" className="h-4 w-4 text-amber-200" />
                  Explore pro tools
                </Link>
              </div>
              <div className="mx-auto md:mx-0 max-w-xl rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-left">
                  <div>
                    <div className="text-sm font-semibold text-white/80 uppercase tracking-wide">Bridge Launch Checklist</div>
                    <p className="text-sm text-blue-100/80">Secure your wallet, polish your profile, and activate escrow in under 5 minutes.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white">
                      <LazyIcon name="IdentificationIcon" className="h-4 w-4 text-amber-200" />
                      Complete profile
                    </Link>
                    <Link href="/dashboard/enhanced" className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white">
                      <LazyIcon name="ChartBarIcon" className="h-4 w-4 text-amber-200" />
                      View dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative w-full max-w-md md:max-w-lg ml-auto">
                <Image
                  src="/careerbridge-hero.svg"
                  alt="CareerBridge illustration connecting opportunities"
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
  <section className="py-16 bg-[var(--surface-primary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <Reveal key={index} delay={index * 60}>
              <div
                className="group rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70 hover:shadow-md hover:ring-purple-300/60 transition p-6 text-center"
              >
                <div className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium mt-1">{stat.label}</div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
  <section className="py-20 bg-[var(--surface-muted)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose CareerBridge?
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
                <Reveal key={index} delay={index * 80}>
                <Card
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
                </Reveal>
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
            <Button size="lg" asChild>
              <Link href="/register?role=freelancer" aria-label="Get Started as Freelancer" className="inline-flex items-center gap-2">
                <span>Get Started as Freelancer</span>
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white hover:text-purple-700">
              <Link href="/jobs/create-enhanced" aria-label="Post Your First Job" className="inline-flex items-center gap-2">
                <span>Post Your First Job</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
