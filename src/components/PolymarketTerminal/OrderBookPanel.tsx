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
    if (!orderBook?.bids.length) return null;
    return orderBook.bids[0];
  }, [orderBook?.bids]);

  const bestAsk = useMemo(() => {
    if (!orderBook?.asks.length) return null;
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
    if (val >= 1000) return (val / 1000).toFixed(2) + 'k';
    return val.toFixed(2);
  };

  const formatUSD = (price: string, size: string) => {
    const usd = parseFloat(price) * parseFloat(size);
    if (usd >= 1000) return (usd / 1000).toFixed(2) + 'k';
    return usd.toFixed(2);
  };

  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/90 font-mono text-xs">
      {/* Header */}
      <div className="border-b border-green-500/30 p-2 bg-green-950/20">
        <div className="text-green-400 font-bold text-sm truncate">
          Order Book — {outcome} — {marketQuestion.slice(0, 50)}
          {marketQuestion.length > 50 && '...'}
        </div>
        {orderBook && (
          <div className="text-green-500/70 text-xs mt-1">
            Last Update: {new Date(orderBook.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Best Bid/Ask Summary */}
      <div className="border-b border-green-500/30 p-2 bg-black/50 grid grid-cols-3 gap-2">
        <div>
          <div className="text-green-500/60 text-[10px]">BEST BID</div>
          <div className="text-green-400 font-bold">
            {bestBid ? formatPrice(bestBid.price) : '—'}
          </div>
        </div>
        <div>
          <div className="text-green-500/60 text-[10px]">SPREAD</div>
          <div className="text-yellow-400 font-bold">{spread || '—'}</div>
        </div>
        <div>
          <div className="text-green-500/60 text-[10px]">BEST ASK</div>
          <div className="text-red-400 font-bold">
            {bestAsk ? formatPrice(bestAsk.price) : '—'}
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="border-b border-green-500/30 bg-green-950/10">
        <div className="grid grid-cols-6 gap-2 p-2 text-green-400/80 font-bold text-[10px]">
          <div className="text-right">Px</div>
          <div className="text-right">Sz</div>
          <div className="text-right">USD</div>
          <div className="text-right">Px</div>
          <div className="text-right">Sz</div>
          <div className="text-right">USD</div>
        </div>
        <div className="grid grid-cols-2 gap-4 px-2 pb-1">
          <div className="text-center text-green-400 font-bold text-[10px]">Bids</div>
          <div className="text-center text-red-400 font-bold text-[10px]">Asks</div>
        </div>
      </div>

      {/* Order Book Ladder */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {!orderBook ? (
          <div className="flex items-center justify-center h-full text-green-500/50">
            Waiting for order book data...
          </div>
        ) : (
          <div className="p-2 space-y-[2px]">
            {Array.from({ length: Math.max(orderBook.bids.length, orderBook.asks.length, 20) }).map(
              (_, index) => {
                const bid = orderBook.bids[index];
                const ask = orderBook.asks[index];

                return (
                  <div
                    key={index}
                    className="grid grid-cols-6 gap-2 text-[11px] hover:bg-green-500/5"
                  >
                    {/* Bid side */}
                    {bid ? (
                      <>
                        <div
                          className={`text-right ${
                            index === 0 ? 'text-green-400 font-bold' : 'text-green-300/80'
                          }`}
                        >
                          {formatPrice(bid.price)}
                        </div>
                        <div className="text-right text-green-200/60">
                          {formatSize(bid.size)}
                        </div>
                        <div className="text-right text-green-100/50">
                          {formatUSD(bid.price, bid.size)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-right text-green-500/20">—</div>
                        <div className="text-right text-green-500/20">—</div>
                        <div className="text-right text-green-500/20">—</div>
                      </>
                    )}

                    {/* Ask side */}
                    {ask ? (
                      <>
                        <div
                          className={`text-right ${
                            index === 0 ? 'text-red-400 font-bold' : 'text-red-300/80'
                          }`}
                        >
                          {formatPrice(ask.price)}
                        </div>
                        <div className="text-right text-red-200/60">
                          {formatSize(ask.size)}
                        </div>
                        <div className="text-right text-red-100/50">
                          {formatUSD(ask.price, ask.size)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-right text-green-500/20">—</div>
                        <div className="text-right text-green-500/20">—</div>
                        <div className="text-right text-green-500/20">—</div>
                      </>
                    )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {orderBook && (
        <div className="border-t border-green-500/30 p-2 bg-green-950/10 text-[10px] text-green-400/70">
          <div className="flex justify-between">
            <span>Bids: {orderBook.bids.length}</span>
            <span>Asks: {orderBook.asks.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}