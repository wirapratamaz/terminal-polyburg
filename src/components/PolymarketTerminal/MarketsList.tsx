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
      if (!markets || markets.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoveredIndex((prev) => Math.min(prev + 1, markets.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoveredIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && hoveredIndex >= 0) {
        e.preventDefault();
        const market = markets[hoveredIndex];
        if (market && market.tokens && market.tokens.length > 0) {
          onSelectMarket(market, market.tokens[0].token_id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markets, hoveredIndex, onSelectMarket]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month} ${day}, ${hours}${ampm} ET`;
  };

  // Limit to 18 visible markets
  const displayMarkets = (markets && markets.length > 0) ? markets.slice(0, 18) : [];

  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/90 font-mono">
      {/* Header */}
      <div className="border-b border-green-500/30 px-2 py-0.5 bg-green-950/20">
        <div className="text-green-400 font-bold text-[9px] leading-tight">
          Results
        </div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30 border border-green-500/20">
        {displayMarkets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-500/50 text-[8px]">
            No markets found
          </div>
        ) : (
          <div className="px-1 py-0.5">
            {displayMarkets.map((market, index) => {
              const isSelected = selectedMarket?.condition_id === market.condition_id;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={market.condition_id}
                  className={`px-1 py-0.5 cursor-pointer border-b border-green-500/10 transition-colors ${
                    isSelected
                      ? 'bg-yellow-600/30 border-yellow-500/40'
                      : isHovered
                      ? 'bg-green-500/10'
                      : 'hover:bg-green-500/5'
                  }`}
                  onClick={() => {
                    if (market.tokens && market.tokens.length > 0) {
                      onSelectMarket(market, market.tokens[0].token_id);
                    }
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                >
                  <div className="text-[8px] leading-tight font-mono">
                    <span className={isSelected ? 'text-yellow-300' : 'text-green-400'}>
                      {index + 1}.
                    </span>
                    <span className={`ml-1 ${isSelected ? 'text-yellow-200' : 'text-green-300'}`}>
                      {market.question} — {formatDate(market.end_date_iso || market.created_at || '')}
                    </span>
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