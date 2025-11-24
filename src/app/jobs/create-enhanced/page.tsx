'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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
import { uploadJSONToIPFS, uploadToIPFS } from '@/lib/ipfs';
import { LazyIcon } from '@/components/ui/LazyIcon';
import { useAuth } from '@/providers/AuthProvider';
import { useApiErrorHandlers } from '@/lib/queryClient';
import Reveal from '@/components/Reveal';
import { LineSkeleton } from '@/components/ui/SkeletonPresets';
// Dynamically import RichTextEditor client-side only to prevent any SSR leakage
const RichTextEditorLazy = dynamic(() => import('@/components/RichTextEditor').then(m => m.RichTextEditor), {
  ssr: false,
  loading: () => <LineSkeleton />
});
import { apiFetch } from '@/lib/utils';

// Wrapper removed; dynamic import handles client-only safety

const jobSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters long'),
  description: z.string().min(50, 'Description must be at least 50 characters long'),
  budgetAmount: z.number().min(0.001, 'Budget must be at least 0.001'),
  budgetType: z.enum(['fixed', 'hourly']),
  currency: z.enum(['ETH', 'USD', 'EUR']),
  paymentMethod: z.enum(['crypto', 'card', 'qr']),
  duration: z.string().min(1, 'Duration is required'),
  deadline: z.string().optional(),
  skills: z.array(z.string()).min(1, 'At least one skill is required'),
  requirements: z.array(z.string()).optional(),
  milestones: z.array(z.object({
    description: z.string().min(5, 'Milestone description required'),
    amount: z.number().min(0.001, 'Amount must be at least 0.001'),
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

function CreateJobPageEnhanced() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { createEscrow } = useEscrow();
  const { token, user } = useAuth();
  const { toastSuccess, toastError, toastInfo, bannerError } = useApiErrorHandlers();
  
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
    formState: { errors, isDirty, isValid },
    setValue,
  watch,
  getValues,
    reset
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    mode: 'onChange',
    criteriaMode: 'all',
    defaultValues: {
      title: '',
      description: '',
      budgetAmount: 0.001,
      budgetType: 'fixed',
      currency: 'USD',
      paymentMethod: 'card',
      duration: '',
      deadline: undefined,
      skills: [],
      requirements: [],
      milestones: [{ description: '', amount: 0.001 }],
      useBlockchain: false,
      attachments: []
    }
  });

  const skills = watch('skills');
  // Rich text description value (HTML) stored separately; keep RHF in sync for validation length.
  const [richDescription, setRichDescription] = useState('');
  const requirements = watch('requirements');
  const budgetType = watch('budgetType');
  const milestones = watch('milestones');
  const useBlockchain = watch('useBlockchain');
  const budgetAmount = watch('budgetAmount');
  const [showStickyActions, setShowStickyActions] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [navigatingAway, setNavigatingAway] = useState(false);

  const extractPlainText = useCallback((value: string): string => {
    return value
      .replace(/<style[^>]*>[^<]*<\/style>/gi, ' ')
      .replace(/<script[^>]*>[^<]*<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

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
        const js = await apiFetch<any>('/api/job-drafts', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
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
    // Wait for auth to settle before attempting server draft fetch
    if (token === undefined) return;
    (async () => {
      let localWrapper: any = null;
      try { const raw = localStorage.getItem(draftKey); if (raw) localWrapper = JSON.parse(raw); } catch {}
      let localDraft = localWrapper?.form ? localWrapper.form : localWrapper;
      let descriptionHtml = '';
      try { const fieldTsRaw = localStorage.getItem(draftKey+':fieldts'); if (fieldTsRaw) fieldTimestampsRef.current = JSON.parse(fieldTsRaw) || {}; } catch {}
      if (localDraft && typeof localDraft === 'object') {
        Object.entries(localDraft).forEach(([k,v]) => { // @ts-ignore
          setValue(k, v);
        });
        const localDesc = typeof localDraft.richDescriptionHtml === 'string' ? localDraft.richDescriptionHtml : localDraft.description;
        if (typeof localDesc === 'string') descriptionHtml = localDesc;
      }
      let localUpdatedNum = Number(localStorage.getItem(draftKey+':updatedAt') || '0');
      if (token) {
        try {
          const js = await apiFetch<any>('/api/job-drafts?page=1&limit=1', { headers: { 'Authorization': `Bearer ${token}` } });
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
              const serverDesc = typeof serverForm.richDescriptionHtml === 'string' ? serverForm.richDescriptionHtml : serverForm.description;
              if (typeof serverDesc === 'string' && serverDesc.trim().length > 0) descriptionHtml = serverDesc;
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
      if (typeof descriptionHtml === 'string' && descriptionHtml.length) {
        setRichDescription(descriptionHtml);
        setValue('description', descriptionHtml);
      } else if (localDraft && typeof localDraft.description === 'string' && localDraft.description.length) {
        setRichDescription(localDraft.description);
        setValue('description', localDraft.description);
      }
      setRestoredDraft(true);
    })();
  }, [restoredDraft, setValue, token]);

  // Autosave draft (debounced)
  const autosave = useCallback((data: any) => {
    const plain = extractPlainText(richDescription);
    try {
      const wrapper = {
        form: { ...data, description: plain, richDescriptionHtml: richDescription },
        _fieldTs: fieldTimestampsRef.current
      };
      localStorage.setItem(draftKey, JSON.stringify(wrapper));
      localStorage.setItem(draftKey+':updatedAt', String(Date.now()));
    } catch {}
  }, [richDescription, extractPlainText]);

  // Server autosave (debounced 2s, skip if no token)
  const serverAutosave = useCallback((data: any) => {
    if (!token) return;
    if (serverAutosaveTimer.current) clearTimeout(serverAutosaveTimer.current);
    serverAutosaveTimer.current = setTimeout(async () => {
      const plain = extractPlainText(richDescription);
      try {
        setServerSyncPending(true);
        const payload = {
          id: serverDraftId || undefined,
          data: { form: { ...data, description: plain, richDescriptionHtml: richDescription }, _fieldTs: fieldTimestampsRef.current }
        };
        const js = await apiFetch<any>('/api/job-drafts', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
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
    }, [token, serverDraftId, richDescription, extractPlainText]);

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

  // Warn on navigation if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !navigatingAway) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, navigatingAway]);

  // Show sticky action bar after user scrolls
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      setShowStickyActions(y > 300);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const clearDraft = async () => {
    const ok = window.confirm('Clear your current draft? This cannot be undone.');
    if (!ok) return;
    try {
      localStorage.removeItem(draftKey);
      localStorage.removeItem(draftKey+':updatedAt');
      if (serverDraftId && token) {
        await apiFetch(`/api/job-drafts/${serverDraftId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        setServerDraftId(null);
      }
      reset();
      toastSuccess('Draft cleared', 'Cleared');
    } catch (e:any) {
      toastError(e?.message || 'Failed to clear draft', 'Clear Failed');
    }
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
    if (!files.length) return;
    // Constraints
    const MAX_FILES = 10;
    const MAX_MB = 10;
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    const ALLOWED = [
      'image/jpeg','image/png','image/webp','image/gif','image/svg+xml',
      'application/pdf','text/plain','application/zip','application/x-zip-compressed'
    ];

    const errors: string[] = [];
    const next: File[] = [];
    const existing = new Set(attachments.map(f => `${f.name}|${f.size}|${(f as any).lastModified||0}`));
    for (const f of files) {
      if (attachments.length + next.length >= MAX_FILES) { errors.push(`Max ${MAX_FILES} files`); break; }
      if (f.size > MAX_BYTES) { errors.push(`${f.name}: > ${MAX_MB}MB`); continue; }
      const typeOk = !f.type || ALLOWED.includes(f.type);
      if (!typeOk) { errors.push(`${f.name}: unsupported type ${f.type || 'unknown'}`); continue; }
      const key = `${f.name}|${f.size}|${(f as any).lastModified||0}`;
      if (existing.has(key)) continue; // skip duplicates
      next.push(f);
      existing.add(key);
    }
    if (errors.length) toastError(errors.join('\n'), 'File Upload');
    if (next.length) setAttachments(prev => [...prev, ...next]);
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
      bannerError('Please connect your wallet to post a job.');
      return;
    }
    // Note: we'll clear any server draft AFTER a successful post.
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
        description: richDescription || data.description,
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
        creatorAddress: address,
        contentFormat: 'rich_html_v1'
      };

      // Save to database first
      const result = await apiFetch<any>('/api/jobs', {
        method: 'POST',
        headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(jobData),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save job to database');
      }

      // If using blockchain, create escrow contract
      if (data.useBlockchain) {
        const totalAmount = data.milestones.reduce((sum, milestone) => sum + milestone.amount, 0);
  const parsedFee = Number.parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE_BPS ?? '', 10);
  const feeBps = Number.isFinite(parsedFee) ? parsedFee : 250; // default 2.5%
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
          toastSuccess(`Job posted & escrow deployed (fee ${(feeBps/100).toFixed(2)}%)`, 'Job Posted');
        } catch (escrowError) {
          console.error('Escrow creation failed:', escrowError);
          setPendingEscrowJobId(result.job?.id || null);
          toastInfo('Job saved, escrow deployment failed. You can retry from the dashboard.', 'Escrow Pending');
        }
      } else {
        toastSuccess('Your job has been posted successfully', 'Job Posted');
      }

      // Clear server draft after successful job post
      try {
        if (token && serverDraftId) {
          await apiFetch(`/api/job-drafts/${serverDraftId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          setServerDraftId(null);
        }
      } catch {}

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to post job:', error);
      toastError(error instanceof Error ? error.message : 'Unknown error', 'Job Post Failed');
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
      toastSuccess('Escrow deployment succeeded on retry', 'Escrow Deployed');
      setPendingEscrowJobId(null);
    } catch (err) {
      toastError((err as any)?.message || 'Unknown error', 'Escrow Retry Failed');
    } finally {
      setEscrowRetrying(false);
    }
  };

  // Immediate save draft (no debounce), used by Save buttons
  const saveDraftImmediate = useCallback(async () => {
    if (!token) {
      bannerError('You must be logged in to save drafts.');
      return;
    }
    try {
      setSavingDraft(true);
      setServerSyncPending(true);
      const payload = { id: serverDraftId || undefined, data: { form: getValues(), _fieldTs: fieldTimestampsRef.current } };
      const js = await apiFetch<any>('/api/job-drafts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (js?.success && js.draft) {
        if (!serverDraftId) setServerDraftId(js.draft.id);
        setLastServerSync(Date.now());
        toastSuccess('Draft saved', 'Saved');
      } else {
        toastError(js?.error || 'Failed to save draft', 'Save failed');
      }
    } catch (e:any) {
      toastError(e?.message || 'Failed to save draft', 'Save error');
    } finally {
      setSavingDraft(false);
      setServerSyncPending(false);
    }
  }, [token, serverDraftId, getValues, toastSuccess, toastError]);

  const onCancel = useCallback(() => {
    const hasUnsaved = isDirty || serverSyncPending;
    if (hasUnsaved) {
      const ok = window.confirm('You have unsaved changes. Leave this page?');
      if (!ok) return;
    }
    setNavigatingAway(true);
    // Prefer going back; if there is no history entry, user agent will stay but that's acceptable for now
    router.back();
  }, [isDirty, serverSyncPending, router]);

  const canSubmit = isValid && isConnected && !!token && !ipfsUploading && !isSubmitting;

  // Show loading state while auth is initializing to prevent fetch errors
  if (token === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00D9C0] via-[#F5E6E8] to-[#D1D5DB] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1E3A5F] border-r-transparent"></div>
          <p className="mt-4 text-sm text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00D9C0] via-[#F5E6E8] to-[#1E3A5F]">
    <PageContainer className="max-w-4xl">
      <Reveal>
        <SectionHeader
          title="Post a New Job"
          subtitle="Create a secure, blockchain-powered freelance project"
          actions={(
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={saveDraftImmediate}
                disabled={!token || savingDraft}
                loading={savingDraft}
                loadingText="Saving..."
                size="sm"
                className="!bg-teal-500 hover:!bg-teal-400 !text-white"
              >
                <span className="inline-flex items-center gap-1">
                  <LazyIcon name="BookmarkSquareIcon" className="h-4 w-4" />
                  Save Draft
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearDraft}
                disabled={isSubmitting}
                size="sm"
                className="!border-rose-200 !text-rose-500 hover:!bg-rose-50"
              >
                <span className="inline-flex items-center gap-1">
                  <LazyIcon name="TrashIcon" className="h-4 w-4" />
                  Clear
                </span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
                size="sm"
                className="!text-slate-500 hover:!bg-slate-100"
              >
                Cancel
              </Button>
              {serverDraftId && (
                <Button
                  type="button"
                  variant="gradient"
                  className="!bg-[linear-gradient(90deg,#4338ca_0%,#7e22ce_50%,#c026d3_100%)] hover:!bg-[linear-gradient(90deg,#4f46e5_0%,#8b5cf6_50%,#d946ef_100%)]"
                  size="sm"
                  onClick={async () => {
                    if (!serverDraftId) return;
                    try {
                      setIsSubmitting(true);
                      const js = await apiFetch<any>(`/api/job-drafts/${serverDraftId}/publish`, { method: 'POST', headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) } });
                      if (js?.success) {
                        toastSuccess('Draft published as job', 'Draft Published');
                        router.push('/dashboard');
                      } else {
                        toastError(js?.error || 'Unknown error', 'Publish Failed');
                      }
                    } catch (e:any) {
                      toastError(e?.message || 'Unknown error', 'Publish Error');
                    } finally { setIsSubmitting(false); }
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    <LazyIcon name="ArrowUpOnSquareIcon" className="h-4 w-4" />
                    Publish
                  </span>
                </Button>
              )}
            </>
          )}
          status={serverDraftId ? (serverSyncPending ? 'Draft saving…' : lastServerSync ? 'Draft saved ✓' : 'Draft ready') : 'No draft saved'}
        />
      </Reveal>
      <Reveal delay={40}>
        <div className="mb-6 rounded-xl p-[1px] bg-gradient-to-r from-purple-600/60 via-blue-500/60 to-cyan-500/60">
          <div className="rounded-[11px] bg-white dark:bg-[var(--surface-primary)] p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white">
              <LazyIcon name="ShieldCheckIcon" className="h-5 w-5" />
            </div>
            <div className="text-sm text-gray-600 dark:text-[var(--text-muted)]">
              <span className="font-medium text-gray-900 dark:text-[var(--text-primary)]">Pro tip:</span> Clear sections, scoped milestones, and a realistic budget attract better proposals.
            </div>
          </div>
        </div>
      </Reveal>
      {serverConflict && (
        <Reveal delay={50} className="mb-4">
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded space-y-2">
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
        </Reveal>
      )}
  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Grid layout for main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wallet Connection Status */}
        { !isConnected && (
          <div className="lg:col-span-3">
            <Reveal delay={100}>
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="flex items-center space-x-3 p-4">
                  <LazyIcon name="ShieldCheckIcon" className="h-6 w-6 text-yellow-600" />
                  <div>
                    <p className="text-yellow-800 font-medium">Wallet Not Connected</p>
                    <p className="text-yellow-700 text-sm">Connect your wallet to enable blockchain features</p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>
        ) }
        <div className="lg:col-span-1">
          <Reveal delay={150}>
        <Card hoverable glass density="compact">
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
          </Reveal>
        </div>
        {/* Job Details (Left column) */}
        <div className="lg:col-span-2">
          <Reveal delay={200}>
        <Card hoverable glass density="spacious">
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
                id="job-title"
                aria-invalid={!!errors.title}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="e.g., Build a responsive React web application"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>Minimum 10 characters</span>
                <span>{(watch('title')||'').length}/100</span>
              </div>
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Description *
              </label>
              <div className="border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 overflow-hidden">
                {/* Hidden textarea to satisfy RHF validation length; mirror plain text length approximation */}
                <textarea
                  {...register('description')}
                  value={richDescription.replace(/<[^>]+>/g,' ').slice(0,15000)}
                  onChange={()=>{ /* ignore manual edits; controlled by editor */ }}
                  className="hidden"
                  readOnly
                />
                {/* Lazy-load RichTextEditor to avoid SSR issues */}
                <RichTextEditorLazy
                  value={richDescription}
                  onChange={(html: string) => {
                    setRichDescription(html);
                  }}
                  placeholder="Describe your project in detail..."
                  className="rich-editor"
                  minHeight={220}
                  aria-label="Job description rich text editor"
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                <span>Minimum 50 characters</span>
                <span>{richDescription.replace(/<[^>]+>/g,' ').trim().length}/15000</span>
              </div>
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
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
                        <div className="bg-purple-500 h-2 transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <LineSkeleton width={`${Math.max(20, Math.min(100, uploadProgress))}%`} className="h-3 rounded" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
          </Reveal>
        </div>

        {/* Budget & Payment (Right) */}
        <div className="lg:col-span-1">
          <Reveal delay={250}>
        <Card hoverable glass>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LazyIcon name="CurrencyDollarIcon" className="h-6 w-6 text-purple-600" />
              <span>Budget & Payment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
              <div className="grid grid-cols-3 gap-3">
                {(['crypto','card','qr'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setValue('paymentMethod', method);
                      if (method === 'crypto') {
                        setValue('currency', 'ETH');
                        setValue('useBlockchain', true);
                      } else {
                        setValue('currency', 'USD');
                        setValue('useBlockchain', false);
                      }
                    }}
                    className={`px-3 py-2 rounded border text-sm transition-colors flex flex-col items-center gap-1 ${watch('paymentMethod')===method ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-300 hover:border-purple-400'}`}
                  >
                    <LazyIcon name={method==='crypto'?'CurrencyDollarIcon':method==='card'?'CreditCardIcon':'QrCodeIcon'} className="h-5 w-5" />
                    <span className="capitalize">{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency *</label>
              <select
                {...register('currency')}
                disabled={watch('paymentMethod') === 'crypto'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="ETH">ETH (Ξ)</option>
              </select>
              {watch('paymentMethod') === 'crypto' && (
                <p className="mt-1 text-xs text-gray-500">Crypto payments use ETH by default</p>
              )}
            </div>

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
                {budgetType === 'fixed' ? `Total Fixed Budget (${watch('currency')})` : `Hourly Rate (${watch('currency')}) *`}
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
                <span className="text-gray-500">Total ({watch('currency')})</span>
                <span className="font-semibold">{totalMilestoneAmount.toFixed(watch('currency')==='ETH'?3:2)}</span>
              </div>
              <div className="p-3 rounded border bg-gray-50 flex flex-col">
                <span className="text-gray-500">Payment</span>
                <span className="font-semibold capitalize">{watch('paymentMethod')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
          </Reveal>
        </div>

        {/* Project Milestones (Left) */}
        <div className="lg:col-span-2">
          <Reveal delay={300}>
        <Card hoverable glass>
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
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove Milestone ${index + 1}`}
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                    </Button>
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
                      Amount ({watch('currency')}) *
                    </label>
                    <input
                      type="number"
                      step={watch('currency')==='ETH'?'0.001':'0.01'}
                      min={watch('currency')==='ETH'?'0.001':'0.01'}
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
            
            <Button
              type="button"
              variant="outline"
              onClick={addMilestone}
              className="w-full border-dashed"
            >
              <LazyIcon name="PlusIcon" className="h-5 w-5 mr-2" />
              Add Another Milestone
            </Button>
            
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
          </Reveal>
        </div>

        {/* Skills and Requirements (Left) */}
        <div className="lg:col-span-2">
          <Reveal delay={350}>
        <Card hoverable glass>
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove skill ${skill}`}
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-purple-700 hover:text-purple-900"
                    >
                      <LazyIcon name="XMarkIcon" className="h-3 w-3" />
                    </Button>
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
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Remove requirement ${index + 1}`}
                        onClick={() => removeRequirement(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <LazyIcon name="XMarkIcon" className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
          </Reveal>
        </div>

        {/* Project Timeline (Right) */}
        <div className="lg:col-span-1">
          <Reveal delay={400}>
        <Card hoverable glass>
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
          </Reveal>
        </div>

        {/* Live Preview (Right) */}
        <div className="lg:col-span-1">
          <Reveal delay={450}>
        <Card hoverable glass>
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
          </Reveal>
        </div>
      </div>

  {/* Submit */}
        <Reveal delay={500}>
        <div className="flex space-x-4">
          <Button
            type="submit"
            disabled={!canSubmit}
            loading={isSubmitting}
            loadingText={ipfsUploading ? 'Uploading to IPFS...' : 'Creating Job...'}
            size="lg"
            variant="gradient"
            className="flex-1 !bg-[linear-gradient(90deg,#4338ca_0%,#7e22ce_50%,#c026d3_100%)] hover:!bg-[linear-gradient(90deg,#4f46e5_0%,#8b5cf6_50%,#d946ef_100%)]"
          >
            <span className="inline-flex items-center gap-2">
              <LazyIcon name="RocketLaunchIcon" className="h-5 w-5" />
              Post Job
            </span>
          </Button>
          
          <div className="flex gap-3 items-center flex-wrap">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
              className="!text-slate-500 hover:!bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={saveDraftImmediate}
              disabled={!token || savingDraft}
              loading={savingDraft}
              loadingText="Saving..."
              className="!bg-teal-500 hover:!bg-teal-400 !text-white"
            >
              <span className="inline-flex items-center gap-1">
                <LazyIcon name="BookmarkSquareIcon" className="h-4 w-4" />
                Save Draft
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={clearDraft}
              disabled={isSubmitting}
              className="!border-rose-200 !text-rose-500 hover:!bg-rose-50"
            >
              <span className="inline-flex items-center gap-1">
                <LazyIcon name="TrashIcon" className="h-4 w-4" />
                Clear Draft
              </span>
            </Button>
            {serverDraftId && (
              <Button
                type="button"
                variant="gradient"
                disabled={!token}
                loading={isSubmitting}
                loadingText="Publishing..."
                className="!bg-[linear-gradient(90deg,#4338ca_0%,#7e22ce_50%,#c026d3_100%)] hover:!bg-[linear-gradient(90deg,#4f46e5_0%,#8b5cf6_50%,#d946ef_100%)]"
                onClick={async () => {
                  if (!serverDraftId) return;
                  try {
                    setIsSubmitting(true);
                    const js = await apiFetch<any>(`/api/job-drafts/${serverDraftId}/publish`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                    if (js?.success) {
                      toastSuccess('Draft published as job', 'Draft Published');
                      router.push('/dashboard');
                    } else {
                      toastError(js?.error || 'Unknown error', 'Publish Failed');
                    }
                  } catch (e:any) {
                    toastError(e?.message || 'Unknown error', 'Publish Error');
                  } finally { setIsSubmitting(false); }
                }}
              >
                <span className="inline-flex items-center gap-1">
                  <LazyIcon name="ArrowUpOnSquareIcon" className="h-4 w-4" />
                  Publish Draft
                </span>
              </Button>
            )}
            {serverDraftId && (
              <span className="text-[10px] text-gray-500" role="status" aria-live="polite">Saved{serverSyncPending ? '...' : lastServerSync ? ' ✓' : ''}</span>
            )}
          </div>
        </div>
        </Reveal>
      </form>

      {/* Sticky Action Bar */}
      {showStickyActions && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="hidden sm:inline-flex items-center gap-1"><LazyIcon name="CurrencyDollarIcon" className="h-4 w-4" />{budgetType==='fixed' ? `${totalMilestoneAmount.toFixed(3)} ETH total` : `${(budgetAmount||0).toFixed(3)} ETH / hr`}</span>
              {Object.keys(errors||{}).length > 0 && (
                <span className="inline-flex items-center gap-1 text-red-600"><LazyIcon name="ExclamationTriangleIcon" className="h-4 w-4" />{Object.keys(errors).length} error{Object.keys(errors).length>1?'s':''}</span>
              )}
              {serverDraftId && (
                <span className="inline-flex items-center gap-1">Draft {serverSyncPending ? 'saving…' : lastServerSync ? 'saved' : 'ready'}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {serverSyncPending && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500" aria-live="polite">
                  <span className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" /> Saving…
                </span>
              )}
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting} className="!text-slate-500 hover:!bg-slate-100">Cancel</Button>
              <Button type="button" variant="secondary" onClick={saveDraftImmediate} disabled={!token || savingDraft} loading={savingDraft} loadingText="Saving..." className="!bg-teal-500 hover:!bg-teal-400 !text-white">Save Draft</Button>
              <Button type="button" variant="outline" onClick={clearDraft} disabled={isSubmitting} className="!border-rose-200 !text-rose-500 hover:!bg-rose-50">Clear Draft</Button>
              <Button type="submit" onClick={handleSubmit(onSubmit)} disabled={!canSubmit} loading={isSubmitting} loadingText={ipfsUploading ? 'Uploading to IPFS…' : 'Creating Job…'} variant="gradient" className="!bg-[linear-gradient(90deg,#4338ca_0%,#7e22ce_50%,#c026d3_100%)] hover:!bg-[linear-gradient(90deg,#4f46e5_0%,#8b5cf6_50%,#d946ef_100%)]">
                Post Job
              </Button>
            </div>
          </div>
        </div>
      )}
  </PageContainer>
    </div>
  );
}

// Disable SSR for this page to prevent hydration mismatches caused by extensions
// injecting attributes into inputs before React hydrates (e.g., password managers, 2FA helpers).
export default dynamic(() => Promise.resolve(CreateJobPageEnhanced), { ssr: false });

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

