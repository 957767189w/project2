'use client'

import { useState, useEffect, useCallback } from 'react'
import { WalletState } from '@/types'

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}

const REQUIRED_FEE = 0 // GEN fee amount (0 as specified)

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: '0',
    chainId: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useCallback(() => {
    return typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask)
  }, [])

  // Get current account
  const getAccount = useCallback(async () => {
    if (!window.ethereum) return null
    
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      }) as string[]
      return accounts[0] || null
    } catch {
      return null
    }
  }, [])

  // Get balance
  const getBalance = useCallback(async (address: string) => {
    if (!window.ethereum) return '0'
    
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }) as string
      
      // Convert from wei to GEN (assuming 18 decimals)
      const balanceInGEN = parseInt(balance, 16) / 1e18
      return balanceInGEN.toFixed(4)
    } catch {
      return '0'
    }
  }, [])

  // Get chain ID
  const getChainId = useCallback(async () => {
    if (!window.ethereum) return null
    
    try {
      const chainId = await window.ethereum.request({
        method: 'eth_chainId',
      }) as string
      return parseInt(chainId, 16)
    } catch {
      return null
    }
  }, [])

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled()) {
      setError('MetaMask is not installed. Please install MetaMask to continue.')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      }) as string[]

      if (accounts.length === 0) {
        setError('No accounts found. Please unlock MetaMask.')
        return false
      }

      const address = accounts[0]
      const balance = await getBalance(address)
      const chainId = await getChainId()

      setWallet({
        address,
        isConnected: true,
        balance,
        chainId,
      })

      return true
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [isMetaMaskInstalled, getBalance, getChainId])

  // Disconnect wallet (client-side only)
  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      isConnected: false,
      balance: '0',
      chainId: null,
    })
  }, [])

  // Charge fee (returns true if successful, false otherwise)
  const chargeFee = useCallback(async (): Promise<boolean> => {
    if (!wallet.isConnected || !wallet.address) {
      setError('Wallet not connected')
      return false
    }

    // Fee is 0, so we just verify the wallet is connected and can sign
    if (REQUIRED_FEE === 0) {
      // Simulate a signature request to verify wallet access
      try {
        // Request a simple signature to verify wallet control
        await window.ethereum!.request({
          method: 'personal_sign',
          params: [
            '0x' + Buffer.from('GenPredict Access Verification').toString('hex'),
            wallet.address,
          ],
        })
        return true
      } catch {
        setError('Payment failed')
        return false
      }
    }

    // If fee > 0, send actual transaction
    try {
      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet.address,
          to: wallet.address, // Send to self for fee verification
          value: '0x' + (REQUIRED_FEE * 1e18).toString(16),
        }],
      })

      // Wait for transaction confirmation
      let receipt = null
      while (!receipt) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        receipt = await window.ethereum!.request({
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        })
      }

      return true
    } catch {
      setError('Payment failed')
      return false
    }
  }, [wallet.isConnected, wallet.address])

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (wallet.address) {
      const balance = await getBalance(wallet.address)
      setWallet(prev => ({ ...prev, balance }))
    }
  }, [wallet.address, getBalance])

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return

    const handleAccountsChanged = async (accounts: unknown) => {
      const accountList = accounts as string[]
      if (accountList.length === 0) {
        disconnect()
      } else {
        const address = accountList[0]
        const balance = await getBalance(address)
        const chainId = await getChainId()
        setWallet({
          address,
          isConnected: true,
          balance,
          chainId,
        })
      }
    }

    const handleChainChanged = (chainId: unknown) => {
      setWallet(prev => ({
        ...prev,
        chainId: parseInt(chainId as string, 16),
      }))
    }

    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum?.removeListener('chainChanged', handleChainChanged)
    }
  }, [disconnect, getBalance, getChainId])

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const address = await getAccount()
      if (address) {
        const balance = await getBalance(address)
        const chainId = await getChainId()
        setWallet({
          address,
          isConnected: true,
          balance,
          chainId,
        })
      }
    }

    checkConnection()
  }, [getAccount, getBalance, getChainId])

  return {
    wallet,
    isLoading,
    error,
    connect,
    disconnect,
    chargeFee,
    refreshBalance,
    isMetaMaskInstalled: isMetaMaskInstalled(),
    clearError: () => setError(null),
  }
}
