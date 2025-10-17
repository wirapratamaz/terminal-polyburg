# Polymarket CLOB WebSocket Sample Responses

This document provides sample JSON responses that you can expect to receive from the Polymarket CLOB WebSocket API when using the `poly-analytics-46ddf7f79a1f21381c4030e06a7dc9d4` API key.

## Table of Contents

- [Subscription Confirmation](#subscription-confirmation)
- [Order Updates (USER Channel)](#order-updates-user-channel)
- [Trade Updates (USER Channel)](#trade-updates-user-channel)
- [Market Updates (MARKET Channel)](#market-updates-market-channel)
- [Order Book Updates](#order-book-updates)
- [Error Responses](#error-responses)
- [Heartbeat/Ping Responses](#heartbeatping-responses)
- [Market Status Updates](#market-status-updates)
- [Message Processing](#message-processing)
- [Real-Time Data Flow](#real-time-data-flow)

## Subscription Confirmation

When you successfully subscribe to a channel, you'll receive a confirmation message:

```json
{
  "type": "subscription",
  "data": {
    "channel": "user",
    "status": "subscribed",
    "timestamp": "2024-10-17T01:53:00.000Z"
  }
}
```

## Order Updates (USER Channel)

Order updates are sent when orders are created, modified, or cancelled:

```json
{
  "type": "order",
  "data": {
    "id": "0x1234567890abcdef1234567890abcdef12345678",
    "market": "0x90e9b437b5bf6b4f38c7c8b9f8e7d6c5b4a39e8d",
    "user": "0xabcdef1234567890abcdef1234567890abcdef12",
    "side": "BUY",
    "size": "100.0",
    "price": "0.65",
    "status": "OPEN",
    "timestamp": "2024-10-17T01:53:15.123Z",
    "expiration": "2024-10-24T01:53:15.123Z",
    "fee": "0.25",
    "asset_id": "16678291189211314787145083999015737376658799626183230671758641503291735614088"
  }
}
```

### Order Status Values
- `OPEN` - Order is active and waiting to be filled
- `FILLED` - Order has been completely executed
- `CANCELLED` - Order has been cancelled by user or system
- `PARTIALLY_FILLED` - Order has been partially executed

### Order Side Values
- `BUY` - Buy order (betting YES)
- `SELL` - Sell order (betting NO)

## Trade Updates (USER Channel)

Trade updates are sent when your orders are executed:

```json
{
  "type": "trade",
  "data": {
    "id": "0xfedcba0987654321fedcba0987654321fedcba09",
    "market": "0x90e9b437b5bf6b4f38c7c8b9f8e7d6c5b4a39e8d",
    "user": "0xabcdef1234567890abcdef1234567890abcdef12",
    "side": "SELL",
    "size": "50.0",
    "price": "0.72",
    "timestamp": "2024-10-17T01:53:45.456Z",
    "fee": "0.15",
    "order_id": "0x1234567890abcdef1234567890abcdef12345678",
    "asset_id": "16678291189211314787145083999015737376658799626183230671758641503291735614088"
  }
}
```

## Market Updates (MARKET Channel)

Market data updates provide real-time pricing and volume information:

```json
{
  "type": "market",
  "data": {
    "market": "0x90e9b437b5bf6b4f38c7c8b9f8e7d6c5b4a39e8d",
    "asset_id": "16678291189211314787145083999015737376658799626183230671758641503291735614088",
    "bid": "0.68",
    "ask": "0.70",
    "last": "0.69",
    "volume": "12847.50",
    "volume_24h": "98234.75",
    "timestamp": "2024-10-17T01:53:30.789Z",
    "price_change_24h": "+0.03",
    "price_change_percent_24h": "+4.55%"
  }
}
```

### Market Data Fields
- `bid` - Highest buy price
- `ask` - Lowest sell price
- `last` - Last trade price
- `volume` - Total volume traded
- `volume_24h` - 24-hour trading volume

## Order Book Updates

Order book updates show the current state of bids and asks:

```json
{
  "type": "book",
  "data": {
    "market": "0x90e9b437b5bf6b4f38c7c8b9f8e7d6c5b4a39e8d",
    "asset_id": "16678291189211314787145083999015737376658799626183230671758641503291735614088",
    "bids": [
      { "price": "0.68", "size": "150.0" },
      { "price": "0.67", "size": "200.0" },
      { "price": "0.66", "size": "300.0" }
    ],
    "asks": [
      { "price": "0.70", "size": "100.0" },
      { "price": "0.71", "size": "175.0" },
      { "price": "0.72", "size": "250.0" }
    ],
    "timestamp": "2024-10-17T01:53:35.234Z"
  }
}
```

## Error Responses

Error messages are sent when authentication fails or other issues occur:

```json
{
  "type": "error",
  "data": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication credentials",
    "timestamp": "2024-10-17T01:53:20.567Z",
    "request_id": "req_12345"
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or expired credentials
- `INVALID_REQUEST` - Malformed subscription request
- `RATE_LIMITED` - Too many requests
- `MARKET_NOT_FOUND` - Invalid market ID
- `INSUFFICIENT_BALANCE` - Not enough funds for order

## Heartbeat/Ping Responses

Heartbeat messages help maintain the connection:

```json
{
  "type": "pong",
  "data": {
    "timestamp": "2024-10-17T01:53:50.890Z"
  }
}
```

## Market Status Updates

Market status updates provide information about market state changes:

```json
{
  "type": "status",
  "data": {
    "market": "0x90e9b437b5bf6b4f38c7c8b9f8e7d6c5b4a39e8d",
    "status": "ACTIVE",
    "description": "Will Donald Trump win the 2024 election?",
    "end_date": "2024-11-05T23:59:59.000Z",
    "volume": "1247832.50",
    "liquidity": "98234.75",
    "timestamp": "2024-10-17T01:53:40.123Z"
  }
}
```

### Market Status Values
- `ACTIVE` - Market is open for trading
- `PAUSED` - Trading temporarily suspended
- `CLOSED` - Market has closed, no new trades
- `RESOLVED` - Market outcome determined
- `CANCELLED` - Market cancelled

## Message Processing

Our WebSocket service handles these messages in `app/services/polymarket_websocket_service.ts`:

```typescript
switch (message.type) {
  case 'order':
    this.handleOrderUpdate(message.data as OrderUpdate)
    break
  case 'trade':
    this.handleTradeUpdate(message.data as TradeUpdate)
    break
  case 'market':
    this.handleMarketUpdate(message.data as MarketUpdate)
    break
  case 'subscription':
    logger.info('Subscription confirmed', message.data)
    break
  case 'error':
    logger.error('Server error received', message.data)
    break
  default:
    logger.warn('Unknown message type', { type: message.type })
}
```

## Real-Time Data Flow

1. **Connect** → Establish WebSocket connection to `wss://ws-live-data.polymarket.com`
2. **Authenticate** → Send API key, secret, and passphrase
3. **Subscribe** → Request USER and/or MARKET channel data
4. **Receive** → Process incoming messages by type
5. **Log** → Store order/trade/market updates
6. **Metrics** → Track message counts and errors
7. **Health** → Monitor connection status

## Authentication Requirements

To receive real data from these endpoints, you need:

1. **Valid API Key** - Like `poly-analytics-46ddf7f79a1f21381c4030e06a7dc9d4`
2. **API Secret** - Generated alongside your API key
3. **Passphrase** - Secret string for encryption/decryption
4. **Active Account** - Account with trading permissions

## Example Subscription Messages

### USER Channel Subscription
```json
{
  "auth": {
    "key": "poly-analytics-46ddf7f79a1f21381c4030e06a7dc9d4",
    "secret": "your-api-secret-here",
    "passphrase": "your-passphrase-here"
  },
  "type": "USER",
  "markets": ["0x90e9b437b5bf6b4f38c7c8b9f8e7d6c5b4a39e8d"]
}
```

### MARKET Channel Subscription
```json
{
  "auth": {
    "key": "poly-analytics-46ddf7f79a1f21381c4030e06a7dc9d4",
    "secret": "your-api-secret-here",
    "passphrase": "your-passphrase-here"
  },
  "type": "MARKET",
  "assets_ids": ["16678291189211314787145083999015737376658799626183230671758641503291735614088"]
}
```

## Testing

To test the WebSocket connection:

```bash
# Start the development server
npm run dev

# Check health endpoint
curl http://localhost:3333/health

# View metrics
curl http://localhost:3333/metrics/summary
```

## Troubleshooting

### Common Issues

1. **No Messages Received**
   - Verify API credentials are valid and active
   - Check that markets/assets exist and are active
   - Ensure proper authentication format

2. **Authentication Errors**
   - Verify API key, secret, and passphrase match
   - Check that credentials haven't expired
   - Ensure account has necessary permissions

3. **Connection Issues**
   - Check network connectivity
   - Verify WebSocket URL is correct
   - Monitor reconnection attempts in logs

### Debug Logging

To enable verbose message logging, update the log level in `.env`:

```env
LOG_LEVEL=debug
```

This will show detailed WebSocket message information in the console output.

---

Generated by Polymarket CLOB WebSocket Client v1.0.0