import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import contractAddresses from '@/contracts/addresses.json';
import { FreelancerEscrowABI } from '@/contracts/abis';

export function useEscrow() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Create escrow
  const createEscrow = async ({
    freelancer,
    milestoneDescriptions,
    milestoneAmounts,
    deadline,
    jobDescription,
    totalAmount,
    platformFee
  }: {
    freelancer: string;
    milestoneDescriptions: string[];
    milestoneAmounts: string[];
    deadline: number;
    jobDescription: string;
    totalAmount: string;
    platformFee: string;
  }) => {
    const value = parseEther(totalAmount) + parseEther(platformFee);
    
    return writeContract({
      address: contractAddresses.FreelancerEscrow as `0x${string}`,
      abi: FreelancerEscrowABI.abi,
      functionName: 'createEscrow',
      args: [
        freelancer as `0x${string}`,
        milestoneDescriptions,
        milestoneAmounts.map(amount => parseEther(amount)),
        BigInt(deadline),
        jobDescription
      ],
      value
    });
  };

  // Complete milestone
  const completeMilestone = async (escrowId: number, milestoneIndex: number) => {
    return writeContract({
      address: contractAddresses.FreelancerEscrow as `0x${string}`,
      abi: FreelancerEscrowABI.abi,
      functionName: 'completeMilestone',
      args: [BigInt(escrowId), BigInt(milestoneIndex)]
    });
  };

  // Release milestone payment
  const releaseMilestonePayment = async (escrowId: number, milestoneIndex: number) => {
    return writeContract({
      address: contractAddresses.FreelancerEscrow as `0x${string}`,
      abi: FreelancerEscrowABI.abi,
      functionName: 'releaseMilestonePayment',
      args: [BigInt(escrowId), BigInt(milestoneIndex)]
    });
  };

  // Raise dispute
  const raiseDispute = async (escrowId: number, reason: string) => {
    return writeContract({
      address: contractAddresses.FreelancerEscrow as `0x${string}`,
      abi: FreelancerEscrowABI.abi,
      functionName: 'raiseDispute',
      args: [BigInt(escrowId), reason]
    });
  };

  return {
    createEscrow,
    completeMilestone,
    releaseMilestonePayment,
    raiseDispute,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed
  };
}

// Hook to read escrow data
export function useEscrowData(escrowId: number) {
  const { data: escrowData, isError, isLoading } = useReadContract({
    address: contractAddresses.FreelancerEscrow as `0x${string}`,
    abi: FreelancerEscrowABI.abi,
    functionName: 'getEscrow',
    args: [BigInt(escrowId)]
  });

  const { data: milestones } = useReadContract({
    address: contractAddresses.FreelancerEscrow as `0x${string}`,
    abi: FreelancerEscrowABI.abi,
    functionName: 'getMilestones',
    args: [BigInt(escrowId)]
  });

  return {
    escrowData,
    milestones,
    isError,
    isLoading
  };
}

// Hook to get user's escrows
export function useUserEscrows(userAddress: string) {
  const { data: escrowIds, isError, isLoading } = useReadContract({
    address: contractAddresses.FreelancerEscrow as `0x${string}`,
    abi: FreelancerEscrowABI.abi,
    functionName: 'getUserEscrows',
    args: [userAddress as `0x${string}`]
  });

  return {
    escrowIds,
    isError,
    isLoading
  };
}

// Hook to get platform fee percentage
export function usePlatformFee() {
  const { data: feePercentage } = useReadContract({
    address: contractAddresses.FreelancerEscrow as `0x${string}`,
    abi: FreelancerEscrowABI.abi,
    functionName: 'platformFeePercentage'
  });

  const calculateFee = (amount: string) => {
    if (!feePercentage) return '0';
    const amountBigInt = parseEther(amount);
    const fee = (amountBigInt * BigInt(feePercentage.toString())) / BigInt(10000);
    return formatEther(fee);
  };

  return {
    feePercentage,
    calculateFee
  };
}
