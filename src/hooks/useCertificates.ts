import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import contractAddresses from '@/contracts/addresses.json';
import { CertificateNFTABI } from '@/contracts/abis';

export function useCertificates() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Mint certificate (only authorized addresses can call this)
  const mintCertificate = async ({
    freelancer,
    client,
    escrowId,
    projectTitle,
    projectDescription,
    skill,
    projectValue,
    rating,
    ipfsHash
  }: {
    freelancer: string;
    client: string;
    escrowId: number;
    projectTitle: string;
    projectDescription: string;
    skill: string;
    projectValue: string;
    rating: number;
    ipfsHash: string;
  }) => {
    return writeContract({
      address: contractAddresses.CertificateNFT as `0x${string}`,
      abi: CertificateNFTABI.abi,
      functionName: 'mintCertificate',
      args: [
        freelancer as `0x${string}`,
        client as `0x${string}`,
        BigInt(escrowId),
        projectTitle,
        projectDescription,
        skill,
        BigInt(projectValue),
        rating,
        ipfsHash
      ]
    });
  };

  return {
    mintCertificate,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed
  };
}

// Hook to get freelancer's certificates
export function useFreelancerCertificates(freelancerAddress: string) {
  const { data: certificateIds, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'getFreelancerCertificates',
    args: [freelancerAddress as `0x${string}`]
  });

  return {
    certificateIds,
    isError,
    isLoading
  };
}

// Hook to get certificate details
export function useCertificate(tokenId: number) {
  const { data: certificate, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'getCertificate',
    args: [BigInt(tokenId)]
  });

  return {
    certificate,
    isError,
    isLoading
  };
}

// Hook to get freelancer's skills
export function useFreelancerSkills(freelancerAddress: string) {
  const { data: skills, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'getFreelancerSkills',
    args: [freelancerAddress as `0x${string}`]
  });

  return {
    skills,
    isError,
    isLoading
  };
}

// Hook to get freelancer's skill level
export function useFreelancerSkillLevel(freelancerAddress: string, skill: string) {
  const { data: skillLevel, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'getFreelancerSkillLevel',
    args: [freelancerAddress as `0x${string}`, skill]
  });

  return {
    level: skillLevel?.[0],
    certificateCount: skillLevel?.[1],
    totalProjectValue: skillLevel?.[2],
    lastUpdated: skillLevel?.[3],
    isError,
    isLoading
  };
}

// Hook to get certificates by skill
export function useCertificatesBySkill(skill: string, limit: number = 10) {
  const { data: certificateIds, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'getCertificatesBySkill',
    args: [skill, BigInt(limit)]
  });

  return {
    certificateIds,
    isError,
    isLoading
  };
}

// Hook to get total supply of certificates
export function useTotalSupply() {
  const { data: totalSupply, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'totalSupply'
  });

  return {
    totalSupply,
    isError,
    isLoading
  };
}

// Hook to get token URI
export function useTokenURI(tokenId: number) {
  const { data: tokenURI, isError, isLoading } = useReadContract({
    address: contractAddresses.CertificateNFT as `0x${string}`,
    abi: CertificateNFTABI.abi,
    functionName: 'tokenURI',
    args: [BigInt(tokenId)]
  });

  return {
    tokenURI,
    isError,
    isLoading
  };
}
