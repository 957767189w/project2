'use client';

import { useState } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { genLayerClient } from '@/lib/genlayer';
import { useWallet } from '@/hooks/useWallet';

const SUPPORTED_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'LINK', name: 'Chainlink' },
];

const DURATION_OPTIONS = [
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '1 day', value: 86400 },
  { label: '3 days', value: 259200 },
  { label: '1 week', value: 604800 },
];

type CreateMarketProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function CreateMarket({ isOpen, onClose, onSuccess }: CreateMarketProps) {
  const { isConnected } = useWallet();
  const [asset, setAsset] = useState('BTC');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [duration, setDuration] = useState(86400);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!threshold || parseFloat(threshold) <= 0) {
      setError('Please enter a valid price threshold');
      return;
    }

    setIsSubmitting(true);

    try {
      const resolutionTimestamp = Math.floor(Date.now() / 1000) + duration;
      
      await genLayerClient.createMarket(
        asset,
        condition,
        parseFloat(threshold),
        resolutionTimestamp
      );

      onSuccess?.();
      onClose();
      
      // Reset form
      setAsset('BTC');
      setCondition('above');
      setThreshold('');
      setDuration(86400);
    } catch (err: any) {
      setError(err.message || 'Failed to create market');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">Create Prediction Market</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Asset Selection */}
          <div>
            <label className="label">Asset</label>
            <select
              value={asset}
              onChange={(e) => setAsset(e.target.value)}
              className="select"
            >
              {SUPPORTED_ASSETS.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} - {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Selection */}
          <div>
            <label className="label">Condition</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCondition('above')}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  condition === 'above'
                    ? 'border-success-500 bg-success-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <TrendingUp size={24} className={condition === 'above' ? 'text-success-500' : 'text-zinc-400'} />
                <span className={condition === 'above' ? 'text-success-500 font-medium' : 'text-zinc-400'}>
                  Price Above
                </span>
              </button>
              <button
                type="button"
                onClick={() => setCondition('below')}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  condition === 'below'
                    ? 'border-danger-500 bg-danger-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <TrendingDown size={24} className={condition === 'below' ? 'text-danger-500' : 'text-zinc-400'} />
                <span className={condition === 'below' ? 'text-danger-500 font-medium' : 'text-zinc-400'}>
                  Price Below
                </span>
              </button>
            </div>
          </div>

          {/* Price Threshold */}
          <div>
            <label className="label">Price Threshold (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="100000"
                className="input pl-8"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label">Resolution Time</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="select"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          <div className="bg-zinc-900/50 rounded-lg p-4">
            <p className="text-sm text-zinc-400 mb-1">Market Preview</p>
            <p className="text-white">
              {asset}/USD will be{' '}
              <span className={condition === 'above' ? 'text-success-500' : 'text-danger-500'}>
                {condition}
              </span>{' '}
              <span className="font-mono font-bold">
                ${threshold || '0'}
              </span>{' '}
              in {DURATION_OPTIONS.find(d => d.value === duration)?.label}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-danger-500 bg-danger-500/10 rounded-lg p-3">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !isConnected}
            className="btn btn-primary w-full py-3 text-lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="inline mr-2 animate-spin" />
                Creating Market...
              </>
            ) : !isConnected ? (
              'Connect Wallet to Create'
            ) : (
              'Create Market'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
