import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { WalletConnection } from '@/types';

export function useWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [walletData, setWalletData] = useState<WalletConnection>({
    address: '',
    isConnected: false,
    chainId: 0,
    balance: '0',
  });

  useEffect(() => {
    setWalletData({
      address: address || '',
      isConnected,
      chainId: chainId || 0,
      balance: '0', // TODO: Implement balance fetching
    });
  }, [address, isConnected, chainId]);

  const connectWallet = (connectorId?: string) => {
    const connector = connectors.find(c => c.id === connectorId) || connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  return {
    wallet: walletData,
    connectWallet,
    disconnectWallet,
    connectors,
    isConnecting: false, // TODO: Implement loading state
  };
}
