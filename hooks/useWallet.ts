'use client';

import { useState, useEffect, useCallback } from 'react';
import { genLayer } from '@/lib/genlayer';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const address = await genLayer.connectWallet();
      
      setState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('gp_wallet_connected', 'true');
      }

      return address;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect wallet';
      
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await genLayer.disconnect();
    
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });

    if (typeof window !== 'undefined') {
      localStorage.removeItem('gp_wallet_connected');
    }
  }, []);

  // Auto-reconnect
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window === 'undefined') return;

      const wasConnected = localStorage.getItem('gp_wallet_connected');
      
      if (wasConnected && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          }) as string[];

          if (accounts && accounts.length > 0) {
            await connect();
          }
        } catch (error) {
          console.error('Auto-connect failed:', error);
        }
      }
    };

    autoConnect();
  }, [connect]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accountsArray = accounts as string[];
      
      if (accountsArray.length === 0) {
        disconnect();
      } else if (accountsArray[0] !== state.address) {
        setState(prev => ({
          ...prev,
          address: accountsArray[0],
        }));
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [state.address, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}

// Hook for fee deduction verification
export function useFeeVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (): Promise<boolean> => {
    setIsVerifying(true);
    setError(null);

    try {
      const success = await genLayer.verifyWalletAccess();
      
      if (!success) {
        setError('Deduction failed');
        return false;
      }
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Deduction failed');
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    verify,
    isVerifying,
    error,
  };
}
