import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const RPC_URL = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || 'https://studio.genlayer.com/api'
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || ''

// GenLayer client singleton
let clientInstance: ReturnType<typeof createClient> | null = null

export function getGenLayerClient(accountAddress?: string) {
  if (!clientInstance || accountAddress) {
    clientInstance = createClient({
      chain: studionet,
      endpoint: RPC_URL,
      account: accountAddress,
    })
  }
  return clientInstance
}

export function getContractAddress(): string {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env')
  }
  return CONTRACT_ADDRESS
}

// Contract interaction helpers
export async function readContract<T>(
  functionName: string,
  args: unknown[] = []
): Promise<T> {
  const client = getGenLayerClient()
  const result = await client.readContract({
    address: getContractAddress(),
    functionName,
    args,
  })
  return result as T
}

export async function writeContract(
  accountAddress: string,
  functionName: string,
  args: unknown[] = [],
  value: bigint = 0n
): Promise<string> {
  const client = getGenLayerClient(accountAddress)
  
  await client.initializeConsensusSmartContract()
  
  const txHash = await client.writeContract({
    address: getContractAddress(),
    functionName,
    args,
    value,
  })
  
  return txHash
}

export async function waitForTransaction(txHash: string) {
  const client = getGenLayerClient()
  
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: 'FINALIZED',
  })
  
  return receipt
}

export { CONTRACT_ADDRESS, RPC_URL }
