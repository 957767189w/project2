import { createClient, createAccount } from 'genlayer-js';
import { studionet, testnetAsimov, localnet } from 'genlayer-js/chains';
import type { TransactionStatus } from 'genlayer-js/types';

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'http://localhost:4000/api';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x2c9FDd983313701761e9DDBaFf2304acff3CD7bb';

export type Market = {
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
  resolution_price?: string;
};

export type MarketOdds = {
  yes_probability: number;
  no_probability: number;
  yes_pool: number;
  no_pool: number;
  total_pool: number;
};

export type PlatformStats = {
  total_markets: number;
  active_markets: number;
  resolved_markets: number;
  total_volume: number;
  collected_fees: number;
};

export type UserPosition = {
  YES: number;
  NO: number;
};

class GenLayerClient {
  private client: ReturnType<typeof createClient> | null = null;
  private walletAddress: string | null = null;

  private getChain() {
    if (RPC_URL.includes('localhost') || RPC_URL.includes('127.0.0.1')) {
      return localnet;
    }
    if (RPC_URL.includes('studio.genlayer.com')) {
      return studionet;
    }
    return testnetAsimov;
  }

  async connectWallet(): Promise<string> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.walletAddress = accounts[0];
      
      this.client = createClient({
        chain: this.getChain(),
        account: this.walletAddress,
      });

      await this.client.initializeConsensusSmartContract();

      return this.walletAddress;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected connection');
      }
      throw error;
    }
  }

  async disconnectWallet(): Promise<void> {
    this.client = null;
    this.walletAddress = null;
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  isConnected(): boolean {
    return this.walletAddress !== null;
  }

  private async getReadClient() {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    return readClient;
  }

  async deductFee(amount: number = 0): Promise<boolean> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      await this.getStats();
      return true;
    } catch (error) {
      console.error('Fee deduction failed:', error);
      return false;
    }
  }

  async getAllMarkets(): Promise<Market[]> {
    const readClient = await this.getReadClient();
    
    try {
      const idsResult = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_all_market_ids',
        args: [],
      });
      
      const ids: string[] = JSON.parse(idsResult as string);
      
      const markets: Market[] = [];
      for (const id of ids) {
        try {
          const marketResult = await readClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            functionName: 'get_market',
            args: [id],
          });
          const market = JSON.parse(marketResult as string);
          if (market.market_id) {
            markets.push(market);
          }
        } catch (e) {
          console.error(`Failed to fetch market ${id}:`, e);
        }
      }
      
      return markets;
    } catch (error) {
      console.error('Failed to get markets:', error);
      return [];
    }
  }

  async getActiveMarkets(): Promise<Market[]> {
    const markets = await this.getAllMarkets();
    const currentTime = Date.now() / 1000;
    
    return markets.filter(m => 
      !m.resolved && 
      parseInt(m.resolution_timestamp) > currentTime
    );
  }

  async getMarket(marketId: string): Promise<Market | null> {
    const readClient = await this.getReadClient();
    
    try {
      const result = await readClient.readContract({
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
    const readClient = await this.getReadClient();
    
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_market_odds',
        args: [marketId],
      });
      
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get odds:', error);
      return { yes_probability: 50, no_probability: 50, yes_pool: 0, no_pool: 0, total_pool: 0 };
    }
  }

  async getStats(): Promise<PlatformStats> {
    const readClient = await this.getReadClient();
    
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_stats',
        args: [],
      });
      
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { total_markets: 0, active_markets: 0, resolved_markets: 0, total_volume: 0, collected_fees: 0 };
    }
  }

  async getUserPosition(marketId: string, userAddress: string): Promise<UserPosition> {
    const readClient = await this.getReadClient();
    
    try {
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_user_position',
        args: [marketId, userAddress],
      });
      
      return JSON.parse(result as string);
    } catch (error) {
      console.error('Failed to get user position:', error);
      return { YES: 0, NO: 0 };
    }
  }

  async createMarket(
    asset: string,
    condition: 'above' | 'below',
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
      status: 'FINALIZED' as TransactionStatus,
    });

    return txHash;
  }

  async placeBet(marketId: string, position: 'YES' | 'NO', amount: bigint): Promise<string> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    const txHash = await this.client.writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'place_bet',
      args: [marketId, position],
      value: amount,
    });

    await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED' as TransactionStatus,
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
      status: 'FINALIZED' as TransactionStatus,
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
      status: 'FINALIZED' as TransactionStatus,
    });

    return txHash;
  }
}

export const genLayerClient = new GenLayerClient();

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}
