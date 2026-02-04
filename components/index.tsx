'use client';

import { useState, useEffect, ReactNode } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { genLayer, type Market, type MarketOdds, type PlatformStats } from '@/lib/genlayer';
import { useWallet, useFeeVerification } from '@/hooks/useWallet';

// ===================== ICONS =====================

function IconWallet({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function IconLogout({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function IconPlus({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function IconRefresh({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function IconTrendUp({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function IconTrendDown({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}

function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconClose({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconCheck({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconAlert({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function IconChart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconDollar({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function Spinner({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ===================== HEADER =====================

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <IconChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Gen<span className="text-blue-400">Predict</span>
              </h1>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#markets" className="text-sm text-zinc-400 hover:text-white transition-colors">Markets</a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">How It Works</a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Docs
            </a>
          </nav>

          <WalletButton />
        </div>
      </div>
    </header>
  );
}

// ===================== WALLET BUTTON =====================

export function WalletButton() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  const formatAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-mono text-sm text-zinc-300">{formatAddr(address)}</span>
        </div>
        <button onClick={disconnect} className="btn btn-ghost p-2" title="Disconnect">
          <IconLogout className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="btn btn-primary"
    >
      {isConnecting ? (
        <>
          <Spinner className="w-4 h-4" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <IconWallet className="w-4 h-4" />
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
}

// ===================== STATS =====================

export function Stats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const data = await genLayer.getStats();
      setStats(data);
      setLoading(false);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: 'Total Markets', value: stats?.total_markets ?? 0, icon: IconChart },
    { label: 'Active', value: stats?.active_markets ?? 0, icon: IconTrendUp },
    { label: 'Resolved', value: stats?.resolved_markets ?? 0, icon: IconCheck },
    { label: 'Volume', value: `${stats?.total_volume ?? 0}`, suffix: 'GEN', icon: IconDollar },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-4 w-20 mb-2" />
            <div className="skeleton h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
      {items.map((item) => (
        <div key={item.label} className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <item.icon className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">{item.label}</span>
          </div>
          <p className="text-2xl font-bold">
            {item.value}
            {item.suffix && <span className="text-base font-normal text-zinc-500 ml-1">{item.suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

// ===================== MARKET CARD =====================

interface MarketCardProps {
  market: Market;
  onSelect: (market: Market) => void;
}

export function MarketCard({ market, onSelect }: MarketCardProps) {
  const [odds, setOdds] = useState<MarketOdds | null>(null);

  useEffect(() => {
    genLayer.getMarketOdds(market.market_id).then(setOdds);
  }, [market.market_id]);

  const resolutionTime = parseInt(market.resolution_timestamp) * 1000;
  const isExpired = Date.now() > resolutionTime;
  const threshold = parseFloat(market.threshold);

  const assetIcons: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    SOL: '◎',
  };

  return (
    <div className="card card-interactive p-5" onClick={() => onSelect(market)}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-blue-400">
            {assetIcons[market.asset] || market.asset.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{market.asset}/USD</h3>
            <p className="text-sm text-zinc-500">Market #{market.market_id}</p>
          </div>
        </div>

        {market.resolved ? (
          <span className={`tag ${market.outcome === 'YES' ? 'tag-green' : 'tag-red'}`}>
            {market.outcome}
          </span>
        ) : isExpired ? (
          <span className="tag tag-yellow">Pending</span>
        ) : (
          <span className="tag tag-blue">Active</span>
        )}
      </div>

      <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
        <p className="text-zinc-300 flex items-center gap-2 flex-wrap">
          <span>Price will be</span>
          <span className={`inline-flex items-center gap-1 font-medium ${market.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}`}>
            {market.condition === 'above' ? <IconTrendUp className="w-4 h-4" /> : <IconTrendDown className="w-4 h-4" />}
            {market.condition}
          </span>
          <span className="font-mono font-bold text-white">${threshold.toLocaleString()}</span>
        </p>
      </div>

      {odds && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-400">YES {odds.yes_probability}%</span>
            <span className="text-red-400">NO {odds.no_probability}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
            <div className="bg-emerald-500 transition-all" style={{ width: `${odds.yes_probability}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${odds.no_probability}%` }} />
          </div>
          <p className="text-xs text-zinc-500 mt-2 text-right">
            Pool: {odds.total_pool.toLocaleString()} GEN
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <IconClock />
        <span>{isExpired ? 'Expired' : formatDistanceToNow(resolutionTime, { addSuffix: true })}</span>
      </div>
    </div>
  );
}

export function MarketCardSkeleton() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="skeleton w-11 h-11 rounded-full" />
        <div>
          <div className="skeleton h-5 w-24 mb-1" />
          <div className="skeleton h-4 w-16" />
        </div>
      </div>
      <div className="skeleton h-16 rounded-lg mb-4" />
      <div className="skeleton h-2 rounded-full mb-4" />
      <div className="skeleton h-4 w-32" />
    </div>
  );
}

// ===================== MODAL =====================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===================== CREATE MARKET =====================

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
];

const DURATIONS = [
  { label: '1 Hour', seconds: 3600 },
  { label: '6 Hours', seconds: 21600 },
  { label: '1 Day', seconds: 86400 },
  { label: '3 Days', seconds: 259200 },
  { label: '1 Week', seconds: 604800 },
];

interface CreateMarketProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateMarketModal({ isOpen, onClose, onSuccess }: CreateMarketProps) {
  const { isConnected } = useWallet();
  const [asset, setAsset] = useState('BTC');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [duration, setDuration] = useState(86400);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await genLayer.createMarket(asset, condition, parseFloat(threshold), resolutionTimestamp);
      
      onSuccess();
      onClose();
      
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Prediction Market">
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div>
          <label className="label">Asset</label>
          <select value={asset} onChange={(e) => setAsset(e.target.value)} className="select-field">
            {ASSETS.map((a) => (
              <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Condition</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setCondition('above')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                condition === 'above' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <IconTrendUp className={`w-6 h-6 ${condition === 'above' ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <span className={condition === 'above' ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>Above</span>
            </button>
            <button
              type="button"
              onClick={() => setCondition('below')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                condition === 'below' ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <IconTrendDown className={`w-6 h-6 ${condition === 'below' ? 'text-red-400' : 'text-zinc-400'}`} />
              <span className={condition === 'below' ? 'text-red-400 font-medium' : 'text-zinc-400'}>Below</span>
            </button>
          </div>
        </div>

        <div>
          <label className="label">Price Threshold (USD)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="100000"
              className="input-field pl-8"
              step="0.01"
              min="0"
            />
          </div>
        </div>

        <div>
          <label className="label">Resolution Time</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="select-field">
            {DURATIONS.map((d) => (
              <option key={d.seconds} value={d.seconds}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="bg-zinc-800/50 rounded-lg p-4">
          <p className="text-sm text-zinc-400">Preview</p>
          <p className="text-white mt-1">
            {asset}/USD will be{' '}
            <span className={condition === 'above' ? 'text-emerald-400' : 'text-red-400'}>{condition}</span>{' '}
            <span className="font-mono font-bold">${threshold || '0'}</span>{' '}
            in {DURATIONS.find(d => d.seconds === duration)?.label}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg p-3">
            <IconAlert />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !isConnected}
          className="btn btn-primary w-full py-3"
        >
          {isSubmitting ? (
            <>
              <Spinner className="w-4 h-4" />
              Creating...
            </>
          ) : !isConnected ? (
            'Connect Wallet First'
          ) : (
            'Create Market'
          )}
        </button>
      </form>
    </Modal>
  );
}

// ===================== PLACE BET =====================

interface PlaceBetProps {
  market: Market | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlaceBetModal({ market, isOpen, onClose, onSuccess }: PlaceBetProps) {
  const { isConnected } = useWallet();
  const { verify, isVerifying, error: verifyError } = useFeeVerification();
  const [position, setPosition] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState<MarketOdds | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (market && isOpen) {
      genLayer.getMarketOdds(market.market_id).then(setOdds);
      setSuccess(false);
      setAmount('');
      setError(null);
      setTxHash(null);
    }
  }, [market, isOpen]);

  if (!market) return null;

  const threshold = parseFloat(market.threshold);
  const resolutionTime = parseInt(market.resolution_timestamp) * 1000;

  const calcPotentialReturn = () => {
    if (!odds || !amount) return 0;
    const bet = parseFloat(amount);
    const total = odds.total_pool + bet;
    const pool = (position === 'YES' ? odds.yes_pool : odds.no_pool) + bet;
    return pool > 0 ? (bet * total) / pool : 0;
  };

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

    // Verify wallet access (fee deduction with amount = 0)
    const verified = await verify();
    if (!verified) {
      setError('Deduction failed');
      return;
    }

    setIsSubmitting(true);

    try {
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const hash = await genLayer.placeBet(market.market_id, position, amountWei);
      setTxHash(hash);
      setSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Success">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <IconCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Bet Placed!</h3>
          <p className="text-zinc-400 mb-4">
            Your {position} position of {amount} GEN has been placed successfully.
          </p>
          {txHash && (
            <p className="text-xs font-mono text-zinc-500 mb-6 break-all">TX: {txHash}</p>
          )}
          <button onClick={onClose} className="btn btn-primary">Close</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Place Your Bet">
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        <div className="bg-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg font-bold text-blue-400">
              {market.asset.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold">{market.asset}/USD</h3>
              <p className="text-sm text-zinc-500">
                Expires {format(resolutionTime, 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          <p className="text-zinc-300">
            Price will be{' '}
            <span className={market.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}>
              {market.condition}
            </span>{' '}
            <span className="font-mono font-bold">${threshold.toLocaleString()}</span>
          </p>
        </div>

        <div>
          <label className="label">Your Prediction</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPosition('YES')}
              className={`p-4 rounded-xl border-2 transition-all ${
                position === 'YES' ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <IconTrendUp className={`w-6 h-6 mx-auto mb-2 ${position === 'YES' ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <div className={`font-semibold ${position === 'YES' ? 'text-emerald-400' : 'text-zinc-400'}`}>YES</div>
              {odds && <div className="text-sm text-zinc-500 mt-1">{odds.yes_probability}% chance</div>}
            </button>
            <button
              type="button"
              onClick={() => setPosition('NO')}
              className={`p-4 rounded-xl border-2 transition-all ${
                position === 'NO' ? 'border-red-500 bg-red-500/10' : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <IconTrendDown className={`w-6 h-6 mx-auto mb-2 ${position === 'NO' ? 'text-red-400' : 'text-zinc-400'}`} />
              <div className={`font-semibold ${position === 'NO' ? 'text-red-400' : 'text-zinc-400'}`}>NO</div>
              {odds && <div className="text-sm text-zinc-500 mt-1">{odds.no_probability}% chance</div>}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Bet Amount (GEN)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="input-field"
            step="0.0001"
            min="0"
          />
          {amount && parseFloat(amount) > 0 && (
            <p className="text-sm text-zinc-400 mt-2">
              Potential return: <span className="text-emerald-400 font-medium">~{calcPotentialReturn().toFixed(4)} GEN</span>
            </p>
          )}
        </div>

        {(error || verifyError) && (
          <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg p-3">
            <IconAlert />
            <span className="text-sm">{error || verifyError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isVerifying || !isConnected}
          className="btn btn-primary w-full py-3"
        >
          {isSubmitting || isVerifying ? (
            <>
              <Spinner className="w-4 h-4" />
              {isVerifying ? 'Verifying...' : 'Placing Bet...'}
            </>
          ) : !isConnected ? (
            'Connect Wallet First'
          ) : (
            'Place Bet'
          )}
        </button>
      </form>
    </Modal>
  );
}

// ===================== FOOTER =====================

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 py-10 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            Built on GenLayer. Powered by Intelligent Contracts.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">
              GenLayer
            </a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Documentation
            </a>
            <a href="https://github.com/genlayerlabs" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
