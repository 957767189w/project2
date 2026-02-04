'use client'

import { useStats } from '@/hooks/useMarkets'

export function StatsBar() {
  const { data: stats, isLoading } = useStats()

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 bg-surface-200 rounded w-20 mb-2" />
            <div className="h-8 bg-surface-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="card p-4">
        <p className="text-sm text-gray-500 mb-1">Total Markets</p>
        <p className="text-2xl font-bold text-gray-900">
          {stats?.total_markets || 0}
        </p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-gray-500 mb-1">Active Markets</p>
        <p className="text-2xl font-bold text-success">
          {stats?.active_markets || 0}
        </p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-gray-500 mb-1">Resolved</p>
        <p className="text-2xl font-bold text-gray-900">
          {stats?.resolved_markets || 0}
        </p>
      </div>
      <div className="card p-4">
        <p className="text-sm text-gray-500 mb-1">Total Volume</p>
        <p className="text-2xl font-bold text-brand-600">
          {formatNumber((stats?.total_volume || 0) / 1e18)} GEN
        </p>
      </div>
    </div>
  )
}
