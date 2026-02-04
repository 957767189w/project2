'use client';

import { Activity } from 'lucide-react';
import { WalletConnect } from './WalletConnect';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Gen<span className="text-primary-400">Predict</span>
              </h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5 hidden sm:block">
                Crypto Price Predictions
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#markets" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Markets
            </a>
            <a href="#how-it-works" className="text-sm text-zinc-400 hover:text-white transition-colors">
              How It Works
            </a>
            <a 
              href="https://docs.genlayer.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Docs
            </a>
          </nav>

          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
