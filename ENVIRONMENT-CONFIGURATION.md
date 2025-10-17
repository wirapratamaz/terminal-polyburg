# Environment Configuration Guide

## ✅ **Successfully Moved All Hardcoded Endpoints to Environment Variables**

All hardcoded endpoints have been moved to environment variables to make the application more configurable and maintainable.

### 📝 **Environment Variables**

#### **Required Variables**
```env
# API Key (Public - safe for client-side)
NEXT_PUBLIC_POLYMARKET_API_KEY=poly-analytics-46ddf7f79a1f21381c4030e06a7dc9d4

# Private Credentials (Server-side only)
POLYMARKET_API_SECRET=your-actual-secret-here
POLYMARKET_PASSPHRASE=your-actual-passphrase-here
```

#### **API Endpoints (Optional - with defaults)**
```env
# Polymarket API Endpoints
NEXT_PUBLIC_GAMMA_API_BASE=https://gamma-api.polymarket.com
NEXT_PUBLIC_CLOB_API_BASE=https://clob.polymarket.com
NEXT_PUBLIC_POLYMARKET_ORIGIN=https://polymarket.com
NEXT_PUBLIC_POLYMARKET_REFERER=https://polymarket.com/
```

#### **WebSocket Configuration (Optional - with defaults)**
```env
# WebSocket Settings
NEXT_PUBLIC_WS_URL=wss://ws-live-data.polymarket.com
NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS=5
NEXT_PUBLIC_WS_RECONNECT_DELAY=1000
```

#### **Development Settings (Optional)**
```env
# Debug Settings
NEXT_PUBLIC_VERBOSE_WS=true
NODE_ENV=development
```

### 🔧 **Configuration Files**

#### **1. Environment Files**

**`.env.example`** - Template for all environment variables:
```env
# Copy this file to .env.local and add your actual credentials
NEXT_PUBLIC_POLYMARKET_API_KEY=poly-analytics-46ddf7f79a1f21381c4030e06a7dc9d4
POLYMARKET_API_SECRET=demo-secret-key-for-testing-purposes-only
POLYMARKET_PASSPHRASE=demo-passphrase-for-testing-poly-analytics-api-key

# API Endpoints Configuration
NEXT_PUBLIC_GAMMA_API_BASE=https://gamma-api.polymarket.com
NEXT_PUBLIC_CLOB_API_BASE=https://clob.polymarket.com
NEXT_PUBLIC_POLYMARKET_ORIGIN=https://polymarket.com
NEXT_PUBLIC_POLYMARKET_REFERER=https://polymarket.com/

# WebSocket Configuration
NEXT_PUBLIC_WS_URL=wss://ws-live-data.polymarket.com
NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS=5
NEXT_PUBLIC_WS_RECONNECT_DELAY=1000
```

**`.env.local`** - Your actual configuration (already created)

#### **2. Centralized Configuration** (`src/lib/config.ts`)

Created a centralized configuration system that:
- **Validates environment variables** on startup
- **Provides default values** for optional settings
- **Centralizes access** to all configuration
- **Includes helper functions** for common tasks

```typescript
// Usage example
import { config, hasWebSocketCredentials } from '@/lib/config';

// Access API endpoints
const apiUrl = config.api.gammaBase;
const wsUrl = config.websocket.url;

// Check if WebSocket can be used
if (hasWebSocketCredentials()) {
  // Initialize WebSocket connection
}
```

### 📁 **Files Updated**

#### **1. WebSocket Client** (`src/lib/polymarket/websocket-client.ts`)
- ✅ Moved WebSocket URL to environment variable
- ✅ Made reconnection settings configurable
- ✅ Uses centralized config system

#### **2. API Client** (`src/lib/polymarket/api.ts`)
- ✅ Moved CLOB API base URL to environment variable
- ✅ Uses centralized config system

#### **3. Markets API Route** (`src/app/api/polymarket/markets/route.ts`)
- ✅ Moved Gamma API base URL to environment variable
- ✅ Moved Origin and Referer headers to environment variables
- ✅ Uses centralized config system

### 🎯 **Benefits of Environment Configuration**

#### **1. Flexibility**
- **Easy Environment Switching**: Different URLs for dev/staging/production
- **Custom Endpoints**: Can point to different Polymarket environments
- **Testing**: Can use mock servers or test endpoints

#### **2. Security**
- **Credential Management**: Sensitive data stays in environment files
- **Version Control**: `.env.local` is gitignored, secrets never committed
- **Public/Private Split**: Public config can be exposed, private stays secure

#### **3. Maintainability**
- **Single Source of Truth**: All configuration in one place
- **Validation**: Automatic checking of required variables
- **Documentation**: Clear understanding of what each variable does

#### **4. Development Experience**
- **Easy Setup**: Copy `.env.example` to `.env.local` and customize
- **Debug Information**: Automatic logging of configuration in development
- **Error Messages**: Clear warnings when variables are missing

### 🚀 **How to Use**

#### **1. Initial Setup**
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit with your actual credentials
nano .env.local
```

#### **2. Development**
```bash
# Start the application
npm run dev

# Check console for configuration logs
# Should see: "🔧 Polymarket Terminal Configuration:"
```

#### **3. Production Deployment**
```bash
# Set environment variables in your deployment platform
# Vercel: Project Settings > Environment Variables
# Railway: Variables tab
# Docker: docker run -e NEXT_PUBLIC_POLYMARKET_API_KEY=...
```

### 🔍 **Configuration Validation**

The application automatically validates configuration on startup:

#### **✅ Valid Configuration**
```bash
🔧 Polymarket Terminal Configuration:
  API Base (Gamma): https://gamma-api.polymarket.com
  API Base (CLOB): https://clob.polymarket.com
  WebSocket URL: wss://ws-live-data.polymarket.com
  API Key: poly-analy...
  Has WebSocket Creds: true
```

#### **⚠️ Missing Configuration**
```bash
⚠️ Configuration warnings:
  - POLYMARKET_API_SECRET is required for WebSocket authentication
  - POLYMARKET_PASSPHRASE is required for WebSocket authentication
  The application will work with limited functionality.
```

### 🎮 **Environment-Specific Examples**

#### **Development Environment**
```env
NEXT_PUBLIC_GAMMA_API_BASE=https://gamma-api.polymarket.com
NEXT_PUBLIC_WS_URL=wss://ws-live-data.polymarket.com
NEXT_PUBLIC_VERBOSE_WS=true
NODE_ENV=development
```

#### **Staging Environment**
```env
NEXT_PUBLIC_GAMMA_API_BASE=https://staging-gamma-api.polymarket.com
NEXT_PUBLIC_WS_URL=wss://staging-ws-live-data.polymarket.com
NEXT_PUBLIC_VERBOSE_WS=false
NODE_ENV=staging
```

#### **Production Environment**
```env
NEXT_PUBLIC_GAMMA_API_BASE=https://gamma-api.polymarket.com
NEXT_PUBLIC_WS_URL=wss://ws-live-data.polymarket.com
NEXT_PUBLIC_VERBOSE_WS=false
NODE_ENV=production
```

### 📋 **Migration Summary**

**Before**: Hardcoded endpoints scattered across files
```typescript
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';
const WS_URL = 'wss://ws-live-data.polymarket.com';
```

**After**: Centralized, configurable, environment-based
```typescript
import { config } from '@/lib/config';
const apiBase = config.api.gammaBase;
const wsUrl = config.websocket.url;
```

### 🎉 **Result**

- ✅ **All hardcoded endpoints moved to environment variables**
- ✅ **Centralized configuration system implemented**
- ✅ **Validation and error handling added**
- ✅ **Development experience improved**
- ✅ **Production deployment simplified**
- ✅ **Security enhanced through proper credential management**

The application is now **fully configurable** and ready for deployment across different environments!