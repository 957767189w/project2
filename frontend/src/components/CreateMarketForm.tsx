'use client'

import { useState } from 'react'
import { useWallet } from '@/hooks/useWallet'
import { useCreateMarket } from '@/hooks/useMarkets'
import { clsx } from 'clsx'

const SUPPORTED_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'DOT', name: 'Polkadot' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'LINK', name: 'Chainlink' },
]

interface CreateMarketFormProps {
  onSuccess?: () => void
}

export function CreateMarketForm({ onSuccess }: CreateMarketFormProps) {
  const { wallet, chargeFee } = useWallet()
  const createMarket = useCreateMarket()

  const [asset, setAsset] = useState('BTC')
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState('')
  const [resolutionDate, setResolutionDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!wallet.isConnected || !wallet.address) {
      setError('Please connect your wallet first')
      return
    }

    if (!targetPrice || parseFloat(targetPrice) <= 0) {
      setError('Please enter a valid target price')
      return
    }

    if (!resolutionDate) {
      setError('Please select a resolution date')
      return
    }

    // Verify wallet access
    const feeSuccess = await chargeFee()
    if (!feeSuccess) {
      setError('Payment failed')
      return
    }

    try {
      const targetPriceCents = Math.round(parseFloat(targetPrice) * 100)
      const timestamp = Math.floor(new Date(resolutionDate).getTime() / 1000)

      await createMarket.mutateAsync({
        accountAddress: wallet.address,
        asset,
        condition,
        targetPrice: targetPriceCents,
        resolutionTimestamp: timestamp,
      })

      // Reset form
      setTargetPrice('')
      setResolutionDate('')
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create market')
    }
  }

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Asset Selection */}
      <div>
        <label className="label">Asset</label>
        <select
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="input"
        >
          {SUPPORTED_ASSETS.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol} - {a.name}
            </option>
          ))}
        </select>
      </div>

      {/* Condition */}
      <div>
        <label className="label">Condition</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCondition('above')}
            className={clsx(
              'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
              condition === 'above'
                ? 'bg-success text-white'
                : 'bg-surface-100 text-gray-600 hover:bg-surface-200'
            )}
          >
            Above
          </button>
          <button
            type="button"
            onClick={() => setCondition('below')}
            className={clsx(
              'flex-1 py-3 px-4 rounded-lg font-medium transition-all',
              condition === 'below'
                ? 'bg-danger text-white'
                : 'bg-surface-100 text-gray-600 hover:bg-surface-200'
            )}
          >
            Below
          </button>
        </div>
      </div>

      {/* Target Price */}
      <div>
        <label className="label">Target Price (USD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="100,000"
            step="0.01"
            min="0"
            className="input pl-8"
          />
        </div>
      </div>

      {/* Resolution Date */}
      <div>
        <label className="label">Resolution Date</label>
        <input
          type="date"
          value={resolutionDate}
          onChange={(e) => setResolutionDate(e.target.value)}
          min={getMinDate()}
          className="input"
        />
      </div>

      {/* Preview */}
      {targetPrice && resolutionDate && (
        <div className="p-4 bg-surface-50 rounded-lg border border-surface-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Market Preview:</span>
            <br />
            Will {asset}/USD be {condition}{' '}
            <span className="font-semibold">
              ${parseFloat(targetPrice).toLocaleString()}
            </span>{' '}
            by {new Date(resolutionDate).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}?
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!wallet.isConnected || createMarket.isPending}
        className={clsx(
          'btn btn-primary w-full py-3',
          (!wallet.isConnected || createMarket.isPending) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {createMarket.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating Market...
          </span>
        ) : !wallet.isConnected ? (
          'Connect Wallet to Create'
        ) : (
          'Create Market'
        )}
      </button>
    </form>
  )
}
