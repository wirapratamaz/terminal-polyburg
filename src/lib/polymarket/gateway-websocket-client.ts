import {
  WebSocketMessage,
  BookMessage,
  PriceChangeMessage,
  TickerMessage,
  OrderBookState,
  SubscribeMessage,
  UnsubscribeMessage,
} from './types';

export class PolymarketGatewayWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private subscribedMarkets: Set<string> = new Set();
  private subscribedAssets: Set<string> = new Set();
  private orderBooks: Map<string, OrderBookState> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;

  // Connect to AdonisJS WebSocket Gateway instead of directly to Polymarket
  private readonly GATEWAY_WS_URL = 'ws://localhost:3334/ws/polymarket';

  constructor() {
    console.log('🔧 Creating Gateway WebSocket client...');
    // Auto-connect when instantiated
    this.connect();
  }

  /**
   * Connect to the AdonisJS WebSocket Gateway
   */
  private connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('Already connected to gateway');
      return;
    }

    console.log('🔌 Connecting to AdonisJS WebSocket Gateway...');
    console.log('   - Gateway URL:', this.GATEWAY_WS_URL);

    this.ws = new WebSocket(this.GATEWAY_WS_URL);

    this.ws.onopen = () => {
      console.log('✅ Connected to AdonisJS WebSocket Gateway');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', true);

      // Re-subscribe to any existing subscriptions
      this.resubscribeAll();
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
        console.error('❌ Error parsing gateway message:', error);
      }
    };

    this.ws.onclose = () => {
      console.warn('🔌 Disconnected from AdonisJS WebSocket Gateway');
      this.isConnected = false;
      this.emit('connected', false);

      // Attempt to reconnect
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('❌ Gateway WebSocket error:', error);
      this.emit('error', error);
    };
  }

  /**
   * Handle messages from the gateway
   */
  private handleMessage(message: any): void {
    console.debug('📨 Gateway message:', { type: message.type || 'unknown' });

    // Handle gateway status messages
    if (message.type === 'gateway_status') {
      console.log(`📡 Gateway status: connected=${message.connected}, clients=${message.clients}`);
      return;
    }

    // Handle Polymarket data messages
    const messageType = message.event || message.type || message.event_type;

    // Check if this looks like order book data (has bids/asks)
    if (message.bids || message.asks || message.market) {
      console.log('📊 Order book data received:', { market: message.market, asset_id: message.asset_id });
      this.handleBookMessage(message as BookMessage);
      return;
    }

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
        console.error('❌ Gateway error:', message.message);
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
   * Subscribe to market data
   */
  subscribeToMarket(marketId: string): void {
    if (!marketId) return;

    console.log('📊 Subscribing to market:', marketId);

    const subscribeMessage: SubscribeMessage = {
      type: 'subscribe',
      channel: 'market',
      market: marketId
    };

    this.sendMessage(subscribeMessage);
    this.subscribedMarkets.add(marketId);
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribeFromMarket(marketId: string): void {
    if (!marketId) return;

    console.log('📊 Unsubscribing from market:', marketId);

    const unsubscribeMessage: UnsubscribeMessage = {
      type: 'unsubscribe',
      channel: 'market',
      market: marketId
    };

    this.sendMessage(unsubscribeMessage);
    this.subscribedMarkets.delete(marketId);
    this.orderBooks.delete(marketId);
  }

  /**
   * Subscribe to asset/token data
   */
  subscribeToAsset(assetId: string): void {
    if (!assetId) return;

    console.log('🪙 Subscribing to asset:', assetId);

    const subscribeMessage: SubscribeMessage = {
      type: 'subscribe',
      channel: 'asset',
      asset: assetId
    };

    this.sendMessage(subscribeMessage);
    this.subscribedAssets.add(assetId);
  }

  /**
   * Unsubscribe from asset data
   */
  unsubscribeFromAsset(assetId: string): void {
    if (!assetId) return;

    console.log('🪙 Unsubscribing from asset:', assetId);

    const unsubscribeMessage: UnsubscribeMessage = {
      type: 'unsubscribe',
      channel: 'asset',
      asset: assetId
    };

    this.sendMessage(unsubscribeMessage);
    this.subscribedAssets.delete(assetId);
  }

  /**
   * Send message to the gateway
   */
  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Cannot send message: gateway not connected');
    }
  }

  /**
   * Re-subscribe to all existing subscriptions after reconnect
   */
  private resubscribeAll(): void {
    // Re-subscribe to markets
    this.subscribedMarkets.forEach(marketId => {
      this.subscribeToMarket(marketId);
    });

    // Re-subscribe to assets
    this.subscribedAssets.forEach(assetId => {
      this.subscribeToAsset(assetId);
    });
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
   * Get order book for a specific market
   */
  getOrderBook(marketId: string): OrderBookState | null {
    return this.orderBooks.get(marketId) || null;
  }

  /**
   * Get all subscribed markets
   */
  getSubscribedMarkets(): string[] {
    return Array.from(this.subscribedMarkets);
  }

  /**
   * Get all subscribed assets
   */
  getSubscribedAssets(): string[] {
    return Array.from(this.subscribedAssets);
  }

  /**
   * Close the WebSocket connection
   */
  close(): void {
    console.log('🔌 Closing gateway WebSocket connection');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}