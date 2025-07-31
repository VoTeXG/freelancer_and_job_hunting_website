'use client';

import { useAccount } from 'wagmi';
import { usePlatformFee, useUserEscrows } from '@/hooks/useEscrow';
import { useUserReputation } from '@/hooks/useReputation';
import { useFreelancerCertificates } from '@/hooks/useCertificates';

export default function BlockchainTestPage() {
  const { address, isConnected } = useAccount();
  const { feePercentage, calculateFee } = usePlatformFee();
  const { escrowIds } = useUserEscrows(address || '');
  const { reputation } = useUserReputation(address || '');
  const { certificateIds } = useFreelancerCertificates(address || '');

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Blockchain Integration Test</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">Please connect your wallet to test blockchain features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">Blockchain Integration Test</h1>
      
      {/* Wallet Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Wallet Information</h2>
        <p><strong>Address:</strong> {address}</p>
        <p><strong>Network:</strong> Local Hardhat Network</p>
      </div>

      {/* Platform Fee */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Platform Fee</h2>
        <p><strong>Fee Percentage:</strong> {feePercentage ? `${Number(feePercentage) / 100}%` : 'Loading...'}</p>
        <p><strong>Fee for 1 ETH:</strong> {calculateFee('1')} ETH</p>
      </div>

      {/* User Escrows */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Escrows</h2>
        {escrowIds && Array.isArray(escrowIds) && escrowIds.length > 0 ? (
          <div>
            <p><strong>Total Escrows:</strong> {escrowIds.length}</p>
            <div className="mt-2">
              {escrowIds.map((id: any, index: number) => (
                <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm mr-2 mb-2">
                  Escrow #{Number(id)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No escrows found</p>
        )}
      </div>

      {/* User Reputation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Reputation</h2>
        {reputation && Array.isArray(reputation) ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>Total Score:</strong> {Number(reputation[0])}</p>
              <p><strong>Review Count:</strong> {Number(reputation[1])}</p>
              <p><strong>Average Rating:</strong> {Number(reputation[2]) / 100}/5</p>
            </div>
            <div>
              <p><strong>Completed Jobs:</strong> {Number(reputation[3])}</p>
              <p><strong>Total Earnings:</strong> {Number(reputation[4])} wei</p>
              <p><strong>Verified:</strong> {reputation[6] ? 'Yes' : 'No'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No reputation data found</p>
        )}
      </div>

      {/* User Certificates */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Certificates</h2>
        {certificateIds && Array.isArray(certificateIds) && certificateIds.length > 0 ? (
          <div>
            <p><strong>Total Certificates:</strong> {certificateIds.length}</p>
            <div className="mt-2">
              {certificateIds.map((id: any, index: number) => (
                <span key={index} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2 mb-2">
                  Certificate #{Number(id)}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No certificates found</p>
        )}
      </div>

      {/* Contract Addresses */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Contract Addresses</h2>
        <div className="text-sm space-y-1 font-mono">
          <p><strong>Escrow:</strong> 0x5FbDB2315678afecb367f032d93F642f64180aa3</p>
          <p><strong>Reputation:</strong> 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512</p>
          <p><strong>Certificates:</strong> 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0</p>
        </div>
      </div>
    </div>
  );
}
