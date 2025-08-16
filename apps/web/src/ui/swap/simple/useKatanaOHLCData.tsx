// hooks/useKatanaOHLCData.ts
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "./ChartSpot";

export interface OHLCPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface KatanaOHLCMetadata {
  token: {
    address: string;
    name: string;
    symbol: string;
    decimals: string; // note: still a string in your example
  };
  totalValueLockedUSD: number;
  volumeUSD: number;
  poolCount: number;
  txCount: number;
  priceUSD: number;
  currency: string;   // e.g. "USD"
  dataSource: string; // e.g. "subgraph"
  chain: string;      // e.g. "katana"
  dexId: string;      // e.g. "katana-sushiswap"
}

export interface KatanaOHLCData {
  chart: OHLCPoint[];
  metadata: KatanaOHLCMetadata;
}

export interface UseKatanaOHLCDataProps {
  tokenAddress: string;
  resolution?: "hour" | "day";
  days?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export interface UseKatanaOHLCDataReturn {
  data: KatanaOHLCData | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  refetch: () => Promise<void>;
  isSupported: boolean;
  dataSource: string;
}

export const useKatanaOHLCData = ({
  tokenAddress,
  resolution = "hour",
  days = 30,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
}: UseKatanaOHLCDataProps): UseKatanaOHLCDataReturn => {
  const [data, setData] = useState<KatanaOHLCData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(true);
  const [dataSource, setDataSource] = useState<string>("katana-sushiswap");

  const fetchOHLCData = useCallback(async () => {
    if (!tokenAddress) return;

    // Don't fetch if already loading
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(
        `[Katana OHLC] Fetching data for ${tokenAddress}, resolution: ${resolution}, days: ${days}`
      );

      const response = await axios.get(`${BACKEND_URL}/api/ohlc/katana`, {
        params: {
          tokenAddress,
          resolution,
          days,
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.status === "success") {
        setData(response.data.data);
        setLastUpdated(Date.now());
        setIsSupported(true);
        setDataSource(response.data.source || "katana-sushiswap");

        console.log(
          `[Katana OHLC] Successfully fetched ${response.data.data.chart.length} candles from Katana subgraph`
        );
      } else {
        throw new Error(response.data.msg || "Failed to fetch Katana OHLC data");
      }
    } catch (err: any) {
      console.error("[Katana OHLC] Fetch error:", err);

      let errorMessage = "Failed to fetch Katana OHLC data";

      if (err.response?.status === 404) {
        errorMessage = "No trading data available for this token on Katana";
        setIsSupported(false);
      } else if (err.response?.status === 429) {
        errorMessage = "Rate limited by Katana subgraph - please wait";
      } else if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (err.message?.includes("Network Error")) {
        errorMessage = "Network error - please check your connection";
      }

      setError(errorMessage);

      // Mark as unsupported for 404 errors
      if (err.response?.status === 404) {
        setIsSupported(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, resolution, days, isLoading]);

  // Initial fetch when dependencies change
  useEffect(() => {
    if (tokenAddress) {
      // Reset state when token changes
      setData(null);
      setError(null);
      setIsSupported(true);
      setDataSource("katana-sushiswap");
      fetchOHLCData();
    }
  }, [tokenAddress, resolution, days]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh || !tokenAddress) return;

    const interval = setInterval(() => {
      console.log("[Katana OHLC] Auto-refreshing data...");
      fetchOHLCData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOHLCData, tokenAddress]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    await fetchOHLCData();
  }, [fetchOHLCData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isSupported,
    dataSource,
  };
};

// Utility functions for Katana OHLC data processing
export const katanaOHLCUtils = {
  // Get price change between first and last candle
  getPriceChange: (
    data: OHLCPoint[]
  ): { absolute: number; percentage: number } => {
    if (!data || data.length < 2) return { absolute: 0, percentage: 0 };

    const first = data[0].close;
    const last = data[data.length - 1].close;
    const absolute = last - first;
    const percentage = (absolute / first) * 100;

    return { absolute, percentage };
  },

  // Get highest and lowest prices in the dataset
  getHighLow: (data: OHLCPoint[]): { high: number; low: number } => {
    if (!data || data.length === 0) return { high: 0, low: 0 };

    let high = data[0].high;
    let low = data[0].low;

    data.forEach((point) => {
      if (point.high > high) high = point.high;
      if (point.low < low) low = point.low;
    });

    return { high, low };
  },

  // Calculate total volume in USD
  getTotalVolume: (data: OHLCPoint[]): number => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, point) => total + point.volume, 0);
  },

  // Get average price (OHLC4)
  getAveragePrice: (point: OHLCPoint): number => {
    return (point.open + point.high + point.low + point.close) / 4;
  },

  // Format timestamp for display
  formatTimestamp: (
    timestamp: number,
    resolution: "hour" | "day"
  ): string => {
    const date = new Date(timestamp);

    switch (resolution) {
      case "hour":
        return date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        });
      case "day":
        return date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      default:
        return date.toLocaleDateString();
    }
  },

  // Check if data is from Katana subgraph
  isKatanaData: (metadata: KatanaOHLCMetadata): boolean => {
    return metadata.dexId === "katana-sushiswap" && metadata.dataSource === "subgraph";
  },

  // Get data reliability score
  getDataReliability: (
    metadata: KatanaOHLCMetadata
  ): {
    score: number;
    description: string;
  } => {
    if (katanaOHLCUtils.isKatanaData(metadata)) {
      return {
        score: 0.9, // Katana subgraph data is very reliable
        description: "Real trading data from Katana SushiSwap pools",
      };
    }
    return {
      score: 0.7,
      description: "Estimated data",
    };
  },

  // Calculate volatility from OHLC data
  calculateVolatility: (data: OHLCPoint[]): number => {
    if (!data || data.length < 2) return 0;

    const returns = data.slice(1).map((point, index) => {
      const prevClose = data[index].close;
      return Math.log(point.close / prevClose);
    });

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) /
      returns.length;

    return Math.sqrt(variance) * Math.sqrt(365); // Annualized volatility
  },

  // Get trend direction
  getTrend: (data: OHLCPoint[]): "bullish" | "bearish" | "sideways" => {
    if (!data || data.length < 10) return "sideways";

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg =
      firstHalf.reduce((sum, point) => sum + point.close, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((sum, point) => sum + point.close, 0) /
      secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.02) return "bullish"; // >2% increase
    if (change < -0.02) return "bearish"; // >2% decrease
    return "sideways";
  },

  // Check if token has sufficient liquidity on Katana
  hasGoodLiquidity: (data: OHLCPoint[]): boolean => {
    if (!data || data.length === 0) return false;
    
    const recentVolume = data.slice(-24); // Last 24 periods
    const avgVolume = katanaOHLCUtils.getTotalVolume(recentVolume) / recentVolume.length;
    
    // Good liquidity if average volume > $100 per period (Katana has lower volume than Ethereum)
    return avgVolume > 100;
  },

  // Get price impact estimate for Katana
  getPriceImpact: (data: OHLCPoint[]): "low" | "medium" | "high" => {
    if (!data || data.length < 10) return "high";

    const volatility = katanaOHLCUtils.calculateVolatility(data);
    
    // Adjusted thresholds for Katana chain
    if (volatility < 0.3) return "low";
    if (volatility < 0.8) return "medium";
    return "high";
  },

  // Format price with appropriate decimals for Katana tokens
  formatPrice: (price: number): string => {
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    if (price >= 0.01) return price.toFixed(6);
    return price.toFixed(8);
  },

  // Format volume with appropriate units
  formatVolume: (volume: number): string => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(2)}K`;
    return `$${volume.toFixed(2)}`;
  },

  // Check if trading pair is active on Katana
  isActivePair: (data: OHLCPoint[]): boolean => {
    if (!data || data.length === 0) return false;
    
    const recent = data.slice(-5); // Last 5 periods
    return recent.some(point => point.volume > 0);
  },

  // Get Katana-specific insights
  getKatanaInsights: (data: OHLCPoint[], metadata: KatanaOHLCMetadata) => {
    const priceChange = katanaOHLCUtils.getPriceChange(data);
    const { high, low } = katanaOHLCUtils.getHighLow(data);
    const trend = katanaOHLCUtils.getTrend(data);
    const hasLiquidity = katanaOHLCUtils.hasGoodLiquidity(data);
    const priceImpact = katanaOHLCUtils.getPriceImpact(data);
    const isActive = katanaOHLCUtils.isActivePair(data);

    return {
      priceChange,
      high,
      low,
      trend,
      hasLiquidity,
      priceImpact,
      isActive,
      chain: "katana",
      poolId: "", // metadata.pair.poolId,
      feeTier: "" // metadata.pair.feeTier,
    };
  },
};

// Example usage component for Katana
export const KatanaOHLCExample = () => {
  const {
    data,
    isLoading,
    error,
    refetch,
    isSupported,
    dataSource
  } = useKatanaOHLCData({
    tokenAddress: "0x...", // Replace with actual Katana token address
    resolution: "hour",
    days: 30,
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
  });

  if (isLoading) return <div>Loading Katana OHLC data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!isSupported) return <div>Token not supported on Katana</div>;
  if (!data) return <div>No data available</div>;

  const insights = katanaOHLCUtils.getKatanaInsights(data.chart, data.metadata);

  return (
    <div>
      <h3>{data.metadata.token.symbol}/USDC on Katana</h3>
      <p>Current Price: ${katanaOHLCUtils.formatPrice(data.metadata.priceUSD)}</p>
      <p>24h Change: {insights.priceChange.percentage.toFixed(2)}%</p>
      <p>24h High: ${katanaOHLCUtils.formatPrice(insights.high)}</p>
      <p>24h Low: ${katanaOHLCUtils.formatPrice(insights.low)}</p>
      <p>Trend: {insights.trend}</p>
      <p>Liquidity: {insights.hasLiquidity ? "Good" : "Low"}</p>
      <p>Price Impact: {insights.priceImpact}</p>
      <p>Pool ID: {insights.poolId}</p>
      <p>Fee Tier: {insights.feeTier}%</p>
      <p>Data Points: {data.chart.length}</p>
      <p>Source: {dataSource}</p>
      <button onClick={refetch}>Refresh Data</button>
    </div>
  );
};