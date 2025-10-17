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
    if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(2)}K`;
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className="flex flex-col h-full border border-green-500/30 bg-black/90 font-mono">
      {/* Header */}
      <div className="border-b border-green-500/30 p-2 bg-green-950/20">
        <div className="text-green-400 font-bold text-sm">
          Markets (Up/Down select, Enter/Right view book, 'q' flip outcome)
        </div>
      </div>

      {/* Results Header */}
      <div className="border-b border-green-500/30 p-2 bg-black/50">
        <div className="text-green-500/70 text-xs">Results: {markets.length} markets</div>
      </div>

      {/* Market List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-green-500/30">
        {markets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-green-500/50 text-sm">
            No markets found
          </div>
        ) : (
          <div className="p-2 space-y-[2px]">
            {markets.map((market, index) => {
              const isSelected =
                selectedMarket?.condition_id === market.condition_id;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={market.condition_id}
                  className={`p-2 cursor-pointer border border-transparent transition-colors ${
                    isSelected
                      ? 'bg-green-500/20 border-green-500/50'
                      : isHovered
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'hover:bg-green-500/5'
                  }`}
                  onClick={() => {
                    if (market.tokens.length > 0) {
                      onSelectMarket(market, market.tokens[0].token_id);
                    }
                  }}
                  onMouseEnter={() => setHoveredIndex(index)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-green-300' : 'text-green-400/90'
                        }`}
                      >
                        {index + 1}. {market.question}
                      </div>
                      {market.tokens.length > 0 && (
                        <div className="flex gap-2 mt-1 text-[10px]">
                          {market.tokens.map((token) => (
                            <span
                              key={token.token_id}
                              className="text-green-500/60"
                            >
                              {token.outcome}
                              {token.price && `: ${parseFloat(token.price).toFixed(2)}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-green-500/60">Vol 24h</div>
                      <div className="text-xs text-green-300 font-mono">
                        {formatVolume(market.volume_24hr)}
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