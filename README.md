# GenPredict

A decentralized cryptocurrency price prediction market built on GenLayer.

## Overview

GenPredict allows users to create and participate in prediction markets for cryptocurrency prices. Markets are automatically resolved using GenLayer's AI-powered intelligent contracts, which fetch real-time price data and determine outcomes through multi-validator consensus.

## Features

- Create prediction markets for any supported cryptocurrency
- Place bets on whether prices will be above or below a threshold
- Automatic market resolution via AI consensus
- Real-time odds calculation
- Wallet integration with MetaMask
- Clean, responsive UI

## Tech Stack

- **Smart Contract**: Python (GenLayer Intelligent Contract)
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Blockchain SDK**: genlayer-js
- **Price Data**: CoinGecko API

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker 26+ (for local GenLayer Studio)
- MetaMask browser extension
- GenLayer CLI (`npm install -g genlayer`)

## Project Structure

```
genpredict/
├── contracts/
│   └── prediction_market.py    # Intelligent Contract
├── frontend/
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and SDK wrapper
│   └── public/                 # Static assets
├── deploy/
│   └── deployScript.ts         # Contract deployment script
└── README.md
```

## Quick Start

### 1. Set Up GenLayer Studio

```bash
# Install GenLayer CLI
npm install -g genlayer

# Initialize and start GenLayer Studio
genlayer init
genlayer up
```

The Studio will be available at `http://localhost:8080`

### 2. Deploy the Smart Contract

**Option A: Using GenLayer Studio UI**

1. Open GenLayer Studio at `http://localhost:8080`
2. Click "Load Contract" and select `contracts/prediction_market.py`
3. Click "Deploy"
4. Copy the deployed contract address

**Option B: Using CLI**

```bash
# Navigate to project directory
cd genpredict

# Select network
genlayer network

# Deploy contract
genlayer deploy
```

### 3. Configure Frontend

```bash
cd frontend

# Copy environment variables
cp .env.example .env

# Edit .env and add your contract address
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x...

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_GENLAYER_RPC_URL
# - NEXT_PUBLIC_CONTRACT_ADDRESS
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | GenLayer RPC endpoint | `http://localhost:4000/api` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed contract address | - |
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID | `61999` |

### Network Endpoints

| Network | RPC URL |
|---------|---------|
| Local Studio | `http://localhost:4000/api` |
| Hosted Studio | `https://studio.genlayer.com/api` |
| Testnet Asimov | `https://rpc.genlayer.com` |

## Smart Contract API

### Write Methods

#### `create_market(asset, condition, threshold, resolution_timestamp)`
Create a new prediction market.

- `asset`: Cryptocurrency symbol (e.g., "BTC", "ETH")
- `condition`: "above" or "below"
- `threshold`: Price threshold in USD
- `resolution_timestamp`: Unix timestamp for market expiration

#### `place_bet(market_id, position)`
Place a bet on a market.

- `market_id`: ID of the market
- `position`: "YES" or "NO"
- Send GEN tokens as `value`

#### `resolve_market(market_id)`
Resolve an expired market (fetches price and determines outcome).

#### `claim_winnings(market_id)`
Claim winnings from a resolved market.

### Read Methods

#### `get_market(market_id)` → Market
Get details of a specific market.

#### `get_all_markets()` → Market[]
Get all markets.

#### `get_active_markets()` → Market[]
Get all active (unresolved, not expired) markets.

#### `get_market_odds(market_id)` → MarketOdds
Get current odds for a market.

#### `get_user_position(market_id, user_address)` → UserPosition
Get user's position in a market.

#### `get_stats()` → PlatformStats
Get platform statistics.

## Supported Assets

- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- BNB (BNB)
- XRP (Ripple)
- ADA (Cardano)
- DOGE (Dogecoin)
- DOT (Polkadot)
- MATIC (Polygon)
- LINK (Chainlink)

## Development

### Running Tests

```bash
# Contract tests (requires GenLayer Studio running)
gltest

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
cd frontend
npm run build
```

## Security Considerations

- Always verify contract addresses before interacting
- Smart contracts are immutable once deployed
- Market resolution depends on external price API availability
- Use testnet for development and testing

## Troubleshooting

### MetaMask Connection Issues

1. Ensure MetaMask is installed and unlocked
2. Add GenLayer network to MetaMask:
   - Network Name: GenLayer Studio
   - RPC URL: http://localhost:4000/api
   - Chain ID: 61999
   - Currency: GEN

### Contract Deployment Fails

1. Check GenLayer Studio is running (`genlayer up`)
2. Verify Docker containers are healthy
3. Check logs in Studio UI

### Price Resolution Fails

1. Verify the market has expired (current time > resolution_timestamp)
2. Check if the asset is supported
3. CoinGecko API may be rate limited - wait and retry

## License

MIT

## Links

- [GenLayer Documentation](https://docs.genlayer.com)
- [GenLayer Studio](https://studio.genlayer.com)
- [GenLayer GitHub](https://github.com/genlayerlabs)
