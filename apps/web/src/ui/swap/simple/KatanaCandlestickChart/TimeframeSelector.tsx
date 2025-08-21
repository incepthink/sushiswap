import React from 'react';
import { CircularProgress } from '@mui/material';

export type TimeframeOption = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';

interface TimeframeSelectorProps {
  selectedTimeframe: TimeframeOption;
  onTimeframeChange: (timeframe: TimeframeOption) => void;
  isProcessingTimeframe: boolean;
  variant?: 'mobile' | 'desktop';
  className?: string;
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  selectedTimeframe,
  onTimeframeChange,
  isProcessingTimeframe,
  variant = 'desktop',
  className = '',
}) => {
  const timeframeOptions: TimeframeOption[] = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'];

  const handleTimeframeClick = (timeframe: TimeframeOption) => {
    if (timeframe !== selectedTimeframe && !isProcessingTimeframe) {
      onTimeframeChange(timeframe);
    }
  };

  const isMobile = variant === 'mobile';

  return (
    <div className={`flex gap-1 ${isMobile ? 'overflow-x-auto pb-1 scrollbar-hide' : ''} ${className}`}>
      {timeframeOptions.map((timeframe) => (
        <button
          key={timeframe}
          onClick={() => handleTimeframeClick(timeframe)}
          disabled={isProcessingTimeframe}
          className={`
            px-2 py-1 font-medium rounded transition-all duration-200 
            ${isMobile ? 'text-xs flex-shrink-0' : 'text-sm'}
            ${
              selectedTimeframe === timeframe
                ? 'bg-transparent text-[#00F5E0] shadow-md'
                : 'bg-transparent text-gray-300 hover:bg-gray-600 hover:text-white'
            }
            ${
              isProcessingTimeframe
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }
          `}
        >
          {isProcessingTimeframe && selectedTimeframe === timeframe ? (
            <div className="flex items-center gap-1">
              <CircularProgress size={isMobile ? 8 : 10} sx={{ color: 'white' }} />
              <span>{timeframe}</span>
            </div>
          ) : (
            timeframe
          )}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;