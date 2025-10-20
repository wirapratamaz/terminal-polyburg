// Environment configuration for Polymarket Terminal
// Centralizes all environment variable access

export const config = {
  // API Endpoints
  api: {
    gammaBase: process.env.NEXT_PUBLIC_GAMMA_API_BASE || 'https://gamma-api.polymarket.com',
    clobBase: process.env.NEXT_PUBLIC_CLOB_API_BASE || 'https://clob.polymarket.com',
    origin: process.env.NEXT_PUBLIC_POLYMARKET_ORIGIN || 'https://polymarket.com',
    referer: process.env.NEXT_PUBLIC_POLYMARKET_REFERER || 'https://polymarket.com/',
  },

  // WebSocket Configuration
  websocket: {
    url: process.env.NEXT_PUBLIC_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    reconnectAttempts: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS || '5'),
    reconnectDelay: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_DELAY || '1000'),
    pingInterval: parseInt(process.env.NEXT_PUBLIC_WS_PING_INTERVAL || '10000'),
  },

  // Authentication - supports both static and dynamic credentials
  auth: {
    apiKey: process.env.NEXT_PUBLIC_POLYMARKET_API_KEY || '',
    apiSecret: process.env.NEXT_PUBLIC_POLYMARKET_SECRET || '',
    passphrase: process.env.NEXT_PUBLIC_POLYMARKET_PASSPHRASE || '',
    privateKey: process.env.NEXT_PUBLIC_POLYMARKET_PRIVATE_KEY || '',
    // Dynamic credentials will be populated by CLOB client
    derivedCredentials: null as {
      apiKey: string;
      secret: string;
      passphrase: string;
      walletAddress: string;
    } | null,
  },

  // Development settings
  development: {
    enableDebugLogs: process.env.NODE_ENV === 'development',
    enableVerboseWebSocket: process.env.NEXT_PUBLIC_VERBOSE_WS === 'true',
  },
};

// Validation function to check if all required environment variables are set
export function validateConfig() {
  const errors: string[] = [];

  if (!config.auth.apiKey) {
    errors.push('NEXT_PUBLIC_POLYMARKET_API_KEY is required');
  }

  if (!config.auth.apiSecret) {
    errors.push('NEXT_PUBLIC_POLYMARKET_SECRET is required for WebSocket authentication');
  }

  if (!config.auth.passphrase) {
    errors.push('NEXT_PUBLIC_POLYMARKET_PASSPHRASE is required for WebSocket authentication');
  }

  if (errors.length > 0) {
    console.warn('⚠️ Configuration warnings:');
    errors.forEach(error => console.warn(`  - ${error}`));
    console.warn('  The application will work with limited functionality.');
  }

  return errors.length === 0;
}

// Helper function to check if WebSocket credentials are available
export function hasWebSocketCredentials(): boolean {
  return !!(config.auth.apiKey && config.auth.apiSecret && config.auth.passphrase);
}

// Helper function to get API base URL for different services
export function getApiBase(service: 'gamma' | 'clob' = 'gamma'): string {
  return service === 'gamma' ? config.api.gammaBase : config.api.clobBase;
}

// Log configuration on startup (development only)
if (config.development.enableDebugLogs) {
  console.log('🔧 Polymarket Terminal Configuration:');
  console.log('  API Base (Gamma):', config.api.gammaBase);
  console.log('  API Base (CLOB):', config.api.clobBase);
  console.log('  WebSocket URL:', config.websocket.url);
  console.log('  API Key:', config.auth.apiKey ? config.auth.apiKey.substring(0, 10) + '...' : 'Not set');
  console.log('  Has WebSocket Creds:', hasWebSocketCredentials());
}

export default config;