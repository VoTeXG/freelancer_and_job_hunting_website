'use client';

import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider, http, createConfig } from 'wagmi';
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { mainnet, polygon, optimism, arbitrum, base, sepolia } from 'wagmi/chains';
import type { Chain } from 'viem';
import { QueryClientProvider } from '@tanstack/react-query';
import { createAppQueryClient } from '@/lib/queryClient';

const minimal = process.env.NEXT_PUBLIC_CI_MINIMAL_WEB3 === '1';
const CHAINS: Chain[] = minimal ? [sepolia] : [mainnet, polygon, optimism, arbitrum, base, sepolia];

const wcProjectId = (process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '').trim();
const wcDisabled = (process.env.NEXT_PUBLIC_DISABLE_WALLETCONNECT || process.env.NEXT_PUBLIC_DISABLE_WALLET_CONNECT || '') === '1';
// Only enable WalletConnect when explicitly configured with a real projectId AND not disabled.
const hasWalletConnect = !!wcProjectId && wcProjectId !== 'your-project-id' && !wcDisabled;

// Build transports explicitly (HTTP only) to avoid unstable WS in dev/corporate networks
const transports = Object.fromEntries(CHAINS.map((c) => [c.id, http()])) as any;

const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || 'http://localhost:3000';

// Allow disabling Coinbase connector if its telemetry causes noisy errors in dev.
const coinbaseDisabled = (process.env.NEXT_PUBLIC_DISABLE_COINBASE || '') === '1';

const connectors = [
  injected({ shimDisconnect: true }),
  ...(!coinbaseDisabled ? [coinbaseWallet({ appName: 'CareerBridge' })] : []),
  ...(hasWalletConnect
    ? [
        walletConnect({
          projectId: wcProjectId,
          showQrModal: true,
          metadata: {
            name: 'CareerBridge',
            description: 'Blockchain-based freelancer marketplace',
            url: appOrigin,
            icons: [`${appOrigin.replace(/\/$/, '')}/favicon.ico`],
          },
        }),
      ]
    : []),
];

const config = createConfig({
  chains: (CHAINS as unknown as readonly [Chain, ...Chain[]]),
  ssr: true,
  connectors,
  transports,
});

const queryClient = createAppQueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // In minimal CI mode skip RainbowKitProvider for speed and to reduce external calls
  if (minimal) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
