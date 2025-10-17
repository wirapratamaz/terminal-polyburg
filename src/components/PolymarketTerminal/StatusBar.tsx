'use client';

import { useEffect, useState } from 'react';
import { Market, OrderBookState } from '@/lib/polymarket/types';

interface StatusBarProps {
  isConnected: boolean;
  selectedMarket: Market | null;
  selectedTokenId: string | null;
  orderBook: OrderBookState | null;
  lastUpdateTime: number | null;
}

export function StatusBar({ isConnected, selectedMarket, selectedTokenId, orderBook, lastUpdateTime }: StatusBarProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Set initial time only on client
    setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));

    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get current token data
  const getCurrentTokenData = () => {
    if (!selectedMarket || !selectedMarket.tokens) {
      return { tokenId: null, price: '0.00', outcome: 'None' };
    }

    const currentToken = selectedMarket.tokens.find(token => token.token_id === selectedTokenId);
    if (!currentToken) {
      return { tokenId: selectedTokenId, price: '0.00', outcome: 'Unknown' };
    }

    return {
      tokenId: currentToken.token_id,
      price: currentToken.price || '0.00',
      outcome: currentToken.outcome || 'Unknown'
    };
  };

  // Get best bid/ask from order book
  const getBestBidAsk = () => {
    if (!orderBook || !orderBook.bids || !orderBook.asks) {
      return { bestBid: '0.00', bestAsk: '0.00', bestBidSize: '0', bestAskSize: '0' };
    }

    const bestBid = orderBook.bids[0];
    const bestAsk = orderBook.asks[0];

    return {
      bestBid: bestBid?.price || '0.00',
      bestAsk: bestAsk?.price || '0.00',
      bestBidSize: bestBid?.size || '0',
      bestAskSize: bestAsk?.size || '0'
    };
  };

  const tokenData = getCurrentTokenData();
  const { bestBid, bestAsk, bestBidSize, bestAskSize } = getBestBidAsk();

  // Format token ID for display
  const formatTokenId = (tokenId: string | null) => {
    if (!tokenId) return 'No Token';
    if (tokenId.length <= 12) return tokenId;
    return `${tokenId.slice(0, 6)}...${tokenId.slice(-6)}`;
  };

  // Return placeholder on server to prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="border-t border-green-500/30 bg-black/95 font-mono text-xs">
        <div className="flex items-center justify-between px-3 py-1">
          <div className="flex items-center gap-4">
            <span className="text-green-500/70">Loading...</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span className="text-gray-400">--:--:--</span>
          </div>
        </div>
      </div>
    );
  }

  
  return (
    <div className="border-t border-green-500/30 bg-black/95 font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1">
        {/* Left side - Real trading data */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-green-500/70">Token:</span>
            <span className="text-green-400 font-mono">{formatTokenId(tokenData.tokenId)}</span>
          </div>
          {isConnected && orderBook ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-green-500/70">Bid:</span>
                <span className="text-green-300 font-mono tabular-nums">{bestBid}</span>
                <span className="text-green-500/50 text-xs">({bestBidSize})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500/70">Ask:</span>
                <span className="text-red-300 font-mono tabular-nums">{bestAsk}</span>
                <span className="text-red-500/50 text-xs">({bestAskSize})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500/70">Outcome:</span>
                <span className="text-green-300">{tokenData.outcome}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <span className="text-green-500/70">Price:</span>
                <span className="text-green-300 font-mono tabular-nums">{tokenData.price}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500/70">Vol:</span>
                <span className="text-green-300 font-mono tabular-nums">
                  {selectedMarket?.volume_24hr || '--'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-500/70">Outcome:</span>
                <span className="text-green-300">{tokenData.outcome}</span>
              </div>
            </>
          )}
        </div>

        {/* Right side - Profile info with actual values */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
              {isConnected ? 'LIVE' : 'DISC'}
            </span>
          </div>
          <div className="text-green-300 font-mono tabular-nums">
            {currentTime}
          </div>
        </div>
      </div>
    </div>
  );
}