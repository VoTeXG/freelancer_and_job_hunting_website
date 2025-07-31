import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import contractAddresses from '@/contracts/addresses.json';
import { ReputationSystemABI } from '@/contracts/abis';

export function useReputation() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Submit review
  const submitReview = async ({
    reviewee,
    escrowId,
    rating,
    comment,
    isFreelancerReview
  }: {
    reviewee: string;
    escrowId: number;
    rating: number;
    comment: string;
    isFreelancerReview: boolean;
  }) => {
    return writeContract({
      address: contractAddresses.ReputationSystem as `0x${string}`,
      abi: ReputationSystemABI.abi,
      functionName: 'submitReview',
      args: [
        reviewee as `0x${string}`,
        BigInt(escrowId),
        rating,
        comment,
        isFreelancerReview
      ]
    });
  };

  return {
    submitReview,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed
  };
}

// Hook to get user reputation
export function useUserReputation(userAddress: string) {
  const { data: reputation, isError, isLoading } = useReadContract({
    address: contractAddresses.ReputationSystem as `0x${string}`,
    abi: ReputationSystemABI.abi,
    functionName: 'getUserReputation',
    args: [userAddress as `0x${string}`]
  });

  return {
    reputation,
    isError,
    isLoading
  };
}

// Hook to get user reviews
export function useUserReviews(userAddress: string) {
  const { data: reviewIds, isError, isLoading } = useReadContract({
    address: contractAddresses.ReputationSystem as `0x${string}`,
    abi: ReputationSystemABI.abi,
    functionName: 'getUserReviews',
    args: [userAddress as `0x${string}`]
  });

  return {
    reviewIds,
    isError,
    isLoading
  };
}

// Hook to get a specific review
export function useReview(reviewId: number) {
  const { data: review, isError, isLoading } = useReadContract({
    address: contractAddresses.ReputationSystem as `0x${string}`,
    abi: ReputationSystemABI.abi,
    functionName: 'getReview',
    args: [BigInt(reviewId)]
  });

  return {
    review,
    isError,
    isLoading
  };
}

// Hook to get paginated reviews
export function useUserReviewsPaginated(userAddress: string, offset: number, limit: number) {
  const { data, isError, isLoading } = useReadContract({
    address: contractAddresses.ReputationSystem as `0x${string}`,
    abi: ReputationSystemABI.abi,
    functionName: 'getUserReviewsPaginated',
    args: [userAddress as `0x${string}`, BigInt(offset), BigInt(limit)]
  });

  return {
    reviewIds: data?.[0],
    total: data?.[1],
    isError,
    isLoading
  };
}
