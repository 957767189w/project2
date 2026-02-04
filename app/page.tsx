'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from 'genlayer-js';

// ============ CONFIGURATION ============
const CONTRACT_ADDRESS = '0x7d15C521f4A463Dc833d550e66635e9BE5063Eb4';
const GENLAYER_ENDPOINT = 'https://studio.genlayer.com/api';

// Chain definition (since genlayer-js/chains import fails)
const GENLAYER_CHAIN = {
  id: 61999,
  name: 'GenLayer Studio',
  nativeCurrency: {
    name: 'GEN',
    symbol: 'GEN',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [GENLAYER_ENDPOINT],
    },
  },
};

// ============ TYPES ============
interface Market {
  market_id: string;
  asset: string;
  condition: string;
  threshold: string;
  yes_pool: string;
  no_pool: string;
  resolved: boolean;
  outcome: string;
}

// ============ GLOBAL STATE ============
let genlayerClient: ReturnType<typeof createClient> | null = null;

// ============ CLIENT MANAGEMENT ============
function initClient(account?: string) {
  const config: any = {
    chain: GENLAYER_CHAIN,
    endpoint: GENLAYER_ENDPOINT,
  };
  
  if (account) {
    config.account = account;
  }
  
  genlayerClient = createClient(config);
  return genlayerClient;
}

function getClient() {
  if (!genlayerClient) {
    genlayerClient = initClient();
  }
  return genlayerClient;
}

// ============ CONTRACT INTERACTION ============
async function callRead(functionName: string, args: any[] = []): Promise<any> {
  const client = getClient();
  
  try {
    const result = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName,
      args,
    });
    
    // Parse JSON if string
    if (typeof result === 'string') {
      try {
        return JSON.parse(result);
      } catch {
        return result;
      }
    }
    return result;
  } catch (error) {
    console.error(`Read ${functionName} error:`, error);
    throw error;
  }
}

async function callWrite(
  functionName: string, 
  args: any[], 
  value: bigint = BigInt(0),
  account: string
): Promise<string> {
  // Reinitialize client with account for writing
  const client = initClient(account);
  
  const txHash = await client.writeContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args,
    value,
  });
  
  // Wait for confirmation
  await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'FINALIZED',
  });
  
  return txHash;
}

// ============ MAIN COMPONENT ============
export default function Home() {
  // Wallet
  const [wallet, setWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  
  // Data
  const [stats, setStats] = useState({ total_markets: 0, active_markets: 0, resolved_markets: 0, total_volume: 0 });
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  
  // UI
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<'create' | 'bet' | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  // ============ LOAD DATA ============
  const loadData = useCallback(async () => {
    setLoading(true);
    setDataError(false);
    
    try {
      // Load stats
      const statsData = await callRead('get_stats');
      if (statsData) setStats(statsData);
      
      // Load market IDs
      const ids = await callRead('get_all_market_ids');
      
      if (Array.isArray(ids) && ids.length > 0) {
        const marketList: Market[] = [];
        
        for (const id of ids) {
          try {
            const market = await callRead('get_market', [String(id)]);
            if (market?.market_id) {
              marketList.push(market);
            }
          } catch (e) {
            console.warn(`Failed to load market ${id}`);
          }
        }
        
        setMarkets(marketList.reverse());
      }
    } catch (e) {
      console.error('Load data error:', e);
      setDataError(true);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============ WALLET CONNECTION ============
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not installed');
      return;
    }
    
    setConnecting(true);
    setError(null);
    
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];
      
      if (accounts?.[0]) {
        setWallet(accounts[0]);
        initClient(accounts[0]);
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    }
    
    setConnecting(false);
  };

  const disconnectWallet = () => {
    setWallet(null);
    genlayerClient = null;
  };

  // ============ FEE CHECK (value = 0) ============
  const checkFee = async (): Promise<boolean> => {
    if (!wallet) {
      setError('Connect wallet first');
      return false;
    }
    
    try {
      await callRead('get_stats');
      return true;
    } catch {
      setError('Deduction failed');
      return false;
    }
  };

  // ============ CREATE MARKET ============
  const handleCreateMarket = async (asset: string, condition: string, threshold: number, duration: number) => {
    if (!wallet) {
      setError('Connect wallet first');
      return;
    }
    
    setError(null);
    
    try {
      const timestamp = Math.floor(Date.now() / 1000) + duration;
      
      await callWrite(
        'create_market',
        [asset, condition, String(threshold), String(timestamp)],
        BigInt(0),
        wallet
      );
      
      setModal(null);
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to create market');
    }
  };

  // ============ PLACE BET ============
  const handlePlaceBet = async (marketId: string, position: string, amount: number) => {
    if (!wallet) {
      setError('Connect wallet first');
      return;
    }
    
    setError(null);
    
    try {
      const amountWei = BigInt(Math.floor(amount * 1e18));
      
      await callWrite(
        'place_bet',
        [marketId, position],
        amountWei,
        wallet
      );
      
      setModal(null);
      setSelectedMarket(null);
      loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to place bet');
    }
  };

  // ============ BUTTON HANDLERS ============
  const onCreateClick = async () => {
    const ok = await checkFee();
    if (ok) setModal('create');
  };

  const onMarketClick = async (market: Market) => {
    const ok = await checkFee();
    if (ok) {
      setSelectedMarket(market);
      setModal('bet');
    }
  };

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-[#08080c]">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              Gen<span className="text-blue-400">Predict</span>
            </span>
          </div>
          
          {wallet ? (
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-sm font-mono text-zinc-300">
                  {wallet.slice(0, 6)}...{wallet.slice(-4)}
                </span>
              </div>
              <button
                onClick={disconnectWallet}
                className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-14">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Predict Crypto Prices
          </h1>
          <p className="text-lg text-zinc-500 max-w-lg mx-auto">
            Create markets, place bets, and earn rewards with AI-powered price resolution
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Markets', value: stats.total_markets },
            { label: 'Active', value: stats.active_markets },
            { label: 'Resolved', value: stats.resolved_markets },
            { label: 'Volume', value: `${stats.total_volume} GEN` },
          ].map((item) => (
            <div key={item.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
              <p className="text-sm text-zinc-500 mb-1">{item.label}</p>
              <p className="text-2xl font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={onCreateClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition"
          >
            + Create Market
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-6 py-3 border border-white/10 hover:bg-white/5 text-white font-medium rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Markets */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Markets</h2>
          
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-6 animate-pulse">
                  <div className="h-6 w-24 bg-white/10 rounded mb-4" />
                  <div className="h-4 w-full bg-white/10 rounded mb-2" />
                  <div className="h-4 w-2/3 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : dataError ? (
            <div className="text-center py-16">
              <p className="text-zinc-500 mb-4">Unable to load markets from contract</p>
              <button onClick={loadData} className="text-blue-400 hover:text-blue-300">
                Try Again
              </button>
            </div>
          ) : markets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No Markets Yet</h3>
              <p className="text-zinc-500 mb-6">Create the first prediction market</p>
              <button
                onClick={onCreateClick}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition"
              >
                Create Market
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {markets.map((market) => (
                <MarketCard key={market.market_id} market={market} onClick={() => onMarketClick(market)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-20">
        <p className="text-center text-sm text-zinc-600">
          Powered by GenLayer Intelligent Contracts
        </p>
      </footer>

      {/* Modals */}
      {modal === 'create' && (
        <CreateModal onClose={() => setModal(null)} onCreate={handleCreateMarket} />
      )}
      
      {modal === 'bet' && selectedMarket && (
        <BetModal
          market={selectedMarket}
          onClose={() => { setModal(null); setSelectedMarket(null); }}
          onBet={(pos, amt) => handlePlaceBet(selectedMarket.market_id, pos, amt)}
        />
      )}
    </div>
  );
}

// ============ MARKET CARD ============
function MarketCard({ market, onClick }: { market: Market; onClick: () => void }) {
  const threshold = parseFloat(market.threshold);
  const pool = parseInt(market.yes_pool || '0') + parseInt(market.no_pool || '0');
  
  return (
    <div
      onClick={onClick}
      className="bg-white/[0.02] border border-white/5 rounded-xl p-6 cursor-pointer hover:bg-white/[0.04] hover:border-white/10 transition"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{market.asset}/USD</h3>
          <p className="text-sm text-zinc-500">#{market.market_id}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          market.resolved 
            ? 'bg-emerald-500/10 text-emerald-400' 
            : 'bg-blue-500/10 text-blue-400'
        }`}>
          {market.resolved ? market.outcome : 'Active'}
        </span>
      </div>
      
      <p className="text-zinc-400 mb-4">
        Price{' '}
        <span className={market.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}>
          {market.condition}
        </span>{' '}
        <span className="text-white font-mono">${threshold.toLocaleString()}</span>
      </p>
      
      <p className="text-sm text-zinc-500">Pool: {pool} GEN</p>
    </div>
  );
}

// ============ CREATE MODAL ============
function CreateModal({ onClose, onCreate }: { 
  onClose: () => void; 
  onCreate: (asset: string, condition: string, threshold: number, duration: number) => void;
}) {
  const [asset, setAsset] = useState('BTC');
  const [condition, setCondition] = useState('above');
  const [threshold, setThreshold] = useState('50000');
  const [duration, setDuration] = useState(86400);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const t = parseFloat(threshold);
    if (!t || t <= 0) return;
    
    setLoading(true);
    await onCreate(asset, condition, t, duration);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Create Market</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Asset</label>
            <select 
              value={asset} 
              onChange={(e) => setAsset(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="SOL">Solana (SOL)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Condition</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setCondition('above')}
                className={`py-3 rounded-lg border-2 font-medium transition ${
                  condition === 'above' 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                ↑ Above
              </button>
              <button
                onClick={() => setCondition('below')}
                className={`py-3 rounded-lg border-2 font-medium transition ${
                  condition === 'below' 
                    ? 'border-red-500 bg-red-500/10 text-red-400' 
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                ↓ Below
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Price (USD)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value={3600}>1 Hour</option>
              <option value={86400}>1 Day</option>
              <option value={604800}>1 Week</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Market'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ BET MODAL ============
function BetModal({ market, onClose, onBet }: { 
  market: Market; 
  onClose: () => void; 
  onBet: (position: string, amount: number) => void;
}) {
  const [position, setPosition] = useState('YES');
  const [amount, setAmount] = useState('0.1');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    
    setLoading(true);
    await onBet(position, a);
    setLoading(false);
  };

  const threshold = parseFloat(market.threshold);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#12121a] border border-white/10 rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Place Bet</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="p-6 space-y-5">
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="font-bold text-white">{market.asset}/USD</h3>
            <p className="text-zinc-400">
              Price{' '}
              <span className={market.condition === 'above' ? 'text-emerald-400' : 'text-red-400'}>
                {market.condition}
              </span>{' '}
              <span className="text-white font-mono">${threshold.toLocaleString()}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Your Prediction</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPosition('YES')}
                className={`py-4 rounded-lg border-2 font-medium transition ${
                  position === 'YES' 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' 
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                YES ↑
              </button>
              <button
                onClick={() => setPosition('NO')}
                className={`py-4 rounded-lg border-2 font-medium transition ${
                  position === 'NO' 
                    ? 'border-red-500 bg-red-500/10 text-red-400' 
                    : 'border-white/10 text-zinc-400 hover:border-white/20'
                }`}
              >
                NO ↓
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Amount (GEN)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ TYPES ============
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
