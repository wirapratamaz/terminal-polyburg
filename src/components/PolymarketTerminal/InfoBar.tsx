'use client';

import { OrderBookState, Market } from '@/lib/polymarket/types';
import { useMemo } from 'react';

interface InfoBarProps {
  messages: string[];
  selectedMarket?: Market | null;
  selectedTokenId?: string | null;
  orderBook?: OrderBookState | null;
}

export function InfoBar({
  messages,
  selectedMarket,
  selectedTokenId,
  orderBook
}: InfoBarProps) {
  // Memoized calculations for better performance
  const marketData = useMemo(() => {
    const currentToken = selectedMarket?.tokens?.find(t => t.token_id === selectedTokenId);
    const bestBid = orderBook?.bids?.[0];
    const bestAsk = orderBook?.asks?.[0];
    const spread = bestBid && bestAsk
      ? (parseFloat(bestAsk.price) - parseFloat(bestBid.price)).toFixed(4)
      : null;

    // Calculate total size at best bid/ask levels
    const bestBidSize = bestBid?.size || '0';
    const bestAskSize = bestAsk?.size || '0';
    
    // Determine the most recent side based on available data
    const lastSide = orderBook?.lastTradeSide || 
                    (bestBid && bestAsk ? 
                      (parseFloat(bestBid.price) > parseFloat(bestAsk.price) ? 'BUY' : 'SELL') : 
                      'BUY');

    return { 
      currentToken, 
      bestBid, 
      bestAsk, 
      spread, 
      bestBidSize, 
      bestAskSize, 
      lastSide 
    };
  }, [selectedMarket, selectedTokenId, orderBook]);

  // Format token ID for display
  const formatTokenId = (tokenId: string) => {
    return tokenId.length > 12 ? `${tokenId.slice(0, 8)}...${tokenId.slice(-6)}` : tokenId;
  };

  // Format size for display
  const formatSize = (size: string) => {
    const val = parseFloat(size);
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toFixed(0);
  };

  const { currentToken, bestBid, bestAsk, spread, bestBidSize, bestAskSize, lastSide } = marketData;
  const hasMarketData = selectedMarket && currentToken && orderBook;

  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/95 font-mono overflow-hidden">
      {/* Trading Header - Real Market Data */}
      <div className="border-b border-green-500/30 px-3 py-2 bg-green-950/20">
        <div className="text-green-400 font-bold text-sm leading-relaxed">
          {hasMarketData
            ? `Trading ${currentToken.outcome} — ${selectedMarket.question.slice(0, 60)}${selectedMarket.question.length > 60 ? '...' : ''}`
            : 'No market selected'
          }
        </div>
      </div>

      {/* Real Trading Details - Improved Layout */}
      {hasMarketData && (
        <div className="border-b border-green-500/30 px-3 py-3 bg-black/50">
          {/* Primary Trading Info - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
            <div className="flex flex-col">
              <span className="text-green-500/60 text-xs uppercase tracking-wide">Token</span>
              <span className="text-green-400 font-mono text-sm mt-1">
                {formatTokenId(currentToken.token_id)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-green-500/60 text-xs uppercase tracking-wide">Price</span>
              <span className="text-green-400 font-mono text-sm tabular-nums mt-1">
                {currentToken.price || (bestBid ? bestBid.price : '0.0000')}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-green-500/60 text-xs uppercase tracking-wide">Size</span>
              <span className="text-green-400 font-mono text-sm tabular-nums mt-1">
                {bestBid && bestAsk ? 
                  `${formatSize(bestBidSize)} / ${formatSize(bestAskSize)}` : 
                  formatSize(bestBidSize || bestAskSize || '0')
                }
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-green-500/60 text-xs uppercase tracking-wide">Side</span>
              <span className={`text-sm mt-1 font-semibold ${lastSide === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                {lastSide}
              </span>
            </div>
          </div>
          
          {/* Market Stats Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
            <div className="flex items-center gap-4 text-xs text-green-400/80">
              <span>Spread: <span className="text-green-400 font-mono">{spread || '—'}</span></span>
              <span>Bids: <span className="text-green-400 font-mono">{orderBook.bids?.length || 0}</span></span>
              <span>Asks: <span className="text-green-400 font-mono">{orderBook.asks?.length || 0}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Last Trade Info - Enhanced */}
      {orderBook?.lastTradePrice && (
        <div className="border-b border-green-500/30 px-3 py-2 bg-black/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-400 font-mono">
              Last: <span className="text-green-300">{orderBook.lastTradeSide}</span> @ 
              <span className="text-green-300 ml-1">{orderBook.lastTradePrice}</span>
            </div>
            {currentToken && (
              <div className="text-xs text-green-400/70 font-mono">
                {formatTokenId(currentToken.token_id)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Market Info - Improved Spacing */}
      {selectedMarket && (
        <div className="border-b border-green-500/30 px-3 py-1 bg-green-950/20">
          <div className="text-green-400 font-bold text-xs mb-1">
            Market Info — {selectedMarket.question.slice(0, 35)}{selectedMarket.question.length > 35 ? '...' : ''}
          </div>
          <div className="flex items-center gap-3 text-xs text-green-500/70">
            <span>Vol: <span className="text-green-400">{selectedMarket.volume_24hr || selectedMarket.volume || '0'}</span></span>
            <span>Status: <span className="text-green-400">{selectedMarket.active ? 'Active' : 'Inactive'}</span></span>
          </div>
        </div>
      )}

      {/* Activity Messages - Better Scrolling */}
      <div className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30 min-h-0">
        <div className="text-green-500/60 text-xs uppercase tracking-wide mb-2">Recent Activity</div>
        {messages.length === 0 ? (
          <div className="text-green-500/50 text-sm italic">
            No recent activity
          </div>
        ) : (
          <div className="space-y-1">
            {messages.slice(-20).map((msg, idx) => (
              <div key={`msg-${msg.slice(0, 20)}-${idx}`} className="text-green-400/90 text-xs font-mono leading-tight break-words">
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status Bar - Enhanced */}
      <div className="border-t border-green-500/30 px-3 py-1 bg-black/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${selectedMarket ? 'bg-green-400' : 'bg-green-500/30'}`}></div>
              <span className="text-green-500/60">Data:</span>
              <span className="text-green-400 font-mono text-xs">
                {selectedMarket ? 'Live' : 'Off'}
              </span>
            </div>
            {orderBook && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                <span className="text-green-500/60">Book:</span>
                <span className="text-green-400 font-mono text-xs">
                  {orderBook.bids?.length || 0}B/{orderBook.asks?.length || 0}A
                </span>
              </div>
            )}
          </div>
          <div className="text-green-500/60 text-xs">
            {new Date().toLocaleTimeString('en-US', { hour12: false, timeStyle: 'medium' })}
          </div>
        </div>
      </div>
    </div>
  );
}