export interface Market {
  id: number
  creator: string
  asset: string
  condition: 'above' | 'below'
  target_price: number
  resolution_timestamp: number
  yes_pool: number
  no_pool: number
  resolved: boolean
  outcome: string
  created_at: number
  total_pool: number
}

export interface Bet {
  market_id: number
  user: string
  position: 'yes' | 'no'
  amount: number
  claimed: boolean
}

export interface MarketOdds {
  yes_odds: number
  no_odds: number
  yes_probability: number
  no_probability: number
  total_pool: number
}

export interface PlatformStats {
  total_markets: number
  active_markets: number
  resolved_markets: number
  total_volume: number
}

export interface WalletState {
  address: string | null
  isConnected: boolean
  balance: string
  chainId: number | null
}

export interface PotentialWinnings {
  bet_amount: number
  potential_return: number
  fee: number
  net_return: number
  multiplier: number
}
