"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import { use1inchOhlcData } from "./use1inchOhlcData";
import {
  createChart,
  IChartApi,
  UTCTimestamp,
  CandlestickData,
} from "lightweight-charts";
import { CircularProgress, Button, ButtonGroup, Box, IconButton } from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useDexScreenerUSDC } from "./useDexScreenerUSDC";
import { Address } from "viem";
import { Type } from "sushi/currency";

// Types
interface OneInchCandlestickChartProps {
  tokenOne: Type;
}

export type TimeframeOption = "minute" | "hour" | "day";

interface TimeframeSelectorProps {
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  isProcessingTimeframe: boolean;
  variant?: "mobile" | "desktop";
  className?: string;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selectedTimeframe,
  onTimeframeChange,
  isProcessingTimeframe,
  variant = "desktop",
  className = "",
}) => {
  const timeframeOptions: { value: TimeframeOption; label: string }[] = [
    { value: "minute", label: "1m" },
    { value: "hour", label: "1h" },
    { value: "day", label: "1d" },
  ];

  const handleTimeframeClick = (timeframe: TimeframeOption) => {
    if (timeframe !== selectedTimeframe && !isProcessingTimeframe) {
      onTimeframeChange(timeframe);
    }
  };

  const isMobile = variant === "mobile";

  return (
    <div className={`flex gap-1 ${isMobile ? "overflow-x-auto pb-1 scrollbar-hide" : ""} ${className}`}>
      {timeframeOptions.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => handleTimeframeClick(value)}
          disabled={isProcessingTimeframe}
          className={`
            px-2 py-1 font-medium rounded transition-all duration-200 
            ${isMobile ? "text-xs flex-shrink-0" : "text-sm"}
            ${
              selectedTimeframe === value
                ? "bg-transparent text-[#00F5E0] shadow-md"
                : "bg-transparent text-gray-300 hover:bg-gray-600 hover:text-white"
            }
            ${
              isProcessingTimeframe
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }
          `}
        >
          {isProcessingTimeframe && selectedTimeframe === value ? (
            <div className="flex items-center gap-1">
              <CircularProgress size={isMobile ? 8 : 10} sx={{ color: "white" }} />
              <span>{label}</span>
            </div>
          ) : (
            label
          )}
        </button>
      ))}
    </div>
  );
};

export function formatCompact(input: number | string, maxDecimals = 2): string {
  let n = typeof input === "string" ? parseFloat(input) : input;
  if (!Number.isFinite(n)) return "–";

  const sign = n < 0 ? "-" : "";
  n = Math.abs(n);

  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];

  for (const { v, s } of units) {
    if (n >= v) {
      return sign + trimZeros((n / v).toFixed(maxDecimals)) + s;
    }
  }

  // For values < 1000, show up to maxDecimals but trim trailing zeros
  return sign + trimZeros(n.toFixed(maxDecimals));
}

function trimZeros(x: string): string {
  return x.replace(/\.0+$|(\.\d*?[1-9])0+$/, "$1");
}

const OneInchCandlestickChart: React.FC<OneInchCandlestickChartProps> = ({ tokenOne }) => {
  // State
  const [resolution, setResolution] = useState<TimeframeOption>("hour");
  const [chartReady, setChartReady] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [chartError, setChartError] = useState<string | null>(null);
  const [currentTokenSymbol, setCurrentTokenSymbol] = useState<string | null>(
    null
  );

  // Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const containerObserverRef = useRef<ResizeObserver | null>(null);

  // Get token address with native token handling
  const getTokenAddress = (token: Type | null): string | null => {
    if (!token) return null;
    
    if (token.isNative) {
      // For native tokens, use the wrapped version address
      return token.wrapped.address;
    }
    
    if (token.isToken) {
      return token.address;
    }
    
    return null;
  };

  const getTokenSymbol = (token: Type | null): string | undefined => {
    if (!token) return undefined;
    if (token.isNative) return 
    return token.symbol;
  };

  // Get token logo URL
  const getTokenLogoUrl = (token: Type | null): string | null => {
    if (!token) return null;
    if (token.isNative) return "https://cdn.sushi.com/image/upload/f_auto,c_limit,w_32/d_unknown.png/native-currency/ethereum.svg"
    // Use the wrapped token address for logo lookup
    
    return token.logoUrl || null
  };

  const tokenAddress = getTokenAddress(tokenOne);
  const tokenSymbol = getTokenSymbol(tokenOne);
  const tokenLogoUrl = getTokenLogoUrl(tokenOne);

  // Track token changes and reset price data - be more aggressive
  useEffect(() => {
    console.log("=== TOKEN CHANGE DETECTED ===");
    console.log("Previous:", currentTokenSymbol);
    console.log("New:", tokenSymbol);

    if (tokenSymbol !== currentTokenSymbol) {
      setCurrentTokenSymbol(tokenSymbol || null);
      setRenderKey((prev) => prev + 1);

      // Force immediate price refetch if we have a token
      if (tokenSymbol) {
        setTimeout(() => {
          console.log("Force refetching price for:", tokenSymbol);
          refetchPrice?.();
        }, 100);
      }
    }
  }, [tokenSymbol, currentTokenSymbol]);

  // 1inch OHLC Data Hook with integrated price data
  const {
    ohlcData,
    isOhlcLoading,
    ohlcError,
    refetchOhlc,
    isSupported,
    dataSource,
    currentPrice,
    isPriceLoading,
    priceError,
    refetchPrice,
    priceChange24h,
    isCurrentPriceAboveChart,
    chartHighLow,
  } = use1inchOhlcData({
    tokenAddress: tokenAddress as Address | undefined,
    resolution,
    limit: 1000,
    autoRefresh: true,
    refreshInterval: 300000,
    chainId: 1, // Ethereum mainnet
    includePriceData: true,
    enablePricePolling: true,
  });

  // Check if price is supported
  const priceIsSupported = !priceError && currentPrice !== null && currentPrice !== undefined;
  const priceHasError = !!priceError;

  // DexScreener metadata
  const {
    data: metadata,
    isLoading: metadataLoading,
    error: metadataError,
  } = useDexScreenerUSDC(tokenOne?.symbol!);

  // Debug logging
  useEffect(() => {
    console.log("1inch Price Debug:", {
      tokenSymbol,
      tokenAddress,
      currentPrice,
      isPriceLoading,
      priceHasError,
      priceIsSupported,
      priceError,
      ohlcData: ohlcData?.chart?.length || 0,
      priceChange24h,
    });
  }, [
    tokenSymbol,
    tokenAddress,
    currentPrice,
    isPriceLoading,
    priceHasError,
    priceIsSupported,
    priceError,
    ohlcData,
    priceChange24h,
  ]);

  // Process OHLC data for chart
  const chartData = useMemo((): CandlestickData[] => {
    if (!ohlcData?.chart) {
      return [];
    }

    try {
      const processed = ohlcData.chart
        .filter((point) => {
          return (
            point.timestamp &&
            point.open > 0 &&
            point.high > 0 &&
            point.low > 0 &&
            point.close > 0 &&
            !isNaN(point.open) &&
            !isNaN(point.high) &&
            !isNaN(point.low) &&
            !isNaN(point.close)
          );
        })
        .map((point) => ({
          time: Math.floor(point.timestamp / 1000) as UTCTimestamp,
          open: Number(point.open),
          high: Number(point.high),
          low: Number(point.low),
          close: Number(point.close),
        }))
        .sort((a, b) => a.time - b.time);

      return processed;
    } catch (err) {
      console.error("Error processing chart data:", err);
      setChartError(`Data processing error: ${err}`);
      return [];
    }
  }, [ohlcData, renderKey]);

  // Calculate price change using current price from 1inch API and historical data
  const priceChange = useMemo(() => {
    // Use the price change from the hook if available
    if (priceChange24h && priceChange24h.percentage !== 0) {
      return priceChange24h;
    }

    // Fallback to manual calculation
    if (!currentPrice || chartData.length === 0) {
      return { percentage: 0, absolute: 0 };
    }

    // Use the most recent close price from chart data as baseline
    const historicalPrice = chartData[chartData.length - 1]?.close;
    if (!historicalPrice) {
      return { percentage: 0, absolute: 0 };
    }

    const absolute = currentPrice - historicalPrice;
    const percentage = (absolute / historicalPrice) * 100;

    return { percentage, absolute };
  }, [currentPrice, chartData, priceChange24h]);

  // Use high/low from hook or calculate from chart data
  const { high, low } = useMemo(() => {
    if (chartHighLow) {
      return chartHighLow;
    }

    if (chartData.length === 0) {
      return { high: 0, low: 0 };
    }

    let high = chartData[0].high;
    let low = chartData[0].low;

    for (const candle of chartData) {
      if (candle.high > high) high = candle.high;
      if (candle.low < low) low = candle.low;
    }

    return { high, low };
  }, [chartData, chartHighLow]);

  // Format price helper function
  const formatPrice = (price: number): string => {
    if (!Number.isFinite(price) || price === 0) return "0.00";

    if (price >= 1000) {
      return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toFixed(4);
    } else if (price >= 0.01) {
      return price.toFixed(6);
    } else {
      return price.toFixed(8);
    }
  };

  // Clean up chart function
  const cleanupChart = useCallback(() => {
    if (containerObserverRef.current) {
      containerObserverRef.current.disconnect();
      containerObserverRef.current = null;
    }

    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (err) {
        console.error("Error removing chart:", err);
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    }
    setChartReady(false);
  }, []);

  // Initialize chart function
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || !tokenAddress) {
      return;
    }

    try {
      setChartError(null);
      cleanupChart();

      const container = chartContainerRef.current;

      // Wait for container to be properly sized
      const checkAndCreateChart = () => {
        const rect = container.getBoundingClientRect();

        if (rect.width === 0 || rect.height === 0) {
          setTimeout(checkAndCreateChart, 50);
          return;
        }

        try {
          // Create chart
          const chart = createChart(container, {
            layout: {
              background: { color: "#0d1117" },
              textColor: "#DDD",
            },
            grid: {
              vertLines: { color: "#1e222d" },
              horzLines: { color: "#1e222d" },
            },
            width: Math.floor(rect.width),
            height: Math.floor(rect.height),
            timeScale: {
              timeVisible: true,
              secondsVisible: false,
              borderColor: "#1e222d",
            },
            rightPriceScale: {
              borderColor: "#2B2B43",
              textColor: "#d1d4dc",
              autoScale: true,
            },
            crosshair: {
              vertLine: {
                color: "#758696",
                width: 1,
                style: 1,
              },
              horzLine: {
                color: "#758696",
                width: 1,
                style: 1,
              },
            },
          });

          // Add candlestick series
          const candlestickSeries = chart.addCandlestickSeries({
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
          });

          chartRef.current = chart;
          candlestickSeriesRef.current = candlestickSeries;

          // Set up resize observer
          containerObserverRef.current = new ResizeObserver(() => {
            if (chartRef.current && chartContainerRef.current) {
              const newRect = chartContainerRef.current.getBoundingClientRect();
              chartRef.current.applyOptions({
                width: Math.floor(newRect.width),
                height: Math.floor(newRect.height),
              });
            }
          });

          containerObserverRef.current.observe(container);
          setChartReady(true);

          // Force immediate data update if we have data
          if (chartData.length > 0) {
            setTimeout(() => {
              if (candlestickSeriesRef.current && chartData.length > 0) {
                candlestickSeriesRef.current.setData(chartData);

                if (chartRef.current) {
                  const lastTime = chartData[chartData.length - 1].time as number;
                  const threeDaysInSeconds = 3 * 24 * 60 * 60;
                  const startTime = (lastTime - threeDaysInSeconds) as UTCTimestamp;
                  const firstTime = chartData[0].time as number;
                  const actualStartTime = Math.max(startTime as number, firstTime) as UTCTimestamp;

                  try {
                    console.log('Setting visible range:', { from: actualStartTime, to: lastTime });
                    chartRef.current.timeScale().setVisibleRange({
                      from: actualStartTime,
                      to: lastTime as UTCTimestamp,
                    });
                  } catch (err) {
                    console.warn("Failed to set initial time range:", err);
                    chartRef.current.timeScale().fitContent();
                  }
                }
              }
            }, 100);
          }
        } catch (err) {
          console.error("Error creating chart:", err);
          setChartError(`Chart creation error: ${err}`);
        }
      };

      checkAndCreateChart();
    } catch (err) {
      console.error("Error initializing chart:", err);
      setChartError(`Chart initialization error: ${err}`);
    }
  }, [tokenAddress, cleanupChart, chartData]);

  // Initialize chart when token changes or component mounts
  useEffect(() => {
    if (tokenAddress) {
      const timer = setTimeout(() => {
        initializeChart();
      }, 100);

      return () => {
        clearTimeout(timer);
        cleanupChart();
      };
    } else {
      cleanupChart();
    }
  }, [tokenAddress, renderKey, initializeChart, cleanupChart]);

  // Update chart data when data changes
  useEffect(() => {
    if (!chartReady || !chartRef.current || !candlestickSeriesRef.current) {
      return;
    }

    try {
      if (chartData.length === 0) {
        candlestickSeriesRef.current.setData([]);
        return;
      }

      candlestickSeriesRef.current.setData(chartData);

      setTimeout(() => {
        if (chartRef.current) {
          // Set default view to last 3 days
          const lastTime = chartData[chartData.length - 1].time as number;
          const threeDaysInSeconds = 3 * 24 * 60 * 60;
          const startTime = (lastTime - threeDaysInSeconds) as UTCTimestamp;
          const firstTime = chartData[0].time as number;
          const actualStartTime = Math.max(startTime as number, firstTime) as UTCTimestamp;

          try {
            console.log('Setting visible range:', { from: actualStartTime, to: lastTime });
            chartRef.current.timeScale().setVisibleRange({
              from: actualStartTime,
              to: lastTime as UTCTimestamp,
            });
          } catch (err) {
            console.warn('Failed to set time range:', err);
            chartRef.current.timeScale().fitContent();
          }
        }
      }, 100);
    } catch (err) {
      console.error("Error updating chart data:", err);
      setChartError(`Chart update error: ${err}`);
    }
  }, [chartData, chartReady]);

  // Force re-initialization when resolution changes
  useEffect(() => {
    if (chartReady && tokenAddress) {
      const timer = setTimeout(() => {
        initializeChart();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [resolution, chartReady, tokenAddress, initializeChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupChart();
    };
  }, [cleanupChart]);

  // Handle no token selected
  if (!tokenOne) {
    return (
      <div className="h-[600px] glow-box flex">
        <div className="w-full h-full flex justify-center items-center">
          <div className="text-gray-400">
            Select a token to view 1inch chart
          </div>
        </div>
      </div>
    );
  }

  // Error states
  if (chartError) {
    return (
      <div className="h-[600px] glow-box flex">
        <div className="w-full h-full flex justify-center items-center">
          <div className="text-center">
            <div className="text-red-400 mb-2">Chart Error: {chartError}</div>
            <Button
              onClick={() => {
                setChartError(null);
                setRenderKey((prev) => prev + 1);
              }}
              size="small"
              startIcon={<Refresh />}
              sx={{ color: "#00b4ff" }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (ohlcError || !isSupported) {
    return (
      <div className="h-[600px] glow-box flex">
        <div className="w-full h-full flex justify-center items-center">
          <div className="text-center">
            <div className="text-red-400 mb-2">
              {ohlcError ||
                `No trading data available from ${
                  dataSource?.toUpperCase() || "1INCH"
                }`}
            </div>
            <Button
              onClick={refetchOhlc}
              size="small"
              startIcon={<Refresh />}
              sx={{ color: "#00b4ff" }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if ((isOhlcLoading || isPriceLoading) && chartData.length === 0) {
    return (
      <div className="h-[600px] glow-box flex">
        <div className="w-full h-full flex justify-center items-center">
          <div className="flex flex-col items-center gap-3">
            <CircularProgress size={40} sx={{ color: "#00b4ff" }} />
            <div className="text-gray-400 text-sm">
              Loading {isOhlcLoading ? "chart" : "price"} data from 1inch...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (chartData.length === 0) {
    return (
      <div className="h-[600px] glow-box flex">
        <div className="w-full h-full flex justify-center items-center">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              No chart data available for {tokenOne?.symbol}
            </div>
            <div className="text-xs text-gray-500">
              Token: {tokenAddress?.slice(0, 8)}...{tokenAddress?.slice(-6)}
            </div>
            <Button
              onClick={() => setRenderKey((prev) => prev + 1)}
              size="small"
              sx={{ color: "#00b4ff", mt: 1 }}
            >
              Force Refresh
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Chart Header - Only show outside on mobile/tablet */}
      <div className="block lg:hidden mb-4 mt-8">
        <div className="glow-box text-white p-3 overflow-hidden">
          <div className="flex items-center gap-3">
            {tokenLogoUrl && (
              <img
                src={tokenLogoUrl}
                alt={tokenOne.symbol}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div>
              <p className="text-lg font-semibold text-white">
                {tokenOne.symbol}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[#627EEA] font-semibold">
                  {isPriceLoading ? (
                    <CircularProgress size={16} sx={{ color: "#627EEA" }} />
                  ) : currentPrice ? (
                    `$${formatPrice(currentPrice)}`
                  ) : priceHasError ? (
                    <span className="text-red-400">Price Error</span>
                  ) : !priceIsSupported ? (
                    <span className="text-gray-400">Not Supported</span>
                  ) : (
                    "$0.00"
                  )}
                </span>
                {currentPrice && (
                  <span
                    className={`text-sm ${
                      priceChange.percentage >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {priceChange.percentage >= 0 ? "+" : ""}
                    {priceChange.percentage.toFixed(2)}%
                  </span>
                )}
                {isCurrentPriceAboveChart !== null && (
                  <span className="text-xs text-gray-400">
                    {isCurrentPriceAboveChart ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Container with glow-box */}
      <div 
        className="glow-box text-white overflow-hidden relative
                   h-[450px] sm:h-[450px] md:h-[550px] lg:h-[550px] xl:h-[560px]
                   max-h-[400px] sm:max-h-[500px] md:max-h-[600px] lg:max-h-[600px] xl:max-h-[700px]
                   p-1 md:p-2"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
          backgroundSize: "clamp(20px, 2.5vw, 30px) clamp(20px, 2.5vw, 30px)"
        }}
      >
        <div key={renderKey} className="w-full h-full relative">
          {/* Chart Header - Overlay mode for desktop only */}
          <div className="hidden lg:block">
            <div className="absolute top-3 left-4 right-4 flex justify-between items-center z-10">
              {/* Token Info */}
              <div className="flex items-center gap-3">
                {tokenLogoUrl && (
                  <img
                    src={tokenLogoUrl}
                    alt={tokenOne.symbol}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <p className="text-lg font-semibold text-white">
                    {tokenOne.symbol}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[#627EEA] font-semibold">
                      {isPriceLoading ? (
                        <CircularProgress size={16} sx={{ color: "#627EEA" }} />
                      ) : currentPrice ? (
                        `$${formatPrice(currentPrice)}`
                      ) : priceHasError ? (
                        <span className="text-red-400">Price Error</span>
                      ) : !priceIsSupported ? (
                        <span className="text-gray-400">Not Supported</span>
                      ) : (
                        "$0.00"
                      )}
                    </span>
                    {currentPrice && (
                      <span
                        className={`text-sm ${
                          priceChange.percentage >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {priceChange.percentage >= 0 ? "+" : ""}
                        {priceChange.percentage.toFixed(2)}%
                      </span>
                    )}
                    {isCurrentPriceAboveChart !== null && (
                      <span className="text-xs text-gray-400">
                        {isCurrentPriceAboveChart ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {/* Resolution Controls */}
                <div className="mr-2">
                  <TimeframeSelector
                    selectedTimeframe={resolution}
                    onTimeframeChange={setResolution}
                    isProcessingTimeframe={isOhlcLoading}
                    variant="desktop"
                  />
                </div>

                {/* Liquidity and Volume Info */}
                <div className="flex gap-4 mr-8">
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-gray-400">LIQ</p>
                    <p className="text-white text-sm">
                      {formatCompact(metadata?.liquidity?.usd || ohlcData?.metadata?.liquidity?.usd || 0)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-gray-400">VOL24H</p>
                    <p className="text-white text-sm">
                      {formatCompact(metadata?.volume?.h24 || ohlcData?.metadata?.volume24h || 0)}
                    </p>
                  </div>
                </div>

                <IconButton
                  onClick={() => {
                    refetchOhlc();
                    refetchPrice();
                    setRenderKey((prev) => prev + 1);
                  }}
                  size="small"
                  disableRipple
                  disabled={isOhlcLoading || isPriceLoading}
                  aria-label="Refresh"
                  sx={{
                    color: '#00F5E0',
                    p: 0.5,
                    '&.Mui-disabled': {
                      color: '#00F5E0',
                      opacity: 0.45,
                    },
                  }}
                >
                  <Refresh sx={{ fontSize: 20 }} />
                </IconButton>
              </div>
            </div>
          </div>

          {/* Resolution Controls for Mobile */}
          <div className="block lg:hidden absolute top-2 left-2 right-2 z-20">
            <TimeframeSelector
              selectedTimeframe={resolution}
              onTimeframeChange={setResolution}
              isProcessingTimeframe={isOhlcLoading}
              variant="mobile"
            />
          </div>

          {/* Chart Container */}
          <div className="w-full h-full px-2 pt-8 lg:pt-16">
            <div
              ref={chartContainerRef}
              className="w-full h-full bg-[#0d1117] rounded-lg"
              style={{
                minHeight: "300px",
                position: "relative",
              }}
            />
          </div>

          {/* Status indicator */}
          <div className="absolute bottom-3 left-4 text-xs text-gray-400 bg-black/70 px-2 py-1 rounded">
            {chartReady ? "📈" : "⏳"} Ready: {chartReady.toString()} | Data:{" "}
            {chartData.length} | Token: {tokenSymbol} | Source: {dataSource}
            {isPriceLoading && " | Price Loading..."}
            {currentPrice && ` | Price: ${formatPrice(currentPrice)}`}
          </div>

          {/* Price Stats */}
          <div className="absolute bottom-3 right-4 flex gap-4 text-xs text-gray-300 bg-black/70 px-2 py-1 rounded">
            <div className="flex flex-col items-center">
              <span className="text-gray-400">HIGH</span>
              <span className="text-green-400 font-medium">
                ${formatPrice(high)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-400">LOW</span>
              <span className="text-red-400 font-medium">${formatPrice(low)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OneInchCandlestickChart;