'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// ============ CONFIG ============
// 使用你提供的正确合约地址
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
let client: any = null;
let wallet: string | null = null;

async function connectWallet(): Promise<string> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not installed');
  }
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
  if (!accounts?.length) throw new Error('No accounts');
  
  wallet = accounts[0];
  // 使用 studionet 预定义链配置
  client = createClient({ 
    chain: studionet, 
    account: wallet 
  });
  
  try { 
    await client.initializeConsensusSmartContract(); 
  } catch(e) {
    console.log('initializeConsensusSmartContract:', e);
  }
  return wallet;
}

function getReadClient() {
  // 使用 studionet 预定义链配置进行读取
  return createClient({ chain: studionet });
}

async function fetchStats(): Promise<Stats> {
  const c = getReadClient();
  try {
    const r = await c.readContract({ 
      address: CONTRACT as `0x${string}`, 
      functionName: 'get_stats', 
      args: [] 
    });
    console.log('fetchStats result:', r);
    return JSON.parse(r as string);
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
    console.log('fetchMarkets ids:', idsResult);
    const ids = JSON.parse(idsResult as string);
    
    const markets: Market[] = [];
    for (const id of ids) {
      try {
        const m = JSON.parse(await c.readContract({ 
          address: CONTRACT as `0x${string}`, 
          functionName: 'get_market', 
          args: [id] 
        }) as string);
        if (m?.market_id) markets.push(m);
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
    return JSON.parse(r as string);
  } catch (e) {
    console.error('fetchOdds error:', e);
    return { yes_probability: 50, no_probability: 50, total_pool: 0 };
  }
}

async function createMarket(asset: string, condition: string, threshold: number, timestamp: number) {
  if (!client) throw new Error('Not connected');
  
  console.log('Creating market with params:', { asset, condition, threshold, timestamp });
  
  const tx = await client.writeContract({
    address: CONTRACT as `0x${string}`,
    functionName: 'create_market',
    args: [asset, condition, threshold.toString(), timestamp.toString()],
    value: BigInt(0),
  });
  
  console.log('Transaction hash:', tx);
  
  const receipt = await client.waitForTransactionReceipt({ 
    hash: tx, 
    status: 'FINALIZED' 
  });
  
  console.log('Transaction receipt:', receipt);
  return receipt;
}

async function placeBet(id: string, position: string, amount: bigint) {
  if (!client) throw new Error('Not connected');
  
  console.log('Placing bet:', { id, position, amount: amount.toString() });
  
  const tx = await client.writeContract({
    address: CONTRACT as `0x${string}`,
    functionName: 'place_bet',
    args: [id, position],
    value: amount,
  });
  
  console.log('Transaction hash:', tx);
  
  const receipt = await client.waitForTransactionReceipt({ 
    hash: tx, 
    status: 'FINALIZED' 
  });
  
  console.log('Transaction receipt:', receipt);
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
      setError(e.message || 'Failed to load data');
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
      console.error('Connect error:', e);
      setError(e.message);
    }
    setConnecting(false);
  };

  const disconnect = () => {
    client = null;
    wallet = null;
    setAddress(null);
  };

  const handleMarketClick = async (m: Market) => {
    setError(null);
    if (!address) { 
      setError('Please connect wallet first'); 
      return; 
    }
    setSelectedMarket(m);
    setShowBet(true);
  };

  const handleCreateClick = async () => {
    setError(null);
    if (!address) { 
      setError('Please connect wallet first'); 
      return; 
    }
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">G</div>
            <span className="font-bold text-lg">Gen<span className="text-blue-400">Predict</span></span>
          </div>
          
          {address ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg border border-zinc-700">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="font-mono text-sm text-zinc-300">{address.slice(0,6)}...{address.slice(-4)}</span>
              </div>
              <button onClick={disconnect} className="btn btn-outline text-sm">Disconnect</button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className="btn btn-primary">
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Predict Crypto Prices
              </span>
            </h1>
            <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto">
              Create markets, place bets, and earn rewards with AI-powered price resolution
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <button onClick={handleCreateClick} className="btn btn-primary px-6 py-3">
                + Create Market
              </button>
              <button onClick={load} className="btn btn-outline px-6 py-3">
                Refresh
              </button>
            </div>
            
            {error && (
              <p className="text-red-400 bg-red-500/10 inline-block px-4 py-2 rounded-lg">{error}</p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: 'Total Markets', value: stats?.total_markets ?? 0 },
              { label: 'Active', value: stats?.active_markets ?? 0 },
              { label: 'Resolved', value: stats?.resolved_markets ?? 0 },
              { label: 'Volume', value: `${stats?.total_volume ?? 0} GEN` },
            ].map(s => (
              <div key={s.label} className="card">
                <p className="text-sm text-zinc-500">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Markets */}
          <h2 className="text-2xl font-bold mb-6">Markets</h2>
          
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1,2,3].map(i => (
                <div key={i} className="card animate-pulse">
                  <div className="h-10 w-10 bg-zinc-800 rounded-full mb-4"></div>
                  <div className="h-4 w-32 bg-zinc-800 rounded mb-2"></div>
                  <div className="h-4 w-48 bg-zinc-800 rounded"></div>
                </div>
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <p className="text-lg mb-2">No markets yet</p>
              <p className="text-sm">Be the first to create a prediction market!</p>
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
  
  const icons: Record<string, string> = {
    BTC: '₿', ETH: 'Ξ', SOL: '◎', BNB: '🔶', XRP: '✕', ADA: '₳', DOGE: '🐕'
  };

  return (
    <div 
      onClick={onClick}
      className={`card cursor-pointer hover:border-zinc-600 transition-all ${market.resolved ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">
            {icons[market.asset] || market.asset[0]}
          </div>
          <div>
            <h3 className="font-semibold">{market.asset}/USD</h3>
            <p className="text-sm text-zinc-500">#{market.market_id}</p>
          </div>
        </div>
        {market.resolved ? (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            market.outcome === 'YES' ? 'bg-green-500/20 text-green-400' :
            market.outcome === 'NO' ? 'bg-red-500/20 text-red-400' :
            'bg-zinc-700 text-zinc-400'
          }`}>
            {market.outcome}
          </span>
        ) : (
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            isExpired ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
          }`}>
            {isExpired ? 'Awaiting Resolution' : formatTime(timeLeft)}
          </span>
        )}
      </div>
      
      <p className="text-zinc-300 mb-4">
        Price will be <span className={market.condition === 'above' ? 'text-green-400' : 'text-red-400'}>
          {market.condition}
        </span> <span className="font-mono font-bold">${threshold.toLocaleString()}</span>
      </p>
      
      <div className="flex justify-between text-sm text-zinc-500">
        <span>YES: {market.yes_pool} wei</span>
        <span>NO: {market.no_pool} wei</span>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">Create Market</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Asset</label>
            <select value={asset} onChange={e => setAsset(e.target.value)} className="select">
              <option value="BTC">BTC - Bitcoin</option>
              <option value="ETH">ETH - Ethereum</option>
              <option value="SOL">SOL - Solana</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Condition</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setCondition('above')}
                className={`p-3 rounded-lg border-2 ${condition === 'above' ? 'border-green-500 bg-green-500/10' : 'border-zinc-700'}`}>
                ↑ Above
              </button>
              <button type="button" onClick={() => setCondition('below')}
                className={`p-3 rounded-lg border-2 ${condition === 'below' ? 'border-red-500 bg-red-500/10' : 'border-zinc-700'}`}>
                ↓ Below
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Price (USD)</label>
            <input 
              type="number" 
              value={threshold} 
              onChange={e => setThreshold(e.target.value)} 
              className="input"
              min="0"
              step="any"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Predict if {asset} will be {condition} ${threshold || '0'} USD
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Duration</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="select">
              <option value={3600}>1 Hour</option>
              <option value={86400}>1 Day</option>
              <option value={604800}>1 Week</option>
            </select>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3">
            {submitting ? 'Creating...' : 'Create Market'}
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
      setError('Enter valid amount'); 
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Bet Placed!</h3>
          <p className="text-zinc-400 mb-6">Your {position} bet of {amount} GEN was successful.</p>
          <button onClick={onSuccess} className="btn btn-primary">Close</button>
        </div>
      </div>
    );
  }

  const threshold = parseFloat(market.threshold);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md">
        <div className="flex justify-between items-center p-5 border-b border-zinc-800">
          <h2 className="text-xl font-semibold">Place Bet</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <h3 className="font-semibold">{market.asset}/USD</h3>
            <p className="text-zinc-400 text-sm">
              Price will be <span className={market.condition === 'above' ? 'text-green-400' : 'text-red-400'}>{market.condition}</span>{' '}
              <span className="font-mono font-bold">${threshold.toLocaleString()}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Your Prediction</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPosition('YES')}
                className={`p-3 rounded-lg border-2 ${position === 'YES' ? 'border-green-500 bg-green-500/10' : 'border-zinc-700'}`}>
                ↑ YES {odds && <span className="text-sm text-zinc-500">({odds.yes_probability}%)</span>}
              </button>
              <button type="button" onClick={() => setPosition('NO')}
                className={`p-3 rounded-lg border-2 ${position === 'NO' ? 'border-red-500 bg-red-500/10' : 'border-zinc-700'}`}>
                ↓ NO {odds && <span className="text-sm text-zinc-500">({odds.no_probability}%)</span>}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Amount (GEN)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" step="0.001" className="input" />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3">
            {submitting ? 'Placing Bet...' : 'Place Bet'}
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

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}
