'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Header,
  Footer,
  Stats,
  MarketCard,
  MarketCardSkeleton,
  CreateMarketModal,
  PlaceBetModal,
} from '@/components';
import { genLayer, type Market } from '@/lib/genlayer';
import { useWallet, useFeeVerification } from '@/hooks/useWallet';

export default function HomePage() {
  const { isConnected } = useWallet();
  const { verify, isVerifying, error: verifyError } = useFeeVerification();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);

  const [accessError, setAccessError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const data = await genLayer.getAllMarkets();
      setMarkets(data);
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMarkets();
  };

  const handleCreateClick = async () => {
    setAccessError(null);

    if (!isConnected) {
      setAccessError('Please connect your wallet to create a market');
      return;
    }

    const ok = await verify();
    if (!ok) {
      setAccessError('Deduction failed');
      return;
    }

    setShowCreateModal(true);
  };

  const handleMarketClick = async (market: Market) => {
    setAccessError(null);

    if (!isConnected) {
      setAccessError('Please connect your wallet to view market details');
      return;
    }

    const ok = await verify();
    if (!ok) {
      setAccessError('Deduction failed');
      return;
    }

    setSelectedMarket(market);
    setShowBetModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-28 pb-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
              <span className="gradient-text">Predict Crypto Prices</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
              Create and join prediction markets for cryptocurrency prices. 
              AI-powered resolution ensures fair and accurate outcomes.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <button
                onClick={handleCreateClick}
                disabled={isVerifying}
                className="btn btn-primary text-base px-6 py-3"
              >
                {isVerifying ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Create Market</span>
                  </>
                )}
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="btn btn-outline text-base px-6 py-3"
              >
                <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
            </div>

            {(accessError || verifyError) && (
              <div className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg px-4 py-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{accessError || verifyError}</span>
              </div>
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <Stats />
          </div>
        </section>

        {/* Markets Section */}
        <section id="markets" className="py-12 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">Prediction Markets</h2>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <MarketCardSkeleton key={i} />
                ))}
              </div>
            ) : markets.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2">No Markets Yet</h3>
                <p className="text-zinc-500 mb-8 max-w-md mx-auto">
                  Be the first to create a prediction market and start trading on crypto price movements.
                </p>
                <button onClick={handleCreateClick} className="btn btn-primary">
                  Create First Market
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {markets.map((market) => (
                  <MarketCard key={market.market_id} market={market} onSelect={handleMarketClick} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 px-4 sm:px-6 bg-zinc-900/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">1. Create or Join</h3>
                <p className="text-zinc-400">
                  Create a new prediction market or place your bet on an existing one. Choose YES or NO for price movements.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">2. AI Resolution</h3>
                <p className="text-zinc-400">
                  When the market expires, GenLayer validators fetch real prices and use AI consensus to determine the outcome.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-3">3. Claim Rewards</h3>
                <p className="text-zinc-400">
                  If your prediction was correct, claim your share of the prize pool. All settlements are trustless and transparent.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Modals */}
      <CreateMarketModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchMarkets}
      />

      <PlaceBetModal
        market={selectedMarket}
        isOpen={showBetModal}
        onClose={() => {
          setShowBetModal(false);
          setSelectedMarket(null);
        }}
        onSuccess={fetchMarkets}
      />
    </div>
  );
}
