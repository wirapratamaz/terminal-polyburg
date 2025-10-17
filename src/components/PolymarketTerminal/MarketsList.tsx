'use client';

import { Market } from '@/lib/polymarket/types';
import { useState, useEffect } from 'react';

interface MarketsListProps {
  markets: Market[];
  selectedMarket: Market | null;
  onSelectMarket: (market: Market, tokenId: string) => void;
}

export function MarketsList({ markets, selectedMarket, onSelectMarket }: MarketsListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (markets.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIndex((prev) => Math.min(prev + 1, markets.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && hoveredIndex >= 0) {
        e.preventDefault();
        const market = markets[hoveredIndex];
        if (market.tokens.length > 0) {
          onSelectMarket(market, market.tokens[0].token_id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markets, hoveredIndex, onSelectMarket]);

  const formatVolume = (volume: string) => {
    const val = parseFloat(volume);
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(0)}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // Limit to 18 visible markets
  const displayMarkets = markets.slice(0, 18);

  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/90 font-mono">
      {/* Header */}
      <div className="border-b border-green-500/30 px-3 py-1 bg-green-950/20">
        <div className="text-green-400 font-bold text-[11px] leading-tight">
          Results: {markets.length} markets
        </div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {displayMarkets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-500/50 text-[10px]">
            No markets found
          </div>
        ) : (
          <div className="px-2 py-1">
            {displayMarkets.map((market, index) => {
              const isSelected = selectedMarket?.condition_id === market.condition_id;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={market.condition_id}
                  className={`px-2 py-1 cursor-pointer border-b border-green-500/10 transition-colors ${
                    isSelected
                      ? 'bg-yellow-600/30 border-yellow-500/40'
                      : isHovered
                      ? 'bg-green-500/10'
                      : 'hover:bg-green-500/5'
                  }`}
                  onClick={() => {
                    if (market.tokens.length > 0) {
                      onSelectMarket(market, market.tokens[0].token_id);
                    }
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`text-[10px] font-mono shrink-0 ${
                        isSelected ? 'text-yellow-300' : 'text-green-400'
                      }`}
                    >
                      {(index + 1).toString().padStart(2, '0')}.
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-[10px] leading-tight truncate ${
                          isSelected ? 'text-yellow-200' : 'text-green-300'
                        }`}
                      >
                        {market.question}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-green-500/60 font-mono">
                          {formatDate(market.end_date_iso || market.created_at || '')}
                        </span>
                        <span className="text-[9px] text-green-400/70 font-mono">
                          {formatVolume(market.volume_24hr)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}