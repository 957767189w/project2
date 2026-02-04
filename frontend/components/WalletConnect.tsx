'use client';

import { useWallet } from '@/hooks/useWallet';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export function WalletConnect() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse" />
          <span className="font-mono text-sm text-zinc-300">{formatAddress(address)}</span>
        </div>
        <button
          onClick={disconnect}
          className="btn btn-outline flex items-center gap-2"
          title="Disconnect wallet"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="btn btn-primary flex items-center gap-2"
      >
        {isConnecting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Wallet size={18} />
            <span>Connect Wallet</span>
          </>
        )}
      </button>
      {error && (
        <span className="text-sm text-danger-500">{error}</span>
      )}
    </div>
  );
}
