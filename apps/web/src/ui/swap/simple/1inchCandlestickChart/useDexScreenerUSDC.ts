import { useQuery } from "@tanstack/react-query";

type DexPair = {
  chainId: string;
  dexId: string;
  pairAddress: string;
  url: string;
  baseToken: { address: string; symbol: string; name: string };
  quoteToken: { address: string; symbol: string; name: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
};

type DexSearchResponse = { pairs?: DexPair[] };

export function useDexScreenerUSDC(query: string) {
  return useQuery({
    queryKey: ["dexscreener", "eth", "uni-sushi", query],
    enabled: query.trim().length > 1,
    queryFn: async (): Promise<DexPair | null> => {
      const url =
        "https://api.dexscreener.com/latest/dex/search?q=" +
        encodeURIComponent(query);

      const res = await fetch(url);
      if (!res.ok) throw new Error(`DexScreener search failed: ${res.status}`);

      const data = (await res.json()) as DexSearchResponse;
      const pairs = data?.pairs ?? [];

      // ✅ filter to ethereum + (uniswap or sushiswap)
      const filtered = pairs.filter(
        (p) =>
          p.chainId === "ethereum" &&
          ["uniswap", "sushiswap"].includes(p.dexId.toLowerCase())
      );

      // return the one with highest liquidity (or null)
      if (!filtered.length) return null;
      return filtered.sort(
        (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)
      )[0];
    },
  });
}