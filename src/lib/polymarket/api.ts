import { Market } from './types';
import { getApiBase } from '../config';

const CLOB_API_BASE = getApiBase('clob');

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
    const markets: Market[] = data
      .filter((market: any) => {
        // Only include markets that have proper CLOB data
        const hasConditionId = market.conditionId && market.conditionId !== '';
        const hasOutcomes = market.outcomes;

        return hasConditionId && hasOutcomes;
      })
      .map((market: any) => {
      // Parse JSON strings safely
      let outcomes: string[] = [];
      try {
        outcomes = market.outcomes ? JSON.parse(market.outcomes) : [];
      } catch (e) {
        console.warn('Failed to parse outcomes:', market.outcomes);
        outcomes = [];
      }

      let clobTokenIds: string[] = [];
      try {
        clobTokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
      } catch (e) {
        clobTokenIds = [];
      }

      let outcomePrices: string[] = [];
      try {
        outcomePrices = market.outcomePrices ? JSON.parse(market.outcomePrices) : [];
      } catch (e) {
        outcomePrices = [];
      }

      // Create tokens array from outcomes and token IDs
      const tokens: any[] = [];
      outcomes.forEach((outcome: string, index: number) => {
        tokens.push({
          token_id: clobTokenIds[index] || `temp-${index}`, // Use fallback if no token ID
          outcome: outcome,
          price: outcomePrices[index] || market.lastTradePrice?.toString() || '0.01', // Use fallback price
          winner: false,
        });
      });

      return {
        condition_id: market.conditionId || market.id || `temp-${market.id}`, // Use fallback
        question_id: market.questionID || market.id || '',
        question: market.question || '',
        description: market.description || '',
        market_slug: market.slug || '',
        end_date_iso: market.endDateIso || market.endDate || new Date().toISOString(),
        game_start_time: market.startDateIso || market.startDate,
        tokens,
        rewards: market.rewards || undefined,
        active: market.active || false,
        closed: market.closed || false,
        archived: market.archived || false,
        volume: market.volumeClob || market.volume || '0',
        volume_24hr: market.volume24hrClob || market.volume24hr || '0',
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