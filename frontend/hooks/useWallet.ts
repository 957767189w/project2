'use client';

import { useState, useEffect, useCallback } from 'react';
import { genLayerClient } from '@/lib/genlayer';

export type WalletState = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
};

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
      const address = await genLayerClient.connectWallet();
      setState({
        address,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      
      // Store in localStorage for persistence
      if (typeof window !== 'undefined') {
        localStorage.setItem('wallet_connected', 'true');
      }
      
      return address;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await genLayerClient.disconnectWallet();
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wallet_connected');
    }
  }, []);

  // Auto-reconnect on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window === 'undefined') return;
      
      const wasConnected = localStorage.getItem('wallet_connected');
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

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== state.address) {
        setState(prev => ({ ...prev, address: accounts[0] }));
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

export function useDeductFee() {
  const [isDeducting, setIsDeducting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deduct = useCallback(async (amount: number = 0): Promise<boolean> => {
    setIsDeducting(true);
    setError(null);

    try {
      const success = await genLayerClient.deductFee(amount);
      if (!success) {
        setError('Deduction failed');
        return false;
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Deduction failed');
      return false;
    } finally {
      setIsDeducting(false);
    }
  }, []);

  return { deduct, isDeducting, error };
}
