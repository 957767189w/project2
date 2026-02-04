'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { readContract, writeContract, waitForTransaction } from '@/lib/genlayer'
import { Market, MarketOdds, PlatformStats, Bet, PotentialWinnings } from '@/types'

// Query keys
const QUERY_KEYS = {
  markets: ['markets'],
  activeMarkets: ['markets', 'active'],
  market: (id: number) => ['market', id],
  marketOdds: (id: number) => ['market', id, 'odds'],
  userBets: (address: string) => ['bets', address],
  stats: ['stats'],
  potentialWinnings: (marketId: number, position: string, amount: number) => 
    ['winnings', marketId, position, amount],
}

// Fetch all markets
export function useMarkets() {
  return useQuery({
    queryKey: QUERY_KEYS.markets,
    queryFn: async () => {
      const markets = await readContract<Market[]>('get_all_markets')
      return markets
    },
  })
}

// Fetch active markets only
export function useActiveMarkets() {
  return useQuery({
    queryKey: QUERY_KEYS.activeMarkets,
    queryFn: async () => {
      const markets = await readContract<Market[]>('get_active_markets')
      return markets
    },
  })
}

// Fetch single market
export function useMarket(marketId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.market(marketId),
    queryFn: async () => {
      const market = await readContract<Market>('get_market', [marketId])
      return market
    },
    enabled: marketId > 0,
  })
}

// Fetch market odds
export function useMarketOdds(marketId: number) {
  return useQuery({
    queryKey: QUERY_KEYS.marketOdds(marketId),
    queryFn: async () => {
      const odds = await readContract<MarketOdds>('get_market_odds', [marketId])
      return odds
    },
    enabled: marketId > 0,
  })
}

// Fetch user bets
export function useUserBets(userAddress: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.userBets(userAddress || ''),
    queryFn: async () => {
      if (!userAddress) return []
      const bets = await readContract<Bet[]>('get_user_bets', [userAddress])
      return bets
    },
    enabled: Boolean(userAddress),
  })
}

// Fetch platform stats
export function useStats() {
  return useQuery({
    queryKey: QUERY_KEYS.stats,
    queryFn: async () => {
      const stats = await readContract<PlatformStats>('get_stats')
      return stats
    },
  })
}

// Calculate potential winnings
export function usePotentialWinnings(marketId: number, position: string, amount: number) {
  return useQuery({
    queryKey: QUERY_KEYS.potentialWinnings(marketId, position, amount),
    queryFn: async () => {
      const winnings = await readContract<PotentialWinnings>(
        'calculate_potential_winnings',
        [marketId, position, amount]
      )
      return winnings
    },
    enabled: marketId > 0 && amount > 0 && Boolean(position),
  })
}

// Create market mutation
export function useCreateMarket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountAddress,
      asset,
      condition,
      targetPrice,
      resolutionTimestamp,
    }: {
      accountAddress: string
      asset: string
      condition: string
      targetPrice: number
      resolutionTimestamp: number
    }) => {
      const txHash = await writeContract(
        accountAddress,
        'create_market',
        [asset, condition, targetPrice, resolutionTimestamp]
      )
      await waitForTransaction(txHash)
      return txHash
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.markets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeMarkets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}

// Place bet mutation
export function usePlaceBet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountAddress,
      marketId,
      position,
      amount,
    }: {
      accountAddress: string
      marketId: number
      position: string
      amount: bigint
    }) => {
      const txHash = await writeContract(
        accountAddress,
        'place_bet',
        [marketId, position],
        amount
      )
      await waitForTransaction(txHash)
      return txHash
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.market(variables.marketId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.marketOdds(variables.marketId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeMarkets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userBets(variables.accountAddress) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}

// Resolve market mutation
export function useResolveMarket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountAddress,
      marketId,
    }: {
      accountAddress: string
      marketId: number
    }) => {
      const txHash = await writeContract(
        accountAddress,
        'resolve_market',
        [marketId]
      )
      await waitForTransaction(txHash)
      return txHash
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.market(variables.marketId) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activeMarkets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.markets })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.stats })
    },
  })
}

// Claim winnings mutation
export function useClaimWinnings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      accountAddress,
      marketId,
    }: {
      accountAddress: string
      marketId: number
    }) => {
      const txHash = await writeContract(
        accountAddress,
        'claim_winnings',
        [marketId]
      )
      await waitForTransaction(txHash)
      return txHash
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userBets(variables.accountAddress) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.market(variables.marketId) })
    },
  })
}
