'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PolymarketGatewayWebSocketClient } from '@/lib/polymarket/gateway-websocket-client';
import { Market, OrderBookState } from '@/lib/polymarket/types';
import { fetchMarkets, searchMarkets } from '@/lib/polymarket/api';
import { SearchPanel } from './SearchPanel';
import { MarketsList } from './MarketsList';
import { OrderBookPanel } from './OrderBookPanel';
import { StatusBar } from './StatusBar';
import { InfoBar } from './InfoBar';

export function PolymarketTerminal() {
  const [wsClient, setWsClient] = useState<PolymarketGatewayWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number>(0);
  const [orderBook, setOrderBook] = useState<OrderBookState | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [activityMessages, setActivityMessages] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);

  // Initialize WebSocket client (gateway handles authentication)
  useEffect(() => {
    console.log('🔧 Creating Gateway WebSocket client...');
    const client = new PolymarketGatewayWebSocketClient();
    console.log('📝 Setting up event listeners...');

    client.on('connected', (connected: boolean) => {
      console.log('🔌 WebSocket connected event received:', connected);
      console.log('📡 Previous isConnected state:', isConnected);
      console.log('⏰ Event received at:', new Date().toLocaleTimeString());
      setIsConnected(connected);
      if (connected) {
        addActivityMessage('✅ Connected to Polymarket via AdonisJS Gateway');
      } else {
        addActivityMessage('❌ Disconnected from Gateway');
      }
      console.log('📡 New isConnected state will be:', connected);
    });

    console.log('💾 Setting wsClient state...');
    setWsClient(client);

    client.on('error', (error: any) => {
      const errorMsg = error.message || 'Unknown error';
      addActivityMessage(`Gateway error: ${errorMsg}`);
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

    return () => {
      client.close();
    };
  }, []);

  // Load markets after WebSocket client is set
  useEffect(() => {
    if (wsClient) {
      console.log('🚀 WebSocket client is ready, loading markets...');
      console.log('🔍 wsClient.getConnectionStatus():', wsClient.getConnectionStatus());
      console.log('🔍 Current isConnected state:', isConnected);
      loadInitialMarkets();
    }
  }, [wsClient]);

  const loadInitialMarkets = async () => {
    setIsSearching(true);
    try {
      addActivityMessage('Loading markets from Polymarket...');
      const initialMarkets = await fetchMarkets(50);
      setMarkets(initialMarkets);
      setIsSearching(false);

      if (initialMarkets.length > 0) {
        addActivityMessage(`✓ Loaded ${initialMarkets.length} tradable markets`);

        // Auto-select first market for demo (even if WebSocket is not connected)
        const firstMarket = initialMarkets[0];
        console.log('First market:', firstMarket);

        if (firstMarket && firstMarket.tokens && firstMarket.tokens.length > 0) {
          const firstToken = firstMarket.tokens[0];
          console.log('First token:', firstToken);

          if (firstToken && firstToken.token_id) {
            handleSelectMarket(firstMarket, firstToken.token_id);
            addActivityMessage(`Auto-selected: ${firstMarket.question.substring(0, 50)}...`);

            console.log('🔍 Checking WebSocket connection status...');
            console.log('📊 isConnected state:', isConnected);
            console.log('🔌 wsClient exists:', !!wsClient);
            console.log('🔗 wsClient.ws state:', wsClient?.ws?.readyState);

            // Check actual WebSocket state as fallback
            const actuallyConnected = wsClient?.getConnectionStatus() || false;
            console.log('🔍 Direct WebSocket check:', actuallyConnected);

            // Use the actual WebSocket state instead of React state to avoid Fast Refresh issues
            if (actuallyConnected) {
              addActivityMessage('✅ WebSocket connected - live data available');
              console.log('✅ WebSocket is connected, live data should be available');

              // Update React state if it's out of sync
              if (!isConnected) {
                console.log('🔄 Syncing React state with actual WebSocket state');
                setIsConnected(true);
              }
            } else {
              addActivityMessage('⚠️ WebSocket not connected - showing static market data only');
              console.log('⚠️ WebSocket not connected, showing static data');
            }
          } else {
            addActivityMessage('⚠ First market has invalid token data');
          }
        } else {
          addActivityMessage('⚠ No valid markets with tokens found');
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

      // Subscribe to market via WebSocket using token ID
      if (wsClient && tokenId) {
        if (wsClient.getConnectionStatus()) {
          wsClient.subscribeToMarket(tokenId);
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
      <div className="bg-black border-b border-green-500/30 px-4 py-2 font-mono text-sm text-green-400 overflow-hidden whitespace-nowrap">
        <div className="animate-marquee inline-block">
          {activityMessages.length > 0 ? (
            activityMessages.slice(-3).map((msg, idx) => (
              <span key={`ticker-${msg.slice(0, 15)}-${idx}`}>
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