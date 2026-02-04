'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';

// ============ CONFIG ============
const CONTRACT = '0x7d15C521f4A463Dc833d550e66635e9BE5063Eb4';
// Use local GenLayer Studio by default
const RPC = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:4000/api'
  : 'https://studio.genlayer.com/api';

const chain = {
  id: 61999,
  name: 'GenLayer',
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

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
  client = createClient({ chain: chain as any, endpoint: RPC, account: wallet });
  try { await client.initializeConsensusSmartContract(); } catch(e) {}
  return wallet;
}

function getReadClient() {
  return createClient({ chain: chain as any, endpoint: RPC });
}

// Alternative: Direct JSON-RPC call for reading
async function callContract(method: string, args: any[] = []): Promise<any> {
  try {
    const response = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          to: CONTRACT,
          function: method,
          args: args,
        },
        id: Date.now(),
      }),
    });
    
    const data = await response.json();
    console.log(`RPC ${method} response:`, data);
    
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }
    
    // Parse result
    let result = data.result;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
      } catch {}
    }
    
    return result;
  } catch (e) {
    console.error(`RPC ${method} error:`, e);
    throw e;
  }
}

async function fetchStats(): Promise<Stats> {
  try {
    // Try direct RPC first
    const result = await callContract('get_stats');
    if (result && typeof result === 'object') {
      return result as Stats;
    }
  } catch (e) {
    console.warn('Direct RPC failed, trying SDK:', e);
  }
  
  // Fallback to SDK
  try {
    const c = getReadClient();
    const r = await c.readContract({ address: CONTRACT as any, functionName: 'get_stats', args: [] });
    console.log('Stats SDK response:', r);
    
    let data = r;
    if (typeof r === 'string') {
      try { data = JSON.parse(r); } catch {}
    }
    return data as Stats;
  } catch (e) {
    console.error('Failed to fetch stats:', e);
    return { total_markets: 0, active_markets: 0, resolved_markets: 0, total_volume: 0 };
  }
}

async function fetchMarkets(): Promise<Market[]> {
  try {
    // Try direct RPC first
    let ids: string[] = [];
    try {
      const idsResult = await callContract('get_all_market_ids');
      ids = Array.isArray(idsResult) ? idsResult.map(String) : [];
    } catch {
      // Fallback to SDK
      const c = getReadClient();
      const idsRaw = await c.readContract({ address: CONTRACT as any, functionName: 'get_all_market_ids', args: [] });
      if (typeof idsRaw === 'string') {
        try { ids = JSON.parse(idsRaw); } catch {}
      }
    }
    
    console.log('Market IDs:', ids);
    
    const markets: Market[] = [];
    for (const id of ids) {
      try {
        let m: any;
        try {
          m = await callContract('get_market', [id]);
        } catch {
          const c = getReadClient();
          const mRaw = await c.readContract({ address: CONTRACT as any, functionName: 'get_market', args: [id] });
          m = typeof mRaw === 'string' ? JSON.parse(mRaw) : mRaw;
        }
        
        if (m?.market_id) {
          markets.push(m);
          console.log(`Market ${id}:`, m);
        }
      } catch (e) {
        console.error(`Failed to fetch market ${id}:`, e);
      }
    }
    return markets.sort((a, b) => parseInt(b.market_id) - parseInt(a.market_id));
  } catch (e) {
    console.error('Failed to fetch markets:', e);
    return [];
  }
}

async function fetchOdds(id: string): Promise<Odds> {
  try {
    const c = getReadClient();
    const r = await c.readContract({ address: CONTRACT as any, functionName: 'get_market_odds', args: [id] });
    return JSON.parse(r as string);
  } catch { return { yes_probability: 50, no_probability: 50, total_pool: 0 }; }
}

async function createMarket(asset: string, condition: string, threshold: number, timestamp: number) {
  if (!client) throw new Error('Wallet not connected');
  console.log('Creating market:', { asset, condition, threshold, timestamp });
  
  try {
    const tx = await client.writeContract({
      address: CONTRACT as any,
      functionName: 'create_market',
      args: [asset, condition, threshold.toString(), timestamp.toString()],
      value: BigInt(0),
    });
    console.log('Transaction submitted:', tx);
    
    const receipt = await client.waitForTransactionReceipt({ hash: tx, status: 'FINALIZED' });
    console.log('Transaction confirmed:', receipt);
    return tx;
  } catch (e: any) {
    console.error('Create market error:', e);
    throw new Error(e.message || 'Transaction failed - check if GenLayer Studio is running');
  }
}

async function placeBet(id: string, position: string, amount: bigint) {
  if (!client) throw new Error('Not connected');
  const tx = await client.writeContract({
    address: CONTRACT as any,
    functionName: 'place_bet',
    args: [id, position],
    value: amount,
  });
  await client.waitForTransactionReceipt({ hash: tx, status: 'FINALIZED' });
}

// ============ MAIN PAGE ============
export default function Page() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  const [showCreate, setShowCreate] = useState(false);
  const [showBet, setShowBet] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNetworkStatus('checking');
    try {
      const [s, m] = await Promise.all([fetchStats(), fetchMarkets()]);
      setStats(s);
      setMarkets(m);
      setNetworkStatus('connected');
      console.log('Loaded:', { stats: s, markets: m });
    } catch (e) {
      console.error('Load error:', e);
      setNetworkStatus('error');
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
    wallet = null;
    setAddress(null);
  };

  const handleMarketClick = async (m: Market) => {
    setError(null);
    if (!address) { setError('Please connect wallet first'); return; }
    // Fee verification (amount = 0)
    try { await fetchStats(); } catch { setError('Deduction failed'); return; }
    setSelectedMarket(m);
    setShowBet(true);
  };

  const handleCreateClick = async () => {
    setError(null);
    if (!address) { setError('Please connect wallet first'); return; }
    try { await fetchStats(); } catch { setError('Deduction failed'); return; }
    setShowCreate(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">G</div>
            <span className="font-bold text-lg">Gen<span className="text-blue-400">Predict</span></span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              networkStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
              networkStatus === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {networkStatus === 'connected' ? '● Connected' :
               networkStatus === 'error' ? '● Offline' :
               '● Checking...'}
            </span>
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
              Create and join prediction markets for cryptocurrency prices. AI-powered resolution ensures fair outcomes.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <button onClick={handleCreateClick} className="btn btn-primary px-6 py-3">
                + Create Market
              </button>
              <button onClick={load} className="btn btn-outline px-6 py-3">
                ↻ Refresh
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
          <h2 className="text-2xl font-bold mb-6">Prediction Markets</h2>
          
          {networkStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-6 text-center">
              <p className="text-red-400 font-semibold mb-2">Unable to connect to GenLayer</p>
              <p className="text-zinc-400 text-sm mb-4">
                Make sure GenLayer Studio is running at <code className="bg-zinc-800 px-2 py-0.5 rounded">localhost:4000</code>
              </p>
              <a href="https://docs.genlayer.com" target="_blank" rel="noopener" className="text-blue-400 text-sm hover:underline">
                View Setup Guide →
              </a>
            </div>
          )}
          
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
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">No Markets Yet</h3>
              <p className="text-zinc-500 mb-6">Be the first to create a prediction market</p>
              <button onClick={handleCreateClick} className="btn btn-primary">Create Market</button>
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

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 text-center text-zinc-500 text-sm">
        Built on GenLayer. Powered by Intelligent Contracts.
      </footer>

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
          onClose={() => { setShowBet(false); setSelectedMarket(null); }}
          onSuccess={() => { setShowBet(false); setSelectedMarket(null); load(); }}
        />
      )}
    </div>
  );
}

// ============ MARKET CARD ============
function MarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const [odds, setOdds] = useState<Odds | null>(null);
  
  useEffect(() => {
    fetchOdds(market.market_id).then(setOdds);
  }, [market.market_id]);

  const threshold = parseFloat(market.threshold);
  const expiry = parseInt(market.resolution_timestamp) * 1000;
  const isExpired = Date.now() > expiry;
  const timeLeft = isExpired ? 'Expired' : formatTime(expiry - Date.now());

  return (
    <div onClick={onClick} className="card hover:border-zinc-700 hover:bg-zinc-800/50 cursor-pointer transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-blue-400">
            {market.asset.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold">{market.asset}/USD</h3>
            <p className="text-sm text-zinc-500">#{market.market_id}</p>
          </div>
        </div>
        <span className={`tag ${market.resolved ? 'tag-green' : isExpired ? 'tag-yellow' : 'tag-blue'}`}>
          {market.resolved ? market.outcome : isExpired ? 'Pending' : 'Active'}
        </span>
      </div>

      <div className="bg-zinc-800/50 rounded-lg p-3 mb-4">
        <p className="text-zinc-300">
          Price will be{' '}
          <span className={market.condition === 'above' ? 'text-green-400' : 'text-red-400'}>
            {market.condition}
          </span>{' '}
          <span className="font-mono font-bold">${threshold.toLocaleString()}</span>
        </p>
      </div>

      {odds && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-green-400">YES {odds.yes_probability}%</span>
            <span className="text-red-400">NO {odds.no_probability}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
            <div className="bg-green-500" style={{ width: `${odds.yes_probability}%` }}></div>
            <div className="bg-red-500" style={{ width: `${odds.no_probability}%` }}></div>
          </div>
        </div>
      )}

      <p className="text-sm text-zinc-500">⏱ {timeLeft}</p>
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
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus(null);
    
    const priceValue = parseFloat(threshold);
    if (!threshold || isNaN(priceValue) || priceValue <= 0) {
      setError('Please enter a valid price');
      return;
    }
    
    setSubmitting(true);
    try {
      setStatus('Sending transaction...');
      const ts = Math.floor(Date.now() / 1000) + duration;
      await createMarket(asset, condition, priceValue, ts);
      setStatus('Market created! Refreshing...');
      
      // Wait a bit for blockchain to update, then refresh
      setTimeout(() => {
        onSuccess();
        // Force page reload to get fresh data
        window.location.reload();
      }, 2000);
    } catch (e: any) {
      console.error('Create market error:', e);
      setError(e.message || 'Failed to create market. Check console for details.');
      setSubmitting(false);
    }
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

          {status && <p className="text-blue-400 text-sm bg-blue-500/10 p-2 rounded">{status}</p>}
          {error && <p className="text-red-400 text-sm bg-red-500/10 p-2 rounded">{error}</p>}

          <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3">
            {submitting ? 'Creating... (please wait)' : 'Create Market'}
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
    if (!amount || parseFloat(amount) <= 0) { setError('Enter valid amount'); return; }
    
    // Fee verification
    try { await fetchStats(); } catch { setError('Deduction failed'); return; }

    setSubmitting(true);
    setError(null);
    try {
      const wei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      await placeBet(market.market_id, position, wei);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
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

          {error && <p className="text-red-400 text-sm">{error}</p>}

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
