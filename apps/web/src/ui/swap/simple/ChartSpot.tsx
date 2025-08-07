"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { startOfMonth, addMonths, differenceInMonths } from "date-fns";
import axios from "axios";

export const BACKEND_URL = "https://api.aggtrade.xyz";

// Token logo mapping function
const getTokenLogo = (symbol: string, fallbackUrl?: string) => {
  switch (symbol?.toUpperCase()) {
    case 'ETH':
      return 'https://cdn.moralis.io/eth/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png';
    case 'USDC':
      return '/logos/usdc.png';
    case 'USDT':
      return 'https://cdn.moralis.io/eth/0xdac17f958d2ee523a2206206994597c13d831ec7.png';
    case 'WETH':
      return '/logos/weth.png';
    case 'WBTC':
      return '/logos/wbtc.png';
    default:
      return fallbackUrl || null;
  }
};

const formatTooltipLabel = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

// Custom tooltip props interface
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length || !label) return null;

  const price = payload[0]?.value as number;

  return (
    <div className="rounded-xl bg-gray-900/90 backdrop-blur-md p-3 border border-gray-700 shadow-xl">
      <p className="text-xs text-[#00F5E0] mb-1">{formatTooltipLabel(label)}</p>
      <p className="text-sm font-semibold text-white">
        ${price.toLocaleString()}
      </p>
    </div>
  );
};

function formatUSDCompact(value: number) {
  if (value === null || value === undefined || isNaN(value)) return "$0.00";

  const abs = Math.abs(value);

  let formatted;
  if (abs >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(2) + "B";
  } else if (abs >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(2) + "M";
  } else if (abs >= 1_000) {
    formatted = (value / 1_000).toFixed(2) + "K";
  } else {
    formatted = value.toFixed(2);
  }

  return `$${formatted}`;
}

// Loading Spinner Component (replacing MUI CircularProgress)
const LoadingSpinner = () => (
  <div className="w-8 h-8 border-2 border-[#00F5E0] border-t-transparent rounded-full animate-spin"></div>
);

// Media Query Hook (replacing MUI useMediaQuery)
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
};

// Chart Header Component with token0 prop
interface ChartHeaderProps {
  token0?: any;
}

export const ChartHeader: React.FC<ChartHeaderProps> = ({ token0 }) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isLargeScreen = useMediaQuery('(min-width: 1280px)');

  const [fdv, setFdv] = useState(0);
  const [vol, setVol] = useState(0);

  // Get token address for API call
  const getTokenAddress = (token: any) => {
    if (!token) return null;
    if (token.isNative) {
      // For native ETH, use WETH address for price data
      return "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    }
    return token.address;
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      const tokenAddress = getTokenAddress(token0);
      if (!tokenAddress) return;
      
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/chart/price`, {
          params: { tokenAddress },
        });
        setFdv(data.metadata.fdv);
        setVol(data.metadata.vol);
      } catch (error) {
        console.error("ERROR FETCHING METADATA:: ", error);
      }
    };

    fetchMetadata();
  }, [token0]);

  if (!token0) return null;

  // Get the appropriate logo for the token
  const tokenLogo = getTokenLogo(token0.symbol!, token0.logoUrl);

  return (
    <div className="flex lg:flex-col justify-between flex-row gap-2 p-4 px-6">
      {/* Token Info */}
      <div className="flex items-center gap-2 md:gap-4">
        <div
          className={`${
            isMobile ? "w-8" : isLargeScreen ? "w-16" : "w-12"
          } rounded-full overflow-hidden flex-shrink-0 bg-gray-700`}
        >
          {tokenLogo ? (
            <img
              src={tokenLogo}
              alt={token0.symbol}
              className="w-full object-cover"
              onError={(e) => {
                // Fallback to first letter if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ display: tokenLogo ? 'none' : 'flex' }}
          >
            {token0.symbol?.charAt(0)}
          </div>
        </div>
        <p
          className={`${
            isMobile
              ? "text-md"
              : isTablet
              ? "text-lg"
              : isLargeScreen
              ? "text-2xl"
              : "text-xl"
          } font-semibold truncate text-white`}
        >
          {token0.name}
        </p>
      </div>

      {/* Metrics */}
      <div className="flex gap-6 justify-start">
        <div className="flex flex-col gap-1 items-start">
          <p
            className={`${
              isMobile ? "text-xs" : isLargeScreen ? "text-sm" : "text-xs"
            } opacity-80 text-gray-300`}
          >
            FDV
          </p>
          <p
            className={`${
              isMobile ? "text-sm" : isLargeScreen ? "text-base" : "text-sm"
            } font-medium text-white`}
          >
            {formatUSDCompact(fdv)}
          </p>
        </div>
        <div className="flex flex-col gap-1 items-start">
          <p
            className={`${
              isMobile ? "text-xs" : isLargeScreen ? "text-sm" : "text-xs"
            } opacity-80 text-gray-300`}
          >
            24H VOL
          </p>
          <p
            className={`${
              isMobile ? "text-sm" : isLargeScreen ? "text-base" : "text-sm"
            } font-medium text-white`}
          >
            {formatUSDCompact(vol)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Chart Component with token0 prop
interface ChartSpotProps {
  token0?: any;
}

const ChartSpot: React.FC<ChartSpotProps> = ({ token0 }) => {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const isTablet = useMediaQuery('(max-width: 768px)');
  const isLargeScreen = useMediaQuery('(min-width: 1280px)');
  const showInternalHeader = useMediaQuery('(min-width: 768px)'); // Show header inside on medium screens and up

  const [chartData, setChartData] = useState<any>([]);
  const [fdv, setFdv] = useState(0);
  const [vol, setVol] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get token address for API call
  const getTokenAddress = (token: any) => {
    if (!token) return null;
    if (token.isNative) {
      // For native ETH, use WETH address for price data
      return "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    }
    return token.address;
  };

  function buildMonthTicks(from: number, to: number) {
    const first = startOfMonth(new Date(from)).getTime();
    const months = differenceInMonths(new Date(to), new Date(first));
    const ticks: number[] = [];
    for (let i = 0; i <= months - 1; i++) {
      ticks.push(addMonths(first, i).getTime());
    }
    return ticks;
  }

  const monthTicks = useMemo(() => {
    if (chartData.length === 0) return [];

    const first = chartData[0].ts;
    const last = chartData[chartData.length - 1].ts;
    return buildMonthTicks(first, last);
  }, [chartData]);

  async function fetchOhlcData() {
    const tokenAddress = getTokenAddress(token0);
    if (!tokenAddress) return;

    setIsLoading(true);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/chart/price`, {
        params: {
          tokenAddress,
        },
      });
      setChartData(data.chart);
      setFdv(data.metadata.fdv);
      setVol(data.metadata.vol);
    } catch (error) {
      console.error("ERROR FETCHING OHLC:: ", error);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (token0) {
      fetchOhlcData();
    }
  }, [token0]);

  return (
    <div className="w-full h-full flex justify-center items-center">
      <p className="text-4xl">Coming Soon...</p>
    </div>
  )

  if (isLoading || chartData.length === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Get the appropriate logo for the token
  const tokenLogo = getTokenLogo(token0!.symbol!, token0!.logoUrl);

  

  return (
    <div className="w-full h-full relative dot-pattern-cyan">
      {/* Header inside chart container - only on large screens */}
      {showInternalHeader && token0 && (
        <div
          className={` absolute ${
            isMobile
              ? "top-2 left-2 right-2"
              : isTablet
              ? "top-3 left-4 right-4"
              : "top-3 left-4 right-4"
          } ${
            isMobile
              ? "flex-col gap-3"
              : isTablet
              ? "flex-col gap-2"
              : "flex justify-between"
          } flex ${isMobile ? "items-start" : "items-center"} z-10`}
        >
          {/* Metrics */}
          <div
            className={`flex ${
              isMobile ? "gap-4" : isLargeScreen ? "gap-8" : "gap-6"
            } ${isMobile || isTablet ? "justify-start" : "justify-end"}`}
          >
            <div className="flex flex-col gap-1 items-center">
              <p
                className={`${
                  isMobile ? "text-xs" : isLargeScreen ? "text-base" : "text-sm"
                } opacity-80 text-gray-300`}
              >
                FDV
              </p>
              <p
                className={`${
                  isMobile ? "text-sm" : isLargeScreen ? "text-md" : "text-base"
                } font-medium text-white`}
              >
                {formatUSDCompact(fdv)}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <p
                className={`${
                  isMobile ? "text-xs" : isLargeScreen ? "text-base" : "text-sm"
                } opacity-80 text-gray-300`}
              >
                24H VOL
              </p>
              <p
                className={`${
                  isMobile ? "text-sm" : isLargeScreen ? "text-md" : "text-base"
                } font-medium text-white`}
              >
                {formatUSDCompact(vol)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className={`w-full h-full ${showInternalHeader ? "pt-8" : "pt-2"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: isMobile ? 10 : isLargeScreen ? 20 : 15,
              right: isMobile ? 10 : isLargeScreen ? 20 : 15,
              left: isMobile ? 10 : isLargeScreen ? 20 : 15,
              bottom: isMobile ? 10 : isLargeScreen ? 20 : 15,
            }}
          >
            <XAxis
              scale="time"
              dataKey="ts"
              domain={["dataMin", "dataMax"]}
              type="number"
              ticks={monthTicks}
              tickFormatter={(ts) =>
                new Date(ts).toLocaleDateString(undefined, {
                  month: "short",
                  day: isMobile ? undefined : "numeric",
                })
              }
              tick={{
                fontSize: isMobile ? 10 : isLargeScreen ? 14 : 12,
                fill: "#888",
              }}
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
            />
            <YAxis
              dataKey="price"
              tickFormatter={(v) =>
                isMobile ? `${(v / 1000).toFixed(1)}K` : `${v.toLocaleString()}`
              }
              width={isMobile ? 40 : isLargeScreen ? 40 : 30}
              orientation="right"
              tickCount={isMobile ? 4 : isLargeScreen ? 6 : 5}
              tick={{
                fontSize: isMobile ? 10 : isLargeScreen ? 14 : 12,
                fill: "#888",
              }}
              axisLine={{ stroke: "#333" }}
              tickLine={{ stroke: "#333" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#00F5E0"
              dot={false}
              strokeWidth={isMobile ? 1.5 : isLargeScreen ? 2.5 : 2}
              activeDot={{
                r: isMobile ? 3 : isLargeScreen ? 5 : 4,
                stroke: "#00F5E0",
                strokeWidth: isLargeScreen ? 3 : 2,
                fill: "#fff",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartSpot;