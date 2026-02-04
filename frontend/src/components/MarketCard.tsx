'use client'

import { Market } from '@/types'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

interface MarketCardProps {
  market: Market
  onClick?: () => void
}

// Asset icons mapping
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
  LINK: '⬢',
}

export function MarketCard({ market, onClick }: MarketCardProps) {
  const totalPool = market.yes_pool + market.no_pool
  const yesPercent = totalPool > 0 ? Math.round((market.yes_pool / totalPool) * 100) : 50
  const noPercent = 100 - yesPercent

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatPool = (amount: number) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(1)}M`
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`
    return amount.toString()
  }

  const getTimeRemaining = () => {
    const now = Date.now() / 1000
    if (market.resolution_timestamp <= now) return 'Ended'
    return formatDistanceToNow(market.resolution_timestamp * 1000, { addSuffix: true })
  }

  const assetIcon = ASSET_ICONS[market.asset] || market.asset[0]

  return (
    <div
      onClick={onClick}
      className={clsx(
        'card p-5 cursor-pointer transition-all duration-200',
        'hover:shadow-card-hover hover:border-brand-200',
        market.resolved && 'opacity-75'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold',
            market.asset === 'BTC' && 'bg-orange-100 text-orange-600',
            market.asset === 'ETH' && 'bg-purple-100 text-purple-600',
            market.asset === 'SOL' && 'bg-gradient-to-br from-purple-500 to-cyan-400 text-white',
            !['BTC', 'ETH', 'SOL'].includes(market.asset) && 'bg-gray-100 text-gray-600'
          )}>
            {assetIcon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{market.asset}/USD</h3>
            <p className="text-sm text-gray-500">
              {market.condition === 'above' ? 'Above' : 'Below'} {formatPrice(market.target_price)}
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <span className={clsx(
          'px-2 py-1 text-xs font-medium rounded-full',
          market.resolved 
            ? 'bg-gray-100 text-gray-600'
            : 'bg-success/10 text-success'
        )}>
          {market.resolved ? `Resolved: ${market.outcome.toUpperCase()}` : 'Active'}
        </span>
      </div>

      {/* Probability Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-success">Yes {yesPercent}%</span>
          <span className="font-medium text-danger">No {noPercent}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div 
            className="bg-success transition-all duration-300"
            style={{ width: `${yesPercent}%` }}
          />
          <div 
            className="bg-danger transition-all duration-300"
            style={{ width: `${noPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatPool(totalPool)} GEN
          </span>
        </div>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {getTimeRemaining()}
        </span>
      </div>
    </div>
  )
}
