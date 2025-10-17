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

    // Transform API response to match our Market type
    const markets: Market[] = data.map((market: any) => {
      const clobTokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
      const outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
      const outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];

      // Create tokens array from outcomes and token IDs
      const tokens: any[] = [];
      outcomes.forEach((outcome: string, index: number) => {
        tokens.push({
          token_id: clobTokenIds[index] || '',
          outcome: outcome,
          price: outcomePrices[index] || '0',
          winner: false,
        });
      });

      return {
        condition_id: market.conditionId || '',
        question_id: market.questionID || '',
        question: market.question || '',
        description: market.description || '',
        market_slug: market.slug || '',
        end_date_iso: market.endDateIso || market.endDate || '',
        game_start_time: market.startDateIso || market.startDate,
        tokens,
        rewards: market.rewards || undefined,
        active: market.active || false,
        closed: market.closed || false,
        archived: market.archived || false,
        volume: market.volume || '0',
        volume_24hr: market.volume24hr || '0',
        // Store additional data for processing
        clobTokenIds,
        outcomePrices,
        outcomes,
      };
    });

    return markets;
  } catch (error) {
    console.error('Error fetching markets:', error);
    return [];
  }
}

export async function searchMarkets(query: string, limit = 50): Promise<Market[]> {
  try {
    // Use the same API endpoint and transformation as fetchMarkets
    const markets = await fetchMarkets(limit, 0);

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