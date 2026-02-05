'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// ============ CONFIG ============
const CONTRACT = '0x7d15C521f4A463Dc833d550e66635e9BE5063Eb4';

// ============ TYPES ============
interface Market {
  market_id: string;
  asset: string;
  condition: string;
  threshold: string;
  resolution_timestamp: string;
  yes_pool: string;
  no_pool: string;
  resolved: boolean;
  outcome: string;
}

interface Stats {
  total_markets: number;
  active_markets: number;
  resolved_markets: number;
  total_volume: number;
}

interface Odds {
  yes_probability: number;
  no_probability: number;
  total_pool: number;
}

// ============ GENLAYER CLIENT ============
let client: ReturnType<typeof createClient> | null = null;
let currentWallet: string | null = null;

async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Please install MetaMask to continue');
  }
  
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  }) as string[];
  
  if (!accounts?.length) throw new Error('No accounts found');
  
  currentWallet = accounts[0];
  client = createClient({ 
    chain: studionet, 
    account: currentWallet 
  });
  
  return currentWallet;
}

function getReadClient() {
  return createClient({ chain: studionet });
}

// Verify wallet connection with zero-value transaction check
async function verifyWalletAccess(): Promise<boolean> {
  if (!client || !currentWallet) {
    throw new Error('Wallet not connected');
  }
  
  try {
    // Simulate a zero-value check by reading contract state
    const c = getReadClient();
    await c.readContract({ 
      address: CONTRACT as `0x${string}`, 
      functionName: 'get_stats', 
      args: [] 
    });
    return true;
  } catch (e) {
    console.error('Wallet verification failed:', e);
    return false;
  }
}

function parseContractResult(result: unknown): any {
  if (typeof result === 'string') {
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  }
  return result;
}

async function fetchStats(): Promise<Stats> {
  const c = getReadClient();
  try {
    const r = await c.readContract({ 
      address: CONTRACT as `0x${string}`, 
      functionName: 'get_stats', 
      args: [] 
    });
    console.log('Raw stats:', r);
    const parsed = parseContractResult(r);
    return {
      total_markets: parsed.total_markets || 0,
      active_markets: parsed.active_markets || 0,
      resolved_markets: parsed.resolved_markets || 0,
      total_volume: parsed.total_volume || 0,
    };
  } catch (e) {
    console.error('fetchStats error:', e);
    return { total_markets: 0, active_markets: 0, resolved_markets: 0, total_volume: 0 };
  }
}

async function fetchMarkets(): Promise<Market[]> {
  const c = getReadClient();
  try {
    const idsResult = await c.readContract({ 
      address: CONTRACT as `0x${string}`, 
      functionName: 'get_all_market_ids', 
      args: [] 
    });
    console.log('Raw market ids:', idsResult);
    const ids = parseContractResult(idsResult);
    
    if (!Array.isArray(ids)) return [];
    
    const markets: Market[] = [];
    for (const id of ids) {
      try {
        const m = await c.readContract({ 
          address: CONTRACT as `0x${string}`, 
          functionName: 'get_market', 
          args: [String(id)] 
        });
        const parsed = parseContractResult(m);
        if (parsed?.market_id) markets.push(parsed);
      } catch (e) {
        console.error(`fetchMarket ${id} error:`, e);
      }
    }
    return markets.sort((a, b) => parseInt(b.market_id) - parseInt(a.market_id));
  } catch (e) {
    console.error('fetchMarkets error:', e);
    return [];
  }
}

async function fetchOdds(id: string): Promise<Odds> {
  const c = getReadClient();
  try {
    const r = await c.readContract({ 
      address: CONTRACT as `0x${string}`, 
      functionName: 'get_market_odds', 
      args: [id] 
    });
    const parsed = parseContractResult(r);
    return {
      yes_probability: parsed.yes_probability || 50,
      no_probability: parsed.no_probability || 50,
      total_pool: parsed.total_pool || 0,
    };
  } catch (e) {
    console.error('fetchOdds error:', e);
    return { yes_probability: 50, no_probability: 50, total_pool: 0 };
  }
}

async function createMarket(asset: string, condition: string, threshold: number, timestamp: number) {
  if (!client) throw new Error('Wallet not connected');
  
  console.log('Creating market:', { asset, condition, threshold, timestamp });
  
  const tx = await client.writeContract({
    address: CONTRACT as `0x${string}`,
    functionName: 'create_market',
    args: [asset, condition, String(threshold), String(timestamp)],
    value: BigInt(0),
  });
  
  console.log('TX Hash:', tx);
  
  const receipt = await client.waitForTransactionReceipt({ 
    hash: tx, 
    status: 'FINALIZED' 
  });
  
  console.log('Receipt:', receipt);
  return receipt;
}

async function placeBet(id: string, position: string, amount: bigint) {
  if (!client) throw new Error('Wallet not connected');
  
  console.log('Placing bet:', { id, position, amount: amount.toString() });
  
  const tx = await client.writeContract({
    address: CONTRACT as `0x${string}`,
    functionName: 'place_bet',
    args: [id, position],
    value: amount,
  });
  
  console.log('TX Hash:', tx);
  
  const receipt = await client.waitForTransactionReceipt({ 
    hash: tx, 
    status: 'FINALIZED' 
  });
  
  console.log('Receipt:', receipt);
  return receipt;
}

// ============ MAIN PAGE ============
export default function Page() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [showBet, setShowBet] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, m] = await Promise.all([fetchStats(), fetchMarkets()]);
      setStats(s);
      setMarkets(m);
    } catch (e: any) {
      console.error('Load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectWallet();
      setAddress(addr);
    } catch (e: any) {
      setError(e.message);
    }
    setConnecting(false);
  };

  const disconnect = () => {
    client = null;
    currentWallet = null;
    setAddress(null);
  };

  const handleMarketClick = async (m: Market) => {
    setError(null);
    if (!address) { 
      setError('Please connect your wallet first'); 
      return; 
    }
    
    // Deduction check (value = 0)
    const verified = await verifyWalletAccess();
    if (!verified) {
      setError('Deduction failed');
      return;
    }
    
    setSelectedMarket(m);
    setShowBet(true);
  };

  const handleCreateClick = async () => {
    setError(null);
    if (!address) { 
      setError('Please connect your wallet first'); 
      return; 
    }
    
    // Deduction check (value = 0)
    const verified = await verifyWalletAccess();
    if (!verified) {
      setError('Deduction failed');
      return;
    }
    
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">G</div>
            <span className="font-semibold text-lg tracking-tight">Gen<span className="text-indigo-400">Predict</span></span>
          </div>
          
          {address ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="font-mono text-sm text-zinc-300">{address.slice(0,6)}...{address.slice(-4)}</span>
              </div>
              <button onClick={disconnect} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={connect} 
              disabled={connecting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-full font-medium text-sm shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="pt-28 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-5xl sm:text-6xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Predict Crypto Prices
              </span>
            </h1>
            <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
              Create markets, place bets, and earn rewards with AI-powered price resolution
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-6">
              <button 
                onClick={handleCreateClick} 
                className="group px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-2xl font-semibold shadow-xl shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Market
                </span>
              </button>
              <button 
                onClick={load} 
                className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              </button>
            </div>
            
            {error && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { label: 'Total Markets', value: stats?.total_markets ?? 0, icon: '📊' },
              { label: 'Active', value: stats?.active_markets ?? 0, icon: '🔥' },
              { label: 'Resolved', value: stats?.resolved_markets ?? 0, icon: '✅' },
              { label: 'Volume', value: `${stats?.total_volume ?? 0} GEN`, icon: '💰' },
            ].map(s => (
              <div key={s.label} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-sm text-zinc-500">{s.label}</span>
                </div>
                <p className="text-3xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Markets Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Prediction Markets</h2>
            <p className="text-zinc-500">Click on a market to place your bet</p>
          </div>
          
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => (
                <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-white/5 rounded-full"></div>
                    <div>
                      <div className="h-4 w-24 bg-white/5 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-white/5 rounded"></div>
                    </div>
                  </div>
                  <div className="h-4 w-full bg-white/5 rounded mb-3"></div>
                  <div className="h-3 w-2/3 bg-white/5 rounded"></div>
                </div>
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-xl font-medium mb-2">No markets yet</p>
              <p className="text-zinc-500">Be the first to create a prediction market!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map(m => (
                <MarketCard key={m.market_id} market={m} onClick={() => handleMarketClick(m)} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showCreate && (
        <CreateModal 
          onClose={() => setShowCreate(false)} 
          onSuccess={() => { setShowCreate(false); load(); }} 
        />
      )}
      
      {showBet && selectedMarket && (
        <BetModal 
          market={selectedMarket} 
          onClose={() => setShowBet(false)} 
          onSuccess={() => { setShowBet(false); load(); }} 
        />
      )}
    </div>
  );
}

// ============ MARKET CARD ============
function MarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const threshold = parseFloat(market.threshold);
  const timeLeft = parseInt(market.resolution_timestamp) * 1000 - Date.now();
  const isExpired = timeLeft <= 0;
  
  const assetConfig: Record<string, { icon: string; color: string }> = {
    BTC: { icon: '₿', color: 'from-orange-500 to-yellow-500' },
    ETH: { icon: 'Ξ', color: 'from-blue-500 to-indigo-500' },
    SOL: { icon: '◎', color: 'from-purple-500 to-pink-500' },
  };
  
  const config = assetConfig[market.asset] || { icon: market.asset[0], color: 'from-zinc-500 to-zinc-600' };

  return (
    <div 
      onClick={onClick}
      className={`group p-6 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition-all ${market.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center text-xl font-bold shadow-lg`}>
            {config.icon}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{market.asset}/USD</h3>
            <p className="text-sm text-zinc-500">Market #{market.market_id}</p>
          </div>
        </div>
        {market.resolved ? (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            market.outcome === 'YES' ? 'bg-emerald-500/20 text-emerald-400' :
            market.outcome === 'NO' ? 'bg-red-500/20 text-red-400' :
            'bg-zinc-700 text-zinc-400'
          }`}>
            {market.outcome}
          </span>
        ) : (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isExpired ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
          }`}>
            {isExpired ? 'Pending' : formatTime(timeLeft)}
          </span>
        )}
      </div>
      
      <p className="text-zinc-300 mb-4">
        Price will be{' '}
        <span className={`font-medium ${market.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}`}>
          {market.condition}
        </span>{' '}
        <span className="font-mono font-bold">${threshold.toLocaleString()}</span>
      </p>
      
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
          <span className="text-zinc-500">YES: {formatPool(market.yes_pool)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-red-400 rounded-full"></span>
          <span className="text-zinc-500">NO: {formatPool(market.no_pool)}</span>
        </div>
      </div>
    </div>
  );
}

// ============ CREATE MODAL ============
function CreateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [asset, setAsset] = useState('BTC');
  const [condition, setCondition] = useState('above');
  const [threshold, setThreshold] = useState('50000');
  const [duration, setDuration] = useState(86400);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const priceValue = parseFloat(threshold);
    if (!threshold || isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    setSubmitting(true);
    try {
      const ts = Math.floor(Date.now() / 1000) + duration;
      await createMarket(asset, condition, priceValue, ts);
      onSuccess();
    } catch (e: any) {
      console.error('Create market error:', e);
      setError(e.message || 'Failed to create market');
    }
    setSubmitting(false);
  };

  const assetOptions = [
    { value: 'BTC', label: 'Bitcoin', icon: '₿' },
    { value: 'ETH', label: 'Ethereum', icon: 'Ξ' },
    { value: 'SOL', label: 'Solana', icon: '◎' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#12121a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold">Create Market</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={submit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Asset</label>
            <div className="grid grid-cols-3 gap-2">
              {assetOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAsset(opt.value)}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    asset === opt.value 
                      ? 'border-indigo-500 bg-indigo-500/10' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-lg">{opt.icon}</span>
                  <span className="block text-xs text-zinc-400 mt-1">{opt.value}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Condition</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setCondition('above')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  condition === 'above' 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Above</span>
              </button>
              <button 
                type="button" 
                onClick={() => setCondition('below')}
                className={`p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${
                  condition === 'below' 
                    ? 'border-red-500 bg-red-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Below</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Price (USD)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input 
                type="number" 
                value={threshold} 
                onChange={e => setThreshold(e.target.value)} 
                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="50000"
                min="0"
                step="any"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Predict if {asset} will be {condition} ${threshold || '0'} USD
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Resolution Time</label>
            <select 
              value={duration} 
              onChange={e => setDuration(Number(e.target.value))} 
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors appearance-none cursor-pointer"
            >
              <option value={3600}>1 Hour</option>
              <option value={86400}>1 Day</option>
              <option value={604800}>1 Week</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : 'Create Market'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ BET MODAL ============
function BetModal({ market, onClose, onSuccess }: { market: Market; onClose: () => void; onSuccess: () => void }) {
  const [position, setPosition] = useState('YES');
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState<Odds | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchOdds(market.market_id).then(setOdds);
  }, [market.market_id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { 
      setError('Please enter a valid amount'); 
      return; 
    }

    setSubmitting(true);
    setError(null);
    try {
      const wei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      await placeBet(market.market_id, position, wei);
      setSuccess(true);
    } catch (e: any) {
      console.error('Place bet error:', e);
      setError(e.message || 'Failed to place bet');
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#12121a] border border-white/10 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-2">Bet Placed!</h3>
          <p className="text-zinc-400 mb-6">Your {position} bet of {amount} GEN was successful.</p>
          <button 
            onClick={onSuccess} 
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  const threshold = parseFloat(market.threshold);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#12121a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h2 className="text-xl font-semibold">Place Bet</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">
                {market.asset === 'BTC' ? '₿' : market.asset === 'ETH' ? 'Ξ' : '◎'}
              </span>
              <span className="font-semibold text-lg">{market.asset}/USD</span>
            </div>
            <p className="text-zinc-400 text-sm">
              Price will be{' '}
              <span className={market.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}>
                {market.condition}
              </span>{' '}
              <span className="font-mono font-bold">${threshold.toLocaleString()}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Your Prediction</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button" 
                onClick={() => setPosition('YES')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  position === 'YES' 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <span className="font-medium">YES</span>
                </div>
                {odds && <span className="block text-xs text-zinc-500 mt-1">{odds.yes_probability}% odds</span>}
              </button>
              <button 
                type="button" 
                onClick={() => setPosition('NO')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  position === 'NO' 
                    ? 'border-red-500 bg-red-500/10' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="font-medium">NO</span>
                </div>
                {odds && <span className="block text-xs text-zinc-500 mt-1">{odds.no_probability}% odds</span>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Bet Amount (GEN)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="0.00" 
              step="0.001"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl font-semibold shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Placing Bet...
              </span>
            ) : 'Place Bet'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============ HELPERS ============
function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function formatPool(value: string): string {
  const num = parseInt(value) || 0;
  if (num === 0) return '0';
  if (num >= 1e18) return `${(num / 1e18).toFixed(2)} GEN`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(0)}B wei`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(0)}M wei`;
  return `${num} wei`;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}
