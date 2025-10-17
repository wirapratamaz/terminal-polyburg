import {
  WebSocketMessage,
  BookMessage,
  PriceChangeMessage,
  TickerMessage,
  OrderBookState,
  SubscribeMessage,
  UnsubscribeMessage,
} from './types';
import { config } from '../config';

export class PolymarketWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = config.websocket.reconnectAttempts;
  private reconnectDelay = config.websocket.reconnectDelay;
  private subscribedMarkets: Set<string> = new Set();
  private subscribedAssets: Set<string> = new Set();
  private orderBooks: Map<string, OrderBookState> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isAuthenticated = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private readonly WS_URL = config.websocket.url;
  private readonly API_KEY = config.auth.apiKey;
  private readonly API_SECRET = config.auth.apiSecret;
  private readonly PASSPHRASE = config.auth.passphrase;

  constructor() {
    // Validate credentials before connecting
    if (!this.API_KEY || !this.API_SECRET || !this.PASSPHRASE) {
      console.warn('⚠️  Missing Polymarket WebSocket credentials:');
      console.warn('   - NEXT_PUBLIC_POLYMARKET_API_KEY:', this.API_KEY ? '✓' : '✗ Missing');
      console.warn('   - POLYMARKET_API_SECRET:', this.API_SECRET ? '✓' : '✗ Missing');
      console.warn('   - POLYMARKET_PASSPHRASE:', this.PASSPHRASE ? '✓' : '✗ Missing');
      console.warn('   WebSocket connection will fail without these credentials');
      console.warn('   Add them to your .env.local file');
    }

    this.connect();
  }

  private connect() {
    try {
      // Use Polymarket CLOB WebSocket URL for real-time data
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket connected to Polymarket CLOB');
        this.reconnectAttempts = 0;
        this.authenticate();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket connection error:', error);

        // Provide specific guidance for common errors
        if (error instanceof ErrorEvent) {
          if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            console.error('🔐 Authentication failed - Check API credentials');
            this.emit('error', {
              code: 'UNAUTHORIZED',
              message: 'Invalid API credentials. Check POLYMARKET_API_SECRET and POLYMARKET_PASSPHRASE in .env.local'
            });
          } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            console.error('🚫 Access forbidden - API key may be invalid or expired');
            this.emit('error', {
              code: 'FORBIDDEN',
              message: 'API key access denied. Verify the API key is valid and active.'
            });
          } else {
            this.emit('error', {
              code: 'CONNECTION_ERROR',
              message: `WebSocket connection failed: ${error.message}`
            });
          }
        } else {
          this.emit('error', {
            code: 'UNKNOWN_ERROR',
            message: 'Unknown WebSocket error occurred'
          });
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isAuthenticated = false;
        this.stopHeartbeat();
        this.emit('connected', false);
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
    }
  }

  private authenticate() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not open for authentication');
      return;
    }

    // Check if we have all required credentials
    if (!this.API_KEY || !this.API_SECRET || !this.PASSPHRASE) {
      console.warn('⚠️ Missing WebSocket credentials - skipping authentication');
      this.emit('error', {
        code: 'MISSING_CREDENTIALS',
        message: 'Missing POLYMARKET_API_SECRET or POLYMARKET_PASSPHRASE in .env.local'
      });
      return;
    }

    const authMessage = {
      auth: {
        key: this.API_KEY,
        secret: this.API_SECRET,
        passphrase: this.PASSPHRASE
      },
      assets_ids: [], // Will be populated when markets are selected
      type: "MARKET"
    };

    this.ws.send(JSON.stringify(authMessage));
    console.log(`WebSocket authentication sent with API key: ${this.API_KEY.substring(0, 10)}...`);
    console.log('Authentication message:', JSON.stringify(authMessage, null, 2));
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached', true);
    }
  }

  private handleMessage(message: any) {
    console.log('Received WebSocket message:', message);

    // Handle authentication response
    if (message.type === 'subscription') {
      this.handleSubscriptionResponse(message);
      return;
    }

    // Handle error messages
    if (message.type === 'error') {
      this.handleErrorMessage(message);
      return;
    }

    // Handle heartbeat responses
    if (message.type === 'pong') {
      console.log('Heartbeat received');
      return;
    }

    // Handle real-time data messages
    switch (message.type) {
      case 'book':
        this.handleBookMessage(message);
        break;
      case 'market':
        this.handleMarketMessage(message);
        break;
      case 'order':
        this.handleOrderMessage(message);
        break;
      case 'trade':
        this.handleTradeMessage(message);
        break;
      case 'status':
        this.handleStatusMessage(message);
        break;
      default:
        console.log('Unknown message type:', message.type, message);
    }
  }

  private handleSubscriptionResponse(message: any) {
    // Handle different response formats
    if (message.data) {
      const { channel, status, timestamp } = message.data;
      console.log(`Subscription confirmed: ${channel} - ${status}`);

      if (status === 'subscribed') {
        if (!this.isAuthenticated) {
          this.isAuthenticated = true;
          this.emit('connected', true);
          this.startHeartbeat();
        }
      }
    } else if (message.success === true || message.status === 'success') {
      // Alternative response format
      console.log('Authentication/Subscription successful');
      if (!this.isAuthenticated) {
        this.isAuthenticated = true;
        this.emit('connected', true);
        this.startHeartbeat();
      }
    }
  }

  private handleErrorMessage(message: any) {
    const { code, message: errorMessage, timestamp } = message.data;
    console.error(`Server error [${code}]: ${errorMessage}`);
    this.emit('error', { code, message: errorMessage, timestamp });

    if (code === 'UNAUTHORIZED') {
      this.isAuthenticated = false;
      this.emit('connected', false);
    }
  }

  private handleMarketMessage(message: any) {
    const data = message.data;
    const key = `${data.market}-${data.asset_id}`;

    // Update order book with market data
    const orderBook: OrderBookState = {
      market: data.market,
      asset_id: data.asset_id,
      bids: [{ price: data.bid, size: data.volume || "0" }],
      asks: [{ price: data.ask, size: data.volume || "0" }],
      timestamp: data.timestamp,
      lastTradePrice: data.last,
      lastTradeSide: undefined,
    };

    this.orderBooks.set(key, orderBook);
    this.emit('book', orderBook);
    this.emit(`book:${key}`, orderBook);
  }

  private handleOrderMessage(message: any) {
    const data = message.data;
    console.log('Order update:', data);
    this.emit('order', data);
  }

  private handleTradeMessage(message: any) {
    const data = message.data;
    console.log('Trade update:', data);
    this.emit('trade', data);
  }

  private handleStatusMessage(message: any) {
    const data = message.data;
    console.log('Status update:', data);
    this.emit('status', data);
  }

  private handleBookMessage(message: BookMessage) {
    const key = `${message.market}-${message.asset_id}`;
    const orderBook: OrderBookState = {
      market: message.market,
      asset_id: message.asset_id,
      bids: message.bids,
      asks: message.asks,
      timestamp: message.timestamp,
    };

    this.orderBooks.set(key, orderBook);
    this.emit('book', orderBook);
    this.emit(`book:${key}`, orderBook);
  }

  private handlePriceChangeMessage(message: PriceChangeMessage) {
    const key = `${message.market}-${message.asset_id}`;
    const currentBook = this.orderBooks.get(key);

    if (currentBook) {
      // Update the order book with the price change
      if (message.side === 'BUY') {
        // Update or add bid
        const existingBidIndex = currentBook.bids.findIndex(b => b.price === message.price);
        if (existingBidIndex >= 0) {
          if (parseFloat(message.size) === 0) {
            currentBook.bids.splice(existingBidIndex, 1);
          } else {
            currentBook.bids[existingBidIndex].size = message.size;
          }
        } else if (parseFloat(message.size) > 0) {
          currentBook.bids.push({ price: message.price, size: message.size });
          currentBook.bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        }
      } else {
        // Update or add ask
        const existingAskIndex = currentBook.asks.findIndex(a => a.price === message.price);
        if (existingAskIndex >= 0) {
          if (parseFloat(message.size) === 0) {
            currentBook.asks.splice(existingAskIndex, 1);
          } else {
            currentBook.asks[existingAskIndex].size = message.size;
          }
        } else if (parseFloat(message.size) > 0) {
          currentBook.asks.push({ price: message.price, size: message.size });
          currentBook.asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        }
      }

      currentBook.timestamp = message.timestamp;
      this.orderBooks.set(key, currentBook);
      this.emit('book', currentBook);
      this.emit(`book:${key}`, currentBook);
    }

    this.emit('priceChange', message);
  }

  private handleTickerMessage(message: TickerMessage) {
    const key = `${message.market}-${message.asset_id}`;
    const currentBook = this.orderBooks.get(key);

    if (currentBook) {
      currentBook.lastTradePrice = message.price;
      currentBook.lastTradeSide = message.side;
      this.orderBooks.set(key, currentBook);
    }

    this.emit('ticker', message);
    this.emit(`ticker:${key}`, message);
  }

  public subscribeToMarkets(markets: string[]) {
    if (!this.API_KEY || !this.API_SECRET || !this.PASSPHRASE) {
      console.warn('⚠️ Cannot subscribe to markets: missing WebSocket credentials');
      this.emit('error', {
        code: 'MISSING_CREDENTIALS',
        message: 'Add POLYMARKET_API_SECRET and POLYMARKET_PASSPHRASE to .env.local for live data'
      });
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Markets will be subscribed on connection.');
      markets.forEach(m => this.subscribedMarkets.add(m));
      return;
    }

    if (!this.isAuthenticated) {
      console.warn('WebSocket is not authenticated. Markets will be subscribed after authentication.');
      markets.forEach(m => this.subscribedMarkets.add(m));
      return;
    }

    // Subscribe to specific token IDs (asset_ids) for market data
    const message = {
      auth: {
        key: this.API_KEY,
        secret: this.API_SECRET,
        passphrase: this.PASSPHRASE
      },
      assets_ids: markets, // These should be token IDs
      type: "MARKET"
    };

    this.ws.send(JSON.stringify(message));
    markets.forEach(market => this.subscribedMarkets.add(market));
    console.log('Subscribed to markets (token IDs):', markets);
  }

  public subscribeToAssets(assetIds: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Assets will be subscribed on connection.');
      assetIds.forEach(a => this.subscribedAssets.add(a));
      return;
    }

    if (!this.isAuthenticated) {
      console.warn('WebSocket is not authenticated. Assets will be subscribed after authentication.');
      assetIds.forEach(a => this.subscribedAssets.add(a));
      return;
    }

    const message = {
      auth: {
        key: this.API_KEY,
        secret: this.API_SECRET,
        passphrase: this.PASSPHRASE
      },
      type: 'MARKET',
      asset_ids: assetIds
    };

    this.ws.send(JSON.stringify(message));
    assetIds.forEach(assetId => this.subscribedAssets.add(assetId));
    console.log('Subscribed to assets:', assetIds);
  }

  public subscribeToUserChannel(markets: string[] = []) {
    if (!this.API_KEY || !this.API_SECRET || !this.PASSPHRASE) {
      console.warn('⚠️ Cannot subscribe to user channel: missing WebSocket credentials');
      this.emit('error', {
        code: 'MISSING_CREDENTIALS',
        message: 'Add POLYMARKET_API_SECRET and POLYMARKET_PASSPHRASE to .env.local for live data'
      });
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message = {
      auth: {
        key: this.API_KEY,
        secret: this.API_SECRET,
        passphrase: this.PASSPHRASE
      },
      type: 'USER',
      markets: markets.length > 0 ? markets : Array.from(this.subscribedMarkets)
    };

    this.ws.send(JSON.stringify(message));
    console.log('Subscribed to USER channel with markets:', message.markets);
    console.log('User subscription message:', JSON.stringify(message, null, 2));
  }

  public unsubscribeFromMarkets(markets: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message = {
      type: 'unsubscribe',
      channel: 'market',
      markets: markets
    };

    this.ws.send(JSON.stringify(message));
    markets.forEach(market => this.subscribedMarkets.delete(market));
    console.log('Unsubscribed from markets:', markets);
  }

  public getOrderBook(market: string, assetId: string): OrderBookState | undefined {
    const key = `${market}-${assetId}`;
    return this.orderBooks.get(key);
  }

  public on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.subscribedMarkets.clear();
    this.subscribedAssets.clear();
    this.orderBooks.clear();
    this.listeners.clear();
  }

  
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}