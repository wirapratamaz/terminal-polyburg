'use client';

import { OrderBookState, Market } from '@/lib/polymarket/types';

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
  // Get current token info
  const currentToken = selectedMarket?.tokens?.find(t => t.token_id === selectedTokenId);

  // Get best bid/ask from order book
  const bestBid = orderBook?.bids?.[0];
  const bestAsk = orderBook?.asks?.[0];
  const spread = bestBid && bestAsk
    ? (parseFloat(bestAsk.price) - parseFloat(bestBid.price)).toFixed(4)
    : null;

  // Format token ID for display
  const formatTokenId = (tokenId: string) => {
    return tokenId.length > 12 ? `${tokenId.slice(0, 6)}...${tokenId.slice(-4)}` : tokenId;
  };

  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/95 font-mono overflow-hidden">
      {/* Trading Header - Real Market Data */}
      <div className="border-b border-green-500/30 px-2 py-0.5 bg-green-950/20">
        <div className="text-green-400 font-bold text-[9px] leading-tight">
          {selectedMarket && currentToken
            ? `Trading ${currentToken.outcome} — ${selectedMarket.question.slice(0, 50)}${selectedMarket.question.length > 50 ? '...' : ''}`
            : 'No market selected'
          }
        </div>
      </div>

      {/* Real Trading Details */}
      {(selectedMarket && currentToken && orderBook) && (
        <div className="border-b border-green-500/30 px-2 py-1 bg-black/50">
          <div className="grid grid-cols-4 gap-3 text-[8px] leading-tight">
            <div>
              <span className="text-green-500/60">Token:</span>
              <span className="text-green-400 ml-1 font-mono">{formatTokenId(currentToken.token_id)}</span>
            </div>
            <div>
              <span className="text-green-500/60">Price:</span>
              <span className="text-green-400 ml-1 font-mono tabular-nums">
                {currentToken.price || (bestBid ? bestBid.price : '0.0000')}
              </span>
            </div>
            <div>
              <span className="text-green-500/60">Size:</span>
              <span className="text-green-400 ml-1 font-mono tabular-nums">
                {bestBid ? bestBid.size : '0'}
              </span>
            </div>
            <div>
              <span className="text-green-500/60">Side:</span>
              <span className="text-green-400 ml-1">
                {orderBook.lastTradeSide || 'BUY'}
              </span>
            </div>
          </div>
          <div className="mt-1 text-[8px] text-green-400/70 leading-tight">
            Spread: {spread || '—'} | Bids: {orderBook.bids?.length || 0} | Asks: {orderBook.asks?.length || 0}
          </div>
        </div>
      )}

      {/* Last Trade Info */}
      {orderBook?.lastTradePrice && (
        <div className="border-b border-green-500/30 px-2 py-1 bg-black/50">
          <div className="text-[8px] text-green-400 font-mono leading-tight">
            Last trade: {orderBook.lastTradeSide} @ {orderBook.lastTradePrice}
          </div>
          {currentToken && (
            <div className="text-[8px] text-green-400/70 font-mono leading-tight">
              Token: {formatTokenId(currentToken.token_id)}
            </div>
          )}
        </div>
      )}

      {/* Market Info */}
      {selectedMarket && (
        <div className="border-b border-green-500/30 px-2 py-0.5 bg-green-950/20">
          <div className="text-green-400 font-bold text-[9px] leading-tight">
            Market Info — {selectedMarket.question.slice(0, 30)}{selectedMarket.question.length > 30 ? '...' : ''}
          </div>
          <div className="text-green-500/60 text-[8px] leading-tight mt-0.5">
            Volume: {selectedMarket.volume_24hr || selectedMarket.volume || '0'} | Active: {selectedMarket.active ? 'Yes' : 'No'}
          </div>
        </div>
      )}

      {/* Activity Messages */}
      <div className="flex-1 px-2 py-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {messages.length === 0 ? (
          <div className="text-green-500/50 text-[8px] leading-tight">
            No recent activity
          </div>
        ) : (
          <div>
            {messages.slice(-6).map((msg, idx) => (
              <div key={`msg-${msg.slice(0, 20)}-${idx}`} className="text-green-400/80 text-[8px] font-mono leading-tight">
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="border-t border-green-500/30 px-2 py-0.5 bg-black/50">
        <div className="flex items-center justify-between text-[8px]">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-green-500/60">Market Data:</span>
              <span className="text-green-400 ml-1 font-mono">
                {selectedMarket ? 'Live' : 'No Market'}
              </span>
            </div>
            {orderBook && (
              <div>
                <span className="text-green-500/60">Order Book:</span>
                <span className="text-green-400 ml-1 font-mono">
                  {orderBook.bids?.length || 0} Bids / {orderBook.asks?.length || 0} Asks
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}