import { createClient, createAccount } from 'genlayer-js';
import { studionet, testnetAsimov, localnet } from 'genlayer-js/chains';
import type { TransactionStatus } from 'genlayer-js/types';

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'http://localhost:4000/api';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

export type Market = {
  market_id: number;
  creator: string;
  asset: string;
  condition: string;
  threshold: number;
  resolution_timestamp: number;
  yes_pool: number;
  no_pool: number;
  resolved: boolean;
  outcome: string;
  created_at: number;
  resolution_price?: number;
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
  private account: ReturnType<typeof createAccount> | null = null;
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
    this.account = null;
    this.walletAddress = null;
  }

  getWalletAddress(): string | null {
    return this.walletAddress;
  }

  isConnected(): boolean {
    return this.walletAddress !== null;
  }

  async deductFee(amount: number = 0): Promise<boolean> {
    if (!this.client || !this.walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Send a zero-value transaction to verify wallet connection
      // This acts as a "fee gate" before operations
      const txHash = await this.client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_stats',
        args: [],
        value: BigInt(amount),
      });

      // Wait for transaction confirmation
      await this.client.waitForTransactionReceipt({
        hash: txHash,
        status: 'ACCEPTED' as TransactionStatus,
      });

      return true;
    } catch (error) {
      console.error('Fee deduction failed:', error);
      return false;
    }
  }

  async getActiveMarkets(): Promise<Market[]> {
    if (!this.client) {
      // Create read-only client
      const readClient = createClient({
        chain: this.getChain(),
      });
      await readClient.initializeConsensusSmartContract();
      
      const result = await readClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'get_active_markets',
        args: [],
      });
      
      return result as Market[];
    }

    const result = await this.client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_active_markets',
      args: [],
    });

    return result as Market[];
  }

  async getAllMarkets(): Promise<Market[]> {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_all_markets',
      args: [],
    });
    
    return result as Market[];
  }

  async getMarket(marketId: number): Promise<Market> {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_market',
      args: [marketId],
    });
    
    return result as Market;
  }

  async getMarketOdds(marketId: number): Promise<MarketOdds> {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_market_odds',
      args: [marketId],
    });
    
    return result as MarketOdds;
  }

  async getStats(): Promise<PlatformStats> {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_stats',
      args: [],
    });
    
    return result as PlatformStats;
  }

  async getUserPosition(marketId: number, userAddress: string): Promise<UserPosition> {
    const readClient = createClient({
      chain: this.getChain(),
    });
    await readClient.initializeConsensusSmartContract();
    
    const result = await readClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: 'get_user_position',
      args: [marketId, userAddress],
    });
    
    return result as UserPosition;
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
      args: [asset, condition, threshold, resolutionTimestamp],
      value: BigInt(0),
    });

    await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED' as TransactionStatus,
    });

    return txHash;
  }

  async placeBet(marketId: number, position: 'YES' | 'NO', amount: bigint): Promise<string> {
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

  async resolveMarket(marketId: number): Promise<string> {
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

  async claimWinnings(marketId: number): Promise<string> {
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

// Singleton instance
export const genLayerClient = new GenLayerClient();

// Type declaration for window.ethereum
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
