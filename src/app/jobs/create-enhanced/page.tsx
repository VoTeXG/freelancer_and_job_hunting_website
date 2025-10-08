'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import PageContainer from '@/components/PageContainer';
import SectionHeader from '@/components/SectionHeader';
import { useEscrow } from '@/hooks/useEscrow';
import { env } from '@/lib/env';
import { uploadJSONToIPFS, uploadToIPFS } from '@/lib/ipfs';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';

const jobSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters long'),
  description: z.string().min(50, 'Description must be at least 50 characters long'),
  budgetAmount: z.number().min(0.001, 'Budget must be at least 0.001 ETH'),
  budgetType: z.enum(['fixed', 'hourly']),
  currency: z.literal('ETH'), // For now, only ETH
  duration: z.string().min(1, 'Duration is required'),
  deadline: z.string().optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  requirements: z.array(z.string()).optional(),
  milestones: z.array(z.object({
    description: z.string().min(5, 'Milestone description required'),
    amount: z.number().min(0.001, 'Amount must be at least 0.001 ETH'),
    deadline: z.string().optional()
  })).min(1, 'At least one milestone is required'),
  useBlockchain: z.boolean(),
  attachments: z.array(z.any()).optional()
});

type JobFormData = z.infer<typeof jobSchema>;

interface Milestone {
  description: string;
  amount: number;
  deadline?: string;
}

export default function CreateJobPageEnhanced() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createEscrow } = useEscrow();
  const { token, user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [requirementInput, setRequirementInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [ipfsUploading, setIpfsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100 overall progress
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [pendingEscrowJobId, setPendingEscrowJobId] = useState<string | null>(null);
  const [lastEscrowPayload, setLastEscrowPayload] = useState<any>(null);
  const [escrowRetrying, setEscrowRetrying] = useState(false);
  // Server-side draft integration
  const [serverDraftId, setServerDraftId] = useState<string | null>(null);
  const [serverSyncPending, setServerSyncPending] = useState(false);
  const [lastServerSync, setLastServerSync] = useState<number>(0);
  const [serverConflict, setServerConflict] = useState<null | { localUpdated: number; serverUpdated: string; overriddenFields?: string[]; conflicts?: string[]; serverValues?: Record<string, any>; localValues?: Record<string, any>; }>(null);
  const fieldTimestampsRef = useRef<Record<string, number>>({});
  const draftKey = 'job_form_draft_v1';
  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);
  const serverAutosaveTimer = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  watch,
  getValues,
    reset
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: '',
      description: '',
      budgetAmount: 0.001,
      budgetType: 'fixed',
      currency: 'ETH',
      duration: '',
      deadline: undefined,
      skills: [],
      requirements: [],
      milestones: [{ description: '', amount: 0.001 }],
      useBlockchain: true,
      attachments: []
    }
  });

  const skills = watch('skills');
  const requirements = watch('requirements');
  const budgetType = watch('budgetType');
  const milestones = watch('milestones');
  const useBlockchain = watch('useBlockchain');
  const budgetAmount = watch('budgetAmount');

  // Immediate conflict resolution sync helper
  const resolveConflict = useCallback(async (field: string, useServer: boolean) => {
    if (!serverConflict) return;
    const now = Date.now();
    const serverVal = (serverConflict.serverValues||{})[field];
    const localVal = (serverConflict.localValues||{})[field];
    const chosen = useServer ? serverVal : localVal;
    // @ts-ignore
    setValue(field, chosen);
    fieldTimestampsRef.current[field] = now;
    // Update local storage draft immediately
    try {
      const currentValues = getValues();
      const wrapper = { form: currentValues, _fieldTs: fieldTimestampsRef.current };
      localStorage.setItem(draftKey, JSON.stringify(wrapper));
      localStorage.setItem(draftKey+':fieldts', JSON.stringify(fieldTimestampsRef.current));
      localStorage.setItem(draftKey+':updatedAt', String(now));
    } catch {}
    // Remove field from conflicts list
    const remaining = (serverConflict.conflicts||[]).filter(f => f !== field);
    setServerConflict(prev => prev ? { ...prev, conflicts: remaining } : prev);
    // Trigger immediate server sync (no debounce) with updated single field
    if (token) {
      try {
        setServerSyncPending(true);
        const payload = { id: serverDraftId || undefined, data: { form: getValues(), _fieldTs: fieldTimestampsRef.current } };
        const res = await fetch('/api/job-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        const js = await res.json();
        if (js?.success && js.draft) {
          if (!serverDraftId) setServerDraftId(js.draft.id);
          setLastServerSync(Date.now());
        }
      } catch (e) { console.warn('Immediate conflict sync failed', e); }
      finally { setServerSyncPending(false); }
    }
  }, [serverConflict, token, serverDraftId, getValues, setValue]);

  // Restore local + fetch server draft (merge preference: latest updated field-level not implemented yet; naive override if server newer)
  useEffect(() => {
    if (restoredDraft) return;
    (async () => {
      let localWrapper: any = null;
      try { const raw = localStorage.getItem(draftKey); if (raw) localWrapper = JSON.parse(raw); } catch {}
      let localDraft = localWrapper?.form ? localWrapper.form : localWrapper;
      try { const fieldTsRaw = localStorage.getItem(draftKey+':fieldts'); if (fieldTsRaw) fieldTimestampsRef.current = JSON.parse(fieldTsRaw) || {}; } catch {}
      if (localDraft && typeof localDraft === 'object') {
        Object.entries(localDraft).forEach(([k,v]) => { // @ts-ignore
          setValue(k, v);
        });
      }
      let localUpdatedNum = Number(localStorage.getItem(draftKey+':updatedAt') || '0');
      if (token) {
        try {
          const res = await fetch('/api/job-drafts?page=1&limit=1', { headers: { 'Authorization': `Bearer ${token}` } });
          const js = await res.json();
          if (js?.success && js.drafts?.length) {
            const draft = js.drafts[0];
            setServerDraftId(draft.id);
            const raw = draft.data || {};
            const serverForm = raw.form && typeof raw.form === 'object' ? raw.form : raw;
            const serverUpdated = new Date(draft.updatedAt).getTime();
            const overridden: string[] = [];
            if (serverForm && typeof serverForm === 'object') {
              Object.entries(serverForm).forEach(([k,v]) => {
                const localFieldTs = fieldTimestampsRef.current[k];
                const currentLocalVal = (localDraft || {})[k];
                const differs = JSON.stringify(currentLocalVal) !== JSON.stringify(v);
                if ((!localFieldTs || serverUpdated > localFieldTs) && differs) {
                  // @ts-ignore
                  setValue(k, v);
                  fieldTimestampsRef.current[k] = serverUpdated;
                  overridden.push(k);
                }
              });
              if (overridden.length) {
                const newWrapper = { form: { ...(localDraft||{}), ...serverForm }, _fieldTs: fieldTimestampsRef.current };
                localDraft = newWrapper.form;
                localStorage.setItem(draftKey, JSON.stringify(newWrapper));
                localStorage.setItem(draftKey+':fieldts', JSON.stringify(fieldTimestampsRef.current));
              }
            }
            if (serverUpdated > localUpdatedNum) {
              localStorage.setItem(draftKey+':updatedAt', String(serverUpdated));
              localUpdatedNum = serverUpdated;
            } else if (serverUpdated < localUpdatedNum) {
              const conflicts = Object.keys(serverForm || {}).filter(k => JSON.stringify((serverForm as any)[k]) !== JSON.stringify((localDraft||{})[k]));
              setServerConflict({ localUpdated: localUpdatedNum, serverUpdated: draft.updatedAt, overriddenFields: overridden, conflicts, serverValues: serverForm, localValues: localDraft });
            }
          }
        } catch (e) { console.warn('Server draft fetch failed', e); }
      }
      setRestoredDraft(true);
    })();
  }, [restoredDraft, setValue, token]);

  // Autosave draft (debounced)
  const autosave = useCallback((data: any) => {
    try {
      const wrapper = { form: data, _fieldTs: fieldTimestampsRef.current };
      localStorage.setItem(draftKey, JSON.stringify(wrapper));
      localStorage.setItem(draftKey+':updatedAt', String(Date.now()));
    } catch {}
  }, []);

  // Server autosave (debounced 2s, skip if no token)
  const serverAutosave = useCallback((data: any) => {
    if (!token) return;
    if (serverAutosaveTimer.current) clearTimeout(serverAutosaveTimer.current);
    serverAutosaveTimer.current = setTimeout(async () => {
      try {
        setServerSyncPending(true);
  const payload = { id: serverDraftId || undefined, data: { form: data, _fieldTs: fieldTimestampsRef.current } };
        const res = await fetch('/api/job-drafts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
        const js = await res.json();
        if (js?.success && js.draft) {
          if (!serverDraftId) setServerDraftId(js.draft.id);
          setLastServerSync(Date.now());
        }
      } catch (e) {
        console.warn('Server draft autosave failed', e);
      } finally {
        setServerSyncPending(false);
      }
    }, 2000);
  }, [token, serverDraftId]);

  useEffect(() => {
    const prevRef = { current: {} as any };
    const sub = watch((formValues) => {
      // Detect per-field changes & stamp timestamps
      Object.entries(formValues).forEach(([k,v]) => {
        const prevVal = (prevRef.current as any)[k];
        if (JSON.stringify(prevVal) !== JSON.stringify(v)) {
          fieldTimestampsRef.current[k] = Date.now();
        }
      });
      prevRef.current = formValues;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        try { localStorage.setItem(draftKey+':fieldts', JSON.stringify(fieldTimestampsRef.current)); } catch {}
        autosave(formValues);
        serverAutosave(formValues);
      }, 600);
    });
    return () => { sub.unsubscribe(); if (autosaveTimer.current) clearTimeout(autosaveTimer.current); if (serverAutosaveTimer.current) clearTimeout(serverAutosaveTimer.current); };
  }, [watch, autosave, serverAutosave]);

  const clearDraft = async () => {
    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(draftKey+':updatedAt');
      if (serverDraftId && token) {
        await fetch(`/api/job-drafts/${serverDraftId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        setServerDraftId(null);
      }
    } catch {}
    reset();
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setValue('skills', [...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setValue('skills', skills.filter(skill => skill !== skillToRemove));
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setValue('requirements', [...(requirements || []), requirementInput.trim()]);
      setRequirementInput('');
    }
  };

  const removeRequirement = (index: number) => {
    const updatedRequirements = (requirements || []).filter((_, i) => i !== index);
    setValue('requirements', updatedRequirements);
  };

  const addMilestone = () => {
    setValue('milestones', [...milestones, { description: '', amount: 0.001 }]);
  };

  const updateMilestone = (index: number, field: keyof Milestone, value: any) => {
    const updatedMilestones = milestones.map((milestone, i) => 
      i === index ? { ...milestone, [field]: value } : milestone
    );
    setValue('milestones', updatedMilestones);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setValue('milestones', milestones.filter((_, i) => i !== index));
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachmentsToIPFS = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    setIpfsUploading(true);
    setUploadProgress(0);
    const results: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        // Sequential to provide progress feedback
        const hash = await uploadToIPFS(files[i]);
        results.push(hash);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      return results;
    } finally {
      setTimeout(() => { // slight delay to let user see 100%
        setIpfsUploading(false);
        setUploadProgress(0);
      }, 400);
    }
  };

  const onSubmit = async (data: JobFormData) => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first');
      return;
    }
    if (!token) {
      alert('You must be logged in to post a job');
      return;
    }
    if (data.budgetType === 'hourly' && (!data.budgetAmount || data.budgetAmount < 0.001)) {
      alert('Hourly rate must be at least 0.001 ETH');
      return;
    }

    setIsSubmitting(true);
    try {
      let ipfsMetadataHash = '';
      let attachmentHashes: string[] = [];

      // Upload attachments to IPFS
      if (attachments.length > 0) {
        attachmentHashes = await uploadAttachmentsToIPFS(attachments);
      }

      // Create job metadata for IPFS
      const jobMetadata = {
        title: data.title,
        description: data.description,
        skills: data.skills,
        requirements: data.requirements,
        attachments: attachmentHashes.map((hash, index) => ({
          name: attachments[index]?.name || `attachment_${index}`,
          ipfsHash: hash,
          type: attachments[index]?.type || 'unknown'
        })),
        createdAt: new Date().toISOString(),
        creator: address
      };

      // Upload job metadata to IPFS
      ipfsMetadataHash = await uploadJSONToIPFS(jobMetadata);

      // Prepare job data for database
      const jobData = {
        title: data.title,
        description: data.description,
        budgetAmount: data.budgetAmount,
        budgetType: data.budgetType,
        currency: data.currency,
        duration: data.duration,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        skills: data.skills,
        requirements: data.requirements,
        milestones: data.milestones,
        ipfsHash: ipfsMetadataHash,
        useBlockchain: data.useBlockchain,
        creatorAddress: address
      };

      // Save to database first
    const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(jobData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save job to database');
      }

      // If using blockchain, create escrow contract
      if (data.useBlockchain) {
        const totalAmount = data.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
        const feeBps = env.PLATFORM_FEE_BPS ?? 250; // default 2.5%
        const feeDecimal = (feeBps / 10000).toString();
        const payload = {
          freelancer: '0x0000000000000000000000000000000000000000',
            milestoneDescriptions: data.milestones.map(m => m.description),
            milestoneAmounts: data.milestones.map(m => parseEther(m.amount.toString()).toString()),
            deadline: data.deadline ? Math.floor(new Date(data.deadline).getTime() / 1000) : 0,
            jobDescription: data.description,
            totalAmount: parseEther(totalAmount.toString()).toString(),
            platformFee: parseEther(feeDecimal).toString()
        };
        setLastEscrowPayload(payload);
        try {
          await createEscrow(payload);
          addNotification({
            type: 'new_message',
            title: 'Job Posted',
            message: `Job posted & escrow deployed (fee ${(feeBps/100).toFixed(2)}%)`,
            data: { jobId: result.job?.id },
            timestamp: new Date().toISOString()
          });
        } catch (escrowError) {
          console.error('Escrow creation failed:', escrowError);
          setPendingEscrowJobId(result.job?.id || null);
          addNotification({
            type: 'new_message',
            title: 'Escrow Pending',
            message: 'Job saved, escrow deployment failed. Retry from dashboard.',
            data: { error: (escrowError as any)?.message, jobId: result.job?.id },
            timestamp: new Date().toISOString()
          });
        }
      } else {
        addNotification({
          type: 'new_message',
          title: 'Job Posted',
          message: 'Your job has been posted successfully',
          data: { jobId: result.job?.id },
          timestamp: new Date().toISOString()
        });
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to post job:', error);
      addNotification({
        type: 'new_message',
        title: 'Job Post Failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        data: {},
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalMilestoneAmount = milestones.reduce((sum, milestone) => sum + (milestone.amount || 0), 0);

  // Keep budgetAmount synced with milestones when fixed budget
  useEffect(() => {
    if (budgetType.toLowerCase() === 'fixed') {
      setValue('budgetAmount', Number(totalMilestoneAmount.toFixed(6)));
    }
  }, [budgetType, totalMilestoneAmount, setValue]);

  const retryEscrow = async () => {
    if (!lastEscrowPayload) return;
    setEscrowRetrying(true);
    try {
      await createEscrow(lastEscrowPayload);
      addNotification({
        type: 'new_message',
        title: 'Escrow Deployed',
        message: 'Escrow deployment succeeded on retry',
        data: { jobId: pendingEscrowJobId },
        timestamp: new Date().toISOString()
      });
      setPendingEscrowJobId(null);
    } catch (err) {
      addNotification({
        type: 'new_message',
        title: 'Escrow Retry Failed',
        message: (err as any)?.message || 'Unknown error',
        data: { jobId: pendingEscrowJobId },
        timestamp: new Date().toISOString()
      });
    } finally {
      setEscrowRetrying(false);
    }
  };

  return (
    <PageContainer className="max-w-4xl">
      <SectionHeader title="Post a New Job" subtitle="Create a secure, blockchain-powered freelance project" />
      {serverConflict && (
        <div className="mb-4 text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded space-y-2">
          <div>
            Local draft ({new Date(serverConflict.localUpdated).toLocaleTimeString()}) newer than server ({new Date(serverConflict.serverUpdated).toLocaleTimeString()}).
          </div>
          {!!serverConflict.overriddenFields?.length && (
            <div>Server overrides applied automatically for: <strong>{serverConflict.overriddenFields.join(', ')}</strong></div>
          )}
          {!!serverConflict.conflicts?.length && (
            <div className="space-y-1">
              <div className="font-semibold">Manual Resolution Needed:</div>
              {serverConflict.conflicts.map(f => (
                <ConflictResolutionRow
                  key={f}
                  field={f}
                  onUseServer={() => resolveConflict(f, true)}
                  onKeepLocal={() => resolveConflict(f, false)}
                />
              ))}
            </div>
          )}
        </div>
      )}

  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Wallet Connection Status */}
        {!isConnected && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center space-x-3 p-4">
              <LazyIcon name="ShieldCheckIcon" className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">Wallet Not Connected</p>
                <p className="text-yellow-700 text-sm">Connect your wallet to enable blockchain features</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blockchain Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LazyIcon name="ShieldCheckIcon" className="h-6 w-6 text-purple-600" />
              <span>Blockchain Protection</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <input
                {...register('useBlockchain')}
                type="checkbox"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                disabled={!isConnected}
              />
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Use blockchain escrow system
                </label>
                <p className="text-sm text-gray-500">
                  Secure milestone-based payments with smart contracts
                </p>
                {pendingEscrowJobId && (
                  <div className="mt-2 text-xs text-amber-600 flex items-center gap-2">
                    <span className="animate-pulse h-2 w-2 bg-amber-500 rounded-full" />
                    Escrow pending deployment for job. You can retry now or later.
                    <button
                      type="button"
                      onClick={retryEscrow}
                      disabled={escrowRetrying}
                      className="ml-2 px-2 py-1 rounded bg-amber-600 text-white disabled:opacity-50 text-[10px]"
                    >
                      {escrowRetrying ? 'Retrying...' : 'Retry'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Title *
              </label>
              <input
                {...register('title')}
                type="text"
                data-testid="job-title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Build a responsive React web application"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <textarea
                {...register('description')}
                rows={6}
                data-testid="job-description"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe your project in detail..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Attachments
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <LazyIcon name="CloudArrowUpIcon" className="h-8 w-8 text-purple-500 mb-2" />
                  <span className="text-sm text-gray-600">Click to upload files</span>
                  <span className="text-xs text-gray-500">Images, documents, designs, etc.</span>
                </label>
              </div>
              
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {ipfsUploading && (
                    <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                      <div className="bg-purple-500 h-2 transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Budget & Payment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LazyIcon name="CurrencyDollarIcon" className="h-6 w-6 text-purple-600" />
              <span>Budget & Payment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Budget Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Type *</label>
              <div className="flex gap-4">
                {(['fixed','hourly'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setValue('budgetType', opt)}
                    className={`px-4 py-2 rounded border text-sm transition-colors ${budgetType===opt ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 hover:border-purple-400'}`}
                  >
                    {opt === 'fixed' ? 'Fixed (milestone based)' : 'Hourly'}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {budgetType === 'fixed' ? 'Total Fixed Budget (ETH)' : 'Hourly Rate (ETH) *'}
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                disabled={budgetType === 'fixed'}
                value={budgetAmount || 0}
                onChange={e => setValue('budgetAmount', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${budgetType==='fixed' ? 'bg-gray-50 cursor-not-allowed' : 'border-gray-300'}`}
              />
              {budgetType === 'fixed' && (
                <p className="mt-1 text-xs text-gray-500">Automatically calculated from milestone amounts.</p>
              )}
              {errors.budgetAmount && (
                <p className="mt-1 text-sm text-red-600">{errors.budgetAmount.message as any}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 rounded border bg-gray-50 flex flex-col">
                <span className="text-gray-500">Milestones</span>
                <span className="font-semibold">{milestones.length}</span>
              </div>
              <div className="p-3 rounded border bg-gray-50 flex flex-col">
                <span className="text-gray-500">Total (ETH)</span>
                <span className="font-semibold">{totalMilestoneAmount.toFixed(3)}</span>
              </div>
              <div className="p-3 rounded border bg-gray-50 flex flex-col">
                <span className="text-gray-500">Budget Type</span>
                <span className="font-semibold capitalize">{budgetType}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle>Project Milestones</CardTitle>
            <p className="text-sm text-gray-600">Break your project into milestone-based payments</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">Milestone {index + 1}</h4>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    value={milestone.description}
                    onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What will be delivered in this milestone?"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (ETH) *
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={milestone.amount}
                      onChange={(e) => updateMilestone(index, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline (Optional)
                    </label>
                    <input
                      type="date"
                      value={milestone.deadline || ''}
                      onChange={(e) => updateMilestone(index, 'deadline', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addMilestone}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
            >
              <LazyIcon name="PlusIcon" className="h-5 w-5 mx-auto mb-1" />
              Add Another Milestone
            </button>
            
            {milestones.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-purple-800">Total Project Value:</span>
          <span className="text-lg font-bold text-purple-900">{totalMilestoneAmount.toFixed(3)} ETH</span>
                </div>
              </div>
            )}
            
            {errors.milestones && (
              <p className="text-sm text-red-600">{errors.milestones.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Skills and Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Skills & Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Skills *
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., React, Node.js, Design"
                />
                <Button type="button" onClick={addSkill}>
                  <LazyIcon name="PlusIcon" className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      <LazyIcon name="XMarkIcon" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              {errors.skills && (
                <p className="mt-1 text-sm text-red-600">{errors.skills.message}</p>
              )}
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Requirements
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={requirementInput}
                  onChange={(e) => setRequirementInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Must have portfolio, 3+ years experience"
                />
                <Button type="button" onClick={addRequirement}>
                  <LazyIcon name="PlusIcon" className="h-4 w-4" />
                </Button>
              </div>
              {requirements && requirements.length > 0 && (
                <ul className="space-y-2">
                  {requirements.map((requirement, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                      <span className="text-sm text-gray-700">{requirement}</span>
                      <button
                        type="button"
                        onClick={() => removeRequirement(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Project Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Duration *
                </label>
                <select
                  {...register('duration')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Select duration</option>
                  <option value="1-7 days">1-7 days</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="3-4 weeks">3-4 weeks</option>
                  <option value="1-2 months">1-2 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6+ months">6+ months</option>
                </select>
                {errors.duration && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Deadline (Optional)
                </label>
                <input
                  {...register('deadline')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">{watch('title') || 'Job Title Preview'}</h3>
              <div className="flex flex-wrap gap-2">
                {skills.slice(0, 8).map((s, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">{s}</span>
                ))}
                {skills.length > 8 && <span className="text-xs text-gray-500">+{skills.length - 8} more</span>}
              </div>
              <p className="text-sm text-gray-600 line-clamp-4">
                {watch('description') || 'Job description preview will appear here as you type.'}
              </p>
              <div className="flex flex-wrap gap-4 text-xs text-gray-600 mt-2">
                <span className="flex items-center gap-1"><LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" /> {budgetType==='fixed' ? `${totalMilestoneAmount.toFixed(3)} ETH total` : `${(budgetAmount||0).toFixed(3)} ETH / hr`}</span>
                {watch('duration') && <span className="flex items-center gap-1"><LazyIcon name="ClockIcon" className="h-4 w-4" /> {watch('duration')}</span>}
                {watch('deadline') && <span className="flex items-center gap-1"><LazyIcon name="CalendarIcon" className="h-4 w-4" /> {watch('deadline')}</span>}
                {useBlockchain && <span className="flex items-center gap-1 text-purple-700"><LazyIcon name="ShieldCheckIcon" className="h-4 w-4" /> Escrow</span>}
              </div>
            </div>
          </CardContent>
        </Card>

  {/* Submit */}
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={isSubmitting || ipfsUploading || !isConnected}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {ipfsUploading ? 'Uploading to IPFS...' : 'Creating Job...'}
              </>
            ) : (
              'Post Job'
            )}
          </Button>
          
          <div className="flex gap-3 items-center flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearDraft}
              disabled={isSubmitting}
            >
              Clear Draft
            </Button>
            {serverDraftId && (
              <Button
                type="button"
                variant="outline"
                disabled={!token || isSubmitting}
                onClick={async () => {
                  if (!serverDraftId) return;
                  try {
                    setIsSubmitting(true);
                    const res = await fetch(`/api/job-drafts/${serverDraftId}/publish`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                    const js = await res.json();
                    if (js?.success) {
                      addNotification({ type: 'new_message', title: 'Draft Published', message: 'Draft published as job', data: { jobId: js.job?.id }, timestamp: new Date().toISOString() });
                      router.push('/dashboard');
                    } else {
                      addNotification({ type: 'new_message', title: 'Publish Failed', message: js?.error || 'Unknown error', data: {}, timestamp: new Date().toISOString() });
                    }
                  } catch (e:any) {
                    addNotification({ type: 'new_message', title: 'Publish Error', message: e?.message || 'Unknown error', data: {}, timestamp: new Date().toISOString() });
                  } finally { setIsSubmitting(false); }
                }}
              >Publish Draft</Button>
            )}
            {serverDraftId && (
              <span className="text-[10px] text-gray-500">Saved{serverSyncPending ? '...' : lastServerSync ? ' ✓' : ''}</span>
            )}
          </div>
        </div>
      </form>
  </PageContainer>
  );
}

// Inline component used above
function ConflictResolutionRow({ field, onUseServer, onKeepLocal }: { field: string; onUseServer: () => void; onKeepLocal: () => void; }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-medium">{field}</span>
      <button
        type="button"
        className="px-1.5 py-0.5 border rounded bg-white hover:bg-purple-50"
        onClick={onUseServer}
      >Use Server</button>
      <button
        type="button"
        className="px-1.5 py-0.5 border rounded bg-white hover:bg-purple-50"
        onClick={onKeepLocal}
      >Keep Local</button>
    </div>
  );
}

