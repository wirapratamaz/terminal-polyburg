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
    // Check if credentials are available
    const hasCredentials = !!(process.env.NEXT_PUBLIC_POLYMARKET_API_KEY &&
                              process.env.POLYMARKET_API_SECRET &&
                              process.env.POLYMARKET_PASSPHRASE);

    if (!hasCredentials) {
      addActivityMessage('Warning: Missing Polymarket API credentials in environment variables');
      addActivityMessage('WebSocket connection will not work without API_SECRET and PASSPHRASE');
    }

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

    client.on('error', (error: any) => {
      const errorMsg = error.message || 'Unknown error';
      addActivityMessage(`WebSocket error: ${errorMsg}`);

      if (error.code === 'UNAUTHORIZED' || errorMsg.includes('401')) {
        addActivityMessage('Authentication failed - check API credentials');
        addActivityMessage('Required: POLYMARKET_API_SECRET and POLYMARKET_PASSPHRASE');
      }
    });

    client.on('book', (book: OrderBookState) => {
      setOrderBook(book);
      setLastUpdateTime(book.timestamp);
      addActivityMessage(
        `Order book updated: ${book?.bids?.length || 0} bids, ${book?.asks?.length || 0} asks`
      );
    });

    client.on('priceChange', (change: any) => {
      setLastUpdateTime(change.timestamp);
      addActivityMessage(
        `Price change: ${change.side} ${change.price} × ${change.size}`
      );
    });

    client.on('order', (order: any) => {
      addActivityMessage(`Order update: ${order.side} ${order.size} @ ${order.price}`);
    });

    client.on('trade', (trade: any) => {
      addActivityMessage(`Trade executed: ${trade.side} ${trade.size} @ ${trade.price}`);
    });

    // Load initial markets
    loadInitialMarkets();

    return () => {
      client.disconnect();
    };
  }, []);

  const loadInitialMarkets = async () => {
    setIsSearching(true);
    try {
      addActivityMessage('Loading markets from Polymarket...');
      const initialMarkets = await fetchMarkets(50);
      setMarkets(initialMarkets);
      setIsSearching(false);

      if (initialMarkets.length > 0) {
        addActivityMessage(`✓ Loaded ${initialMarkets.length} markets`);

        // Auto-select first market for demo (even if WebSocket is not connected)
        const firstMarket = initialMarkets[0];
        if (firstMarket && firstMarket.tokens && firstMarket.tokens.length > 0) {
          const firstToken = firstMarket.tokens[0];
          handleSelectMarket(firstMarket, firstToken.token_id);
          addActivityMessage(`Auto-selected: ${firstMarket.question.substring(0, 50)}...`);

          if (!isConnected) {
            addActivityMessage('WebSocket not connected - showing static market data only');
          }
        }
      } else {
        addActivityMessage('⚠ No markets found');
      }
    } catch (error) {
      setIsSearching(false);
      addActivityMessage(`✗ Failed to load markets: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      if (!market || !market.tokens) {
        addActivityMessage('Invalid market data');
        return;
      }

      setSelectedMarket(market);
      setSelectedTokenId(tokenId);
      setOrderBook(null);

      // Find token index
      const tokenIndex = market.tokens.findIndex((t) => t.token_id === tokenId);
      setSelectedTokenIndex(tokenIndex >= 0 ? tokenIndex : 0);

      // Subscribe to market via WebSocket
      if (wsClient && market.condition_id) {
        if (wsClient.isConnected()) {
          wsClient.subscribeToMarkets([market.condition_id]);
          addActivityMessage(
            `Subscribed to market: ${market.question} - ${market.tokens[tokenIndex]?.outcome || 'Unknown'}`
          );
        } else {
          addActivityMessage('WebSocket not connected - cannot subscribe to market');
        }
      }
    },
    [wsClient, addActivityMessage]
  );

  // Handle 'q' key to flip outcome
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'q' && selectedMarket && selectedMarket.tokens && selectedMarket.tokens.length > 1) {
        const nextIndex = (selectedTokenIndex + 1) % selectedMarket.tokens.length;
        const nextToken = selectedMarket.tokens[nextIndex];
        if (nextToken) {
          handleSelectMarket(selectedMarket, nextToken.token_id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarket, selectedTokenIndex, handleSelectMarket]);

  const currentOutcome = useMemo(() => {
    if (!selectedMarket || selectedTokenIndex < 0 || !selectedMarket.tokens) return 'N/A';
    return selectedMarket.tokens[selectedTokenIndex]?.outcome || 'Unknown';
  }, [selectedMarket, selectedTokenIndex]);

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Top ticker bar - Real activity */}
      <div className="bg-black border-b border-green-500/30 px-4 py-1 font-mono text-xs text-green-400 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block">
          {activityMessages.length > 0 ? (
            activityMessages.slice(-3).map((msg, idx) => (
              <span key={idx}>
                {msg} &nbsp;&nbsp;&nbsp;
              </span>
            ))
          ) : (
            <span>Waiting for market activity...</span>
          )}
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
            <InfoBar
              messages={activityMessages}
              selectedMarket={selectedMarket}
              selectedTokenId={selectedTokenId}
              orderBook={orderBook}
            />
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