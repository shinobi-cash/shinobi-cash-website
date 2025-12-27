/**
 * Prices API Proxy
 * Handles token price requests server-side to hide Alchemy API key from client
 *
 * SECURITY: API key is server-side only (not NEXT_PUBLIC_*)
 * @file app/api/prices/route.ts
 */

import { NextResponse } from "next/server";

// Server-side Alchemy API key (credentials never exposed to client)
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

if (!ALCHEMY_API_KEY) {
  console.warn(
    "[Prices API] ALCHEMY_API_KEY not configured - price fetching will be disabled"
  );
}

// Cache TTL for price data (60 seconds)
const PRICE_CACHE_TTL = 60;

interface PriceData {
  symbol: string;
  usdPrice: number;
  lastUpdatedAt: string;
}

interface AlchemyPriceResponse {
  data: Array<{
    symbol: string;
    prices: Array<{
      currency: string;
      value: string;
      lastUpdatedAt: string;
    }>;
    error?: string;
  }>;
}

/**
 * GET /api/prices?symbols=ETH
 * Fetches current token prices from Alchemy
 */
export async function GET(request: Request) {
  try {
    // Check if API key is configured
    if (!ALCHEMY_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Price API not configured"
        },
        { status: 503 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols") || "ETH";

    // Validate symbols parameter
    const symbolArray = symbols.split(",").map((s) => s.trim().toUpperCase());
    if (symbolArray.length === 0 || symbolArray.length > 25) {
      return NextResponse.json(
        {
          success: false,
          error: "symbols parameter must contain 1-25 token symbols"
        },
        { status: 400 }
      );
    }

    // Fetch prices from Alchemy
    const alchemyUrl = `https://api.g.alchemy.com/prices/v1/${ALCHEMY_API_KEY}/tokens/by-symbol?symbols=${symbolArray.join(",")}`;

    const response = await fetch(alchemyUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "shinobi-cash-api/1.0.0",
      },
      next: {
        revalidate: PRICE_CACHE_TTL, // Next.js cache revalidation
      },
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const alchemyData: AlchemyPriceResponse = await response.json();

    // Transform Alchemy response to our format
    const prices: PriceData[] = alchemyData.data
      .filter((item) => !item.error) // Filter out tokens with errors
      .map((item) => {
        const usdPrice = item.prices.find((p) => p.currency === "usd");
        return {
          symbol: item.symbol,
          usdPrice: usdPrice ? parseFloat(usdPrice.value) : 0,
          lastUpdatedAt: usdPrice?.lastUpdatedAt || new Date().toISOString(),
        };
      });

    // Return with caching headers
    return NextResponse.json(
      {
        success: true,
        data: prices,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": `s-maxage=${PRICE_CACHE_TTL}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[Prices API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Price fetch failed",
      },
      { status: 500 }
    );
  }
}
