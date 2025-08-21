import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface ChartErrorBoundaryProps {
  chainId: number;
  tokenOne: any;
  tokenAddress: string | null;
  isKatanaChain: boolean;
  chartError: string | null;
  error: string | null;
  isSupported: boolean;
  isLoading: boolean;
  priceLoading: boolean;
  chartDataLength: number;
  onRetry: () => void;
  onRefetch: () => void;
  onForceRefresh: () => void;
}

const ChartErrorBoundary: React.FC<ChartErrorBoundaryProps> = ({
  chainId,
  tokenOne,
  tokenAddress,
  isKatanaChain,
  chartError,
  error,
  isSupported,
  isLoading,
  priceLoading,
  chartDataLength,
  onRetry,
  onRefetch,
  onForceRefresh,
}) => {
  // Handle non-Katana chain
  if (!isKatanaChain) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            Katana charts are only available on Katana network
          </div>
          <div className="text-xs text-gray-500">
            Current chain: {chainId === 1 ? 'Ethereum' : `Chain ${chainId}`}
          </div>
        </div>
      </div>
    );
  }

  // Handle no token selected
  if (!tokenOne) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="text-gray-400">Select a token to view Katana chart</div>
      </div>
    );
  }

  // Chart error
  if (chartError) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">Chart Error: {chartError}</div>
          <Button
            onClick={onRetry}
            size="small"
            startIcon={<Refresh />}
            sx={{ color: '#00b4ff' }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // API or support error
  if (error || !isSupported) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">
            {error || 'No trading data available on Katana'}
          </div>
          <Button
            onClick={onRefetch}
            size="small"
            startIcon={<Refresh />}
            sx={{ color: '#00b4ff' }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if ((isLoading || priceLoading) && chartDataLength === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="flex flex-col items-center gap-3">
          <CircularProgress size={40} sx={{ color: '#00b4ff' }} />
          <div className="text-gray-400 text-sm">
            Loading {isLoading ? 'chart' : 'price'} data...
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (chartDataLength === 0) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            No chart data available for {tokenOne?.ticker}
          </div>
          <div className="text-xs text-gray-500">
            Token: {tokenAddress?.slice(0, 8)}...{tokenAddress?.slice(-6)}
          </div>
          <Button
            onClick={onForceRefresh}
            size="small"
            sx={{ color: '#00b4ff', mt: 1 }}
          >
            Force Refresh
          </Button>
        </div>
      </div>
    );
  }

  return null; // No error, render children
};

export default ChartErrorBoundary;