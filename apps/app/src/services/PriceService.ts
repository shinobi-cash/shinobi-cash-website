import type { PricesApiResponse, TokenSymbol } from "@/types/price";

export async function fetchTokenPrice(symbol: TokenSymbol): Promise<number> {
  const response = await fetch(`/api/prices?symbols=${symbol}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Price API error: ${response.status} ${response.statusText}`);
  }

  const data: PricesApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || "Failed to fetch price data");
  }

  const priceData = data.data.find((p) => p.symbol === symbol);

  if (!priceData) {
    throw new Error(`Price not found for symbol: ${symbol}`);
  }

  return priceData.usdPrice;
}
