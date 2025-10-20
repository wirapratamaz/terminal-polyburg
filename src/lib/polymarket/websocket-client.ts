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
// Conditionally import clob-auth to avoid wallet.js browser issues
let initializePolymarketAuth: any = null;
if (typeof window === 'undefined') {
  // Only import on server-side to avoid browser wallet.js issues
  try {
    initializePolymarketAuth = require('./clob-auth').initializePolymarketAuth;
  } catch (e) {
    console.log('⚠️ CLOB auth import failed, skipping private key derivation');
  }
}


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

  private readonly WS_URL = config.websocket.url;
  private API_KEY = config.auth.apiKey;
  private API_SECRET = config.auth.apiSecret;
  private PASSPHRASE = config.auth.passphrase;
  private isInitializing = false;

  constructor() {
    this.initializeCredentials();
  }

  private async initializeCredentials() {
    this.isInitializing = true;

    // Check if we have static credentials first
    const hasStaticCredentials = !!(this.API_KEY && this.API_SECRET && this.PASSPHRASE);
    const hasPrivateKey = !!config.auth.privateKey;
    const isUsingDemoCredentials = this.API_SECRET?.includes('demo-sec') || this.PASSPHRASE?.includes('demo-pas');

    console.log('🔐 WebSocket Constructor - Credential Debug:');
    console.log('   - Has static credentials:', hasStaticCredentials);
    console.log('   - Has private key:', hasPrivateKey);
    console.log('   - Using demo credentials:', isUsingDemoCredentials);
    console.log('   - Private key preview:', config.auth.privateKey ? `${config.auth.privateKey.substring(0, 10)}...` : 'undefined');

    // If we have a private key and are using demo credentials, try to derive real ones
    if (hasPrivateKey && (isUsingDemoCredentials || !hasStaticCredentials) && initializePolymarketAuth) {
      try {
        console.log('🔄 Attempting to derive API credentials from private key...');
        const derivedCreds = await initializePolymarketAuth(config.auth.privateKey);

        // Check if derivation actually returned valid credentials
        if (derivedCreds.apiKey && derivedCreds.secret && derivedCreds.passphrase) {
          // Update instance credentials
          this.API_KEY = derivedCreds.apiKey;
          this.API_SECRET = derivedCreds.secret;
          this.PASSPHRASE = derivedCreds.passphrase;

          // Store in config for other components
          config.auth.derivedCredentials = derivedCreds;

          console.log('✅ Successfully derived credentials from private key:');
          console.log('   - API Key preview:', `${derivedCreds.apiKey.substring(0, 15)}...`);
          console.log('   - Secret preview:', `${derivedCreds.secret.substring(0, 8)}...`);
          console.log('   - Passphrase preview:', `${derivedCreds.passphrase.substring(0, 8)}...`);
          console.log('   - Wallet address:', derivedCreds.walletAddress);
        } else {
          console.log('⚠️ Private key derivation returned empty credentials, keeping static credentials');
        }

      } catch (error) {
        console.error('❌ Failed to derive credentials from private key:', error);
        console.log('⚠️ Falling back to static credentials from environment');
      }
    } else if (hasPrivateKey && !initializePolymarketAuth) {
      console.log('⚠️ CLOB auth not available in browser, using static credentials');
    }

    // Validate final credentials
    const hasCredentials = !!(this.API_KEY && this.API_SECRET && this.PASSPHRASE);

    console.log('   - Final API_KEY length:', this.API_KEY?.length || 0);
    console.log('   - Final API_KEY preview:', this.API_KEY ? `${this.API_KEY.substring(0, 15)}...` : 'undefined');
    console.log('   - Final API_SECRET length:', this.API_SECRET?.length || 0);
    console.log('   - Final API_SECRET preview:', this.API_SECRET ? `${this.API_SECRET.substring(0, 8)}...` : 'undefined');
    console.log('   - Final PASSPHRASE length:', this.PASSPHRASE?.length || 0);
    console.log('   - Final PASSPHRASE preview:', this.PASSPHRASE ? `${this.PASSPHRASE.substring(0, 8)}...` : 'undefined');
    console.log('   - Final hasCredentials:', hasCredentials);

    if (!hasCredentials) {
      console.warn('⚠️  Missing credentials detected:');
      console.warn('   - API_KEY:', this.API_KEY ? '✓' : '✗ Missing');
      console.warn('   - API_SECRET:', this.API_SECRET ? '✓' : '✗ Missing');
      console.warn('   - PASSPHRASE:', this.PASSPHRASE ? '✓' : '✗ Missing');
      console.warn('   Will skip user channel authentication');
    } else {
      console.log('✅ WebSocket credentials configured');
    }

    this.isInitializing = false;
    this.connect();
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private connect() {
    try {
      // Use Polymarket CLOB WebSocket URL for real-time data
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('🔗 WebSocket connected to Polymarket CLOB');
        console.log('📡 WebSocket readyState:', this.ws?.readyState);
        this.reconnectAttempts = 0;

        // Delay the event emission to ensure React component is ready
        setTimeout(() => {
          console.log('🎯 About to emit connected event: true (delayed)');
          console.log('⏰ Emitting at:', new Date().toLocaleTimeString());
          console.log('📊 Event emitter _events:', Object.keys(this._events || {}));
          console.log('👂 Connected listeners:', this._events?.connected?.length || 0);
          this.emit('connected', true);
          console.log('✅ Connected event emitted successfully');
        }, 100);

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
        console.log('❌ WebSocket disconnected');
        console.log('📡 WebSocket readyState:', this.ws?.readyState);
        console.log('🎯 Emitting connected event: false');
        this.isAuthenticated = false;
        this.emit('connected', false);
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
    }
  }

  private authenticate() {
    console.log('🔐 authenticate() called');
    console.log('   - WebSocket state:', this.ws?.readyState);
    console.log('   - WebSocket.OPEN constant:', WebSocket.OPEN);

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket is not open for authentication');
      console.error('   - ws exists:', !!this.ws);
      console.error('   - readyState:', this.ws?.readyState);
      return;
    }

    // Check if we have all required credentials (same logic as AdonisJS)
    const hasValidCredentials = !!(this.API_KEY && this.API_SECRET && this.PASSPHRASE);

    console.log('🔐 Authentication credential check:');
    console.log('   - API_KEY exists:', !!this.API_KEY);
    console.log('   - API_SECRET exists:', !!this.API_SECRET);
    console.log('   - PASSPHRASE exists:', !!this.PASSPHRASE);
    console.log('   - hasValidCredentials:', hasValidCredentials);

    if (!hasValidCredentials) {
      console.warn('⚠️ Missing credentials - skipping authentication');
      console.warn('   Market data will still be available without authentication');
      // Don't emit error for missing credentials - just skip authentication
      return;
    }

    // According to our working implementation, authentication happens during subscription
    console.log('🔐 WebSocket connected - ready for market subscriptions');
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
    console.log('📨 Received WebSocket message:');
    console.log('   - Type:', message.type);
    console.log('   - Full message:', message);

    // Handle authentication response
    if (message.type === 'subscription') {
      console.log('🔐 Handling subscription response...');
      this.handleSubscriptionResponse(message);
      return;
    }

    // Handle error messages
    if (message.type === 'error') {
      console.log('❌ Handling error message...');
      this.handleErrorMessage(message);
      return;
    }


    // Handle authentication success messages
    if (message.type === 'auth' || message.type === 'authenticated') {
      console.log('🔐 Authentication response received:', message);
      this.isAuthenticated = true;
      this.emit('connected', true);
      return;
    }

    // Handle real-time data messages
    switch (message.type) {
      case 'book':
        console.log('📖 Handling book message...');
        this.handleBookMessage(message);
        break;
      case 'market':
        console.log('📊 Handling market message...');
        this.handleMarketMessage(message);
        break;
      case 'order':
        console.log('📋 Handling order message...');
        this.handleOrderMessage(message);
        break;
      case 'trade':
        console.log('💰 Handling trade message...');
        this.handleTradeMessage(message);
        break;
      case 'status':
        console.log('ℹ️ Handling status message...');
        this.handleStatusMessage(message);
        break;
      default:
        console.log('❓ Unknown message type:', message.type);
        console.log('   - Full unknown message:', message);
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
        }
      }
    } else if (message.success === true || message.status === 'success') {
      // Alternative response format
      console.log('Authentication/Subscription successful');
      if (!this.isAuthenticated) {
        this.isAuthenticated = true;
        this.emit('connected', true);
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
    console.log('📊 subscribeToMarkets() called with:', markets);

    const hasValidCredentials = !!(this.API_KEY && this.API_SECRET && this.PASSPHRASE);
    console.log('🔐 Subscription credential check:');
    console.log('   - hasValidCredentials:', hasValidCredentials);
    console.log('   - WebSocket connected:', this.ws?.readyState === WebSocket.OPEN);
    console.log('   - isAuthenticated flag:', this.isAuthenticated);

    if (!hasValidCredentials) {
      console.warn('⚠️ Cannot subscribe to markets: missing credentials');
      console.warn('   Market data subscriptions require API credentials');
      console.warn('   - API_KEY:', this.API_KEY ? 'exists' : 'missing');
      console.warn('   - API_SECRET:', this.API_SECRET ? 'exists' : 'missing');
      console.warn('   - PASSPHRASE:', this.PASSPHRASE ? 'exists' : 'missing');
      // Don't emit error for missing credentials - just skip subscription
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket is not connected. Markets will be subscribed on connection.');
      console.warn('   - ws exists:', !!this.ws);
      console.warn('   - readyState:', this.ws?.readyState);
      markets.forEach(m => this.subscribedMarkets.add(m));
      return;
    }

    if (!this.isAuthenticated) {
      console.warn('⚠️ WebSocket is not authenticated. Attempting authentication first...');
      console.warn('   - Current isAuthenticated:', this.isAuthenticated);

      // Try to authenticate immediately by sending auth message
      console.log('🔄 Attempting immediate authentication for subscription...');

      const authMessage = {
        auth: {
          key: this.API_KEY,
          secret: this.API_SECRET,
          passphrase: this.PASSPHRASE
        },
        asset_ids: markets,
        type: "MARKET"
      };

      console.log('📤 Sending auth + subscription message:');
      console.log('   - Markets (asset_ids):', markets);
      console.log('   - Auth key preview:', this.API_KEY.substring(0, 15) + '...');
      console.log('   - Message structure:', {
        auth: {
          key: this.API_KEY ? `${this.API_KEY.substring(0, 15)}...` : 'missing',
          secret: this.API_SECRET ? `${this.API_SECRET.substring(0, 8)}...` : 'missing',
          passphrase: this.PASSPHRASE ? `${this.PASSPHRASE.substring(0, 8)}...` : 'missing'
        },
        asset_ids: authMessage.asset_ids,
        type: authMessage.type
      });

      this.ws.send(JSON.stringify(authMessage));
      markets.forEach(market => this.subscribedMarkets.add(market));
      console.log('✅ Auth + subscription message sent for:', markets);
      return;
    }

    // Subscribe to specific token IDs with authentication
    const message = {
      auth: {
        key: this.API_KEY,
        secret: this.API_SECRET,
        passphrase: this.PASSPHRASE
      },
      asset_ids: markets,
      type: "MARKET"
    };

    console.log('📤 Sending market subscription:');
    console.log('   - Markets (asset_ids):', markets);
    console.log('   - Auth key preview:', this.API_KEY.substring(0, 15) + '...');

    this.ws.send(JSON.stringify(message));
    markets.forEach(market => this.subscribedMarkets.add(market));
    console.log('✅ Market subscription sent for:', markets);
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
    const hasValidCredentials = !!(this.API_KEY && this.API_SECRET && this.PASSPHRASE);

    if (!hasValidCredentials) {
      console.warn('⚠️ Cannot subscribe to user channel: missing credentials');
      console.warn('   User channel requires API credentials');
      // Don't emit error for missing credentials - just skip subscription
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

  
}