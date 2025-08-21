import React from 'react';
import { katanaOHLCUtils } from './useKatanaSwapOHLC';

interface ChartStatusIndicatorsProps {
  chartReady: boolean;
  chartDataLength: number;
  renderKey: number;
  priceLoading: boolean;
  currentPrice: number | null;
  high: number;
  low: number;
}

const ChartStatusIndicators: React.FC<ChartStatusIndicatorsProps> = ({
  chartReady,
  chartDataLength,
  renderKey,
  priceLoading,
  currentPrice,
  high,
  low,
}) => {
  return (
    <>
      {/* Status indicator */}
      <div className="absolute bottom-3 left-4 text-xs text-gray-400 bg-black/70 px-2 py-1 rounded">
        {chartReady ? '📈' : '⏳'} Ready: {chartReady.toString()} | Data:{' '}
        {chartDataLength} | Key: {renderKey}
        {priceLoading && ' | Price Loading...'}
        {currentPrice && ` | Price: $${currentPrice.toFixed(4)}`}
      </div>

      {/* Price Stats */}
      <div className="absolute bottom-3 right-4 flex gap-4 text-xs text-gray-300 bg-black/70 px-2 py-1 rounded">
        <div className="flex flex-col items-center">
          <span className="text-gray-400">HIGH</span>
          <span className="text-green-400 font-medium">
            ${katanaOHLCUtils.formatPrice(high)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-400">LOW</span>
          <span className="text-red-400 font-medium">
            ${katanaOHLCUtils.formatPrice(low)}
          </span>
        </div>
      </div>
    </>
  );
};

export default ChartStatusIndicators;