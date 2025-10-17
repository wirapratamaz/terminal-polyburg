// Polymarket CLOB WebSocket Types

export interface OrderBookLevel {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  hash?: string;
}

export interface PriceChangeMessage {
  event_type: 'price_change';
  market: string;
  asset_id: string;
  price: string;
  side: 'BUY' | 'SELL';
  size: string;
  timestamp: number;
}

export interface BookMessage {
  event_type: 'book';
  market: string;
  asset_id: string;
  hash: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
}

export interface LastTradePrice {
  market: string;
  asset_id: string;
  price: string;
  side: 'BUY' | 'SELL';
  size: string;
  timestamp: number;
}

export interface TickerMessage {
  event_type: 'last_trade_price';
  market: string;
  asset_id: string;
  price: string;
  side: 'BUY' | 'SELL';
  size: string;
  timestamp: number;
}

export type WebSocketMessage = BookMessage | PriceChangeMessage | TickerMessage;

export interface SubscribeMessage {
  type: 'subscribe';
  channel: string;
  markets?: string[];
  assets_ids?: string[];
}

export interface UnsubscribeMessage {
  type: 'unsubscribe';
  channel: string;
  markets?: string[];
  assets_ids?: string[];
}

export interface Market {
  condition_id: string;
  question_id: string;
  question: string;
  description: string;
  market_slug: string;
  end_date_iso: string;
  game_start_time?: string;
  tokens: Token[];
  rewards?: {
    event_start_date?: string;
    event_end_date?: string;
    min_size?: string;
    max_spread?: string;
  };
  active: boolean;
  closed: boolean;
  archived: boolean;
  volume: string;
  volume_24hr: string;
  // Additional fields from API
  clobTokenIds?: string[];
  outcomePrices?: string[];
  outcomes?: string[];
}

export interface Token {
  token_id: string;
  outcome: string;
  price?: string;
  winner?: boolean;
}

export interface OrderBookState {
  market: string;
  asset_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  lastTradePrice?: string;
  lastTradeSide?: 'BUY' | 'SELL';
}