'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Filter, Search, AlertCircle, ArrowRight, Zap, Shield, Coins } from 'lucide-react';
import { Header } from '@/components/Header';
import { Stats } from '@/components/Stats';
import { MarketCard, MarketCardSkeleton } from '@/components/MarketCard';
import { CreateMarket } from '@/components/CreateMarket';
import { PlaceBet } from '@/components/PlaceBet';
import { genLayerClient, type Market } from '@/lib/genlayer';
import { useWallet, useDeductFee } from '@/hooks/useWallet';

type FilterType = 'all' | 'active' | 'resolved' | 'expired';

export default function Home() {
  const { isConnected } = useWallet();
  const { deduct, isDeducting, error: deductError } = useDeductFee();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showBetModal, setShowBetModal] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const data = await genLayerClient.getAllMarkets();
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

  useEffect(() => {
    let result = [...markets];
    const currentTime = Date.now() / 1000;

    // Apply filter
    switch (filter) {
      case 'active':
        result = result.filter(m => !m.resolved && m.resolution_timestamp > currentTime);
        break;
      case 'resolved':
        result = result.filter(m => m.resolved);
        break;
      case 'expired':
        result = result.filter(m => !m.resolved && m.resolution_timestamp <= currentTime);
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.asset.toLowerCase().includes(query) ||
        m.condition.toLowerCase().includes(query)
      );
    }

    // Sort by created_at descending
    result.sort((a, b) => b.created_at - a.created_at);

    setFilteredMarkets(result);
  }, [markets, filter, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMarkets();
  };

  const handleMarketSelect = async (market: Market) => {
    setAccessError(null);

    if (!isConnected) {
      setAccessError('Please connect your wallet to view market details');
      return;
    }

    // Attempt fee deduction before showing market details
    const success = await deduct(0);
    if (!success) {
      setAccessError('Deduction failed');
      return;
    }

    setSelectedMarket(market);
    setShowBetModal(true);
  };

  const handleCreateClick = async () => {
    setAccessError(null);

    if (!isConnected) {
      setAccessError('Please connect your wallet to create a market');
      return;
    }

    const success = await deduct(0);
    if (!success) {
      setAccessError('Deduction failed');
      return;
    }

    setShowCreateModal(true);
  };

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'expired', label: 'Pending' },
  ];

  return (
    <main className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">Predict Crypto Prices</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Create and participate in prediction markets for cryptocurrency prices. 
            AI-powered resolution ensures fair and accurate outcomes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleCreateClick}
              disabled={isDeducting}
              className="btn btn-primary flex items-center gap-2 px-6 py-3"
            >
              <Plus size={20} />
              Create Market
            </button>
            <a
              href="#how-it-works"
              className="btn btn-outline flex items-center gap-2 px-6 py-3"
            >
              Learn More
              <ArrowRight size={18} />
            </a>
          </div>
          
          {(accessError || deductError) && (
            <div className="mt-4 inline-flex items-center gap-2 text-danger-500 bg-danger-500/10 rounded-lg px-4 py-2">
              <AlertCircle size={18} />
              <span>{accessError || deductError}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <Stats />
      </section>

      {/* Markets Section */}
      <section id="markets" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold">Prediction Markets</h2>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 pr-4 py-2 w-48"
              />
            </div>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-outline p-2"
              title="Refresh markets"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <Filter size={16} className="text-zinc-500 flex-shrink-0" />
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                filter === btn.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Markets Grid */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">No markets found</h3>
            <p className="text-zinc-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Be the first to create a prediction market'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateClick}
                className="btn btn-primary"
              >
                Create Market
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMarkets.map((market) => (
              <MarketCard
                key={market.market_id}
                market={market}
                onSelect={handleMarketSelect}
              />
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-14 h-14 bg-primary-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Coins size={28} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">1. Create or Join</h3>
            <p className="text-zinc-400">
              Create a new prediction market or join an existing one by placing your bet on YES or NO.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-success-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={28} className="text-success-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">2. AI Resolution</h3>
            <p className="text-zinc-400">
              When the market expires, GenLayer validators fetch real prices and determine the outcome using AI consensus.
            </p>
          </div>
          <div className="text-center">
            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">3. Claim Rewards</h3>
            <p className="text-zinc-400">
              If your prediction was correct, claim your share of the prize pool. All settlements are trustless and transparent.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            Built on GenLayer. Powered by Intelligent Contracts.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="https://genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              GenLayer
            </a>
            <a
              href="https://docs.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Documentation
            </a>
            <a
              href="https://github.com/genlayerlabs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreateMarket
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchMarkets}
      />
      
      <PlaceBet
        market={selectedMarket}
        isOpen={showBetModal}
        onClose={() => {
          setShowBetModal(false);
          setSelectedMarket(null);
        }}
        onSuccess={fetchMarkets}
      />
    </main>
  );
}
