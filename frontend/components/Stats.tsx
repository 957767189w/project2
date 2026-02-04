'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, CheckCircle, DollarSign } from 'lucide-react';
import { genLayerClient, type PlatformStats } from '@/lib/genlayer';

export function Stats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await genLayerClient.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatVolume = (amount: number) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`;
    if (amount >= 1e3) return `${(amount / 1e3).toFixed(2)}K`;
    return amount.toFixed(2);
  };

  const statItems = [
    {
      label: 'Total Markets',
      value: stats?.total_markets || 0,
      icon: BarChart3,
      color: 'text-primary-400',
      bgColor: 'bg-primary-500/10',
    },
    {
      label: 'Active Markets',
      value: stats?.active_markets || 0,
      icon: TrendingUp,
      color: 'text-success-500',
      bgColor: 'bg-success-500/10',
    },
    {
      label: 'Resolved',
      value: stats?.resolved_markets || 0,
      icon: CheckCircle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Total Volume',
      value: formatVolume(stats?.total_volume || 0),
      suffix: 'GEN',
      icon: DollarSign,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg skeleton" />
              <div>
                <div className="h-4 w-16 skeleton rounded mb-1" />
                <div className="h-6 w-12 skeleton rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {statItems.map((item) => (
        <div key={item.label} className="card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
              <item.icon size={20} className={item.color} />
            </div>
            <div>
              <p className="text-sm text-zinc-400">{item.label}</p>
              <p className="text-xl font-semibold">
                {item.value}
                {item.suffix && <span className="text-sm text-zinc-500 ml-1">{item.suffix}</span>}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
