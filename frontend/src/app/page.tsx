'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'
import { StatsBar } from '@/components/StatsBar'
import { MarketCard } from '@/components/MarketCard'
import { CreateMarketForm } from '@/components/CreateMarketForm'
import { BettingPanel } from '@/components/BettingPanel'
import { useActiveMarkets, useMarkets } from '@/hooks/useMarkets'
import { useWallet } from '@/hooks/useWallet'
import { Market } from '@/types'
import { clsx } from 'clsx'

type Tab = 'active' | 'all' | 'create'

export default function Home() {
  const { wallet } = useWallet()
  const { data: activeMarkets, isLoading: loadingActive } = useActiveMarkets()
  const { data: allMarkets, isLoading: loadingAll } = useMarkets()
  
  const [activeTab, setActiveTab] = useState<Tab>('active')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)

  const markets = activeTab === 'active' ? activeMarkets : allMarkets
  const isLoading = activeTab === 'active' ? loadingActive : loadingAll

  return (
    <div className="min-h-screen bg-surface-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Predict Crypto Prices
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Decentralized prediction markets powered by GenLayer. 
            Create markets, place bets, and earn rewards based on your predictions.
          </p>
        </section>

        {/* Stats */}
        <section className="mb-8">
          <StatsBar />
        </section>

        {/* Tabs */}
        <section id="markets" className="mb-6">
          <div className="flex gap-2 border-b border-surface-200">
            <button
              onClick={() => setActiveTab('active')}
              className={clsx(
                'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
                activeTab === 'active'
                  ? 'text-brand-600 border-brand-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              )}
            >
              Active Markets
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={clsx(
                'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
                activeTab === 'all'
                  ? 'text-brand-600 border-brand-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              )}
            >
              All Markets
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={clsx(
                'px-4 py-3 font-medium text-sm transition-colors border-b-2 -mb-px',
                activeTab === 'create'
                  ? 'text-brand-600 border-brand-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              )}
            >
              Create Market
            </button>
          </div>
        </section>

        {/* Content */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Markets List */}
          <div className={clsx(
            'lg:col-span-2',
            activeTab === 'create' && 'hidden lg:block'
          )}>
            {activeTab === 'create' ? (
              <div className="card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Recent Markets
                </h2>
                <div className="space-y-4">
                  {allMarkets?.slice(0, 5).map((market) => (
                    <MarketCard
                      key={market.id}
                      market={market}
                      onClick={() => setSelectedMarket(market)}
                    />
                  ))}
                </div>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card p-5 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-surface-200" />
                      <div>
                        <div className="h-4 bg-surface-200 rounded w-20 mb-2" />
                        <div className="h-3 bg-surface-200 rounded w-32" />
                      </div>
                    </div>
                    <div className="h-2 bg-surface-200 rounded mb-4" />
                    <div className="flex justify-between">
                      <div className="h-3 bg-surface-200 rounded w-16" />
                      <div className="h-3 bg-surface-200 rounded w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : markets && markets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {markets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onClick={() => setSelectedMarket(market)}
                  />
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Markets Found</h3>
                <p className="text-gray-500 mb-4">
                  {activeTab === 'active' 
                    ? 'There are no active markets right now. Be the first to create one!'
                    : 'No markets have been created yet.'}
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="btn btn-primary"
                >
                  Create a Market
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {activeTab === 'create' ? (
              <div id="create" className="card p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  Create New Market
                </h2>
                <CreateMarketForm onSuccess={() => setActiveTab('active')} />
              </div>
            ) : selectedMarket ? (
              <BettingPanel
                market={selectedMarket}
                onClose={() => setSelectedMarket(null)}
              />
            ) : (
              <div className="card p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Getting Started
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      1
                    </div>
                    <p>Connect your MetaMask wallet to get started</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      2
                    </div>
                    <p>Browse active prediction markets or create your own</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      3
                    </div>
                    <p>Place bets on whether prices will be above or below targets</p>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      4
                    </div>
                    <p>Claim your winnings when markets resolve</p>
                  </div>
                </div>

                {!wallet.isConnected && (
                  <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning font-medium">
                      Connect your wallet to start trading
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => setActiveTab('create')}
                    className="btn btn-primary w-full"
                  >
                    Create a Market
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer id="portfolio" className="mt-16 pt-8 border-t border-surface-200 text-center text-sm text-gray-500">
          <p>
            Powered by{' '}
            <a 
              href="https://genlayer.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-600 hover:underline"
            >
              GenLayer
            </a>
            {' '}· Intelligent Contracts for the AI Era
          </p>
        </footer>
      </main>
    </div>
  )
}
