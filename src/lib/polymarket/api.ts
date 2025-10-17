import { Market } from './types';

const CLOB_API_BASE = 'https://clob.polymarket.com';

export async function fetchMarkets(limit = 100, offset = 0): Promise<Market[]> {
  try {
    const response = await fetch(
      `/api/polymarket/markets?limit=${limit}&offset=${offset}&active=true&closed=false`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch markets: ${response.statusText}`);
    }

    const data = await response.json();
    return data as Market[];
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
}

export async function searchMarkets(query: string, limit = 50): Promise<Market[]> {
  try {
    const response = await fetch(
      `/api/polymarket/markets?limit=${limit}&active=true&closed=false`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to search markets: ${response.statusText}`);
    }

    const markets: Market[] = await response.json();
    
    // Filter markets by query
    const lowerQuery = query.toLowerCase();
    return markets.filter(
      (market) =>
        market.question.toLowerCase().includes(lowerQuery) ||
        market.description?.toLowerCase().includes(lowerQuery) ||
        market.market_slug.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching markets:', error);
    return [];
  }
}

export async function getOrderBook(tokenId: string) {
  try {
    const response = await fetch(`${CLOB_API_BASE}/book?token_id=${tokenId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch order book: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching order book:', error);
    return null;
  }
}