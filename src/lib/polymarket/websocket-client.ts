import {
  WebSocketMessage,
  BookMessage,
  PriceChangeMessage,
  TickerMessage,
  OrderBookState,
  SubscribeMessage,
  UnsubscribeMessage,
} from './types';

export class PolymarketWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribedMarkets: Set<string> = new Set();
  private orderBooks: Map<string, OrderBookState> = new Map();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private readonly WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      this.ws = new WebSocket(this.WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket connected to Polymarket CLOB');
        this.reconnectAttempts = 0;
        this.emit('connected', true);

        // Resubscribe to markets after reconnection
        if (this.subscribedMarkets.size > 0) {
          const markets = Array.from(this.subscribedMarkets);
          this.subscribeToMarkets(markets);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.emit('connected', false);
        this.reconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.reconnect();
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

  private handleMessage(message: WebSocketMessage) {
    switch (message.event_type) {
      case 'book':
        this.handleBookMessage(message as BookMessage);
        break;
      case 'price_change':
        this.handlePriceChangeMessage(message as PriceChangeMessage);
        break;
      case 'last_trade_price':
        this.handleTickerMessage(message as TickerMessage);
        break;
      default:
        console.log('Unknown message type:', message);
    }
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Markets will be subscribed on connection.');
      markets.forEach(m => this.subscribedMarkets.add(m));
      return;
    }

    const message: SubscribeMessage = {
      type: 'subscribe',
      channel: 'market',
      markets: markets,
    };

    this.ws.send(JSON.stringify(message));
    markets.forEach(market => this.subscribedMarkets.add(market));
    console.log('Subscribed to markets:', markets);
  }

  public unsubscribeFromMarkets(markets: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected');
      return;
    }

    const message: UnsubscribeMessage = {
      type: 'unsubscribe',
      channel: 'market',
      markets: markets,
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
    this.subscribedMarkets.clear();
    this.orderBooks.clear();
    this.listeners.clear();
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}