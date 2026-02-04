'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { genLayerClient } from '@/lib/genlayer';
import type { Market, MarketOdds } from '@/lib/genlayer';
import { useWallet, useDeductFee } from '@/hooks/useWallet';

type PlaceBetProps = {
  market: Market | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function PlaceBet({ market, isOpen, onClose, onSuccess }: PlaceBetProps) {
  const { isConnected, address } = useWallet();
  const { deduct, isDeducting, error: deductError } = useDeductFee();
  const [position, setPosition] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState<MarketOdds | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'confirm' | 'success'>('input');
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (market && isOpen) {
      const fetchOdds = async () => {
        try {
          const data = await genLayerClient.getMarketOdds(market.market_id);
          setOdds(data);
        } catch (err) {
          console.error('Failed to fetch odds:', err);
        }
      };
      fetchOdds();
    }
  }, [market, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setStep('input');
      setAmount('');
      setError(null);
      setTxHash(null);
    }
  }, [isOpen]);

  if (!isOpen || !market) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // First, attempt fee deduction (amount = 0 for this MVP)
    const feeDeducted = await deduct(0);
    if (!feeDeducted) {
      setError('Deduction failed');
      return;
    }

    setStep('confirm');
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const hash = await genLayerClient.placeBet(market.market_id, position, amountWei);
      setTxHash(hash);
      setStep('success');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePotentialWinnings = () => {
    if (!odds || !amount) return 0;
    const betAmount = parseFloat(amount);
    const totalPool = odds.total_pool + betAmount;
    const winningPool = (position === 'YES' ? odds.yes_pool : odds.no_pool) + betAmount;
    if (winningPool === 0) return 0;
    return (betAmount * totalPool) / winningPool;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  const renderContent = () => {
    if (step === 'success') {
      return (
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-success-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Bet Placed Successfully!</h3>
          <p className="text-zinc-400 mb-4">
            Your {position} position of {amount} GEN has been placed.
          </p>
          {txHash && (
            <p className="text-sm font-mono text-zinc-500 mb-6 break-all">
              TX: {txHash}
            </p>
          )}
          <button onClick={onClose} className="btn btn-primary">
            Close
          </button>
        </div>
      );
    }

    if (step === 'confirm') {
      return (
        <div className="p-5">
          <h3 className="text-lg font-semibold mb-4">Confirm Your Bet</h3>
          <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-zinc-400">Market</span>
              <span>{market.asset}/USD {market.condition} ${market.threshold}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Position</span>
              <span className={position === 'YES' ? 'text-success-500' : 'text-danger-500'}>
                {position}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Amount</span>
              <span>{amount} GEN</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-3">
              <span className="text-zinc-400">Potential Winnings</span>
              <span className="text-success-500 font-semibold">
                ~{calculatePotentialWinnings().toFixed(4)} GEN
              </span>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-danger-500 bg-danger-500/10 rounded-lg p-3 mb-4">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => setStep('input')}
              disabled={isSubmitting}
              className="btn btn-outline flex-1"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="btn btn-primary flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="inline mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                'Confirm Bet'
              )}
            </button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Market Info */}
        <div className="bg-zinc-900/50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-primary-400">
              {market.asset.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{market.asset}/USD</h3>
              <p className="text-sm text-zinc-400">
                Expires {format(new Date(market.resolution_timestamp * 1000), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          <p className="text-zinc-300">
            Price will be{' '}
            <span className={market.condition === 'above' ? 'text-success-500' : 'text-danger-500'}>
              {market.condition}
            </span>{' '}
            <span className="font-mono font-bold">${market.threshold.toLocaleString()}</span>
          </p>
        </div>

        {/* Position Selection */}
        <div>
          <label className="label">Your Prediction</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPosition('YES')}
              className={`p-4 rounded-lg border-2 transition-all ${
                position === 'YES'
                  ? 'border-success-500 bg-success-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <TrendingUp size={24} className={`mx-auto mb-2 ${position === 'YES' ? 'text-success-500' : 'text-zinc-400'}`} />
              <div className={`font-semibold ${position === 'YES' ? 'text-success-500' : 'text-zinc-400'}`}>
                YES
              </div>
              {odds && (
                <div className="text-sm text-zinc-500 mt-1">
                  {odds.yes_probability}% chance
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPosition('NO')}
              className={`p-4 rounded-lg border-2 transition-all ${
                position === 'NO'
                  ? 'border-danger-500 bg-danger-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <TrendingDown size={24} className={`mx-auto mb-2 ${position === 'NO' ? 'text-danger-500' : 'text-zinc-400'}`} />
              <div className={`font-semibold ${position === 'NO' ? 'text-danger-500' : 'text-zinc-400'}`}>
                NO
              </div>
              {odds && (
                <div className="text-sm text-zinc-500 mt-1">
                  {odds.no_probability}% chance
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="label">Bet Amount (GEN)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input"
            step="0.0001"
            min="0"
          />
          {amount && parseFloat(amount) > 0 && (
            <p className="text-sm text-zinc-400 mt-2">
              Potential return:{' '}
              <span className="text-success-500 font-medium">
                ~{calculatePotentialWinnings().toFixed(4)} GEN
              </span>
            </p>
          )}
        </div>

        {/* Error */}
        {(error || deductError) && (
          <div className="flex items-center gap-2 text-danger-500 bg-danger-500/10 rounded-lg p-3">
            <AlertCircle size={18} />
            <span className="text-sm">{error || deductError}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isDeducting || !isConnected}
          className="btn btn-primary w-full py-3"
        >
          {isDeducting ? (
            <>
              <Loader2 size={18} className="inline mr-2 animate-spin" />
              Processing...
            </>
          ) : !isConnected ? (
            'Connect Wallet to Bet'
          ) : (
            'Place Bet'
          )}
        </button>
      </form>
    );
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#111118] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">
            {step === 'success' ? 'Success' : step === 'confirm' ? 'Confirm Bet' : 'Place Your Bet'}
          </h2>
          {!isSubmitting && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {renderContent()}
      </div>
    </div>
  );
}
