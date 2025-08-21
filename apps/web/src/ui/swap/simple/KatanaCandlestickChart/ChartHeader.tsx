//sushi chart header

import React, { useState } from 'react';
import { CircularProgress, IconButton } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { katanaOHLCUtils } from './useKatanaSwapOHLC';
import TimeframeSelector, { TimeframeOption } from './TimeframeSelector';
import {Type} from "sushi/currency"

export function formatCompact(input: number | string, maxDecimals = 2): string {
  let n = typeof input === 'string' ? parseFloat(input) : input;
  if (!Number.isFinite(n)) return '–';

  const sign = n < 0 ? '-' : '';
  n = Math.abs(n);

  const units = [
    { v: 1e12, s: 'T' },
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' },
  ];

  for (const { v, s } of units) {
    if (n >= v) {
      return sign + trimZeros((n / v).toFixed(maxDecimals)) + s;
    }
  }

  return sign + trimZeros(n.toFixed(maxDecimals));
}

function trimZeros(x: string): string {
  return x.replace(/\.0+$|(\.\d*?[1-9])0+$/, '$1');
}


type MetricDisplayMode = 'usd' | 'percentage';

interface TimeframeMetrics {
  priceChange: { absolute: number; percentage: number };
  volumeChange: { absolute: number; percentage: number };
  totalVolume: number;
  avgPrice: number;
  timeframe: TimeframeOption;
}

interface ChartHeaderProps {
  tokenOne: Type;
  currentPrice: number | null;
  priceLoading: boolean;
  priceHasError: boolean;
  priceChange: {
    percentage: number;
    absolute: number;
  };
  ohlcData: any;
  isLoading: boolean;
  onRefresh: () => void;
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  isProcessingTimeframe: boolean;
  timeframeMetrics: TimeframeMetrics | null;
  isOverlay?: boolean; // New prop to control overlay vs standalone mode
}

const ChartHeader: React.FC<ChartHeaderProps> = ({
  tokenOne,
  currentPrice,
  priceLoading,
  priceHasError,
  priceChange,
  ohlcData,
  isLoading,
  onRefresh,
  selectedTimeframe,
  onTimeframeChange,
  isProcessingTimeframe,
  timeframeMetrics,
  isOverlay = true, // Default to overlay mode for backward compatibility
}) => {
  // Toggle states for metrics display
  const [priceDisplayMode, setPriceDisplayMode] = useState<MetricDisplayMode>('percentage');
  const [volumeDisplayMode, setVolumeDisplayMode] = useState<MetricDisplayMode>('usd');

  // Check if we have valid timeframe data
  const hasValidTimeframeData = !!timeframeMetrics && timeframeMetrics.timeframe === selectedTimeframe;

  // Format price change display
  const renderPriceChange = () => {
    if (!hasValidTimeframeData) {
      return <span className="text-gray-400">--</span>;
    }

    const { priceChange: tfPriceChange } = timeframeMetrics!;

    if (priceDisplayMode === 'usd') {
      const value = tfPriceChange.absolute;
      const sign = value >= 0 ? '+' : '';
      return `${sign}$${formatCompact(Math.abs(value))}`;
    } else {
      const value = tfPriceChange.percentage;
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    }
  };

  // Format volume change display
  const renderVolumeChange = () => {
    if (!hasValidTimeframeData) {
      return <span className="text-gray-400">--</span>;
    }

    const { volumeChange } = timeframeMetrics!;

    if (volumeDisplayMode === 'usd') {
      const value = volumeChange.absolute;
      const sign = value >= 0 ? '+' : '';
      return `${sign}$${formatCompact(Math.abs(value))}`;
    } else {
      const value = volumeChange.percentage;
      const sign = value >= 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    }
  };

  // Colors
  const getPriceChangeColor = (): string => {
    if (!hasValidTimeframeData) return 'text-gray-400';
    return timeframeMetrics!.priceChange.percentage >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getVolumeChangeColor = (): string => {
    if (!hasValidTimeframeData) return 'text-gray-400';
    return timeframeMetrics!.volumeChange.percentage >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const refreshDisabled = isLoading || isProcessingTimeframe;

  // Determine wrapper classes based on overlay mode
  const wrapperClasses = isOverlay 
    ? "absolute top-2 left-2 right-2 md:top-3 md:left-4 md:right-4 z-10"
    : "w-full";

  return (
    <div className={wrapperClasses}>
      {/* Mobile/Tablet Standalone Layout */}
      <div className={`${isOverlay ? 'block md:hidden' : 'block lg:hidden'} space-y-3 ${!isOverlay ? 'p-3' : ''}`}>
        {/* Top Row - Token Info and Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tokenOne?.logoUrl && (
              <img
                src={tokenOne.logoUrl}
                alt={tokenOne.symbol}
                className="w-6 h-6 md:w-8 md:h-8 rounded-full"
              />
            )}
            <div>
              <p className="text-base md:text-lg font-semibold text-white">
                {tokenOne?.symbol || 'Token'}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[#00F5E0] font-semibold text-sm">
                  {priceLoading ? (
                    <CircularProgress size={14} sx={{ color: '#00F5E0' }} />
                  ) : currentPrice ? (
                    `$${katanaOHLCUtils.formatPrice(currentPrice)}`
                  ) : (
                    '$0.00'
                  )}
                </span>
                <span
                  className={`text-xs ${
                    priceChange.percentage >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {priceChange.percentage >= 0 ? '+' : ''}
                  {priceChange.percentage.toFixed(2)}%
                </span>
                {priceHasError && (
                  <span className="text-xs text-red-400">Error</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Refresh Button */}
          <IconButton
            onClick={onRefresh}
            size="small"
            disableRipple
            disabled={refreshDisabled}
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
            <Refresh sx={{ fontSize: 18 }} />
          </IconButton>
        </div>

        {/* Metrics Grid - 2x2 layout on mobile */}
        <div className="grid grid-cols-2 gap-3">
          {/* Price Change */}
          <div className="flex flex-col">
            <p className="text-xs text-gray-400 mb-1">Price ({selectedTimeframe})</p>
            <button
              onClick={() => setPriceDisplayMode(prev => (prev === 'usd' ? 'percentage' : 'usd'))}
              className={`text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer text-left ${getPriceChangeColor()}`}
              disabled={!hasValidTimeframeData}
            >
              {renderPriceChange()}
            </button>
          </div>

          {/* Volume Change */}
          <div className="flex flex-col">
            <p className="text-xs text-gray-400 mb-1">Volume ({selectedTimeframe})</p>
            <button
              onClick={() => setVolumeDisplayMode(prev => (prev === 'usd' ? 'percentage' : 'usd'))}
              className={`text-xs font-medium hover:opacity-80 transition-opacity cursor-pointer text-left ${getVolumeChangeColor()}`}
              disabled={!hasValidTimeframeData}
            >
              {renderVolumeChange()}
            </button>
          </div>

          {/* Total Volume */}
          <div className="flex flex-col">
            <p className="text-xs text-gray-400 mb-1">Total Vol</p>
            <p className="text-xs text-white font-medium">
              {hasValidTimeframeData ? `$${formatCompact(ohlcData?.metadata?.volumeUSD || 0)}` : '--'}
            </p>
          </div>

          {/* Pool TVL */}
          <div className="flex flex-col">
            <p className="text-xs text-gray-400 mb-1">Pool TVL</p>
            <p className="text-xs text-white font-medium">
              ${formatCompact(ohlcData?.metadata?.totalValueLockedUSD || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Only show as overlay */}
      <div className={`${isOverlay ? 'hidden md:flex' : 'hidden lg:flex'} justify-between items-start`}>
        {/* Left Side - Token Info */}
        <div className="flex items-center gap-3">
          {tokenOne?.logoUrl && (
            <img
              src={tokenOne.logoUrl}
              alt={tokenOne.symbol}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <p className="text-lg font-semibold text-white">
              {tokenOne?.symbol || 'Token'}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[#00F5E0] font-semibold">
                {priceLoading ? (
                  <CircularProgress size={16} sx={{ color: '#00F5E0' }} />
                ) : currentPrice ? (
                  `$${katanaOHLCUtils.formatPrice(currentPrice)}`
                ) : (
                  '$0.00'
                )}
              </span>
              <span
                className={`text-sm ${
                  priceChange.percentage >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {priceChange.percentage >= 0 ? '+' : ''}
                {priceChange.percentage.toFixed(2)}%
              </span>
              {priceHasError && (
                <span className="text-xs text-red-400">Price Error</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Controls and Metrics */}
        <div className="flex gap-8">
          {/* Timeframe Buttons Row */}
          <div className="flex items-end gap-2">
            <TimeframeSelector
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={onTimeframeChange}
              isProcessingTimeframe={isProcessingTimeframe}
              variant="desktop"
            />
          </div>

          {/* Metrics Row */}
          <div className="flex items-center gap-6">
            {/* Price Change */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-400 mb-1">Price ({selectedTimeframe})</p>
              <button
                onClick={() => setPriceDisplayMode(prev => (prev === 'usd' ? 'percentage' : 'usd'))}
                className={`text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer ${getPriceChangeColor()}`}
                disabled={!hasValidTimeframeData}
              >
                {renderPriceChange()}
              </button>
            </div>

            {/* Volume Change */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-400 mb-1">Volume ({selectedTimeframe})</p>
              <button
                onClick={() => setVolumeDisplayMode(prev => (prev === 'usd' ? 'percentage' : 'usd'))}
                className={`text-sm font-medium hover:opacity-80 transition-opacity cursor-pointer ${getVolumeChangeColor()}`}
                disabled={!hasValidTimeframeData}
              >
                {renderVolumeChange()}
              </button>
            </div>

            {/* Total Volume */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-400 mb-1">Total Vol</p>
              <p className="text-sm text-white font-medium">
                {hasValidTimeframeData ? `$${formatCompact(ohlcData?.metadata?.volumeUSD || 0)}` : '--'}
              </p>
            </div>

            {/* Pool TVL */}
            <div className="flex flex-col items-center">
              <p className="text-xs text-gray-400 mb-1">Pool TVL</p>
              <p className="text-sm text-white font-medium">
                ${formatCompact(ohlcData?.metadata?.totalValueLockedUSD || 0)}
              </p>
            </div>

            {/* Refresh Icon */}
            <IconButton
              onClick={onRefresh}
              size="small"
              disableRipple
              disabled={refreshDisabled}
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
    </div>
  );
};

export default ChartHeader;