import { useState, useEffect, useMemo } from 'react';
import { useKatanaBalance } from 'src/ui/swap/simple/useKatanaBalance';
import { getTokenInfoBySymbol } from 'src/constants/katanaTokens';
import { BACKEND_URL } from 'src/ui/swap/simple/ChartSpot';

export interface KatanaPortfolioToken {
  symbol: string;
  name: string;
  address: string;
  balance: number;
  price: number;
  value: number;
  logoUrl?: string;
  decimals: number;
  chain_id: number;
}

export interface KatanaPortfolioData {
  tokens: KatanaPortfolioToken[];
  totalValue: number;
  isLoading: boolean;
  error: string | null;
  // new:
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  lastUpdated: number | null; // epoch ms
}

export function useKatanaPortfolio(address: string | null): KatanaPortfolioData {
  // try to grab refetch if the balance hook exposes it; otherwise undefined
  const {
    balances,
    loading: balancesLoading,
    error: balancesError,
    refetch: refetchBalances,
  } = useKatanaBalance(address, BACKEND_URL) as {
    balances: Array<{ symbol: string; balance: string }>;
    loading: boolean;
    error: string | null;
    refetch?: () => Promise<void>;
  };

  const [portfolioTokens, setPortfolioTokens] = useState<KatanaPortfolioToken[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  // refresh controls
  const [refreshTick, setRefreshTick] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // helper to fetch prices for current balances
  const fetchPricesForBalances = async (signal?: AbortSignal) => {
    setPricesLoading(true);
    setPricesError(null);

    try {
      const tokenPromises = balances.map(async (balance) => {
        const tokenInfo = getTokenInfoBySymbol(balance.symbol);
        if (!tokenInfo) {
          console.warn(`Token info not found for symbol: ${balance.symbol}`);
          return null;
        }

        // Use your WETH-on-Katana (or pricing proxy) address for ETH pricing
        const priceAddress =
          balance.symbol === 'ETH'
            ? '0xEE7D8BCFb72bC1880D0Cf19822eB0A2e6577aB62'
            : tokenInfo.address;

        try {
          const url = `${BACKEND_URL}/api/price/katana?tokenAddress=${encodeURIComponent(
            priceAddress
          )}`;
          const response = await fetch(url, { signal });
          const priceData = await response.json();

          const price =
            response.ok && priceData.status === 'ok' ? priceData.price : 0;

          const balanceNum = parseFloat(balance.balance);

          return {
            symbol: balance.symbol,
            name: tokenInfo.name,
            address: tokenInfo.address || priceAddress,
            balance: balanceNum,
            price,
            value: balanceNum * price,
            logoUrl: tokenInfo.logoUrl,
            decimals: tokenInfo.decimals,
            chain_id: 747474,
          } as KatanaPortfolioToken;
        } catch (priceError) {
          if ((priceError as any)?.name === 'AbortError') return null;
          console.error(`Error fetching price for ${balance.symbol}:`, priceError);
          const balanceNum = parseFloat(balance.balance);
          return {
            symbol: balance.symbol,
            name: tokenInfo.name,
            address: tokenInfo.address || '',
            balance: balanceNum,
            price: 0,
            value: 0,
            logoUrl: tokenInfo.logoUrl,
            decimals: tokenInfo.decimals,
            chain_id: 747474,
          } as KatanaPortfolioToken;
        }
      });

      const results = await Promise.all(tokenPromises);
      const validTokens = results.filter(
        (t): t is KatanaPortfolioToken => t !== null
      );
      const nonZeroTokens = validTokens.filter((t) => t.balance > 0);

      setPortfolioTokens(nonZeroTokens);
      setLastUpdated(Date.now());
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        setPricesError(
          err instanceof Error ? err.message : 'Failed to fetch prices'
        );
        console.error('Error fetching portfolio prices:', err);
      }
    } finally {
      setPricesLoading(false);
    }
  };

  // auto-fetch when balances or manual refresh changes
  useEffect(() => {
    if (!balances.length) {
      setPortfolioTokens([]);
      return;
    }
    const controller = new AbortController();
    fetchPricesForBalances(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, refreshTick]); // re-run on balances change or manual refresh

  // public refresh function
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      // try to refresh balances if hook supports it
      if (typeof refetchBalances === 'function') {
        await refetchBalances();
      }
      // bump tick to force price refetch (and price-only refresh if balances unchanged)
      setRefreshTick((t) => t + 1);
    } finally {
      // let the UI spinner show until fetch completes; small delay avoids flicker
      setTimeout(() => setIsRefreshing(false), 50);
    }
  };

  const totalValue = useMemo(
    () => portfolioTokens.reduce((total, token) => total + token.value, 0),
    [portfolioTokens]
  );

  const isLoading = balancesLoading || pricesLoading;
  const error = balancesError || pricesError;

  return {
    tokens: portfolioTokens,
    totalValue,
    isLoading,
    error,
    refresh,
    isRefreshing,
    lastUpdated,
  };
}
