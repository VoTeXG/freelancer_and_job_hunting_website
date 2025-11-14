'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Modal from '@/components/ui/Modal';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LazyIcon } from '@/components/ui/LazyIcon';
import PageContainer from '@/components/PageContainer';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApiErrorHandlers } from '@/lib/queryClient';

function ContactModal({ isOpen, onClose, freelancer }: { isOpen: boolean; onClose: () => void; freelancer: any }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Contact ${freelancer?.username || 'Freelancer'}`} size="md">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Send a message to express interest or ask questions.</p>
        <textarea className="w-full px-3 py-2 border rounded-md" rows={4} placeholder="Write your message..." />
        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function FreelancerDetailPage() {
  const params = useParams();
  const idParam = (params as any)?.id;
  const freelancerId: string | undefined = Array.isArray(idParam) ? idParam[0] : idParam;

  const [freelancer, setFreelancer] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHiring, setIsHiring] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const { toastSuccess, toastError, bannerError } = useApiErrorHandlers();

  useEffect(() => {
    fetchProfile();
  }, [freelancerId]);

  const fetchProfile = async () => {
    if (!freelancerId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/freelancers/${freelancerId}`);
      const data = await res.json();
      if (res.ok && data.freelancer) {
        setFreelancer(data.freelancer);
      } else {
        throw new Error(data.error || 'Failed to load freelancer');
      }
    } catch (e:any) {
      console.error('Failed to fetch freelancer:', e);
      toastError(e?.message || 'Failed to load freelancer', 'Load failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleHire = async () => {
    if (!freelancerId) return;
    setIsHiring(true);
    try {
      // Placeholder: call API to send a hire request or open contact modal
      const res = await fetch(`/api/freelancers/${freelancerId}/hire`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        toastSuccess('Hire request sent', 'Request sent');
      } else {
        toastError(data?.error || 'Failed to send hire request', 'Request failed');
      }
    } catch (e:any) {
      console.error('Failed to send hire request', e);
      toastError(e?.message || 'Failed to send hire request', 'Request failed');
    } finally {
      setIsHiring(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Skeleton className="h-40 w-40 rounded-full mx-auto" />
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
              <Skeleton className="h-32" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-48" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!freelancer) {
    return (
      <PageContainer>
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold">Freelancer not found</h1>
          <p className="text-[var(--text-muted)]">This freelancer may have been removed.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} freelancer={freelancer} />

      <div className="max-w-4xl mx-auto py-8">
        {/* Standardized hero/header */}
        <div className="mb-6 animate-fade-up">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-600)] to-blue-600">{freelancer.username}</span>
          </h1>
          <p className="text-[var(--text-muted)] text-lg">{freelancer.title || 'Freelancer'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6 animate-fade-up">
            <Card>
              <CardContent className="text-center">
                <div className="w-28 h-28 mx-auto rounded-full overflow-hidden bg-gray-100 mb-4">
                  {freelancer.profilePicture ? (
                    <Image src={freelancer.profilePicture} alt={`${freelancer.username} avatar`} width={112} height={112} className="object-cover" />
                  ) : (
                    <div className="w-28 h-28 bg-gray-200 rounded-full" />
                  )}
                </div>

                <h2 className="text-lg font-semibold">{freelancer.username}</h2>
                <p className="text-sm text-gray-500">{freelancer.reputation?.toFixed?.(1) ?? '—'} • {freelancer.completedJobs ?? 0} jobs</p>

                <div className="mt-6 space-y-3">
                  <Button className="w-full" onClick={() => setContactOpen(true)}>
                    <LazyIcon name="ChatBubbleLeftEllipsisIcon" className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  <Button variant="outline" className="w-full" loading={isHiring} loadingText="Hiring..." onClick={handleHire}>
                    <LazyIcon name="HandRaisedIcon" className="h-4 w-4 mr-2" />
                    Hire
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{freelancer.description}</p>
              </CardContent>
            </Card>

            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(freelancer.skills || []).map((s: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded-md text-sm">{s}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6 animate-fade-up">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                {(freelancer.portfolio || []).length === 0 ? (
                  <p className="text-gray-500">No portfolio items yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {freelancer.portfolio.map((p: any) => (
                      <div key={p.id} className="border rounded-lg overflow-hidden">
                        {p.image && <img src={p.image} alt={p.title} className="w-full h-48 object-cover" />}
                        <div className="p-3">
                          <h3 className="font-medium">{p.title}</h3>
                          <p className="text-sm text-gray-500">{p.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                {(freelancer.certifications || []).length === 0 ? (
                  <p className="text-gray-500">No certifications listed.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {freelancer.certifications.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <LazyIcon name="AcademicCapIcon" className="h-6 w-6 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500">{c.issuer}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-up">
              <CardHeader>
                <CardTitle>Languages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(freelancer.languages || []).map((l: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 rounded-md text-sm">{l}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
