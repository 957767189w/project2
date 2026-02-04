# GenPredict

A decentralized crypto price prediction market built on GenLayer.

## Contract

**Address:** `0x2c9FDd983313701761e9DDBaFf2304acff3CD7bb`

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000

### Deploy to Vercel

1. Push this repository to GitHub
2. Import to Vercel: https://vercel.com/new
3. Set environment variables:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS`: `0x2c9FDd983313701761e9DDBaFf2304acff3CD7bb`
   - `NEXT_PUBLIC_GENLAYER_RPC_URL`: `https://studio.genlayer.com/api`
4. Deploy

Or use Vercel CLI:

```bash
npm install -g vercel
vercel
```

## Features

- Create prediction markets (BTC, ETH, SOL)
- Place YES/NO bets
- AI-powered price resolution
- MetaMask wallet integration
- Fee verification before operations

## Requirements

- Node.js 18+
- MetaMask browser extension
- GenLayer Studio (for local testing)

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- genlayer-js SDK
