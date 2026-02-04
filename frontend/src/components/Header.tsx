'use client'

import { useWallet } from '@/hooks/useWallet'
import { clsx } from 'clsx'

export function Header() {
  const { wallet, isLoading, connect, disconnect, isMetaMaskInstalled } = useWallet()

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">GenPredict</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#markets" className="text-gray-600 hover:text-gray-900 font-medium">
              Markets
            </a>
            <a href="#create" className="text-gray-600 hover:text-gray-900 font-medium">
              Create
            </a>
            <a href="#portfolio" className="text-gray-600 hover:text-gray-900 font-medium">
              Portfolio
            </a>
          </nav>

          {/* Wallet */}
          <div className="flex items-center gap-4">
            {wallet.isConnected ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {wallet.balance} GEN
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatAddress(wallet.address!)}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className={clsx(
                    'btn btn-secondary text-sm',
                    'flex items-center gap-2'
                  )}
                >
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="hidden sm:inline">Connected</span>
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={isLoading || !isMetaMaskInstalled}
                className={clsx(
                  'btn btn-primary text-sm',
                  'flex items-center gap-2',
                  (isLoading || !isMetaMaskInstalled) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Connecting...</span>
                  </>
                ) : !isMetaMaskInstalled ? (
                  <span>Install MetaMask</span>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
