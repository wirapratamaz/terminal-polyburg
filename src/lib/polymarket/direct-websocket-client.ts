import {
  WebSocketMessage,
  BookMessage,
  PriceChangeMessage,
  TickerMessage,
  OrderBookState,
} from './types';

export class PolymarketDirectWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isConnected = false;
  private isPolymarketConnected = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private orderBooks: Map<string, OrderBookState> = new Map();
  private subscribedAssets: Set<string> = new Set();

  // Polymarket WebSocket configuration
  private readonly POLYMARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

  // Asset IDs from environment or defaults
  private readonly DEFAULT_ASSET_IDS = [
    '60487116984468020978247225474488676749601001829886755968952521846780452448915',
    '81104637750588840860328515305303028259865221573278091453716127842023614249200'
  ];

  constructor() {
    console.log('🔧 Creating Direct Polymarket WebSocket client...');
    // Don't auto-connect immediately - wait for markets to load first
  }

  /**
   * Connect directly to Polymarket WebSocket
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected to Polymarket');
      return;
    }

    console.log('🔌 Connecting directly to Polymarket WebSocket...');
    console.log('   - WebSocket URL:', this.POLYMARKET_WS_URL);

    this.ws = new WebSocket(this.POLYMARKET_WS_URL);

    this.ws.onopen = () => {
      console.log('✅ Connected directly to Polymarket WebSocket');
      this.isConnected = true;
      this.isPolymarketConnected = true;
      this.reconnectAttempts = 0;

      this.emit('connected', true);
      this.emit('polymarket_status', true);

      // Authenticate and subscribe to market data
      this.authenticateWithPolymarket();
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        // Handle array of messages (Polymarket sends arrays)
        if (Array.isArray(parsed)) {
          parsed.forEach(message => this.handleMessage(message));
        } else {
          this.handleMessage(parsed);
        }
      } catch (error) {
        console.error('❌ Error parsing Polymarket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.warn('🔌 Disconnected from Polymarket WebSocket');
      this.isConnected = false;
      this.isPolymarketConnected = false;
      this.emit('connected', false);
      this.emit('polymarket_status', false);

      // Attempt to reconnect
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('❌ Polymarket WebSocket error:', error);
      this.emit('error', error);
      this.isConnected = false;
      this.isPolymarketConnected = false;
    };
  }

  /**
   * Authenticate and subscribe to Polymarket market channel
   */
  private authenticateWithPolymarket(): void {
    // For market channel, we don't need authentication, just subscribe with asset_ids
    // Get asset IDs from environment or use defaults
    const assetIdsEnv = process.env.NEXT_PUBLIC_POLYMARKET_ASSET_IDS;
    let assetIds = assetIdsEnv ? assetIdsEnv.split(',').filter(Boolean) : [];

    if (assetIds.length === 0) {
      console.warn('⚠️ No asset IDs configured, using default');
      assetIds = [...this.DEFAULT_ASSET_IDS];
    }

    // Subscribe to market channel with asset IDs
    const subscribeMessage = {
      assets_ids: assetIds,
      type: 'market'
    };

    console.log('🔐 Subscribing to Polymarket market channel with asset IDs:', assetIds);
    this.sendMessage(subscribeMessage);

    // Track subscribed assets
    assetIds.forEach(id => this.subscribedAssets.add(id));
  }

  /**
   * Handle messages from Polymarket
   */
  private handleMessage(message: any): void {
    console.debug('📨 Polymarket message:', { type: message.type || 'unknown' });

    // Check if this looks like order book data (has bids/asks)
    if (message.bids || message.asks || message.market) {
      console.log('📊 Order book data received:', { market: message.market, asset_id: message.asset_id });
      this.handleBookMessage(message as BookMessage);
      return;
    }

    const messageType = message.event || message.type || message.event_type;

    switch (messageType) {
      case 'book':
        this.handleBookMessage(message as BookMessage);
        break;
      case 'price_change':
        this.handlePriceChangeMessage(message as PriceChangeMessage);
        break;
      case 'ticker':
        this.handleTickerMessage(message as TickerMessage);
        break;
      case 'error':
        console.error('❌ Polymarket error:', message.message);
        this.emit('error', new Error(message.message));
        break;
      default:
        console.debug('📨 Unhandled message type:', messageType, 'keys:', Object.keys(message));
    }
  }

  /**
   * Handle book messages (order book updates)
   */
  private handleBookMessage(message: BookMessage): void {
    const marketId = message.market;
    if (!marketId) return;

    // Create order book state with all available data
    const orderBook = {
      market: marketId,
      asset_id: message.asset_id,
      bids: message.bids || [],
      asks: message.asks || [],
      timestamp: Date.now()
    };

    this.orderBooks.set(marketId, orderBook);

    // Emit the order book data to the terminal
    this.emit('book', orderBook);
  }

  /**
   * Handle price change messages
   */
  private handlePriceChangeMessage(message: PriceChangeMessage): void {
    this.emit('price_change', message);
  }

  /**
   * Handle ticker messages
   */
  private handleTickerMessage(message: TickerMessage): void {
    this.emit('ticker', message);
  }

  /**
   * Subscribe to market data for a specific asset/token
   */
  subscribeToMarket(assetId: string): void {
    if (!assetId) return;

    console.log('📊 Subscribing to market asset:', assetId);

    // Add to subscribed assets
    this.subscribedAssets.add(assetId);

    // For the market channel, we typically subscribe to all assets at once
    // but we can track individual subscriptions for UI purposes
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarket(assetId: string): void {
    if (!assetId) return;

    console.log('📊 Unsubscribing from market asset:', assetId);
    this.subscribedAssets.delete(assetId);
    this.orderBooks.delete(assetId);
  }

  /**
   * Send message to Polymarket
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Cannot send message: not connected to Polymarket');
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Event emitter functionality
   */
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get Polymarket connection status
   */
  getPolymarketStatus(): boolean {
    return this.isPolymarketConnected;
  }

  /**
   * Get order book for a specific market
   */
  getOrderBook(marketId: string): OrderBookState | null {
    return this.orderBooks.get(marketId) || null;
  }

  /**
   * Get all subscribed assets
   */
  getSubscribedAssets(): string[] {
    return Array.from(this.subscribedAssets);
  }

  /**
   * Disconnect from Polymarket
   */
  disconnect(): void {
    console.log('🔌 Disconnecting from Polymarket WebSocket');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isPolymarketConnected = false;
    this.emit('connected', false);
    this.emit('polymarket_status', false);
  }

  /**
   * Close the WebSocket connection (alias for disconnect)
   */
  close(): void {
    this.disconnect();
  }
}