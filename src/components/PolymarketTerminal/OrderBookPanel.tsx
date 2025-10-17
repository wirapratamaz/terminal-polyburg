'use client';

import { OrderBookState } from '@/lib/polymarket/types';
import { useMemo } from 'react';

interface OrderBookPanelProps {
  orderBook: OrderBookState | null;
  marketQuestion: string;
  outcome: string;
}

export function OrderBookPanel({ orderBook, marketQuestion, outcome }: OrderBookPanelProps) {
  const bestBid = useMemo(() => {
    if (!orderBook?.bids || !orderBook.bids.length) return null;
    return orderBook.bids[0];
  }, [orderBook?.bids]);

  const bestAsk = useMemo(() => {
    if (!orderBook?.asks || !orderBook.asks.length) return null;
    return orderBook.asks[0];
  }, [orderBook?.asks]);

  const spread = useMemo(() => {
    if (!bestBid || !bestAsk) return null;
    const spreadValue = parseFloat(bestAsk.price) - parseFloat(bestBid.price);
    return spreadValue.toFixed(4);
  }, [bestBid, bestAsk]);

  const formatPrice = (price: string) => {
    return parseFloat(price).toFixed(4);
  };

  const formatSize = (size: string) => {
    const val = parseFloat(size);
    if (val >= 1000) return (val / 1000).toFixed(1) + 'k';
    return val.toFixed(0);
  };

  const formatUSD = (price: string, size: string) => {
    const usd = parseFloat(price) * parseFloat(size);
    if (usd >= 1000) return (usd / 1000).toFixed(1) + 'k';
    return usd.toFixed(0);
  };

  // Generate 50 rows for order book display
  const displayRows = Array.from({ length: 50 }).map((_, index) => ({
    bid: (orderBook?.bids && orderBook.bids[index]) || null,
    ask: (orderBook?.asks && orderBook.asks[index]) || null,
    index
  }));

  return (
    <div className="flex flex-col h-full border border-green-500/40 bg-black/95 font-mono">
      {/* Instruction Header */}
      <div className="border-b border-green-500/40 px-2 py-0.5 bg-black">
        <div className="text-green-400 text-xs leading-tight">
          Markets (Up/Down select, Enter/Right view book, 'q' flip outcome)
        </div>
      </div>

      {/* Selected Market Header */}
      <div className="border-b border-green-500/40 px-2 py-1 bg-blue-950/30">
        {marketQuestion !== 'No market selected' ? (
          <div className="text-blue-300 text-xs leading-tight font-semibold">
            {outcome} — {marketQuestion}
          </div>
        ) : (
          <div className="text-green-500/60 text-xs leading-tight">
            N/A — No market selected
          </div>
        )}
      </div>

      {/* Column Headers */}
      <div className="border-b border-green-500/40 bg-black">
        <div className="grid grid-cols-6 gap-0 px-2 py-0.5">
          <div className="text-center text-green-400 font-bold text-xs col-span-3 border-r border-green-500/30">Bids</div>
          <div className="text-center text-red-400 font-bold text-xs col-span-3">Asks</div>
        </div>
        <div className="grid grid-cols-6 gap-0 px-2 py-0.5 text-green-400/70 font-bold text-xs">
          <div className="text-right">Px</div>
          <div className="text-right">Sz</div>
          <div className="text-right border-r border-green-500/30 pr-1">USD</div>
          <div className="text-right pl-1">Px</div>
          <div className="text-right">Sz</div>
          <div className="text-right">USD</div>
        </div>
      </div>

      {/* Order Book Ladder */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {!orderBook ? (
          <div className="flex items-center justify-center h-full text-green-500/50 text-sm">
            Waiting for order book data...
          </div>
        ) : (
          <div className="font-mono">
            {displayRows.map((row) => {
              const isHighlighted = row.index % 8 === 0 && row.index > 0;
              
              return (
                <div
                  key={row.index}
                  className={`grid grid-cols-6 gap-0 px-2 py-0 text-xs leading-tight border-b border-green-500/5 ${
                    isHighlighted ? 'bg-yellow-600/20' : ''
                  }`}
                >
                  {/* Bid side */}
                  {row.bid ? (
                    <>
                      <div className="text-right text-green-300 font-mono tabular-nums">
                        {formatPrice(row.bid.price)}
                      </div>
                      <div className="text-right text-green-300/70 font-mono tabular-nums">
                        {formatSize(row.bid.size)}
                      </div>
                      <div className="text-right text-green-300/50 font-mono tabular-nums border-r border-green-500/20 pr-1">
                        {formatUSD(row.bid.price, row.bid.size)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-right text-green-500/10">—</div>
                      <div className="text-right text-green-500/10">—</div>
                      <div className="text-right text-green-500/10 border-r border-green-500/20 pr-1">—</div>
                    </>
                  )}

                  {/* Ask side */}
                  {row.ask ? (
                    <>
                      <div className="text-right text-red-300 font-mono tabular-nums pl-1">
                        {formatPrice(row.ask.price)}
                      </div>
                      <div className="text-right text-red-300/70 font-mono tabular-nums">
                        {formatSize(row.ask.size)}
                      </div>
                      <div className="text-right text-red-300/50 font-mono tabular-nums">
                        {formatUSD(row.ask.price, row.ask.size)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-right text-green-500/10 pl-1">—</div>
                      <div className="text-right text-green-500/10">—</div>
                      <div className="text-right text-green-500/10">—</div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {orderBook && (
        <div className="border-t border-green-500/40 px-2 py-0.5 bg-black text-xs text-green-400/70">
          <div className="flex justify-between font-mono tabular-nums">
            <span>Spread: {spread || '—'}</span>
            <span>Bids: {orderBook?.bids?.length || 0} | Asks: {orderBook?.asks?.length || 0}</span>
            <span>Last: {new Date(orderBook.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}