// GenLayer Client for GenPredict
// Contract Address: 0x2c9FDd983313701761e9DDBaFf2304acff3CD7bb

import { createClient } from 'genlayer-js';
import { studionet, localnet } from 'genlayer-js/chains';

// Configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x2c9FDd983313701761e9DDBaFf2304acff3CD7bb';
const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api';

// Types
export interface Market {
  market_id: string;
  creator: string;
  asset: string;
  condition: string;
  threshold: string;
  resolution_timestamp: string;
  yes_pool: string;
  no_pool: string;
  resolved: boolean;
  outcome: string;
}

export interface MarketOdds {
  yes_probability: number;
  no_probability: number;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
}

export interface PlatformStats {
  total_markets: number;
  active_markets: number;
  resolved_markets: number;
  total_volume: number;
}

// GenLayer Client Class
class GenLayerService {
  private client: ReturnType<typeof createClient> | null = null;
  private walletAddress: string | null = null;
  private initialized: boolean = false;

  private getChain() {
    if (RPC_URL.includes('localhost') || RPC_URL.includes('127.0.0.1')) {
      return localnet;
    }
    return studionet;
  }

  async connectWallet(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('Window not available');
    }

    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock MetaMask.');
      }

      this.walletAddress = accounts[0];

      this.client = createClient({
        chain: this.getChain(),
        account: this.walletAddress,
      });

      await this.client.initializeConsensusSmartContract();
      this.initialized = true;

      return this.walletAddress;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Connection rejected. Please approve the connection in MetaMask.');
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.walletAddress = null;
    this.initialized = false;
  }

  getAddress(): string | null {
    return this.walletAddress;
  }

  isConnected(): boolean {
    return this.walletAddress !== null && this.initialized;
  }

  private async getReadOnlyClient() {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    return readClient;
  }

  // Fee deduction check (amount = 0)
  async verifyWalletAccess(): Promise<boolean> {
    if (!this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Verify by reading contract state
      await this.getStats();
      return true;
    } catch (error) {
      console.error('Wallet verification failed:', error);
      return false;
    }
  }

  // Read Methods
  async getStats(): Promise<PlatformStats> {
    const client = await this.getReadOnlyClient();
    
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_stats',
        args: [],
      });
      
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get stats:', error);
      return {
        total_markets: 0,
        active_markets: 0,
        resolved_markets: 0,
        total_volume: 0,
      };
    }
  }

  async getAllMarkets(): Promise<Market[]> {
    const client = await this.getReadOnlyClient();
    
    try {
      const idsResult = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_all_market_ids',
        args: [],
      });
      
      const ids: string[] = JSON.parse(idsResult as string);
      const markets: Market[] = [];

      for (const id of ids) {
        try {
          const marketResult = await client.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'get_market',
            args: [id],
          });
          
          const market = JSON.parse(marketResult as string);
          if (market && market.market_id) {
            markets.push(market);
          }
        } catch (e) {
          console.error(`Failed to fetch market ${id}:`, e);
        }
      }

      return markets.sort((a, b) => parseInt(b.market_id) - parseInt(a.market_id));
    } catch (error) {
      console.error('Failed to get markets:', error);
      return [];
    }
  }

  async getMarket(marketId: string): Promise<Market | null> {
    const client = await this.getReadOnlyClient();
    
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_market',
        args: [marketId],
      });
      
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get market:', error);
      return null;
    }
  }

  async getMarketOdds(marketId: string): Promise<MarketOdds> {
    const client = await this.getReadOnlyClient();
    
    try {
      const result = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_market_odds',
        args: [marketId],
      });
      
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get market odds:', error);
      return {
        yes_probability: 50,
        no_probability: 50,
        yes_pool: 0,
        no_pool: 0,
        total_pool: 0,
      };
    }
  }

  // Write Methods
  async createMarket(
    asset: string,
    condition: string,
    threshold: number,
    resolutionTimestamp: number
  ): Promise<string> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    const txHash = await this.client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'create_market',
      args: [asset, condition, threshold.toString(), resolutionTimestamp.toString()],
      value: BigInt(0),
    });

    await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED',
    });

    return txHash;
  }

  async placeBet(marketId: string, position: string, amountWei: bigint): Promise<string> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    const txHash = await this.client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'place_bet',
      args: [marketId, position],
      value: amountWei,
    });

    await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED',
    });

    return txHash;
  }

  async resolveMarket(marketId: string): Promise<string> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    const txHash = await this.client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'resolve_market',
      args: [marketId],
    });

    await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED',
    });

    return txHash;
  }

  async claimWinnings(marketId: string): Promise<string> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    const txHash = await this.client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'claim_winnings',
      args: [marketId],
    });

    await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED',
    });

    return txHash;
  }
}

// Singleton export
export const genLayer = new GenLayerService();

// Window ethereum type
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
