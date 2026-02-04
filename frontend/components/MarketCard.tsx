'use client';

import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, Users, DollarSign, ArrowRight } from 'lucide-react';
import type { Market, MarketOdds } from '@/lib/genlayer';
import { genLayerClient } from '@/lib/genlayer';

const ASSET_ICONS: Record<string, string> = {
  BTC: '₿',
  ETH: 'Ξ',
  SOL: '◎',
  BNB: '⬡',
  XRP: '✕',
  ADA: '₳',
  DOGE: 'Ð',
  DOT: '●',
  MATIC: '⬡',
  LINK: '⬡',
};

type MarketCardProps = {
  market: Market;
  onSelect?: (market: Market) => void;
};

export function MarketCard({ market, onSelect }: MarketCardProps) {
  const [odds, setOdds] = useState<MarketOdds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOdds = async () => {
      try {
        const data = await genLayerClient.getMarketOdds(market.market_id);
        setOdds(data);
      } catch (error) {
        console.error('Failed to fetch odds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
  }, [market.market_id]);

  const isExpired = Date.now() / 1000 > market.resolution_timestamp;
  const expiresIn = formatDistanceToNow(new Date(market.resolution_timestamp * 1000), { addSuffix: true });
  const createdDate = format(new Date(market.created_at * 1000), 'MMM d, yyyy');

  const getStatusBadge = () => {
    if (market.resolved) {
      return (
        <span className={`badge ${market.outcome === 'YES' ? 'badge-success' : 'badge-danger'}`}>
          Resolved: {market.outcome}
        </span>
      );
    }
    if (isExpired) {
      return <span className="badge badge-warning">Pending Resolution</span>;
    }
    return <span className="badge badge-info">Active</span>;
  };

  const formatVolume = (amount: number) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
    return amount.toString();
  };

  return (
    <div 
      className="card card-hover cursor-pointer group"
      onClick={() => onSelect?.(market)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-primary-400">
            {ASSET_ICONS[market.asset] || market.asset.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-lg text-white group-hover:text-primary-400 transition-colors">
              {market.asset}/USD
            </h3>
            <p className="text-sm text-zinc-500">Created {createdDate}</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
        <p className="text-zinc-300 flex items-center gap-2">
          Price will be
          <span className={`font-semibold ${market.condition === 'above' ? 'text-success-500' : 'text-danger-500'}`}>
            {market.condition === 'above' ? (
              <TrendingUp size={16} className="inline mr-1" />
            ) : (
              <TrendingDown size={16} className="inline mr-1" />
            )}
            {market.condition}
          </span>
          <span className="font-mono font-bold text-white">${market.threshold.toLocaleString()}</span>
        </p>
      </div>

      {odds && !loading && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-success-500">YES {odds.yes_probability}%</span>
            <span className="text-danger-500">NO {odds.no_probability}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
            <div 
              className="bg-success-500 transition-all duration-300"
              style={{ width: `${odds.yes_probability}%` }}
            />
            <div 
              className="bg-danger-500 transition-all duration-300"
              style={{ width: `${odds.no_probability}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {isExpired ? 'Expired' : expiresIn}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign size={14} />
            {odds ? formatVolume(odds.total_pool) : '0'} GEN
          </span>
        </div>
        <ArrowRight size={16} className="text-zinc-600 group-hover:text-primary-400 transition-colors" />
      </div>
    </div>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full skeleton" />
          <div>
            <div className="h-5 w-24 skeleton rounded mb-1" />
            <div className="h-4 w-32 skeleton rounded" />
          </div>
        </div>
        <div className="h-6 w-16 skeleton rounded-full" />
      </div>
      <div className="bg-zinc-900/50 rounded-lg p-4 mb-4">
        <div className="h-5 w-48 skeleton rounded" />
      </div>
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div className="h-4 w-16 skeleton rounded" />
          <div className="h-4 w-16 skeleton rounded" />
        </div>
        <div className="h-2 skeleton rounded-full" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="h-4 w-4 skeleton rounded" />
      </div>
    </div>
  );
}
