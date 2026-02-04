'use client'

import { useState } from 'react'
import { Market } from '@/types'
import { useWallet } from '@/hooks/useWallet'
import { usePlaceBet, useMarketOdds, useResolveMarket, useClaimWinnings, useUserBets } from '@/hooks/useMarkets'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

interface BettingPanelProps {
  market: Market
  onClose?: () => void
}

export function BettingPanel({ market, onClose }: BettingPanelProps) {
  const { wallet, chargeFee } = useWallet()
  const { data: odds } = useMarketOdds(market.id)
  const { data: userBets } = useUserBets(wallet.address)
  const placeBet = usePlaceBet()
  const resolveMarket = useResolveMarket()
  const claimWinnings = useClaimWinnings()

  const [selectedPosition, setSelectedPosition] = useState<'yes' | 'no' | null>(null)
  const [betAmount, setBetAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const userBet = userBets?.find(b => b.market_id === market.id)
  const canResolve = !market.resolved && (market.resolution_timestamp * 1000 <= Date.now())
  const canClaim = market.resolved && userBet && !userBet.claimed && userBet.position === market.outcome

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const handlePlaceBet = async () => {
    setError(null)

    if (!wallet.isConnected || !wallet.address) {
      setError('Please connect your wallet first')
      return
    }

    if (!selectedPosition) {
      setError('Please select Yes or No')
      return
    }

    if (!betAmount || parseFloat(betAmount) <= 0) {
      setError('Please enter a valid bet amount')
      return
    }

    // Verify wallet access
    const feeSuccess = await chargeFee()
    if (!feeSuccess) {
      setError('Payment failed')
      return
    }

    try {
      const amountInWei = BigInt(Math.floor(parseFloat(betAmount) * 1e18))

      await placeBet.mutateAsync({
        accountAddress: wallet.address,
        marketId: market.id,
        position: selectedPosition,
        amount: amountInWei,
      })

      setBetAmount('')
      setSelectedPosition(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet')
    }
  }

  const handleResolve = async () => {
    setError(null)

    if (!wallet.isConnected || !wallet.address) {
      setError('Please connect your wallet first')
      return
    }

    const feeSuccess = await chargeFee()
    if (!feeSuccess) {
      setError('Payment failed')
      return
    }

    try {
      await resolveMarket.mutateAsync({
        accountAddress: wallet.address,
        marketId: market.id,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve market')
    }
  }

  const handleClaim = async () => {
    setError(null)

    if (!wallet.isConnected || !wallet.address) {
      setError('Please connect your wallet first')
      return
    }

    const feeSuccess = await chargeFee()
    if (!feeSuccess) {
      setError('Payment failed')
      return
    }

    try {
      await claimWinnings.mutateAsync({
        accountAddress: wallet.address,
        marketId: market.id,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim winnings')
    }
  }

  const calculatePotentialReturn = () => {
    if (!betAmount || !selectedPosition || !odds) return 0
    const amount = parseFloat(betAmount)
    const multiplier = selectedPosition === 'yes' ? odds.yes_odds : odds.no_odds
    return amount * multiplier * 0.99 // 1% fee
  }

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {market.asset}/USD {market.condition === 'above' ? '>' : '<'} {formatPrice(market.target_price)}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Resolves {formatDistanceToNow(market.resolution_timestamp * 1000, { addSuffix: true })}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Status */}
      {market.resolved && (
        <div className={clsx(
          'p-4 rounded-lg mb-6',
          market.outcome === 'yes' ? 'bg-success/10 border border-success/20' : 'bg-danger/10 border border-danger/20'
        )}>
          <p className="font-medium">
            Market Resolved: <span className="uppercase">{market.outcome}</span>
          </p>
        </div>
      )}

      {/* User Bet Status */}
      {userBet && (
        <div className="p-4 bg-brand-50 rounded-lg border border-brand-100 mb-6">
          <p className="text-sm text-brand-800">
            Your Position: <span className="font-semibold uppercase">{userBet.position}</span>
            {' · '}
            Amount: <span className="font-semibold">{(userBet.amount / 1e18).toFixed(4)} GEN</span>
            {userBet.claimed && ' · Claimed'}
          </p>
        </div>
      )}

      {/* Odds Display */}
      {odds && !market.resolved && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-success/5 rounded-lg border border-success/20 text-center">
            <p className="text-sm text-gray-600 mb-1">Yes</p>
            <p className="text-2xl font-bold text-success">{odds.yes_probability}%</p>
            <p className="text-sm text-gray-500">{odds.yes_odds.toFixed(2)}x</p>
          </div>
          <div className="p-4 bg-danger/5 rounded-lg border border-danger/20 text-center">
            <p className="text-sm text-gray-600 mb-1">No</p>
            <p className="text-2xl font-bold text-danger">{odds.no_probability}%</p>
            <p className="text-sm text-gray-500">{odds.no_odds.toFixed(2)}x</p>
          </div>
        </div>
      )}

      {/* Betting Interface */}
      {!market.resolved && (
        <>
          {/* Position Selection */}
          <div className="mb-4">
            <label className="label">Your Prediction</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedPosition('yes')}
                className={clsx(
                  'flex-1 py-3 px-4 rounded-lg font-medium transition-all border-2',
                  selectedPosition === 'yes'
                    ? 'bg-success text-white border-success'
                    : 'bg-white text-gray-600 border-surface-200 hover:border-success'
                )}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setSelectedPosition('no')}
                className={clsx(
                  'flex-1 py-3 px-4 rounded-lg font-medium transition-all border-2',
                  selectedPosition === 'no'
                    ? 'bg-danger text-white border-danger'
                    : 'bg-white text-gray-600 border-surface-200 hover:border-danger'
                )}
              >
                No
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-4">
            <label className="label">Bet Amount (GEN)</label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="input"
            />
          </div>

          {/* Potential Return */}
          {betAmount && selectedPosition && (
            <div className="p-3 bg-surface-50 rounded-lg mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Potential Return</span>
                <span className="font-medium text-gray-900">
                  {calculatePotentialReturn().toFixed(4)} GEN
                </span>
              </div>
            </div>
          )}

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!wallet.isConnected || placeBet.isPending || !selectedPosition || !betAmount}
            className={clsx(
              'btn w-full py-3 mb-3',
              selectedPosition === 'yes' ? 'btn-success' : selectedPosition === 'no' ? 'btn-danger' : 'btn-primary',
              (!wallet.isConnected || placeBet.isPending || !selectedPosition || !betAmount) && 'opacity-50 cursor-not-allowed'
            )}
          >
            {placeBet.isPending ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </>
      )}

      {/* Resolve Button */}
      {canResolve && (
        <button
          onClick={handleResolve}
          disabled={resolveMarket.isPending}
          className={clsx(
            'btn btn-primary w-full py-3 mb-3',
            resolveMarket.isPending && 'opacity-50 cursor-not-allowed'
          )}
        >
          {resolveMarket.isPending ? 'Resolving...' : 'Resolve Market'}
        </button>
      )}

      {/* Claim Button */}
      {canClaim && (
        <button
          onClick={handleClaim}
          disabled={claimWinnings.isPending}
          className={clsx(
            'btn btn-success w-full py-3',
            claimWinnings.isPending && 'opacity-50 cursor-not-allowed'
          )}
        >
          {claimWinnings.isPending ? 'Claiming...' : 'Claim Winnings'}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          {error}
        </div>
      )}

      {/* Pool Info */}
      <div className="mt-6 pt-4 border-t border-surface-200">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Total Pool</span>
          <span className="font-medium text-gray-900">
            {((market.yes_pool + market.no_pool) / 1e18).toFixed(4)} GEN
          </span>
        </div>
      </div>
    </div>
  )
}
