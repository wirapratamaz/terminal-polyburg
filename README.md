# Polymarket Live Order Book

A real-time trading terminal for Polymarket prediction markets with live order book data, WebSocket connectivity, and advanced search functionality.

## Features

- 🔄 **Real-time WebSocket Connection** - Live order book updates from Polymarket CLOB
- 🔍 **Advanced Search** - Search markets with intelligent debouncing and duplicate prevention
- 📊 **Live Order Book** - Real-time bid/ask data with price changes
- 🎯 **Market Selection** - Browse and select from available prediction markets
- ⚡ **Terminal-style UI** - Retro terminal interface with green-on-black aesthetics
- 📈 **Activity Feed** - Real-time trading activity and price updates

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd polymarket-live-order-book
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

3. Set up environment variables (optional):
```bash
cp .env.example .env.local
```

Add your Polymarket API credentials to `.env.local` for live WebSocket data:
```
POLYMARKET_API_SECRET=your_api_secret
POLYMARKET_PASSPHRASE=your_passphrase
NEXT_PUBLIC_POLYMARKET_API_KEY=your_api_key
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application. If port 3000 is in use, it will automatically use the next available port (e.g., 3001).

## Usage

### Basic Navigation

- **Search Markets**: Type in the search box to filter markets (500ms debounce)
- **Select Market**: Click on any market to view its order book
- **Switch Outcomes**: Press 'Q' to toggle between Yes/No outcomes
- **Clear Search**: Click the Clear button to reset search

### Search Features

- **Real-time Search**: Search triggers automatically 500ms after you stop typing
- **Duplicate Prevention**: Same query won't trigger multiple API calls
- **Manual Search**: Press Enter or click Search button for immediate results
- **Multi-field Search**: Searches through question, description, and market slug

### WebSocket Features

When API credentials are provided:
- **Live Updates**: Real-time order book changes
- **Price Alerts**: Automatic notifications for price movements
- **Trade Activity**: Live trade execution updates
- **Connection Status**: Visual indicators for WebSocket connectivity

## Project Structure

```
src/
├── app/                          # Next.js app router
├── components/
│   └── PolymarketTerminal/       # Main terminal components
│       ├── SearchPanel.tsx       # Market search with debouncing
│       ├── MarketsList.tsx       # Market list display
│       ├── OrderBookPanel.tsx    # Order book visualization
│       ├── StatusBar.tsx         # Connection status
│       └── InfoBar.tsx           # Activity feed
├── lib/
│   └── polymarket/               # Polymarket API integration
│       ├── api.ts                # Market data fetching
│       ├── types.ts              # TypeScript definitions
│       └── websocket-client.ts   # WebSocket client
```

## API Integration

The application uses the Polymarket CLOB API for:
- Market data fetching via `/api/polymarket/markets` endpoint
- Real-time WebSocket connections for order book updates
- Search functionality with client-side filtering

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time**: WebSocket connections
- **State Management**: React hooks and context

## Deployment

### Vercel (Recommended)

The easiest way to deploy is using [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme):

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically

### Other Platforms

```bash
npm run build
npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and demonstration purposes. Please respect Polymarket's terms of service when using their API.