'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';

// Получи Project ID бесплатно здесь: https://cloud.walletconnect.com
const WALLET_CONNECT_PROJECT_ID = 'eef6d440eb46defe67636c9f3eef12d3';

const queryClient = new QueryClient();

// Определяем Tempo Testnet вручную
const tempoTestnet = {
  id: 42429,
  name: 'Tempo Testnet',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
  // Газ на testnet платится в стейблкоинах автоматически (если есть баланс)
} as const;

// Используем getDefaultConfig напрямую — он сам создаёт config для wagmi
const config = getDefaultConfig({
  appName: 'Tempo Token Locker',
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [tempoTestnet],
  transports: {
    [tempoTestnet.id]: http(),
  },
  ssr: true,
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}