// hooks/use1inchOhlcData.ts
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Address } from "viem";
import { BACKEND_URL } from "../ChartSpot";
import { usePriceBackend, SupportedChain } from "src/lib/wagmi/components/web3-input/Currency/usePriceBackend";

export interface OHLCPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCMetadata {
  pair: {
    address: string;
    baseToken: {
      address: string;
      name: string;
      symbol: string;
    };
    quoteToken: {
      address: string;
      name: string;
      symbol: string;
    };
    dexId: string;
    url: string;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  volume24h: number;
  fdv: number;
  marketCap: number;
  priceUsd: number;
  currency: string;
  dataSource: string;
}

export interface OHLCData {
  chart: OHLCPoint[];
  metadata: OHLCMetadata;
}

export interface Use1inchOHLCDataProps {
  tokenAddress: Address | undefined;
  resolution?: "minute" | "hour" | "day";
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  chainId?: SupportedChain;
  includePriceData?: boolean; // Whether to fetch current price data
  enablePricePolling?: boolean; // Whether to enable price polling
}

export interface Use1inchOHLCDataReturn {
  // OHLC Data
  ohlcData: OHLCData | null;
  isOhlcLoading: boolean;
  ohlcError: string | null;
  lastUpdated: number;
  refetchOhlc: () => Promise<void>;
  isSupported: boolean;
  dataSource: string;
  
  // Current Price Data (from usePriceBackend)
  currentPrice: number | null | undefined;
  isPriceLoading: boolean;
  priceError: any;
  refetchPrice: () => void;
  
  // Combined utilities
  priceChange24h: { absolute: number; percentage: number } | null;
  isCurrentPriceAboveChart: boolean | null;
  chartHighLow: { high: number; low: number } | null;
}

export const use1inchOhlcData = ({
  tokenAddress,
  resolution = "hour",
  limit = 1000,
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  chainId = 1,
  includePriceData = true,
  enablePricePolling = true,
}: Use1inchOHLCDataProps): Use1inchOHLCDataReturn => {
  const [ohlcData, setOhlcData] = useState<OHLCData | null>(null);
  const [isOhlcLoading, setIsOhlcLoading] = useState(false);
  const [ohlcError, setOhlcError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [isSupported, setIsSupported] = useState(true);
  const [dataSource, setDataSource] = useState<string>("1inch");

  // Use the price backend hook for current price data
  const {
    data: currentPrice,
    isLoading: isPriceLoading,
    error: priceError,
    refetch: refetchPrice,
  } = usePriceBackend(
    includePriceData ? tokenAddress : undefined,
    undefined,
    chainId,
    {
      enabled: includePriceData && !!tokenAddress,
      refetchInterval: enablePricePolling ? 30000 : undefined, // 30 seconds or disabled
      staleTime: 15000, // 15 seconds
    }
  );

  const fetchOHLCData = useCallback(async () => {
    if (!tokenAddress) return;

    // Don't fetch if already loading
    if (isOhlcLoading) return;

    setIsOhlcLoading(true);
    setOhlcError(null);

    try {
      console.log(
        `[1inch OHLC] Fetching charts data for ${tokenAddress}, resolution: ${resolution}, limit: ${limit}`
      );

      const response = await axios.get(`${BACKEND_URL}/api/ohlc`, {
        params: {
          tokenAddress,
          resolution,
          limit,
          chainId, // Include chainId in the request
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.status === "success") {
        setOhlcData(response.data.data);
        setLastUpdated(Date.now());
        setIsSupported(true);
        setDataSource(response.data.source || "1inch");

        console.log(
          `[1inch OHLC] Successfully fetched ${response.data.data.chart.length} candles from 1inch charts API`
        );
      } else {
        throw new Error(response.data.msg || "Failed to fetch OHLC data");
      }
    } catch (err: any) {
      console.error("[1inch OHLC] Fetch error:", err);

      let errorMessage = "Failed to fetch OHLC data";

      if (err.response?.status === 404) {
        errorMessage = "No trading data available for this token pair on 1inch";
        setIsSupported(false);
      } else if (err.response?.status === 401) {
        errorMessage = "1inch API authentication required";
        setIsSupported(false);
      } else if (err.response?.status === 429) {
        errorMessage = "Rate limited by 1inch API - please wait";
      } else if (err.response?.data?.msg) {
        errorMessage = err.response.data.msg;
      } else if (err.message?.includes("timeout")) {
        errorMessage = "Request timeout - please try again";
      } else if (err.message?.includes("Network Error")) {
        errorMessage = "Network error - please check your connection";
      }

      setOhlcError(errorMessage);

      // Mark as unsupported for 404 and 401 errors
      if (err.response?.status === 404 || err.response?.status === 401) {
        setIsSupported(false);
      }
    } finally {
      setIsOhlcLoading(false);
    }
  }, [tokenAddress, resolution, limit, chainId, isOhlcLoading]);

  // Initial fetch when dependencies change
  useEffect(() => {
    if (tokenAddress) {
      // Reset state when token changes
      setOhlcData(null);
      setOhlcError(null);
      setIsSupported(true);
      setDataSource("1inch");
      fetchOHLCData();
    }
  }, [tokenAddress, resolution, limit, chainId]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh || !tokenAddress) return;

    const interval = setInterval(() => {
      console.log("[1inch OHLC] Auto-refreshing charts data...");
      fetchOHLCData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchOHLCData, tokenAddress]);

  // Manual refetch function
  const refetchOhlc = useCallback(async () => {
    await fetchOHLCData();
  }, [fetchOHLCData]);

  // Calculate price change from OHLC data
  const priceChange24h = useCallback(() => {
    if (!ohlcData?.chart || ohlcData.chart.length < 2) return null;
    
    const firstCandle = ohlcData.chart[0];
    const lastCandle = ohlcData.chart[ohlcData.chart.length - 1];
    
    const absolute = lastCandle.close - firstCandle.open;
    const percentage = (absolute / firstCandle.open) * 100;
    
    return { absolute, percentage };
  }, [ohlcData]);

  // Check if current price is above the latest chart price
  const isCurrentPriceAboveChart = useCallback(() => {
    if (currentPrice === null || currentPrice === undefined || !ohlcData?.chart || ohlcData.chart.length === 0) return null;
    
    const lastCandle = ohlcData.chart[ohlcData.chart.length - 1];
    return currentPrice > lastCandle.close;
  }, [currentPrice, ohlcData]);

  // Get high/low from chart data
  const chartHighLow = useCallback(() => {
    if (!ohlcData?.chart || ohlcData.chart.length === 0) return null;
    
    let high = ohlcData.chart[0].high;
    let low = ohlcData.chart[0].low;
    
    ohlcData.chart.forEach((candle) => {
      if (candle.high > high) high = candle.high;
      if (candle.low < low) low = candle.low;
    });
    
    return { high, low };
  }, [ohlcData]);

  return {
    // OHLC Data
    ohlcData,
    isOhlcLoading,
    ohlcError,
    lastUpdated,
    refetchOhlc,
    isSupported,
    dataSource,
    
    // Current Price Data
    currentPrice,
    isPriceLoading,
    priceError,
    refetchPrice,
    
    // Combined utilities
    priceChange24h: priceChange24h(),
    isCurrentPriceAboveChart: isCurrentPriceAboveChart(),
    chartHighLow: chartHighLow(),
  };
};

// Utility hook for batch 1inch OHLC data with price integration
export const useBatch1inchOhlcData = () => {
  const [batchOhlcData, setBatchOhlcData] = useState<{ [address: string]: OHLCData }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchOHLC = useCallback(
    async (
      tokenAddresses: Address[],
      resolution: "minute" | "hour" | "day" = "hour",
      limit: number = 1000,
      chainId: SupportedChain = 1
    ) => {
      if (!tokenAddresses.length) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log(
          `[1inch OHLC Batch] Fetching charts data for ${tokenAddresses.length} tokens on chain ${chainId}`
        );

        const response = await axios.post(
          `${BACKEND_URL}/api/ohlc/batch`,
          {
            tokenAddresses,
            resolution,
            limit,
            chainId,
          },
          {
            timeout: 60000, // 60 second timeout for batch requests
          }
        );

        if (response.data.status === "success") {
          setBatchOhlcData(response.data.data);
          console.log(
            `[1inch OHLC Batch] Successfully fetched data for ${response.data.successful} tokens from 1inch charts`
          );

          if (response.data.failed > 0) {
            console.warn(
              `[1inch OHLC Batch] Failed to fetch data for ${response.data.failed} tokens:`,
              response.data.errors
            );
          }
        } else {
          throw new Error(
            response.data.msg || "Failed to fetch batch OHLC data from 1inch"
          );
        }
      } catch (err: any) {
        console.error("[1inch OHLC Batch] Fetch error:", err);
        const errorMessage =
          err.response?.data?.msg ||
          err.message ||
          "Failed to fetch batch OHLC data from 1inch";
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    batchOhlcData,
    isLoading,
    error,
    fetchBatchOHLC,
  };
};

// Enhanced utility functions for 1inch OHLC data processing with price integration
export const ohlc1inchUtils = {
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

  // Compare current price with chart data
  compareCurrentPriceWithChart: (
    currentPrice: number | null | undefined,
    chartData: OHLCPoint[]
  ): {
    isAboveLastClose: boolean;
    isAboveHighest: boolean;
    isBelowLowest: boolean;
    percentageFromLastClose: number;
  } => {
    if (currentPrice === null || currentPrice === undefined || !chartData || chartData.length === 0) {
      return {
        isAboveLastClose: false,
        isAboveHighest: false,
        isBelowLowest: false,
        percentageFromLastClose: 0,
      };
    }

    const lastClose = chartData[chartData.length - 1].close;
    const { high: highest, low: lowest } = ohlc1inchUtils.getHighLow(chartData);

    return {
      isAboveLastClose: currentPrice > lastClose,
      isAboveHighest: currentPrice > highest,
      isBelowLowest: currentPrice < lowest,
      percentageFromLastClose: ((currentPrice - lastClose) / lastClose) * 100,
    };
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

  // Calculate total volume (note: 1inch charts may not provide accurate volume)
  getTotalVolume: (data: OHLCPoint[]): number => {
    if (!data || data.length === 0) return 0;
    return data.reduce((total, point) => total + point.volume, 0);
  },

  // Get average price (OHLC4)
  getAveragePrice: (point: OHLCPoint): number => {
    return (point.open + point.high + point.low + point.close) / 4;
  },

  // Format timestamp for display based on resolution
  formatTimestamp: (
    timestamp: number,
    resolution: "minute" | "hour" | "day"
  ): string => {
    const date = new Date(timestamp);

    switch (resolution) {
      case "minute":
        return date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        });
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

  // Check if data is from 1inch charts API
  is1inchData: (metadata: OHLCMetadata): boolean => {
    return metadata.dataSource === "api" || metadata.dataSource === "1inch";
  },

  // Get data reliability score for 1inch data
  getDataReliability: (
    metadata: OHLCMetadata
  ): {
    score: number;
    description: string;
  } => {
    if (ohlc1inchUtils.is1inchData(metadata)) {
      return {
        score: 0.95, // 1inch charts are highly reliable
        description: "Real aggregated price data from 1inch DEX aggregator",
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

    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
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

  // Enhanced trend analysis with current price consideration
  getTrendWithCurrentPrice: (
    data: OHLCPoint[],
    currentPrice?: number | null
  ): {
    trend: "bullish" | "bearish" | "sideways";
    strength: "weak" | "moderate" | "strong";
    currentPriceTrend?: "continuation" | "reversal" | "neutral";
  } => {
    const baseTrend = ohlc1inchUtils.getTrend(data);
    
    if (!data || data.length < 10) {
      return {
        trend: "sideways",
        strength: "weak",
      };
    }

    const { absolute, percentage } = ohlc1inchUtils.getPriceChange(data);
    
    let strength: "weak" | "moderate" | "strong" = "weak";
    if (Math.abs(percentage) > 10) strength = "strong";
    else if (Math.abs(percentage) > 5) strength = "moderate";

    let currentPriceTrend: "continuation" | "reversal" | "neutral" | undefined;
    
    if (currentPrice !== null && currentPrice !== undefined && data.length > 0) {
      const lastClose = data[data.length - 1].close;
      const priceMovement = (currentPrice - lastClose) / lastClose;
      
      if (baseTrend === "bullish") {
        currentPriceTrend = priceMovement > 0.01 ? "continuation" : 
                           priceMovement < -0.01 ? "reversal" : "neutral";
      } else if (baseTrend === "bearish") {
        currentPriceTrend = priceMovement < -0.01 ? "continuation" : 
                           priceMovement > 0.01 ? "reversal" : "neutral";
      } else {
        currentPriceTrend = "neutral";
      }
    }

    return {
      trend: baseTrend,
      strength,
      currentPriceTrend,
    };
  },

  // Calculate support and resistance levels
  getSupportResistance: (
    data: OHLCPoint[],
    currentPrice?: number | null
  ): {
    support: number[];
    resistance: number[];
    nearestSupport?: number;
    nearestResistance?: number;
  } => {
    if (!data || data.length < 20) {
      return { support: [], resistance: [] };
    }

    // Simple support/resistance calculation based on local highs and lows
    const highs: number[] = [];
    const lows: number[] = [];

    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const isLocalHigh = 
        current.high > data[i - 1].high &&
        current.high > data[i - 2].high &&
        current.high > data[i + 1].high &&
        current.high > data[i + 2].high;
      
      const isLocalLow = 
        current.low < data[i - 1].low &&
        current.low < data[i - 2].low &&
        current.low < data[i + 1].low &&
        current.low < data[i + 2].low;

      if (isLocalHigh) highs.push(current.high);
      if (isLocalLow) lows.push(current.low);
    }

    const resistance = [...new Set(highs)].sort((a, b) => b - a).slice(0, 5);
    const support = [...new Set(lows)].sort((a, b) => a - b).slice(0, 5);

    let nearestSupport: number | undefined;
    let nearestResistance: number | undefined;

    if (currentPrice !== null && currentPrice !== undefined) {
      nearestSupport = support
        .filter(s => s < currentPrice)
        .sort((a, b) => b - a)[0];
      
      nearestResistance = resistance
        .filter(r => r > currentPrice)
        .sort((a, b) => a - b)[0];
    }

    return {
      support,
      resistance,
      nearestSupport,
      nearestResistance,
    };
  },
};