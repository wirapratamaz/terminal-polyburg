'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PolymarketWebSocketClient } from '@/lib/polymarket/websocket-client';
import { Market, OrderBookState } from '@/lib/polymarket/types';
import { fetchMarkets, searchMarkets } from '@/lib/polymarket/api';
import { SearchPanel } from './SearchPanel';
import { MarketsList } from './MarketsList';
import { OrderBookPanel } from './OrderBookPanel';
import { StatusBar } from './StatusBar';
import { InfoBar } from './InfoBar';

export function PolymarketTerminal() {
  const [wsClient, setWsClient] = useState<PolymarketWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number>(0);
  const [orderBook, setOrderBook] = useState<OrderBookState | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activityMessages, setActivityMessages] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    const client = new PolymarketWebSocketClient();
    setWsClient(client);

    client.on('connected', (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        addActivityMessage('WebSocket connected to Polymarket CLOB');
      } else {
        addActivityMessage('WebSocket disconnected');
      }
    });

    client.on('book', (book: OrderBookState) => {
      setOrderBook(book);
      setLastUpdateTime(book.timestamp);
      addActivityMessage(
        `Order book updated: ${book.bids.length} bids, ${book.asks.length} asks`
      );
    });

    client.on('priceChange', (change: any) => {
      setLastUpdateTime(change.timestamp);
      addActivityMessage(
        `Price change: ${change.side} ${change.price} × ${change.size}`
      );
    });

    // Load initial markets
    loadInitialMarkets();

    return () => {
      client.disconnect();
    };
  }, []);

  const loadInitialMarkets = async () => {
    setIsSearching(true);
    const initialMarkets = await fetchMarkets(50);
    setMarkets(initialMarkets);
    setIsSearching(false);
    if (initialMarkets.length > 0) {
      addActivityMessage(`Loaded ${initialMarkets.length} markets`);
    }
  };

  const addActivityMessage = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityMessages((prev) => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    if (query.trim() === '') {
      const allMarkets = await fetchMarkets(50);
      setMarkets(allMarkets);
      addActivityMessage('Showing all markets');
    } else {
      const results = await searchMarkets(query);
      setMarkets(results);
      addActivityMessage(`Search: "${query}" - ${results.length} results`);
    }
    setIsSearching(false);
  };

  const handleSelectMarket = useCallback(
    (market: Market, tokenId: string) => {
      setSelectedMarket(market);
      setSelectedTokenId(tokenId);
      setOrderBook(null);

      // Find token index
      const tokenIndex = market.tokens.findIndex((t) => t.token_id === tokenId);
      setSelectedTokenIndex(tokenIndex);

      // Subscribe to market via WebSocket
      if (wsClient && market.condition_id) {
        wsClient.subscribeToMarkets([market.condition_id]);
        addActivityMessage(
          `Subscribed to: ${market.question} - ${market.tokens[tokenIndex]?.outcome || 'Unknown'}`
        );
      }
    },
    [wsClient, addActivityMessage]
  );

  // Handle 'q' key to flip outcome
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' && selectedMarket && selectedMarket.tokens.length > 1) {
        const nextIndex = (selectedTokenIndex + 1) % selectedMarket.tokens.length;
        const nextToken = selectedMarket.tokens[nextIndex];
        handleSelectMarket(selectedMarket, nextToken.token_id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarket, selectedTokenIndex, handleSelectMarket]);

  const currentOutcome = useMemo(() => {
    if (!selectedMarket || selectedTokenIndex < 0) return 'N/A';
    return selectedMarket.tokens[selectedTokenIndex]?.outcome || 'Unknown';
  }, [selectedMarket, selectedTokenIndex]);

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top ticker bar */}
      <div className="bg-black border-b border-green-500/30 px-4 py-1 font-mono text-xs text-green-400 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block">
          Zigmund SELL Yes @ Will Bournemouth win the 2025-26 Engl... &nbsp;&nbsp;&nbsp; Zigmund
          SELL Yes @ Will Aston Villa win the 2025-26 Engl... &nbsp;&nbsp;&nbsp; luna113 BUY Down
          @ Bitcoin Up or Down — October 15, 4PM ET &nbsp;&nbsp;&nbsp; anciente BUY
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left panel - Search + Markets */}
        <div className="col-span-4 border-r border-green-500/30 flex flex-col overflow-hidden">
          <div className="shrink-0">
            <SearchPanel onSearch={handleSearch} isSearching={isSearching} />
          </div>
          <div className="flex-1 overflow-hidden">
            <MarketsList
              markets={markets}
              selectedMarket={selectedMarket}
              onSelectMarket={handleSelectMarket}
            />
          </div>
        </div>

        {/* Right panel - Order Book + Activity */}
        <div className="col-span-8 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <OrderBookPanel
              orderBook={orderBook}
              marketQuestion={selectedMarket?.question || 'No market selected'}
              outcome={currentOutcome}
            />
          </div>
          <div className="h-32 shrink-0 border-t border-green-500/30">
            <InfoBar messages={activityMessages} />
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <StatusBar
        isConnected={isConnected}
        selectedMarket={selectedMarket?.question || null}
        lastUpdateTime={lastUpdateTime}
      />
    </div>
  );
}