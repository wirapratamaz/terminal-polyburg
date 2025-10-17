import { NextRequest, NextResponse } from 'next/server';

const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '0';
    const active = searchParams.get('active') || 'true';
    const closed = searchParams.get('closed') || 'false';

    const apiUrl = `${GAMMA_API_BASE}/markets?limit=${limit}&offset=${offset}&active=${active}&closed=${closed}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; PolymarketTerminal/1.0)',
      'Origin': 'https://polymarket.com',
      'Referer': 'https://polymarket.com/',
    };

    // Don't use Bearer token, just use API key in headers if available
    const apiKey = process.env.NEXT_PUBLIC_POLYMARKET_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      console.log('Using API key:', apiKey.substring(0, 10) + '...');
    } else {
      console.log('No API key found, proceeding without authentication');
    }

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`Polymarket API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch markets: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      },
    });
  } catch (error) {
    console.error('Error in markets API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}